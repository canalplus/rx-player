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
import {
  map,
  tap,
} from "rxjs/operators";
import features from "../../features";
import log from "../../log";
import Manifest, {
  Adaptation,
  Representation,
} from "../../manifest";
import {
  getMDAT,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import createSmoothManifestParser from "../../parsers/manifest/smooth";
import {
  bytesToStr,
  strToBytes,
} from "../../utils/byte_parsing";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import request from "../../utils/request";
import stringFromUTF8 from "../../utils/string_from_utf8";
import warnOnce from "../../utils/warn_once";
import {
  IAudioVideoParserObservable,
  IChunkTimingInfos,
  IImageParserObservable,
  IManifestLoaderArguments,
  IManifestParserArguments,
  IManifestParserObservable,
  INextSegmentsInfos,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
  ISegmentParserArguments,
  ITextParserObservable,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import returnParsedManifest from "../utils/return_parsed_manifest";
import generateManifestLoader from "../utils/text_manifest_loader";
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
  dlSegment? : IChunkTimingInfos
) : void {
  log.debug("Smooth Parser: update segments information.");
  const representations = adaptation.representations;
  for (let i = 0; i < representations.length; i++) {
    const representation = representations[i];
    representation.index._addSegments(nextSegments, dlSegment);
  }
}

export default function(options : ITransportOptions) : ITransportPipelines {
  const smoothManifestParser = createSmoothManifestParser(options);
  const segmentLoader = generateSegmentLoader(options.segmentLoader);

  const manifestLoaderOptions = { customManifestLoader: options.manifestLoader };
  const manifestLoader = generateManifestLoader(manifestLoaderOptions);

  const manifestPipeline = {
    resolver(
      { url } : IManifestLoaderArguments
    ) : Observable<IManifestLoaderArguments> {
      if (url === undefined) {
        return observableOf({ url : undefined });
      }

      // TODO Remove WSX logic
      let resolving;
      if (WSX_REG.test(url)) {
        warnOnce("Giving WSX URL to loadVideo is deprecated." +
          " You should only give Manifest URLs.");
        resolving = request({ url: replaceToken(url, ""),
                              responseType: "document" })
          .pipe(map(({ value }) : string => {
            const extractedURL = extractISML(value.responseData);
            if (extractedURL === null || extractedURL.length === 0) {
              throw new Error("Invalid ISML");
            }
            return extractedURL;
          }));
      } else {
        resolving = observableOf(url);
      }

      const token = extractToken(url);
      return resolving.pipe(map((_url) => ({
        url: replaceToken(resolveManifest(_url), token),
      })));
    },

    loader: manifestLoader,

    parser(
      { response, url: reqURL } : IManifestParserArguments
    ) : IManifestParserObservable {
      const url = response.url === undefined ? reqURL :
                                               response.url;
      const data = typeof response.responseData === "string" ?
        new DOMParser().parseFromString(response.responseData, "text/xml") :
        response.responseData as Document; // TODO find a way to check if Document?
      const { receivedTime: manifestReceivedTime } = response;
      const parserResult = smoothManifestParser(data, url, manifestReceivedTime);
      const manifest = new Manifest(parserResult, {
        representationFilter: options.representationFilter,
        supplementaryImageTracks: options.supplementaryImageTracks,
        supplementaryTextTracks: options.supplementaryTextTracks,
      });
      return returnParsedManifest(manifest, url);
    },
  };

  const segmentPipeline = {
    loader(
      content : ISegmentLoaderArguments
    ) : ISegmentLoaderObservable<ArrayBuffer|Uint8Array|null> {
      if (content.segment.isInit || options.checkMediaSegmentIntegrity !== true) {
        return segmentLoader(content);
      }
      return segmentLoader(content).pipe(tap(res => {
        if ((res.type === "data-loaded" || res.type === "data-chunk") &&
            res.value.responseData !== null)
        {
          checkISOBMFFIntegrity(new Uint8Array(res.value.responseData),
                                content.segment.isInit);
        }
      }));
    },

    parser({
      content,
      response,
    } : ISegmentParserArguments< ArrayBuffer | Uint8Array | null >
    ) : IAudioVideoParserObservable {
      const { segment, representation, adaptation, manifest } = content;
      const { data, isChunked } = response;
      if (data === null) {
        if (segment.isInit) {
          const segmentProtections = representation.getProtectionsInitializationData();
          return observableOf({ type: "parsed-init-segment",
                                value: { initializationData: null,
                                         segmentProtections,
                                         initTimescale: undefined } });
        }
        return observableOf({ type: "parsed-segment",
                              value: { chunkData: null,
                                       chunkInfos: null,
                                       chunkOffset: 0,
                                       appendWindow: [undefined, undefined] } });
      }

      const responseBuffer = data instanceof Uint8Array ? data :
                                                          new Uint8Array(data);

      if (segment.isInit) {
        const psshInfo = takePSSHOut(responseBuffer);
        if (psshInfo.length > 0) {
          for (let i = 0; i < psshInfo.length; i++) {
            const { systemID, data: psshData } = psshInfo[i];
            representation._addProtectionData("cenc", systemID, psshData);
          }
        }
        const segmentProtections = representation.getProtectionsInitializationData();
        return observableOf({ type: "parsed-init-segment",
                              value: { initializationData: data,
                                       segmentProtections,

                                       // smooth init segments are crafted by hand.
                                       // Their timescale is the one from the manifest.
                                       initTimescale: segment.timescale } });
      }

      const { nextSegments, chunkInfos } = extractTimingsInfos(responseBuffer,
                                                               isChunked,
                                                               segment,
                                                               manifest.isLive);
      if (chunkInfos === null) {
        throw new Error("Smooth Segment without time information");
      }
      const chunkData = patchSegment(responseBuffer, chunkInfos.time);
      if (nextSegments.length > 0) {
        addNextSegments(adaptation, nextSegments, chunkInfos);
      }
      return observableOf({ type: "parsed-segment",
                            value: { chunkData,
                                     chunkInfos,
                                     chunkOffset: 0,
                                     appendWindow: [undefined, undefined] } });
    },
  };

  const textTrackPipeline = {
    loader(
      { segment,
        representation,
        url } : ISegmentLoaderArguments
    ) : ISegmentLoaderObservable<string|ArrayBuffer|null> {
      if (segment.isInit || url === null) {
        return observableOf({ type: "data-created" as const,
                              value: { responseData: null } });
      }
      const isMP4 = isMP4EmbeddedTrack(representation);
      if (!isMP4 || options.checkMediaSegmentIntegrity !== true) {
        return request({ url,
                         responseType: isMP4 ? "arraybuffer" : "text",
                         sendProgressEvents: true });
      }
      return request({ url,
                       responseType: "arraybuffer",
                       sendProgressEvents: true })
        .pipe(tap(res => {
          if (res.type === "data-loaded") {
            checkISOBMFFIntegrity(new Uint8Array(res.value.responseData),
                                  segment.isInit);
          }
        }));
    },

    parser({
      content,
      response,
    } : ISegmentParserArguments<string|ArrayBuffer|Uint8Array|null>
    ) : ITextParserObservable {
      const { manifest, adaptation, representation, segment } = content;
      const { language } = adaptation;
      const { mimeType = "", codec = "" } = representation;
      const { data, isChunked } = response;
      if (segment.isInit) { // text init segment has no use in HSS
        return observableOf({ type: "parsed-init-segment",
                              value: { initializationData: null,
                                       segmentProtections: [],
                                       initTimescale: undefined } });
      }
      if (data === null) {
        return observableOf({ type: "parsed-segment",
                              value: { chunkData: null,
                                       chunkInfos: null,
                                       chunkOffset: 0,
                                       appendWindow: [undefined, undefined] } });
      }

      let nextSegments;
      let chunkInfos : IChunkTimingInfos|null = null;
      const isMP4 = mimeType.indexOf("mp4") >= 0;

      let _sdStart : number|undefined;
      let _sdEnd : number|undefined;
      let _sdTimescale : number = 1;
      let _sdData : string;
      let _sdType : string|undefined;

      if (isMP4) {
        let chunkBytes : Uint8Array;
        if (typeof data === "string") {
          chunkBytes = strToBytes(data);
        } else {
          chunkBytes = data instanceof Uint8Array ? data :
            new Uint8Array(data);
        }
        const timings = extractTimingsInfos(chunkBytes,
                                            isChunked,
                                            segment,
                                            manifest.isLive);

        nextSegments = timings.nextSegments;
        chunkInfos = timings.chunkInfos;
        if (chunkInfos === null) {
          if (isChunked) {
            log.warn("Smooth: Unavailable time data for current text track.");
          } else {
            _sdStart = segment.time;
            _sdEnd = _sdStart + segment.duration;
            _sdTimescale = segment.timescale;
          }
        } else {
          _sdStart = chunkInfos.time;
          _sdEnd = !isNullOrUndefined(chunkInfos.duration) ?
            chunkInfos.time + chunkInfos.duration :
            undefined;
          _sdTimescale = chunkInfos.timescale;
        }

        const lcCodec = codec.toLowerCase();
        if (mimeType === "application/ttml+xml+mp4" ||
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
        const mdat = getMDAT(chunkBytes);
        _sdData = stringFromUTF8(mdat);
      } else {
        let chunkString : string;
        if (typeof data !== "string") {
          const bytesData = data instanceof Uint8Array ? data :
                                                         new Uint8Array(data);
          chunkString = bytesToStr(bytesData);
        } else {
          chunkString = data;
        }

        const segmentTime = segment.time;

        // vod is simple WebVTT or TTML text
        _sdStart = segmentTime;
        _sdEnd = segmentTime + segment.duration;
        _sdTimescale = segment.timescale;

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

        if (_sdType === undefined) {
          const lcCodec = codec.toLowerCase();
          if (lcCodec === "srt") {
            _sdType = "srt";
          } else {
            throw new Error(
              `could not find a text-track parser for the type ${mimeType}`);
          }
        }
        _sdData = chunkString;
      }

      if (chunkInfos !== null &&
          Array.isArray(nextSegments) && nextSegments.length > 0)
      {
        addNextSegments(adaptation, nextSegments, chunkInfos);
      }

      const chunkOffset = _sdStart === undefined ? 0 :
                                                   _sdStart / _sdTimescale;
      return observableOf({ type: "parsed-segment",
                            value: { chunkData: { type: _sdType,
                                                  data: _sdData,
                                                  language,
                                                  timescale: _sdTimescale,
                                                  start: _sdStart,
                                                  end: _sdEnd },
                                     chunkInfos,
                                     chunkOffset,
                                     appendWindow: [undefined, undefined] } });
    },
  };

  const imageTrackPipeline = {
    loader(
      { segment,
        url } : ISegmentLoaderArguments
    ) : ISegmentLoaderObservable<ArrayBuffer|null> {
      if (segment.isInit || url === null) {
        // image do not need an init segment. Passthrough directly to the parser
        return observableOf({ type: "data-created" as const,
                              value: { responseData: null } });
      }

      return request({ url,
                       responseType: "arraybuffer",
                       sendProgressEvents: true });
    },

    parser(
      { response, content } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : IImageParserObservable {
      const { data, isChunked } = response;

      if (content.segment.isInit) { // image init segment has no use
        return observableOf({ type: "parsed-init-segment",
                              value: { initializationData: null,
                                       segmentProtections: [],
                                       initTimescale: undefined } });
      }

      if (isChunked) {
        throw new Error("Image data should not be downloaded in chunks");
      }

      // TODO image Parsing should be more on the sourceBuffer side, no?
      if (data === null || features.imageParser === null) {
        return observableOf({ type: "parsed-segment",
                              value: { chunkData: null,
                                       chunkInfos: null,
                                       chunkOffset: 0,
                                       appendWindow: [undefined, undefined] } });
      }

      const bifObject = features.imageParser(new Uint8Array(data));
      const thumbsData = bifObject.thumbs;
      return observableOf({ type: "parsed-segment",
                            value: { chunkData: { data: thumbsData,
                                                  start: 0,
                                                  end: Number.MAX_VALUE,
                                                  timescale: 1,
                                                  type: "bif" },
                                     chunkInfos: { time: 0,
                                                   duration: Number.MAX_VALUE,
                                                   timescale: bifObject.timescale },
                                     chunkOffset: 0,
                                     segmentProtections: [],
                                     appendWindow: [undefined, undefined] } });
    },
  };

  return { manifest: manifestPipeline,
           audio: segmentPipeline,
           video: segmentPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}

/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Representation} representation
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation : Representation) : boolean {
  return typeof representation.mimeType === "string" &&
         representation.mimeType.indexOf("mp4") >= 0;
}
