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

import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import type {
  IManifest,
  ISegment,
  IPeriod,
  IRepresentation,
  ITrackMetadata,
  IVariantStreamMetadata,
} from "../../../manifest";
import { getLoggableSegmentId } from "../../../manifest";
import type { ICdnMetadata } from "../../../parsers/manifest";
import type { IPlayerError } from "../../../public_types";
import type {
  IChunkCompleteInformation,
  ISegmentContext,
  ISegmentLoader,
  ISegmentLoaderOptions,
  ISegmentLoadingProgressInformation,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
  ISegmentPipeline,
} from "../../../transports";
import arrayIncludes from "../../../utils/array_includes";
import idGenerator from "../../../utils/id_generator";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import getTimestamp from "../../../utils/monotonic_timestamp";
import objectAssign from "../../../utils/object_assign";
import type { CancellationSignal } from "../../../utils/task_canceller";
import { CancellationError } from "../../../utils/task_canceller";
import type {
  IMetricsCallbackPayload,
  IRequestBeginCallbackPayload,
  IRequestEndCallbackPayload,
  IRequestProgressCallbackPayload,
} from "../../adaptive";
import type CmcdDataBuilder from "../../cmcd";
import type { IBufferType } from "../../segment_sinks";
import type CdnPrioritizer from "../cdn_prioritizer";
import errorSelector from "../utils/error_selector";
import { scheduleRequestWithCdns } from "../utils/schedule_request";
import InitializationSegmentCache from "./initialization_segment_cache";

/** Allows to generate a unique identifies for each request. */
const generateRequestID = idGenerator();

/**
 * Create an `ISegmentFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `ISegmentFetcher` also implements a retry mechanism, based on the given
 * `requestOptions` argument, which may retry a segment request when it fails.
 *
 * @param {Object} args
 * @returns {Function}
 */
