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

import {
  Observable,
  of as observableOf,
} from "rxjs";
import { map } from "rxjs/operators";
import features from "../../features";
import log from "../../log";
import Manifest, {
  Adaptation,
  Representation,
} from "../../manifest";
import { getMDAT } from "../../parsers/containers/isobmff";
import createSmoothManifestParser from "../../parsers/manifest/smooth";
import assert from "../../utils/assert";
import request from "../../utils/request";
import stringFromUTF8 from "../../utils/string_from_utf8";
import warnOnce from "../../utils/warn_once";
import {
  ILoaderObservable,
  ImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  INextSegmentsInfos,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentTimingInfos,
  ITransportOptions,
  ITransportPipelines,
  SegmentParserObservable,
  TextTrackParserObservable,
} from "../types";
import generateManifestLoader from "../utils/manifest_loader";
import extractTimingsInfos from "./extract_timings_infos";
import { patchSegment } from "./isobmff";
import generateSegmentLoader from "./segment_loader";
import {
  extractISML,
  extractToken,
  replaceToken,
  resolveManifest,
} from "./utils";

const WSX_REG = /\.wsx?(\?token=\S+)?/;

/**
 * @param {Object} adaptation
 * @param {Object} dlSegment
 * @param {Object} nextSegments
 */
function addNextSegments(
  adaptation : Adaptation,
  nextSegments : INextSegmentsInfos[],
  dlSegment? : ISegmentTimingInfos
) : void {
  log.debug("Smooth Parser: update segments informations.");
  const representations = adaptation.representations;
  for (let i = 0; i < representations.length; i++) {
    const representation = representations[i];
    representation.index._addSegments(nextSegments, dlSegment);
  }
}

