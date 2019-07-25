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
  ISegment,
} from "../../manifest";
import parseMetaPlaylist, {
  IParserResponse as IMPLParserResponse,
} from "../../parsers/manifest/metaplaylist";
import { IParsedManifest } from "../../parsers/manifest/types";
import request from "../../utils/request";
import {
  IImageParserObservable,
  ILoaderDataLoaded,
  ILoaderDataLoadedValue,
  IManifestLoaderArguments,
  IManifestLoaderObservable,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentParserObservable,
  ISegmentTimingInfos,
  ITransportOptions,
  ITransportPipelines,
} from "../types";

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
  return objectAssign(getLoaderArguments(segment, offset), { init, response });
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
 * @param {Object} transports
 * @returns {Object}
 */
function getTransportPipelinesFromSegment(
  segment : ISegment,
  transports : Partial<Record<string, ITransportPipelines>>,
  options : ITransportOptions
): ITransportPipelines {
  const { privateInfos } = segment;
  if (privateInfos == null || privateInfos.metaplaylistInfos == null) {
    throw new Error("MetaPlaylist: Undefined transport for content for metaplaylist.");
  }

  const { transportType } = privateInfos.metaplaylistInfos;
  return getTransportPipelines(transports, transportType, options);
}

export default function(options: ITransportOptions = {}): ITransportPipelines {
  const transports : Partial<Record<string, ITransportPipelines>> = {};

  const manifestPipeline = {
    loader({ url } : IManifestLoaderArguments) : IManifestLoaderObservable<string> {
      return request({ url, responseType: "text" });
    },

    parser(
      {
        response,
        url: loaderURL,
        scheduleRequest,
        externalClockOffset,
      } : IManifestParserArguments< string | Document,
                                    ILoaderDataLoadedValue< string | Document > >
    ) : IManifestParserObservable {
      const { responseData } = response;
      if (typeof responseData !== "string") {
        throw new Error("MPL: Parser input must be string.");
      }

      return handleParsedResult(parseMetaPlaylist(responseData, loaderURL));

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
                                                    options);
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

  function addOffsetToResponse<T>(
    offset : number,
    scaledOffset : number,
    { segmentData,
      segmentInfos,
      segmentOffset } : { segmentData : T|null;
                          segmentInfos : ISegmentTimingInfos|null;
                          segmentOffset : number; }
  ) : { segmentData : T|null;
        segmentInfos : ISegmentTimingInfos|null;
        segmentOffset : number; }
  {
    if (segmentData == null) {
      return { segmentData: null, segmentInfos: null, segmentOffset: 0 };
    }
    if (segmentInfos && segmentInfos.time > -1) {
      segmentInfos.time += scaledOffset;
    }
    return { segmentData,
             segmentInfos,
             segmentOffset: segmentOffset + offset };
  }

  const audioPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { audio } = getTransportPipelinesFromSegment(segment, transports, options);
      return audio.loader(getLoaderArguments(segment, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ISegmentParserObservable< Uint8Array | ArrayBuffer | null > {
      const { period, init, segment } = args;
      const offset = period.start;
      const scaledOffset = offset * (init ? init.timescale : segment.timescale);
      const { audio } = getTransportPipelinesFromSegment(segment, transports, options);
      return audio.parser(getParserArguments(args, segment, offset))
        .pipe(map(res => addOffsetToResponse(offset, scaledOffset, res)));
    },
  };

  const videoPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { video } = getTransportPipelinesFromSegment(segment, transports, options);
      return video.loader(getLoaderArguments(segment, period.start));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ISegmentParserObservable< Uint8Array | ArrayBuffer | null > {
      const { period, init, segment } = args;
      const offset = period.start;
      const scaledOffset = offset * (init ? init.timescale : segment.timescale);
      const { video } = getTransportPipelinesFromSegment(segment, transports, options);
      return video.parser(getParserArguments(args, segment, offset))
        .pipe(map(res => addOffsetToResponse(offset, scaledOffset, res)));
    },
  };

  const textTrackPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { text } = getTransportPipelinesFromSegment(segment, transports, options);
      return text.loader(getLoaderArguments(segment, period.start));
    },

    parser: (args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>) => {
      const { period, init, segment } = args;
      const offset = period.start;
      const scaledOffset = offset * (init ? init.timescale : segment.timescale);
      const { text } = getTransportPipelinesFromSegment(segment, transports, options);
      return text.parser(getParserArguments(args, segment, offset))
        .pipe(map(res => addOffsetToResponse(offset, scaledOffset, res)));
    },
  };

  const imageTrackPipeline = {
    loader({ segment, period } : ISegmentLoaderArguments) {
      const { image } = getTransportPipelinesFromSegment(segment, transports, options);
      return image.loader(getLoaderArguments(segment, period.start));
    },

    parser(
      args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : IImageParserObservable {
      const { period, init, segment } = args;
      const offset = period.start;
      const scaledOffset = offset * (init ? init.timescale : segment.timescale);
      const { image } = getTransportPipelinesFromSegment(segment, transports, options);
      return image.parser(getParserArguments(args, segment, offset))
        .pipe(map(res => addOffsetToResponse(offset, scaledOffset, res)));
    },
  };

  return { manifest: manifestPipeline,
           audio: audioPipeline,
           video: videoPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