export default function createSegmentFetcher<TLoadedFormat, TSegmentDataType>({
  bufferType,
  pipeline,
  cdnPrioritizer,
  cmcdDataBuilder,
  eventListeners,
  requestOptions,
}: ISegmentFetcherArguments<
  TLoadedFormat,
  TSegmentDataType
>): ISegmentFetcher<TSegmentDataType> {
  let connectionTimeout;
  if (
    requestOptions.connectionTimeout === undefined ||
    requestOptions.connectionTimeout < 0
  ) {
    connectionTimeout = undefined;
  } else {
    connectionTimeout = requestOptions.connectionTimeout;
  }
  const pipelineRequestOptions: ISegmentLoaderOptions = {
    timeout:
      requestOptions.requestTimeout < 0 ? undefined : requestOptions.requestTimeout,
    connectionTimeout,
    cmcdPayload: undefined,
  };

  /**
   * Cache audio and video initialization segments.
   * This allows to avoid doing too many requests for what are usually very
   * small files.
   */
  const cache = arrayIncludes(["audio", "video"], bufferType)
    ? new InitializationSegmentCache<TLoadedFormat>()
    : undefined;

  const { loadSegment, parseSegment } = pipeline;

  /**
   * Fetch a specific segment.
   * @param {Object} content
   * @param {Object} fetcherCallbacks
   * @param {Object} cancellationSignal
   * @returns {Promise}
   */
  return async function fetchSegment(
    content: ISegmentLoaderContent,
    fetcherCallbacks: ISegmentFetcherCallbacks<TSegmentDataType>,
    cancellationSignal: CancellationSignal,
  ): Promise<void> {
    const { segment, representation, track, manifest, period } = content;

    // used by logs
    const segmentIdString = getLoggableSegmentId(content);
    const requestId = generateRequestID();

    /**
     * If the request succeeded, set to the corresponding
     * `IChunkCompleteInformation` object.
     * For any other completion cases: if the request either failed, was
     * cancelled or just if no request was needed, set to `null`.
     *
     * Stays to `undefined` when the request is still pending.
     */
    let requestInfo: IChunkCompleteInformation | null | undefined;

    /**
     * Array containing one entry per loaded chunk, in chronological order.
     * The boolean indicates if the chunk has been parsed at least once.
     *
     * This is used to know when all loaded chunks have been parsed, which
     * can be useful to e.g. construct metrics about the loaded segment.
     */
    const parsedChunks: boolean[] = [];

    /**
     * Addition of the duration of each encountered and parsed chunks.
     * Allows to have an idea of the real duration of the full segment once
     * all chunks have been parsed.
     *
     * `undefined` if at least one of the parsed chunks has unknown duration.
     */
    let segmentDurationAcc: number | undefined = 0;

    /** Set to `true` once network metrics have been sent. */
    let metricsSent = false;

    /** Segment context given to the transport pipelines. */
    const context: ISegmentContext = {
      segment,
      type: track.trackType,
      language: track.language,
      isLive: manifest.isLive,
      periodStart: period.start,
      periodEnd: period.end,
      mimeType: representation.mimeType,
      codecs: representation.codecs[0],
      manifestPublishTime: manifest.publishTime,
    };

    const loaderCallbacks = {
      /**
       * Callback called when the segment loader has progress information on
       * the request.
       * @param {Object} info
       */
      onProgress(info: ISegmentLoadingProgressInformation): void {
        if (requestInfo !== undefined) {
          return; // request already termminated
        }
        if (info.totalSize !== undefined && info.size < info.totalSize) {
          eventListeners.onProgress?.({
            duration: info.duration,
            size: info.size,
            totalSize: info.totalSize,
            timestamp: getTimestamp(),
            id: requestId,
          });
        }
      },

      /**
       * Callback called when the segment is communicated by the loader
       * through decodable sub-segment(s) called chunk(s), with a chunk in
       * argument.
       * @param {*} chunkData
       */
      onNewChunk(chunkData: TLoadedFormat): void {
        fetcherCallbacks.onChunk(generateParserFunction(chunkData, true));
      },
    };

    // Retrieve from cache if it exists
    const cached = cache !== undefined ? cache.get(content) : null;
    if (cached !== null) {
      log.debug("SF: Found wanted segment in cache", segmentIdString);
      fetcherCallbacks.onChunk(generateParserFunction(cached, false));
      return Promise.resolve();
    }

    log.debug("SF: Beginning request", segmentIdString);
    eventListeners.onRequestBegin?.({
      requestTimestamp: getTimestamp(),
      id: requestId,
      content,
    });

    cancellationSignal.register(onCancellation);

    try {
      const res = await scheduleRequestWithCdns(
        content.representation.cdnMetadata,
        cdnPrioritizer,
        callLoaderWithUrl,
        objectAssign({ onRetry }, requestOptions),
        cancellationSignal,
      );

      if (res.resultType === "segment-loaded") {
        const loadedData = res.resultData.responseData;
        if (cache !== undefined) {
          cache.add(content, res.resultData.responseData);
        }
        fetcherCallbacks.onChunk(generateParserFunction(loadedData, false));
      } else if (res.resultType === "segment-created") {
        fetcherCallbacks.onChunk(generateParserFunction(res.resultData, false));
      }

      log.debug("SF: Segment request ended with success", segmentIdString);
      fetcherCallbacks.onAllChunksReceived();

      if (res.resultType !== "segment-created") {
        requestInfo = res.resultData;
        sendNetworkMetricsIfAvailable();
      } else {
        requestInfo = null;
      }

      if (!cancellationSignal.isCancelled()) {
        // The current task could have been canceled as a result of one
        // of the previous callbacks call. In that case, we don't want to send
        // a "requestEnd" again as it has already been sent on cancellation.
        eventListeners.onRequestEnd?.({ id: requestId });
      }
      cancellationSignal.deregister(onCancellation);
    } catch (err) {
      cancellationSignal.deregister(onCancellation);
      requestInfo = null;
      if (err instanceof CancellationError) {
        log.debug("SF: Segment request aborted", segmentIdString);
        throw err;
      }
      log.debug("SF: Segment request failed", segmentIdString);
      eventListeners.onRequestEnd?.({ id: requestId });
      throw errorSelector(err);
    }

    function onCancellation() {
      if (requestInfo !== undefined) {
        return; // Request already terminated
      }
      log.debug("SF: Segment request cancelled", segmentIdString);
      requestInfo = null;
      eventListeners.onRequestEnd?.({ id: requestId });
    }

    /**
     * Call a segment loader for the given URL with the right arguments.
     * @param {Object|null} cdnMetadata
     * @returns {Promise}
     */
    function callLoaderWithUrl(
      cdnMetadata: ICdnMetadata | null,
    ): ReturnType<ISegmentLoader<TLoadedFormat>> {
      pipelineRequestOptions.cmcdPayload =
        cmcdDataBuilder?.getCmcdDataForSegmentRequest(content);
      return loadSegment(
        cdnMetadata,
        context,
        pipelineRequestOptions,
        cancellationSignal,
        loaderCallbacks,
      );
    }

    /**
     * Generate function allowing to parse a loaded segment.
     * @param {*} data
     * @param {Boolean} isChunked
     * @returns {Function}
     */
    function generateParserFunction(
      data: TLoadedFormat,
      isChunked: boolean,
    ): (
      initTimescale?: number,
    ) =>
      | ISegmentParserParsedInitChunk<TSegmentDataType>
      | ISegmentParserParsedMediaChunk<TSegmentDataType> {
      parsedChunks.push(false);
      const parsedChunkId = parsedChunks.length - 1;
      return function parse(
        initTimescale?: number,
      ):
        | ISegmentParserParsedInitChunk<TSegmentDataType>
        | ISegmentParserParsedMediaChunk<TSegmentDataType> {
        const loaded = { data, isChunked };

        try {
          const parsed = parseSegment(loaded, context, initTimescale);

          if (!parsedChunks[parsedChunkId]) {
            segmentDurationAcc =
              segmentDurationAcc !== undefined &&
              parsed.segmentType === "media" &&
              parsed.chunkInfos !== null &&
              parsed.chunkInfos.duration !== undefined
                ? segmentDurationAcc + parsed.chunkInfos.duration
                : undefined;
            parsedChunks[parsedChunkId] = true;

            sendNetworkMetricsIfAvailable();
          }
          return parsed;
        } catch (error) {
          throw formatError(error, {
            defaultCode: "PIPELINE_PARSE_ERROR",
            defaultReason: "Unknown parsing error",
          });
        }
      };
    }

    /**
     * Function called when the function request is retried.
     * @param {*} err
     */
    function onRetry(err: unknown): void {
      fetcherCallbacks.onRetry(errorSelector(err));
    }

    /**
     * Send netork metrics if they haven't yet been sent and if all data to
     * define them is available.
     */
    function sendNetworkMetricsIfAvailable(): void {
      if (metricsSent) {
        return;
      }
      if (
        !isNullOrUndefined(requestInfo) &&
        requestInfo.size !== undefined &&
        requestInfo.requestDuration !== undefined &&
        parsedChunks.length > 0 &&
        parsedChunks.every((isParsed) => isParsed)
      ) {
        metricsSent = true;
        eventListeners.onMetrics?.({
          size: requestInfo.size,
          requestDuration: requestInfo.requestDuration,
          content: {
            segment,
            track,
            representationItem: {
              bandwidth: content.variant.bandwidth ?? representation.bitrate ?? 0,
              representation,
            },
          },
          segmentDuration: segmentDurationAcc,
        });
      }
    }
  };
}

