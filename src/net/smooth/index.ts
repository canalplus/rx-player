/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Observable } from "rxjs/Observable";
import { Adaptation } from "../../manifest";
import parseBif from "../../parsers/images/bif";
import assert from "../../utils/assert";
import request from "../../utils/request";
import { stringFromUTF8 } from "../../utils/strings";
import { resolveURL } from "../../utils/url";
import {
  ILoaderObservable,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  INextSegmentsInfos,
  IResolverObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentTimingInfos,
  ITransportPipelines,
  SegmentParserObservable,
  TextTrackParserObservable,
} from "../types";
import extractTimingsInfos from "./isobmff_timings_infos";
import createSmoothManifestParser from "./manifest";
import mp4Utils from "./mp4";
import generateSegmentLoader from "./segment_loader";
import { IHSSParserOptions } from "./types";
import {
  buildSegmentURL,
  extractISML,
  extractToken,
  replaceToken,
  resolveManifest,
} from "./utils";

const {
  patchSegment,
  getMdat,
} = mp4Utils;

const WSX_REG = /\.wsx?(\?token=\S+)?/;

/**
 * @param {Object} adaptation
 * @param {Object} dlSegment
 * @param {Object} nextSegments
 */
function addNextSegments(
  adaptation : Adaptation,
  dlSegment : ISegmentTimingInfos,
  nextSegments : INextSegmentsInfos[]
) {
  const representations = adaptation.representations;
  for (let i = 0; i < representations.length; i++) {
    const representation = representations[i];
    if (
      dlSegment.duration != null &&
      dlSegment.timescale != null
    ) {
      // TODO TypeScript bug?
      representation.index._addSegments(nextSegments, dlSegment as {
        time : number;
        duration : number;
        timescale : number;
      });
    }
  }
}

export default function(
  options : IHSSParserOptions = {}
) : ITransportPipelines<
  Document,               // manifest loader -> parser
  ArrayBuffer|Uint8Array, // audio    loader -> parser
  ArrayBuffer|Uint8Array, // video    loader -> parser
  ArrayBuffer|string,     // text     loader -> parser
  ArrayBuffer             // image    loader -> parser
