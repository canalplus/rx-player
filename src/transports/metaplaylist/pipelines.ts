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
  combineLatest,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
} from "rxjs/operators";
import features from "../../features";
import Manifest, {
  Adaptation,
  IMetaPlaylistPrivateInfos,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import parseMetaPlaylist, {
  IParserResponse as IMPLParserResponse,
} from "../../parsers/manifest/metaplaylist";
import { IParsedManifest } from "../../parsers/manifest/types";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import {
  IAudioVideoParserObservable,
  IChunkTimingInfos,
  IImageParserObservable,
  ILoaderDataLoaded,
  ILoaderDataLoadedValue,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentParserParsedSegment,
  ITextParserObservable,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "./manifest_loader";

/**
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getContent(
  segment : ISegment,
  offset : number
) : { manifest : Manifest;
      period : Period;
      adaptation : Adaptation;
      representation : Representation;
      segment : ISegment; }
{
  if (segment.privateInfos?.metaplaylistInfos === undefined) {
    throw new Error("MetaPlaylist: missing private infos");
  }
  const { manifest,
          period,
          adaptation,
          representation } = segment.privateInfos.metaplaylistInfos.baseContent;
  const newTime = segment.time < 0 ? segment.time :
                                     segment.time - (offset * segment.timescale);
  const offsetedSegment = objectAssign({}, segment, { time: newTime });
  return  { manifest,
            period,
            adaptation,
            representation,
            segment: offsetedSegment };
}

/**
 * Prepare any wrapped segment loader's arguments.
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getLoaderArguments(
  segment : ISegment,
  url : string | null,
  offset : number
) : ISegmentLoaderArguments {
  const content = getContent(segment, offset);
  return objectAssign({ url }, content);
}

/**
 * Prepare any wrapped segment parser's arguments.
 * @param {Object} arguments
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getParserArguments<T>(
  { initTimescale, response } : ISegmentParserArguments<T>,
  segment : ISegment,
  offset : number
) : ISegmentParserArguments<T> {
  return { initTimescale,
           response,
           content: getContent(segment, offset) };
}

/**
 * @param {Object} transports
 * @param {string} transportName
 * @param {Object} options
 * @returns {Object}
 */
function getTransportPipelines(
  transports : Partial<Record<string, ITransportPipelines>>,
  transportName : string,
  options : ITransportOptions
) : ITransportPipelines {
  const initialTransport = transports[transportName];
  if (initialTransport !== undefined) {
    return initialTransport;
  }

  const feature = features.transports[transportName];

  if (feature === undefined) {
    throw new Error(`MetaPlaylist: Unknown transport ${transportName}.`);
  }
  const transport = feature(options);
  transports[transportName] = transport;
  return transport;
}

/**
 * @param {Object} segment
 * @returns {Object}
 */
function getMetaPlaylistPrivateInfos(segment : ISegment) : IMetaPlaylistPrivateInfos {
  const { privateInfos } = segment;
  if (privateInfos?.metaplaylistInfos === undefined) {
    throw new Error("MetaPlaylist: Undefined transport for content for metaplaylist.");
  }
  return privateInfos.metaplaylistInfos;
}
export default function(options : ITransportOptions): ITransportPipelines {
  const transports : Partial<Record<string, ITransportPipelines>> = {};

  const manifestLoader = generateManifestLoader({
    customManifestLoader: options.manifestLoader,
  });

  // remove some options that we might not want to apply to the
  // other streaming protocols used here
  const otherTransportOptions = objectAssign({},
                                             options,
                                             { manifestLoader: undefined,
                                               supplementaryTextTracks: [],
                                               supplementaryImageTracks: [] });

  const manifestPipeline = {
    loader: manifestLoader,
    parser(
      { response,
        url: loaderURL,
        scheduleRequest,
        externalClockOffset } : IManifestParserArguments
    ) : IManifestParserObservable {
      const url = response.url === undefined ? loaderURL :
                                               response.url;
      const { responseData } = response;

      const parserOptions = {
        url,
        serverSyncInfos: options.serverSyncInfos,
      };

      return handleParsedResult(parseMetaPlaylist(responseData, parserOptions));

      function handleParsedResult(
        parsedResult : IMPLParserResponse<IParsedManifest>
      ) : IManifestParserObservable {
        if (parsedResult.type === "done") {
          const manifest = new Manifest(parsedResult.value, options);
          return observableOf({ manifest });
        }

        const loaders$ : Array<Observable<Manifest>> =
          parsedResult.value.ressources.map((ressource) => {
            const transport = getTransportPipelines(transports,
                                                    ressource.transportType,
                                                    otherTransportOptions);
            const request$ = scheduleRequest(() =>
                transport.manifest.loader({ url : ressource.url }).pipe(
                  filter((e): e is ILoaderDataLoaded< Document | string > =>
                    e.type === "data-loaded"
                  ),
                  map((e) : ILoaderDataLoadedValue< Document | string > => e.value)
                ));

            return request$.pipe(mergeMap((responseValue) => {
              return transport.manifest.parser({ response: responseValue,
                                                 url: ressource.url,
                                                 scheduleRequest,
                                                 externalClockOffset })
                .pipe(map((parserData) : Manifest => parserData.manifest));
            }));
          });

        return combineLatest(loaders$).pipe(mergeMap((loadedRessources) =>
          handleParsedResult(parsedResult.value.continue(loadedRessources))
        ));
      }
    },
  };

  /**
   * @param {Object} segment
   * @param {Object} transports
   * @returns {Object}
   */
  function getTransportPipelinesFromSegment(
    segment : ISegment
  ): ITransportPipelines {
    const { transportType } = getMetaPlaylistPrivateInfos(segment);
    return getTransportPipelines(transports, transportType, otherTransportOptions);
  }

  /**
   * @param {number} contentOffset
   * @param {number} scaledContentOffset
   * @param {number|undefined} contentEnd
   * @param {Object} segmentResponse
   * @returns {Object}
   */
  function offsetTimeInfos(
    contentOffset : number,
    scaledContentOffset : number,
    contentEnd : number | undefined,
    segmentResponse : ISegmentParserParsedSegment<unknown>
  ) : { chunkInfos : IChunkTimingInfos | null;
        chunkOffset : number;
        appendWindow : [ number | undefined, number | undefined ]; } {
    const offsetedSegmentOffset = segmentResponse.chunkOffset + contentOffset;
    if (isNullOrUndefined(segmentResponse.chunkData)) {
      return { chunkInfos: segmentResponse.chunkInfos,
               chunkOffset: offsetedSegmentOffset,
               appendWindow: [undefined, undefined] };
    }

    // clone chunkInfos
    const { chunkInfos, appendWindow } = segmentResponse;
    const offsetedChunkInfos = chunkInfos === null ? null :
                                                     objectAssign({}, chunkInfos);
    if (offsetedChunkInfos !== null && offsetedChunkInfos.time > -1) {
      offsetedChunkInfos.time += scaledContentOffset;
    }

    const offsetedWindowStart = appendWindow[0] !== undefined ?
      Math.max(appendWindow[0] + contentOffset, contentOffset) :
      contentOffset;

    let offsetedWindowEnd : number|undefined;
    if (appendWindow[1] !== undefined) {
      offsetedWindowEnd = contentEnd !== undefined ?
        Math.min(appendWindow[1] + contentOffset, contentEnd) :
        appendWindow[1] + contentOffset;
    } else if (contentEnd !== undefined) {
      offsetedWindowEnd = contentEnd;
    }
    return { chunkInfos: offsetedChunkInfos,
             chunkOffset: offsetedSegmentOffset,
             appendWindow: [ offsetedWindowStart, offsetedWindowEnd ] };
  }

  const audioPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.loader(getLoaderArguments(segment, url, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : IAudioVideoParserObservable {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  const videoPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.loader(getLoaderArguments(segment, url, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : IAudioVideoParserObservable {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  const textTrackPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { text } = getTransportPipelinesFromSegment(segment);
      return text.loader(getLoaderArguments(segment, url, period.start));
    },

    parser: (
      args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>
    ) : ITextParserObservable => {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { text } = getTransportPipelinesFromSegment(segment);
      return text.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  const imageTrackPipeline = {
    loader({ segment, period, url } : ISegmentLoaderArguments) {
      const { image } = getTransportPipelinesFromSegment(segment);
      return image.loader(getLoaderArguments(segment, url, period.start));
    },

    parser(
      args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : IImageParserObservable {
      const { initTimescale, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (initTimescale ?? segment.timescale);
      const { image } = getTransportPipelinesFromSegment(segment);
      return image.parser(getParserArguments(args, segment, contentStart))
        .pipe(map(res => {
          if (res.type === "parsed-init-segment") {
            return res;
          }
          const timeInfos = offsetTimeInfos(contentStart,
                                            scaledOffset,
                                            contentEnd,
                                            res.value);
         return objectAssign({ type: "parsed-segment",
                               value: objectAssign({}, res.value, timeInfos) });
        }));
    },
  };

  return { manifest: manifestPipeline,
           audio: audioPipeline,
           video: videoPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