/**
 * Defines the `ISegmentFetcher` function which allows to load a single segment.
 *
 * Loaded data is entirely communicated through callbacks present in the
 * `callbacks` arguments.
 *
 * The returned Promise only gives an indication of if the request ended with
 * success or on error.
 */
export type ISegmentFetcher<TSegmentDataType> = (
  /** Information on the segment wanted. */
  content: ISegmentLoaderContent,
  /** Callbacks the `ISegmentFetcher` will call as it loads the data. */
  callbacks: ISegmentFetcherCallbacks<TSegmentDataType>,
  /** CancellationSignal allowing to cancel the request. */
  cancellationSignal: CancellationSignal,
) => Promise<void>;

/**
 * Callbacks given to an `ISegmentFetcher` allowing to be notified on its
 * inner request's various events.
 */
export interface ISegmentFetcherCallbacks<TSegmentDataType> {
  /** Called when a decodable chunk of the whole segment is available. */
  onChunk(
    parse: (
      initTimescale: number | undefined,
    ) =>
      | ISegmentParserParsedInitChunk<TSegmentDataType>
      | ISegmentParserParsedMediaChunk<TSegmentDataType>,
  ): void;

  /**
   * Callback called when all decodable chunks of the loaded segment have been
   * communicated through the `onChunk` callback.
   *
   * This callback is called before the corresponding `ISegmentFetcher`'s
   * returned Promise is resolved.
   */
  onAllChunksReceived(): void;

  /**
   * Callback called when the segment request has to restart from scratch, e.g.
   * due to a request error.
   */
  onRetry(error: IPlayerError): void;
}

/** Content used by the segment loader as a context to load a new segment. */
export interface ISegmentLoaderContent {
  manifest: IManifest;
  period: IPeriod;
  track: ITrackMetadata;
  variant: IVariantStreamMetadata;
  representation: IRepresentation;
  segment: ISegment;
}