export default function(
  options : ITransportOptions = {}
) : ITransportPipelines {
  const smoothManifestParser = createSmoothManifestParser(options);
  const segmentLoader = generateSegmentLoader(options.segmentLoader);

  const manifestLoaderOptions = { customManifestLoader: options.manifestLoader };
  const manifestLoader = generateManifestLoader(manifestLoaderOptions);

  const manifestPipeline = {
    resolver(
      { url } : IManifestLoaderArguments
    ) : Observable<IManifestLoaderArguments> {
      let resolving;
      const token = extractToken(url);

      // TODO Remove WSX logic
      if (WSX_REG.test(url)) {
        warnOnce("Giving WSX URL to loadVideo is deprecated." +
          " You should only give Manifest URLs.");
        resolving = request({
          url: replaceToken(url, ""),
          responseType: "document",
        }).pipe(
          map(({ value }) : string => {
            const extractedURL = extractISML(value.responseData);
            if (!extractedURL) {
              throw new Error("Invalid ISML");
            }
            return extractedURL;
          })
        );
      } else {
        resolving = observableOf(url);
      }

      return resolving
        .pipe(map((_url) => ({
          url: replaceToken(resolveManifest(_url), token),
        })));
    },

    loader(
      { url } : IManifestLoaderArguments
    ) : ILoaderObservable<Document|string> {
      return manifestLoader(url);
    },

    parser(
      { response, url: reqURL } : IManifestParserArguments<Document|string, string>
    ) : IManifestParserObservable {
      const url = response.url == null ? reqURL : response.url;
      const data = typeof response.responseData === "string" ?
        new DOMParser().parseFromString(response.responseData, "text/xml") :
        response.responseData;
      const { receivedTime: manifestReceivedTime } = response;
      const parserResult = smoothManifestParser(data, url, manifestReceivedTime);
      const manifest = new Manifest(parserResult, {
        representationFilter: options.representationFilter,
        supplementaryImageTracks: options.supplementaryImageTracks,
        supplementaryTextTracks: options.supplementaryTextTracks,
      });
      return observableOf({ manifest, url });
    },
  };

  const segmentPipeline = {
    loader({
      adaptation,
      manifest,
      period,
      representation,
      segment,
    } : ISegmentLoaderArguments
    ) : ILoaderObservable<ArrayBuffer|Uint8Array|null> {
      return segmentLoader({
        adaptation,
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
    } : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : SegmentParserObservable {
      const { responseData } = response;
      if (responseData == null) {
        return observableOf({ segmentData: null, segmentInfos: null, segmentOffset: 0 });
      }

      if (segment.isInit) {
        // smooth init segments are crafted by hand. Their timescale is the one
        // from the manifest.
        const initSegmentInfos = {
          timescale: segment.timescale,
          time: -1,
          duration: 0,
        };
        return observableOf({
          segmentData: responseData,
          segmentInfos: initSegmentInfos,
          segmentOffset: 0,
        });
      }
      const responseBuffer = responseData instanceof Uint8Array ?
        responseData : new Uint8Array(responseData);

      const { nextSegments, segmentInfos } =
        extractTimingsInfos(responseBuffer, segment, manifest.isLive);
      const segmentData = patchSegment(responseBuffer, segmentInfos.time);

      if (nextSegments) {
        addNextSegments(adaptation, nextSegments, segmentInfos);
      }
      return observableOf({ segmentData, segmentInfos, segmentOffset: 0 });
    },
  };

  const textTrackPipeline = {
    loader({
      segment,
      representation,
    } : ISegmentLoaderArguments
    ) : ILoaderObservable<string|ArrayBuffer|null> {
      if (segment.isInit || segment.mediaURL == null) {
        return observableOf({
          type: "data" as "data",
          value: { responseData: null },
        });
      }
      const responseType = isMP4EmbeddedTrack(representation) ? "arraybuffer" : "text";
      return request({
        url: segment.mediaURL,
        responseType,
        sendProgressEvents: true,
      });
    },

    parser({
        response,
        segment,
        representation,
        adaptation,
        manifest,
    } : ISegmentParserArguments<string|ArrayBuffer|Uint8Array|null>
    ) : TextTrackParserObservable {
      const { language } = adaptation;
      const {
        mimeType = "",
        codec = "",
      } = representation;

      if (__DEV__) {
        if (segment.isInit) {
          assert(response.responseData === null);
        } else {
          assert(
            typeof response.responseData === "string" ||
            response.responseData instanceof ArrayBuffer
          );
        }
      }

      const responseData = response.responseData;

      if (responseData === null) {
        return observableOf({
          segmentData: null,
          segmentInfos: segment.timescale > 0 ? {
            duration: segment.isInit ? 0 : segment.duration,
            time: segment.isInit ? -1 : segment.time,
            timescale: segment.timescale,
          } : null,
          segmentOffset: 0,
        });
      }

      let parsedResponse : string|Uint8Array;
      let nextSegments;
      let segmentInfos : ISegmentTimingInfos|null = null;
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
        _sdTimescale = segmentInfos.timescale;
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
        if (
          mimeType === "application/ttml+xml+mp4" ||
          lcCodec === "stpp" ||
          lcCodec === "stpp.ttml.im1t"
        ) {
          _sdType = "ttml";
        } else if (lcCodec === "wvtt") {
          _sdType = "vtt";
        } else {
          throw new Error(
            `could not find a text-track parser for the type ${mimeType}`);
        }
        const mdat = getMDAT(parsedResponse as Uint8Array);
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
        addNextSegments(adaptation, nextSegments, segmentInfos);
      }
      return observableOf({
        segmentData: {
          type: _sdType,
          data: _sdData,
          language,
          timescale: _sdTimescale,
          start: _sdStart,
          end: _sdEnd,
        },
        segmentInfos,
        segmentOffset: _sdStart / _sdTimescale,
      });
    },
  };

  const imageTrackPipeline = {
    loader(
      { segment } : ISegmentLoaderArguments
    ) : ILoaderObservable<ArrayBuffer|null> {
      if (segment.isInit || segment.mediaURL == null) {
        // image do not need an init segment. Passthrough directly to the parser
        return observableOf({
          type: "data" as "data",
          value: { responseData: null },
        });
      }

      return request({
        url: segment.mediaURL,
        responseType: "arraybuffer",
        sendProgressEvents: true,
      });
    },

    parser(
      { response, segment } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ImageParserObservable {
      const responseData = response.responseData;

      // TODO image Parsing should be more on the sourceBuffer side, no?
      if (responseData === null || features.imageParser == null) {
        return observableOf({
          segmentData: null,
          segmentInfos: segment.timescale > 0 ? {
            duration: segment.isInit ? 0 : segment.duration,
            time: segment.isInit ? -1 : segment.time,
            timescale: segment.timescale,
          } : null,
          segmentOffset: 0,
        });
      }

      const bifObject = features.imageParser(new Uint8Array(responseData));
      const data = bifObject.thumbs;
      return observableOf({
        segmentData: {
          data,
          start: 0,
          end: Number.MAX_VALUE,
          timescale: 1,
          type: "bif",
        },
        segmentInfos: {
          time: 0,
          duration: Number.MAX_VALUE,
          timescale: bifObject.timescale,
        },
        segmentOffset: 0,
      });
    },
  };

  const overlayTrackPipeline = {
    loader() : never {
      throw new Error("Overlay tracks not managed in HSS");
    },

    parser() : never {
      throw new Error("Overlay tracks not yet in HSS");
    },
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
    overlay: overlayTrackPipeline,
  };
}

/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Representation} representation
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation : Representation) : boolean {
  return !!representation.mimeType && representation.mimeType.indexOf("mp4") >= 0;
}
