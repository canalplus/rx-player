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

import objectAssign from "object-assign";
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
  IMetaPlaylistPrivateInfos,
  ISegment,
} from "../../manifest";
import parseMetaPlaylist, {
  IParserResponse as IMPLParserResponse,
} from "../../parsers/manifest/metaplaylist";
import { IParsedManifest } from "../../parsers/manifest/types";
import {
  IImageParserObservable,
  IImageParserResponse,
  ILoaderDataLoaded,
  ILoaderDataLoadedValue,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentParserObservable,
  ISegmentParserResponse,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "./manifest_loader";

/**
 * Prepare any wrapped segment loader's arguments.
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getLoaderArguments(
  segment : ISegment,
  offset : number
) : ISegmentLoaderArguments {
  if (segment.privateInfos == null || segment.privateInfos.metaplaylistInfos == null) {
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
 * Prepare any wrapped segment parser's arguments.
 * @param {Object} arguments
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getParserArguments<T>(
  { init, response } : ISegmentParserArguments<T>,
  segment : ISegment,
  offset : number
) : ISegmentParserArguments<T> {
  return { init,
           response,
           content: getLoaderArguments(segment, offset) };
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
  if (initialTransport != null) {
    return initialTransport;
  }

  const feature = features.transports[transportName];

  if (feature == null) {
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
  if (privateInfos == null || privateInfos.metaplaylistInfos == null) {
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
      const url = response.url == null ? loaderURL :
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
            if (transport == null) {
              throw new Error("MPL: Unrecognized transport.");
            }
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
   * @param {Object} parserResponse
   */
  function formatParserResponse<T>(
    contentOffset : number,
    scaledContentOffset : number,
    contentEnd : number | undefined,
    { chunkData,
      chunkInfos,
      chunkOffset,
      segmentProtections,
      appendWindow } : ISegmentParserResponse<T>
  ) : ISegmentParserResponse<T> {
    const offsetedSegmentOffset = chunkOffset + contentOffset;
    if (chunkData == null) {
      return { chunkData: null,
               chunkInfos,
               chunkOffset: offsetedSegmentOffset,
               segmentProtections,
               appendWindow: [undefined, undefined] };
    }
    if (chunkInfos !== null && chunkInfos.time > -1) {
      chunkInfos.time += scaledContentOffset;
    }

    const offsetedWindowStart = appendWindow[0] != null ?
      Math.max(appendWindow[0] + contentOffset, contentOffset) :
      contentOffset;

    let offsetedWindowEnd : number|undefined;
    if (appendWindow[1] != null) {
      offsetedWindowEnd = contentEnd != null ? Math.min(appendWindow[1] + contentOffset,
                                                        contentEnd) :
                                        appendWindow[1] + contentOffset;
    } else if (contentEnd != null) {
      offsetedWindowEnd = contentEnd;
    }
    return { chunkData,
             chunkInfos,
             chunkOffset: offsetedSegmentOffset,
             segmentProtections,
             appendWindow: [offsetedWindowStart, offsetedWindowEnd] };
  }

  const audioPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.loader(getLoaderArguments(segment, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ISegmentParserObservable< Uint8Array | ArrayBuffer > {
      const { init, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (init != null ? init.timescale :
                                                          segment.timescale);
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.parser(getParserArguments(args, segment, contentStart))
        .pipe(
          map((evt) => {
            if (evt.type === "retry") {
              return evt;
            }
            const formattedResponse = formatParserResponse(contentStart,
                                                           scaledOffset,
                                                           contentEnd,
                                                           evt.value);
            return { type: "parser-response" as const,
                     value: formattedResponse };
          })
        );
    },
  };

  const videoPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.loader(getLoaderArguments(segment, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ISegmentParserObservable< Uint8Array | ArrayBuffer > {
      const { init, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (init != null ? init.timescale :
                                                          segment.timescale);
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.parser(getParserArguments(args, segment, contentStart))
      .pipe(
        map((evt) => {
          if (evt.type === "retry") {
            return evt;
          }
          const formattedResponse = formatParserResponse(contentStart,
                                                         scaledOffset,
                                                         contentEnd,
                                                         evt.value);
          return { type: "parser-response" as const,
                   value: formattedResponse };
        })
      );
    },
  };

  const textTrackPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { text } = getTransportPipelinesFromSegment(segment);
      return text.loader(getLoaderArguments(segment, period.start));
    },

    parser: (args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>) => {
      const { init, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (init != null ? init.timescale :
                                                          segment.timescale);

      const { text } = getTransportPipelinesFromSegment(segment);
      return text.parser(getParserArguments(args, segment, contentStart))
      .pipe(
        map((evt) => {
          if (evt.type === "retry") {
            return evt;
          }
          const formattedResponse = formatParserResponse(contentStart,
                                                         scaledOffset,
                                                         contentEnd,
                                                         evt.value);
          return { type: "parser-response" as const,
                   value: formattedResponse };
        })
      );
    },
  };

  const imageTrackPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { image } = getTransportPipelinesFromSegment(segment);
      return image.loader(getLoaderArguments(segment, period.start));
    },

    parser(
      args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : IImageParserObservable {
      const { init, content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const scaledOffset = contentStart * (init != null ? init.timescale :
                                                          segment.timescale);

      const { image } = getTransportPipelinesFromSegment(segment);
      return image.parser(getParserArguments(args, segment, contentStart))
        .pipe(
          filter((res): res is IImageParserResponse => res.type === "parser-response"),
          map((res: IImageParserResponse) => {
            const formattedResponse = formatParserResponse(contentStart,
                                                           scaledOffset,
                                                           contentEnd,
                                                           res.value);
            return { type: "parser-response" as const,
                     value: formattedResponse };
          }));
    },
  };

  return { manifest: manifestPipeline,
           audio: audioPipeline,
           video: videoPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