/**
 * Callbacks given when creating an `ISegmentFetcher`, allowing to be notified
 * on high-level metadata about performed requests.
 */
export interface ISegmentFetcherLifecycleCallbacks {
  /** Called when a segment request begins. */
  onRequestBegin?: (arg: IRequestBeginCallbackPayload) => void;
  /** Called when progress information is available on a pending segment request. */
  onProgress?: (arg: IRequestProgressCallbackPayload) => void;
  /**
   * Called when a segment request ends (either because it completed, it failed
   * or was canceled).
   */
  onRequestEnd?: (arg: IRequestEndCallbackPayload) => void;
  /**
   * Called when network metrics linked to a segment request are available,
   * once the request has terminated.
   * This callback may be called before or after the corresponding
   * `onRequestEnd` callback, you should not rely on the order between the two.
   */
  onMetrics?: (arg: IMetricsCallbackPayload) => void;
}

/** requestOptions allowing to configure an `ISegmentFetcher`'s behavior. */
export interface ISegmentFetcherOptions {
  /**
   * Initial delay to wait if a request fails before making a new request, in
   * milliseconds.
   */
  baseDelay: number;
  /**
   * Maximum delay to wait if a request fails before making a new request, in
   * milliseconds.
   */
  maxDelay: number;
  /**
   * Maximum number of retries to perform on "regular" errors (e.g. due to HTTP
   * status, integrity errors, timeouts...).
   */
  maxRetry: number;
  /**
   * Timeout after which request are aborted and, depending on other requestOptions,
   * retried.
   * To set to `-1` for no timeout.
   */
  requestTimeout: number;
  /**
   * Connection timeout, in milliseconds, after which the request is canceled
   * if the responses headers has not being received.
   * Do not set or set to "undefined" to disable it.
   */
  connectionTimeout: number | undefined;
}

/**
 * @param {Object} baseOptions
 * @returns {Object}
 */
export function getSegmentFetcherRequestOptions({
  maxRetry,
  lowLatencyMode,
  requestTimeout,
  connectionTimeout,
}: {
  maxRetry?: number | undefined;
  requestTimeout?: number | undefined;
  connectionTimeout?: number | undefined;
  lowLatencyMode: boolean;
}): ISegmentFetcherOptions {
  const {
    DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
    DEFAULT_REQUEST_TIMEOUT,
    DEFAULT_CONNECTION_TIMEOUT,
    INITIAL_BACKOFF_DELAY_BASE,
    MAX_BACKOFF_DELAY_BASE,
  } = config.getCurrent();
  return {
    maxRetry: maxRetry ?? DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
    baseDelay: lowLatencyMode
      ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY
      : INITIAL_BACKOFF_DELAY_BASE.REGULAR,
    maxDelay: lowLatencyMode
      ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY
      : MAX_BACKOFF_DELAY_BASE.REGULAR,
    requestTimeout:
      requestTimeout === undefined ? DEFAULT_REQUEST_TIMEOUT : requestTimeout,
    connectionTimeout:
      connectionTimeout === undefined ? DEFAULT_CONNECTION_TIMEOUT : connectionTimeout,
  };
}

export interface ISegmentFetcherArguments<TLoadedFormat, TSegmentDataType> {
  /** Type of  buffer concerned (e.g. `"audio"`, `"video"`, `"text" etc.) */
  bufferType: IBufferType;
  /**
   * The transport-specific logic allowing to load segments of the given buffer
   * type and transport protocol (e.g. DASH).
   */
  pipeline: ISegmentPipeline<TLoadedFormat, TSegmentDataType>;
  /**
   * Abstraction allowing to synchronize, update and keep track of the
   * priorization of the CDN to use to load any given segment, in cases where
   * multiple ones are available.
   *
   * Can be set to `null` in which case a minimal priorization logic will be used
   * instead.
   */
  cdnPrioritizer: CdnPrioritizer | null;
  /**
   * Optional module allowing to collect "Common Media Client Data" (a.k.a. CMCD)
   * for the CDN.
   */
  cmcdDataBuilder: CmcdDataBuilder | null;
  /**
   * Callbacks that can be registered to be informed when new requests are made,
   * ended, new metrics are available etc.
   * This should be mainly useful to implement an adaptive logic relying on those
   * metrics and events.
   */
  eventListeners: ISegmentFetcherLifecycleCallbacks;
  /**
   * Various tweaking requestOptions allowing to configure the behavior of the returned
   * `ISegmentFetcher` regarding segment requests.
   */
  requestOptions: ISegmentFetcherOptions;
}