> {
  const smoothManifestParser = createSmoothManifestParser(options);
  const segmentLoader = generateSegmentLoader(options.segmentLoader);

  const manifestPipeline = {
    resolver({ url } : IManifestLoaderArguments) : IResolverObservable {
      let resolving;
      const token = extractToken(url);

      // TODO Remove WSX logic
      if (WSX_REG.test(url)) {
        resolving = request({
          url: replaceToken(url, ""),
          responseType: "document",
          ignoreProgressEvents: true,
        })
          .map(({ value }) : string => {
            const extractedURL = extractISML(value.responseData);
            if (!extractedURL) {
              throw new Error("Invalid ISML");
            }
            return extractedURL;
          });
      } else {
        resolving = Observable.of(url);
      }

      return resolving
        .map((_url) => ({ url: replaceToken(resolveManifest(_url), token) }));
    },

    loader({ url } : IManifestLoaderArguments) : ILoaderObservable<Document> {
      return request({
        url,
        responseType: "document",
        ignoreProgressEvents: true,
      });
    },

    parser(
      { response, url } : IManifestParserArguments<Document>
    ) : IManifestParserObservable {
      const manifest = smoothManifestParser(response.responseData, url);
      return Observable.of({
        manifest,
        url: response.url,
      });
    },
  };

  const segmentPipeline = {
    loader({
      adaptation,
      init,
      manifest,
      period,
      representation,
      segment,
    } : ISegmentLoaderArguments
    ) : ILoaderObservable<ArrayBuffer|Uint8Array> {
      return segmentLoader({
        adaptation,
        init,
        manifest,
        period,
        representation,
        segment,
      });
    },

    parser({
      segment,
      response,
      adaptation,
      manifest,
    } : ISegmentParserArguments<ArrayBuffer|Uint8Array>
    ) : SegmentParserObservable {
      const responseData = response.responseData;

      if (segment.isInit) {
        // smooth init segments are crafted by hand. Their timescale is the one
        // from the manifest.
        const initSegmentInfos = {
          timescale: segment.timescale,
          time: -1,
          duration: 0,
        };
        return Observable.of({
          segmentData: responseData,
          segmentInfos: initSegmentInfos,
        });
      }
      if (__DEV__) {
        assert(responseData instanceof ArrayBuffer);
      }
      const responseBuffer = new Uint8Array(responseData as ArrayBuffer);
      const { nextSegments, segmentInfos } =
        extractTimingsInfos(responseBuffer, segment, manifest.isLive);
      const segmentData = patchSegment(responseBuffer, segmentInfos.time);

      if (nextSegments) {
        addNextSegments(adaptation, segmentInfos, nextSegments);
      }
      return Observable.of({ segmentData, segmentInfos });
    },
  };

  const textTrackPipeline = {
    loader({
      segment,
      representation,
    } : ISegmentLoaderArguments
    ) : ILoaderObservable<string|ArrayBuffer> {
      if (segment.isInit) {
        return Observable.empty();
      }

      const { mimeType } = representation;
      const base = resolveURL(representation.baseURL);
      const url = buildSegmentURL(base, representation, segment);

      return request({
        url,
        responseType: (mimeType && mimeType.indexOf("mp4") >= 0) ?
          "arraybuffer" : "text",
      });
    },

    parser({
        response,
        segment,
        representation,
        adaptation,
        manifest,
    } : ISegmentParserArguments<string|ArrayBuffer>
    ) : TextTrackParserObservable {
      const { language } = adaptation;
      const {
        mimeType = "",
        codec = "",
      } = representation;

      if (__DEV__) {
        assert(typeof response.responseData === "string" ||
          response.responseData instanceof ArrayBuffer);
      }
      const responseData = response.responseData;
      let parsedResponse : string|Uint8Array;
      let nextSegments;
      let segmentInfos;
      const isMP4 = mimeType.indexOf("mp4") >= 0;

      // segmentData components
      let _sdStart : number;
      let _sdEnd : number|undefined;
      let _sdTimescale : number;
      let _sdData : string;
      let _sdType : string|undefined;

      if (isMP4) {
        if (__DEV__) {
          assert(responseData instanceof ArrayBuffer);
        }
        parsedResponse = new Uint8Array(responseData as ArrayBuffer);
        const timings =
          extractTimingsInfos(parsedResponse, segment, manifest.isLive);

        nextSegments = timings.nextSegments;
        segmentInfos = timings.segmentInfos;
        _sdStart = segmentInfos.time;
        _sdEnd = segmentInfos.duration != null ?
          segmentInfos.time + segmentInfos.duration : undefined;

        if (__DEV__) {
          assert(typeof segmentInfos.timescale === "number");
        }
        _sdTimescale = segmentInfos.timescale as number;
      } else {
        if (__DEV__) {
          assert(typeof responseData === "string");
        }
        parsedResponse = responseData as string;

        const segmentTime = segment.time || 0;

        // vod is simple WebVTT or TTML text
        _sdStart = segmentTime;
        _sdEnd = segment.duration != null ?
          segmentTime + segment.duration : undefined;
        _sdTimescale = segment.timescale;
      }

      if (isMP4) {
        const lcCodec = codec.toLowerCase();
        if (mimeType === "application/ttml+xml+mp4" || lcCodec === "stpp") {
          _sdType = "ttml";
        } else if (lcCodec === "wvtt") {
          _sdType = "vtt";
        } else {
          throw new Error(
            `could not find a text-track parser for the type ${mimeType}`);
        }
        const mdat = getMdat(parsedResponse as Uint8Array);
        _sdData = stringFromUTF8(mdat);

      } else {
        switch (mimeType) {
          case "application/x-sami":
          case "application/smil": // TODO SMIL should be its own format, no?
            _sdType = "sami";
            break;
          case "application/ttml+xml":
            _sdType = "ttml";
            break;
          case "text/vtt":
            _sdType = "vtt";
            break;
        }

        if (!_sdType) {
          const lcCodec = codec.toLowerCase();
          if (lcCodec === "srt") {
            _sdType = "srt";
          } else {
            throw new Error(
              `could not find a text-track parser for the type ${mimeType}`);
          }
        }
        _sdData = responseData as string;
      }

      if (segmentInfos != null && nextSegments) {
        addNextSegments(adaptation, segmentInfos, nextSegments);
      }
      return Observable.of({
        segmentData: {
          type: _sdType,
          data: _sdData,
          language,
          timescale: _sdTimescale,
          start: _sdStart,
          end: _sdEnd,
          timeOffset: _sdStart / _sdTimescale,
        },
        segmentInfos,
      });
    },
  };

  const imageTrackPipeline = {
    loader(
      { segment, representation } : ISegmentLoaderArguments
    ) : ILoaderObservable<ArrayBuffer> {
      if (segment.isInit) {
        return Observable.empty();
      } else {
        const baseURL = resolveURL(representation.baseURL);
        const url = buildSegmentURL(baseURL, representation, segment);

        return request({
          url,
          responseType: "arraybuffer",
        });
      }
    },

    parser(
      { response } : ISegmentParserArguments<ArrayBuffer>
    ) : ImageParserObservable {
      const responseData = response.responseData;
      const blob = new Uint8Array(responseData);

      const bif = parseBif(blob);
      const segmentData = bif.thumbs;

      const segmentInfos = {
        time: 0,
        duration: Number.MAX_VALUE,
        timescale: bif.timescale,
      };

      // var firstThumb = blob[0];
      // var lastThumb  = blob[blob.length - 1];

      // segmentInfos = {
      //   time: firstThumb.ts,
      //   duration: lastThumb.ts
      // };

      return Observable.of({ segmentData, segmentInfos });
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
  };
}
