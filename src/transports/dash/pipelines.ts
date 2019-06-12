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
  combineLatest as observableCombineLatest,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
} from "rxjs/operators";
import features from "../../features";
import Manifest from "../../manifest";
import {
  getMDHDTimescale,
  getSegmentsFromSidx,
} from "../../parsers/containers/isobmff";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import parseMPD, {
  IMPDParserResponse,
} from "../../parsers/manifest/dash";
import request from "../../utils/request";
import {
  IImageParserObservable,
  IManifestLoaderArguments,
  IManifestLoaderObservable,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
  ISegmentParserArguments,
  ISegmentParserObservable,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "../utils/manifest_loader";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import {
  loader as TextTrackLoader,
  parser as TextTrackParser,
} from "./pipelines_text";
import generateSegmentLoader from "./segment_loader";

/**
 * Request external "xlink" ressource from a MPD.
 * @param {string} xlinkURL
 * @returns {Observable}
 */
function requestStringResource(url : string) : Observable<string> {
  return request({ url,
                   responseType: "text" })
  .pipe(
    filter((e) => e.type === "data-loaded"),
    map((e) => e.value.responseData)
  );
}

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @returns {Object}
 */
export default function(
  options : ITransportOptions = {}
) : ITransportPipelines {
  const manifestLoader = generateManifestLoader({
    customManifestLoader: options.manifestLoader,
  });
  const segmentLoader = generateSegmentLoader(options.segmentLoader);
  const { referenceDateTime } = options;

  const manifestPipeline = {
    loader(
      { url } : IManifestLoaderArguments
    ) : IManifestLoaderObservable< Document | string > {
      return manifestLoader(url);
    },

    parser(
      { response, url: loaderURL, scheduleRequest, hasClockSynchronization } :
      IManifestParserArguments< Document | string, string >
    ) : IManifestParserObservable {
      const url = response.url == null ? loaderURL :
                                         response.url;
      const data = typeof response.responseData === "string" ?
                     new DOMParser().parseFromString(response.responseData,
                                                     "text/xml") :
                     response.responseData;

      const parsedManifest = parseMPD(data,
                                      { url,
                                        referenceDateTime,
                                        loadExternalClock: !hasClockSynchronization });
      return loadExternalResources(parsedManifest);

      function loadExternalResources(
        parserResponse : IMPDParserResponse
      ) : IManifestParserObservable {
        if (parserResponse.type === "done") {
          const manifest = new Manifest(parserResponse.value, options);
          return observableOf({ manifest, url });
        }

        const { ressources, continue: continueParsing } = parserResponse.value;

        const externalResources$ = ressources
          .map(resource => scheduleRequest(() => requestStringResource(resource)));

        return observableCombineLatest(externalResources$)
          .pipe(mergeMap(loadedResources =>
            loadExternalResources(continueParsing(loadedResources))
          ));
      }
    },
  };

  const segmentPipeline = {
    loader(
      content : ISegmentLoaderArguments
    ) : ISegmentLoaderObservable<Uint8Array|ArrayBuffer|null> {
      return segmentLoader(content);
    },

    parser({ content, response, init } : ISegmentParserArguments< Uint8Array |
                                                                  ArrayBuffer |
                                                                  null >
    ) : ISegmentParserObservable< Uint8Array | ArrayBuffer | null > {
      const { representation, segment } = content;
      const { data, isChunked } = response;
      if (data == null) { // No data, just return empty infos
        return observableOf({ chunkData: null,
                              chunkInfos: null,
                              chunkOffset: 0 });
      }

      const chunkData = data instanceof Uint8Array ? data :
                                                     new Uint8Array(data);
      const indexRange = segment.indexRange;
      const isWEBM = representation.mimeType === "video/webm" ||
                     representation.mimeType === "audio/webm";

      const nextSegments = isWEBM ?
        getSegmentsFromCues(chunkData, 0) :
        getSegmentsFromSidx(chunkData, indexRange ? indexRange[0] : 0);

      if (!segment.isInit) {
        const chunkInfos = isWEBM ? null : // TODO extract from webm
                                    getISOBMFFTimingInfos(chunkData,
                                                          isChunked,
                                                          segment,
                                                          nextSegments,
                                                          init);
        const chunkOffset = segment.timestampOffset || 0;
        return observableOf({ chunkData, chunkInfos, chunkOffset });
      } else { // it is an initialization segment
        if (nextSegments) {
          representation.index._addSegments(nextSegments);
        }

        const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                                   getMDHDTimescale(chunkData);

        const chunkInfos = timescale != null && timescale > 0 ? { time: -1,
                                                                  duration: 0,
                                                                  timescale } :
                                                                null;
        return observableOf({ chunkData,
                              chunkInfos,
                              chunkOffset: segment.timestampOffset || 0 });
      }
    },
  };

  const textTrackPipeline = { loader: TextTrackLoader,
                              parser: TextTrackParser };

  const imageTrackPipeline = {
    loader(
      { segment } : ISegmentLoaderArguments
    ) : ISegmentLoaderObservable<ArrayBuffer|null> {
      if (segment.isInit || segment.mediaURL == null) {
        return observableOf({ type: "data-created" as const,
                              value: { responseData: null } });
      }
      const { mediaURL } = segment;
      return request({ url: mediaURL,
                       responseType: "arraybuffer",
                       sendProgressEvents: true });
    },

    parser(
      { response, content } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : IImageParserObservable {
      const { segment } = content;
      const { data, isChunked } = response;

      if (isChunked) {
        throw new Error("Image data should not be downloaded in chunks");
      }

      // TODO image Parsing should be more on the sourceBuffer side, no?
      if (data === null || features.imageParser == null) {
        return observableOf({
          chunkData: null,
          chunkInfos: segment.timescale > 0 ? {
            duration: segment.isInit ? 0 : segment.duration,
            time: segment.isInit ? -1 : segment.time,
            timescale: segment.timescale,
          } : null,
          chunkOffset: segment.timestampOffset || 0 });
      }
      const bifObject = features.imageParser(new Uint8Array(data));
      const thumbsData = bifObject.thumbs;
      return observableOf({ chunkData: { data: thumbsData,
                                         start: 0,
                                         end: Number.MAX_VALUE,
                                         timescale: 1,
                                         type: "bif" },
                            chunkInfos: { time: 0,
                                          duration: Number.MAX_VALUE,
                                          timescale: bifObject.timescale },
                            chunkOffset: segment.timestampOffset || 0 });
    },
  };

  return { manifest: manifestPipeline,
           audio: segmentPipeline,
           video: segmentPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
