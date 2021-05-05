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
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
  share,
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
import deferSubscriptions from "../../utils/defer_subscriptions";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import {
  IChunkTimeInfo,
  IImageTrackSegmentData,
  ILoaderDataLoadedValue,
  IManifestParserArguments,
  IManifestParserResponseEvent,
  IManifestParserWarningEvent,
  ISegmentLoaderArguments,
  ISegmentParserArguments,
  ISegmentParserParsedInitSegment,
  ISegmentParserParsedSegment,
  ITextTrackSegmentData,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "./manifest_loader";

/**
 * Get base - real - content from an offseted metaplaylist content.
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getOriginalContent(segment : ISegment) : { manifest : Manifest;
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
  const { originalSegment } = segment.privateInfos.metaplaylistInfos;
  return  { manifest,
            period,
            adaptation,
            representation,
            segment: originalSegment };
}

/**
 * Prepare any wrapped segment loader's arguments.
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getLoaderArguments(
  segment : ISegment,
  url : string | null
) : ISegmentLoaderArguments {
  const content = getOriginalContent(segment);
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
  segment : ISegment
) : ISegmentParserArguments<T> {
  return { initTimescale,
           response,
           content: getOriginalContent(segment) };
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
        previousManifest,
        scheduleRequest,
        unsafeMode,
        externalClockOffset } : IManifestParserArguments
    ) : Observable<IManifestParserWarningEvent | IManifestParserResponseEvent> {
      const url = response.url === undefined ? loaderURL :
                                               response.url;
      const { responseData } = response;

      const parserOptions = { url,
                              serverSyncInfos: options.serverSyncInfos };

      return handleParsedResult(parseMetaPlaylist(responseData, parserOptions));

      function handleParsedResult(
        parsedResult : IMPLParserResponse<IParsedManifest>
      ) : Observable<IManifestParserWarningEvent | IManifestParserResponseEvent> {
        if (parsedResult.type === "done") {
          const manifest = new Manifest(parsedResult.value, options);
          return observableOf({ type: "parsed",
                                value: { manifest } });
        }

        const loaders$ = parsedResult.value.ressources.map((ressource) => {
          const transport = getTransportPipelines(transports,
                                                  ressource.transportType,
                                                  otherTransportOptions);
          const request$ = scheduleRequest(() =>
            transport.manifest.loader({ url : ressource.url }).pipe(
              filter(
                (e): e is { type : "data-loaded";
                            value : ILoaderDataLoadedValue<Document | string>; } =>
                  e.type === "data-loaded"
              ),
              map((e) : ILoaderDataLoadedValue< Document | string > => e.value)
            ));

          return request$.pipe(mergeMap((responseValue) => {
            return transport.manifest.parser({ response: responseValue,
                                               url: ressource.url,
                                               scheduleRequest,
                                               previousManifest,
                                               unsafeMode,
                                               externalClockOffset });
          })).pipe(deferSubscriptions(), share());
        });

        const warnings$ : Array<Observable<IManifestParserWarningEvent>> =
          loaders$.map(loader =>
            loader.pipe(filter((evt) : evt is IManifestParserWarningEvent =>
              evt.type === "warning")));

        const responses$ : Array<Observable<IManifestParserResponseEvent>> =
          loaders$.map(loader =>
            loader.pipe(filter((evt) : evt is IManifestParserResponseEvent =>
              evt.type === "parsed")));

        return observableMerge(
          combineLatest(responses$).pipe(mergeMap((evt) => {
            const loadedRessources = evt.map(e => e.value.manifest);
            return handleParsedResult(parsedResult.value.continue(loadedRessources));
          })),
          ...warnings$);
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
    contentEnd : number | undefined,
    segmentResponse : ISegmentParserParsedSegment<unknown>
  ) : { chunkInfos : IChunkTimeInfo | null;
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
    if (offsetedChunkInfos !== null) {
      offsetedChunkInfos.time += contentOffset;
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
    loader({ segment, url } : ISegmentLoaderArguments) {
      const { audio } = getTransportPipelinesFromSegment(segment);
      return audio.loader(getLoaderArguments(segment, url));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ISegmentParserParsedSegment<ArrayBuffer | Uint8Array | null>  |
        ISegmentParserParsedInitSegment<ArrayBuffer | Uint8Array | null>
    {
      const { content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { audio } = getTransportPipelinesFromSegment(segment);
      const parsed = audio.parser(getParserArguments(args, segment));
      if (parsed.segmentType === "init") {
        return parsed;
      }
      const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
      return objectAssign({}, parsed, timeInfos);
    },
  };

  const videoPipeline = {
    loader({ segment, url } : ISegmentLoaderArguments) {
      const { video } = getTransportPipelinesFromSegment(segment);
      return video.loader(getLoaderArguments(segment, url));
    },

    parser(
      args : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
    ) : ISegmentParserParsedSegment<ArrayBuffer | Uint8Array | null>  |
        ISegmentParserParsedInitSegment<ArrayBuffer | Uint8Array | null>
    {
      const { content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { video } = getTransportPipelinesFromSegment(segment);
      const parsed = video.parser(getParserArguments(args, segment));
      if (parsed.segmentType === "init") {
        return parsed;
      }
      const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
      return objectAssign({}, parsed, timeInfos);
    },
  };

  const textTrackPipeline = {
    loader({ segment, url } : ISegmentLoaderArguments) {
      const { text } = getTransportPipelinesFromSegment(segment);
      return text.loader(getLoaderArguments(segment, url));
    },

    parser(
      args: ISegmentParserArguments<ArrayBuffer|string|Uint8Array|null>
    ) : ISegmentParserParsedInitSegment<null> |
        ISegmentParserParsedSegment<ITextTrackSegmentData>
    {
      const { content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { text } = getTransportPipelinesFromSegment(segment);
      const parsed = text.parser(getParserArguments(args, segment));
      if (parsed.segmentType === "init") {
        return parsed;
      }
      const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
      return objectAssign({}, parsed, timeInfos);
    },
  };

  const imageTrackPipeline = {
    loader({ segment, url } : ISegmentLoaderArguments) {
      const { image } = getTransportPipelinesFromSegment(segment);
      return image.loader(getLoaderArguments(segment, url));
    },

    parser(
      args : ISegmentParserArguments<ArrayBuffer|Uint8Array|null>
    ) : ISegmentParserParsedInitSegment<null>  |
        ISegmentParserParsedSegment<IImageTrackSegmentData>
    {
      const { content } = args;
      const { segment } = content;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { image } = getTransportPipelinesFromSegment(segment);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      const parsed = image.parser(getParserArguments(args, segment));
      if (parsed.segmentType === "init") {
        return parsed;
      }
      const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
      return objectAssign({}, parsed, timeInfos);
    },
  };

  return { manifest: manifestPipeline,
           audio: audioPipeline,
           video: videoPipeline,
           text: textTrackPipeline,
           image: imageTrackPipeline };
}
