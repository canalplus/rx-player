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

import features from "../../features";
import log from "../../log";
import Manifest, {
  Adaptation,
  ISegment,
} from "../../manifest";
import { getMDAT } from "../../parsers/containers/isobmff";
import createSmoothManifestParser, {
  SmoothRepresentationIndex,
} from "../../parsers/manifest/smooth";
import request from "../../utils/request";
import {
  strToUtf8,
  utf8ToStr,
} from "../../utils/string_parsing";
import { CancellationSignal } from "../../utils/task_canceller";
import {
  IChunkTimeInfo,
  IImageTrackSegmentData,
  ILoadedAudioVideoSegmentFormat,
  ILoadedImageSegmentFormat,
  ILoadedTextSegmentFormat,
  IManifestParserOptions,
  IManifestParserResult,
  IRequestedData,
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
  ITextTrackSegmentData,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import generateManifestLoader from "../utils/generate_manifest_loader";
import extractTimingsInfos, {
  INextSegmentsInfos,
} from "./extract_timings_infos";
import isMP4EmbeddedTrack from "./is_mp4_embedded_track";
import { patchSegment } from "./isobmff";
import generateSegmentLoader from "./segment_loader";

/**
 * @param {Object} adaptation
 * @param {Object} dlSegment
 * @param {Object} nextSegments
 */
function addNextSegments(
  adaptation : Adaptation,
  nextSegments : INextSegmentsInfos[],
  dlSegment : ISegment
) : void {
  log.debug("Smooth Parser: update segments information.");
  const representations = adaptation.representations;
  for (let i = 0; i < representations.length; i++) {
    const representation = representations[i];
    if (representation.index instanceof SmoothRepresentationIndex &&
        dlSegment?.privateInfos?.smoothMediaSegment !== undefined)
    {
      representation.index.addNewSegments(nextSegments,
                                          dlSegment.privateInfos.smoothMediaSegment);
    } else {
      log.warn("Smooth Parser: should only encounter SmoothRepresentationIndex");
    }
  }
}

export default function(options : ITransportOptions) : ITransportPipelines {
  const smoothManifestParser = createSmoothManifestParser(options);
  const segmentLoader = generateSegmentLoader(options);

  const manifestLoaderOptions = { customManifestLoader: options.manifestLoader };
  const manifestLoader = generateManifestLoader(manifestLoaderOptions,
                                                "text");

  const manifestPipeline = {
    loadManifest: manifestLoader,

    parseManifest(
      manifestData : IRequestedData<unknown>,
      parserOptions : IManifestParserOptions
    ) : IManifestParserResult {
      const url = manifestData.url ?? parserOptions.originalUrl;
      const { receivedTime: manifestReceivedTime, responseData } = manifestData;

      const documentData = typeof responseData === "string" ?
        new DOMParser().parseFromString(responseData, "text/xml") :
        responseData as Document; // TODO find a way to check if Document?

      const parserResult = smoothManifestParser(documentData,
                                                url,
                                                manifestReceivedTime);

      const manifest = new Manifest(parserResult, {
        representationFilter: options.representationFilter,
        supplementaryImageTracks: options.supplementaryImageTracks,
      });
      return { manifest, url };
    },
  };

  /**
   * Export functions allowing to load and parse audio and video smooth
   * segments.
   */
  const audioVideoPipeline = {
    /**
     * Load a Smooth audio/video segment.
     * @param {string|null} url
     * @param {Object} content
     * @param {Object} cancelSignal
     * @param {Object} callbacks
     * @returns {Promise}
     */
    loadSegment(
      url : string | null,
      content : ISegmentContext,
      cancelSignal : CancellationSignal,
      callbacks : ISegmentLoaderCallbacks<ILoadedAudioVideoSegmentFormat>
    ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat> |
                ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat>>
    {
      return segmentLoader(url, content, cancelSignal, callbacks);
    },

    parseSegment(
      loadedSegment : { data : ArrayBuffer | Uint8Array | null;
                        isChunked : boolean; },
      content : ISegmentContext,
      initTimescale : number | undefined
    ) : ISegmentParserParsedInitChunk< ArrayBuffer | Uint8Array | null> |
        ISegmentParserParsedMediaChunk< ArrayBuffer | Uint8Array | null >
    {
      const { segment, adaptation, manifest } = content;
      const { data, isChunked } = loadedSegment;
      if (data === null) {
        if (segment.isInit) {
          return { segmentType: "init",
                   initializationData: null,
                   initializationDataSize: 0,
                   protectionDataUpdate: false,
                   initTimescale: undefined };
        }
        return { segmentType: "media",
                 chunkData: null,
                 chunkInfos: null,
                 chunkOffset: 0,
                 chunkSize: 0,
                 protectionDataUpdate: false,
                 appendWindow: [undefined, undefined] };
      }

      const responseBuffer = data instanceof Uint8Array ? data :
                                                          new Uint8Array(data);

      if (segment.isInit) {
        const timescale = segment.privateInfos?.smoothInitSegment?.timescale;
        return { segmentType: "init",
                 initializationData: data,
                 initializationDataSize: data.byteLength,
                 // smooth init segments are crafted by hand.
                 // Their timescale is the one from the manifest.
                 initTimescale: timescale,
                 protectionDataUpdate: false };
      }

      const timingInfos = initTimescale !== undefined ?
        extractTimingsInfos(responseBuffer,
                            isChunked,
                            initTimescale,
                            segment,
                            manifest.isLive) :
        null;
      if (timingInfos === null ||
          timingInfos.chunkInfos === null ||
          timingInfos.scaledSegmentTime === undefined)
      {
        throw new Error("Smooth Segment without time information");
      }
      const { nextSegments, chunkInfos, scaledSegmentTime } = timingInfos;
      const chunkData = patchSegment(responseBuffer, scaledSegmentTime);
      if (nextSegments.length > 0) {
        addNextSegments(adaptation, nextSegments, segment);
      }
      return { segmentType: "media",
               chunkData,
               chunkInfos,
               chunkOffset: 0,
               chunkSize: chunkData.length,
               protectionDataUpdate: false,
               appendWindow: [undefined, undefined] };
    },
  };

  const textTrackPipeline = {
    loadSegment(
      url : string | null,
      content : ISegmentContext,
      cancelSignal : CancellationSignal,
      callbacks : ISegmentLoaderCallbacks<ILoadedTextSegmentFormat>
    ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedTextSegmentFormat> |
                ISegmentLoaderResultSegmentCreated<ILoadedTextSegmentFormat>> {
      const { segment, representation } = content;
      if (segment.isInit || url === null) {
        return Promise.resolve({ resultType: "segment-created",
                                 resultData: null });
      }

      const isMP4 = isMP4EmbeddedTrack(representation);
      if (!isMP4) {
        return request({ url,
                         responseType: "text",
                         cancelSignal,
                         onProgress: callbacks.onProgress })
          .then((data) => ({ resultType: "segment-loaded" as const,
                             resultData: data }));
      } else {
        return request({ url,
                         responseType: "arraybuffer",
                         cancelSignal,
                         onProgress: callbacks.onProgress })
          .then((data) => {
            if (options.checkMediaSegmentIntegrity !== true) {
              return { resultType: "segment-loaded" as const,
                       resultData: data };
            }
            const dataU8 = new Uint8Array(data.responseData);
            checkISOBMFFIntegrity(dataU8, content.segment.isInit);
            return { resultType: "segment-loaded" as const,
                     resultData: { ...data, responseData: dataU8 } };
          });
      }
    },

    parseSegment(
      loadedSegment : { data : ArrayBuffer | Uint8Array | string | null;
                        isChunked : boolean; },
      content : ISegmentContext,
      initTimescale : number | undefined
    ) : ISegmentParserParsedInitChunk< null > |
        ISegmentParserParsedMediaChunk< ITextTrackSegmentData | null >
    {
      const { manifest, adaptation, representation, segment } = content;
      const { language } = adaptation;
      const isMP4 = isMP4EmbeddedTrack(representation);
      const { mimeType = "", codec = "" } = representation;
      const { data, isChunked } = loadedSegment;
      let chunkSize : number | undefined;
      if (segment.isInit) { // text init segment has no use in HSS
        return { segmentType: "init",
                 initializationData: null,
                 initializationDataSize: 0,
                 protectionDataUpdate: false,
                 initTimescale: undefined };
      }
      if (data === null) {
        return { segmentType: "media",
                 chunkData: null,
                 chunkInfos: null,
                 chunkOffset: 0,
                 chunkSize: 0,
                 protectionDataUpdate: false,
                 appendWindow: [undefined, undefined] };
      }

      let nextSegments;
      let chunkInfos : IChunkTimeInfo|null = null;

      let segmentStart : number | undefined;
      let segmentEnd : number | undefined;
      let _sdData : string;
      let _sdType : string|undefined;

      if (isMP4) {
        let chunkBytes : Uint8Array;
        if (typeof data === "string") {
          chunkBytes = strToUtf8(data);
        } else {
          chunkBytes = data instanceof Uint8Array ? data :
            new Uint8Array(data);
        }
        chunkSize = chunkBytes.length;
        const timingInfos = initTimescale !== undefined ?
          extractTimingsInfos(chunkBytes,
                              isChunked,
                              initTimescale,
                              segment,
                              manifest.isLive) :
          null;

        nextSegments = timingInfos?.nextSegments;
        chunkInfos = timingInfos?.chunkInfos ?? null;
        if (chunkInfos === null) {
          if (isChunked) {
            log.warn("Smooth: Unavailable time data for current text track.");
          } else {
            segmentStart = segment.time;
            segmentEnd = segment.end;
          }
        } else {
          segmentStart = chunkInfos.time;
          segmentEnd = chunkInfos.duration !== undefined ?
            chunkInfos.time + chunkInfos.duration :
            segment.end;
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
        _sdData = mdat === null ? "" :
                                  utf8ToStr(mdat);
      } else { // not MP4
        segmentStart = segment.time;
        segmentEnd = segment.end;

        let chunkString : string;
        if (typeof data !== "string") {
          const bytesData = data instanceof Uint8Array ? data :
                                                         new Uint8Array(data);
          chunkSize = bytesData.length;
          chunkString = utf8ToStr(bytesData);
        } else {
          chunkString = data;
        }

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
        addNextSegments(adaptation, nextSegments, segment);
      }

      const chunkOffset = segmentStart ?? 0;
      return { segmentType: "media",
               chunkData: { type: _sdType,
                            data: _sdData,
                            start: segmentStart,
                            end: segmentEnd,
                            language },
               chunkSize,
               chunkInfos,
               chunkOffset,
               protectionDataUpdate: false,
               appendWindow: [undefined, undefined] };
    },
  };

  const imageTrackPipeline = {
    async loadSegment(
      url : string | null,
      content : ISegmentContext,
      cancelSignal : CancellationSignal,
      callbacks : ISegmentLoaderCallbacks<ILoadedImageSegmentFormat>
    ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedImageSegmentFormat> |
                ISegmentLoaderResultSegmentCreated<ILoadedImageSegmentFormat>> {
      if (content.segment.isInit || url === null) {
        // image do not need an init segment. Passthrough directly to the parser
        return { resultType: "segment-created" as const,
                 resultData: null };
      }

      const data = await request({ url,
                                   responseType: "arraybuffer",
                                   onProgress: callbacks.onProgress,
                                   cancelSignal });
      return { resultType: "segment-loaded" as const,
               resultData: data };
    },

    parseSegment(
      loadedSegment : { data : ArrayBuffer | Uint8Array | null;
                        isChunked : boolean; },
      content : ISegmentContext,
      _initTimescale : number | undefined
    ) : ISegmentParserParsedInitChunk< null > |
        ISegmentParserParsedMediaChunk< IImageTrackSegmentData | null >
    {
      const { data, isChunked } = loadedSegment;

      if (content.segment.isInit) { // image init segment has no use
        return { segmentType: "init",
                 initializationData: null,
                 initializationDataSize: 0,
                 protectionDataUpdate: false,
                 initTimescale: undefined };
      }

      if (isChunked) {
        throw new Error("Image data should not be downloaded in chunks");
      }

      // TODO image Parsing should be more on the buffer side, no?
      if (data === null || features.imageParser === null) {
        return { segmentType: "media",
                 chunkData: null,
                 chunkInfos: null,
                 chunkOffset: 0,
                 chunkSize: 0,
                 protectionDataUpdate: false,
                 appendWindow: [undefined, undefined] };
      }

      const bifObject = features.imageParser(new Uint8Array(data));
      const thumbsData = bifObject.thumbs;
      return { segmentType: "media",
               chunkData: { data: thumbsData,
                            start: 0,
                            end: Number.MAX_VALUE,
                            timescale: 1,
                            type: "bif" },
               chunkInfos: { time: 0,
                             duration: Number.MAX_VALUE },
               chunkSize: undefined,
               chunkOffset: 0,
               protectionDataUpdate: false,
               appendWindow: [undefined, undefined] };
    },
  };

  return { manifest: manifestPipeline,
           audio: audioVideoPipeline,
           video: audioVideoPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
