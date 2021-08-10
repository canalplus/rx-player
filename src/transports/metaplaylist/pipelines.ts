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

import config from "../../config";
import features from "../../features";
import Manifest, {
  IMetaPlaylistPrivateInfos,
  ISegment,
} from "../../manifest";
import parseMetaPlaylist, {
  IParserResponse as IMPLParserResponse,
} from "../../parsers/manifest/metaplaylist";
import { IParsedManifest } from "../../parsers/manifest/types";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import { CancellationSignal } from "../../utils/task_canceller";
import {
  IChunkTimeInfo,
  ILoadedAudioVideoSegmentFormat,
  ILoadedTextSegmentFormat,
  IManifestParserOptions,
  IManifestParserRequestScheduler,
  IManifestParserResult,
  IRequestedData,
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultChunkedComplete,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
  ITextTrackSegmentData,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "./manifest_loader";

/**
 * Get base - real - content from an offseted metaplaylist content.
 * @param {Object} segment
 * @returns {Object}
 */
function getOriginalContext(
  mplContext : ISegmentContext
) : ISegmentContext {
  const { segment } = mplContext;
  if (segment.privateInfos?.metaplaylistInfos === undefined) {
    throw new Error("MetaPlaylist: missing private infos");
  }
  const { isLive,
          periodStart,
          periodEnd,
          manifestPublishTime } = segment.privateInfos.metaplaylistInfos;
  const { originalSegment } = segment.privateInfos.metaplaylistInfos;
  return  { segment: originalSegment,
            type: mplContext.type,
            language: mplContext.language,
            mimeType: mplContext.mimeType,
            codecs: mplContext.codecs,
            isLive,
            periodStart,
            periodEnd,
            manifestPublishTime };
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
                                             { manifestLoader: undefined });

  const manifestPipeline = {
    loadManifest: manifestLoader,

    parseManifest(
      manifestData : IRequestedData<unknown>,
      parserOptions : IManifestParserOptions,
      onWarnings : (warnings: Error[]) => void,
      cancelSignal : CancellationSignal,
      scheduleRequest : IManifestParserRequestScheduler
    ) : Promise<IManifestParserResult> {
      const url = manifestData.url ?? parserOptions.originalUrl;
      const { responseData } = manifestData;

      const mplParserOptions = { url,
                                 serverSyncInfos: options.serverSyncInfos };
      const parsed = parseMetaPlaylist(responseData, mplParserOptions);

      return handleParsedResult(parsed);

      function handleParsedResult(
        parsedResult : IMPLParserResponse<IParsedManifest>
      ) : Promise<IManifestParserResult> {
        if (parsedResult.type === "done") {
          const manifest = new Manifest(parsedResult.value, options);
          return Promise.resolve({ manifest });
        }

        const parsedValue = parsedResult.value;
        const loaderProms = parsedValue.ressources.map((resource) => {
          const transport = getTransportPipelines(transports,
                                                  resource.transportType,
                                                  otherTransportOptions);
          return scheduleRequest(loadSubManifest)
            .then((data) =>
              transport.manifest.parseManifest(data,
                                               { ...parserOptions,
                                                 originalUrl: resource.url },
                                               onWarnings,
                                               cancelSignal,
                                               scheduleRequest));
          function loadSubManifest() {
            /*
             * Whether a ManifestLoader's timeout should be relied on here
             * is ambiguous.
             */
            const manOpts = { timeout: config.getCurrent().DEFAULT_REQUEST_TIMEOUT };
            return transport.manifest.loadManifest(resource.url, manOpts, cancelSignal);
          }
        });

        return Promise.all(loaderProms).then(parsedReqs => {
          const loadedRessources = parsedReqs.map(e => e.manifest);
          return handleParsedResult(parsedResult.value.continue(loadedRessources));
        });
      }
    },
  };

  /**
   * @param {Object} segment
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
   * @param {number|undefined} contentEnd
   * @param {Object} segmentResponse
   * @returns {Object}
   */
  function offsetTimeInfos(
    contentOffset : number,
    contentEnd : number | undefined,
    segmentResponse : ISegmentParserParsedMediaChunk<unknown>
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
    loadSegment(
      url : string | null,
      context : ISegmentContext,
      loaderOptions : ISegmentLoaderOptions,
      cancelToken : CancellationSignal,
      callbacks : ISegmentLoaderCallbacks<ILoadedAudioVideoSegmentFormat>
    ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat> |
                ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat> |
                ISegmentLoaderResultChunkedComplete>
    {
      const { segment } = context;
      const { audio } = getTransportPipelinesFromSegment(segment);

      const ogContext = getOriginalContext(context);
      return audio.loadSegment(url, ogContext, loaderOptions, cancelToken, callbacks);
    },

    parseSegment(
      loadedSegment : { data : ILoadedAudioVideoSegmentFormat; isChunked : boolean },
      context : ISegmentContext,
      initTimescale : number | undefined
    ) : ISegmentParserParsedInitChunk<ArrayBuffer | Uint8Array | null> |
        ISegmentParserParsedMediaChunk<ArrayBuffer | Uint8Array | null>
    {
      const { segment } = context;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { audio } = getTransportPipelinesFromSegment(segment);

      const ogContext = getOriginalContext(context);
      const parsed = audio.parseSegment(loadedSegment, ogContext, initTimescale);
      if (parsed.segmentType === "init") {
        return parsed;
      }
      const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
      return objectAssign({}, parsed, timeInfos);
    },
  };

  const videoPipeline = {
    loadSegment(
      url : string | null,
      context : ISegmentContext,
      loaderOptions : ISegmentLoaderOptions,
      cancelToken : CancellationSignal,
      callbacks : ISegmentLoaderCallbacks<ILoadedAudioVideoSegmentFormat>
    ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat> |
                ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat> |
                ISegmentLoaderResultChunkedComplete>
    {
      const { segment } = context;
      const { video } = getTransportPipelinesFromSegment(segment);
      const ogContext = getOriginalContext(context);
      return video.loadSegment(url, ogContext, loaderOptions, cancelToken, callbacks);
    },

    parseSegment(
      loadedSegment : { data : ILoadedAudioVideoSegmentFormat; isChunked : boolean },
      context : ISegmentContext,
      initTimescale : number | undefined
    ) : ISegmentParserParsedInitChunk<ArrayBuffer | Uint8Array | null> |
        ISegmentParserParsedMediaChunk<ArrayBuffer | Uint8Array | null>
    {
      const { segment } = context;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { video } = getTransportPipelinesFromSegment(segment);
      const ogContext = getOriginalContext(context);
      const parsed = video.parseSegment(loadedSegment, ogContext, initTimescale);
      if (parsed.segmentType === "init") {
        return parsed;
      }
      const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
      return objectAssign({}, parsed, timeInfos);
    },
  };

  const textTrackPipeline = {
    loadSegment(
      url : string | null,
      context : ISegmentContext,
      loaderOptions : ISegmentLoaderOptions,
      cancelToken : CancellationSignal,
      callbacks : ISegmentLoaderCallbacks<ILoadedTextSegmentFormat>
    ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedTextSegmentFormat> |
                ISegmentLoaderResultSegmentCreated<ILoadedTextSegmentFormat> |
                ISegmentLoaderResultChunkedComplete>
    {
      const { segment } = context;
      const { text } = getTransportPipelinesFromSegment(segment);

      const ogContext = getOriginalContext(context);
      return text.loadSegment(url, ogContext, loaderOptions, cancelToken, callbacks);
    },

    parseSegment(
      loadedSegment : { data : ILoadedTextSegmentFormat; isChunked : boolean },
      context : ISegmentContext,
      initTimescale : number | undefined
    ) : ISegmentParserParsedInitChunk<ITextTrackSegmentData | null> |
        ISegmentParserParsedMediaChunk<ITextTrackSegmentData>
    {
      const { segment } = context;
      const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
      const { text } = getTransportPipelinesFromSegment(segment);

      const ogContext = getOriginalContext(context);
      const parsed = text.parseSegment(loadedSegment, ogContext, initTimescale);
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
           text: textTrackPipeline };
}
