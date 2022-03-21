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

import { Observable } from "rxjs";
import config from "../../../config";
import {
  formatError,
  ICustomError,
} from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  getLoggableSegmentId,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import {
  IChunkCompleteInformation,
  ISegmentLoadingProgressInformation,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
  ISegmentPipeline,
} from "../../../transports";
import arrayIncludes from "../../../utils/array_includes";
import idGenerator from "../../../utils/id_generator";
import InitializationSegmentCache from "../../../utils/initialization_segment_cache";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectAssign from "../../../utils/object_assign";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import {
  IMetricsCallbackPayload,
  IRequestBeginCallbackPayload,
  IRequestEndCallbackPayload,
  IRequestProgressCallbackPayload,
} from "../../abr";
import { IBufferType } from "../../segment_buffers";
import errorSelector from "../utils/error_selector";
import { tryURLsWithBackoff } from "../utils/try_urls_with_backoff";


const generateRequestID = idGenerator();

/**
 * Create an `ISegmentFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `ISegmentFetcher` also implements a retry mechanism, based on the given
 * `options` argument, which may retry a segment request when it fails.
 *
 * @param {string} bufferType
 * @param {Object} transport
 * @param {Object} callbacks
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentFetcher<TLoadedFormat, TSegmentDataType>(
  bufferType : IBufferType,
  pipeline : ISegmentPipeline<TLoadedFormat, TSegmentDataType>,
  callbacks : ISegmentFetcherCreatorCallbacks,
  options : ISegmentFetcherOptions
) : ISegmentFetcher<TSegmentDataType> {
  /**
   * Cache audio and video initialization segments.
   * This allows to avoid doing too many requests for what are usually very
   * small files.
   */
  const cache = arrayIncludes(["audio", "video"], bufferType) ?
    new InitializationSegmentCache<TLoadedFormat>() :
    undefined;

  const { loadSegment, parseSegment } = pipeline;

  /**
   * Fetch a specific segment.
   *
   * This function returns an Observable which will fetch segments on
   * subscription.
   * If the corresponding request fails, it may retry it based on the given
   * options.
   *
   * This Observable will emit various events during that request lifecycle and
   * throw if the segment request(s) (including potential retries) fail.
   * The Observable will automatically complete once no events are left to be
   * sent.
   * @param {Object} content
   * @returns {Observable}
   */
  return function fetchSegment(
    content : ISegmentLoaderContent
  ) : Observable<ISegmentFetcherEvent<TSegmentDataType>> {
    const { segment } = content;

    // used by logs
    const segmentIdString = getLoggableSegmentId(content);

    return new Observable((obs) => {
      const requestId = generateRequestID();
      const canceller = new TaskCanceller();

      /**
       * If the request succeeded, set to the corresponding
       * `IChunkCompleteInformation` object.
       * For any other completion cases: if the request either failed, was
       * cancelled or just if no request was needed, set to `null`.
       *
       * Stays to `undefined` when the request is still pending.
       */
      let requestInfo : IChunkCompleteInformation | null | undefined;

      /**
       * Array containing one entry per loaded chunk, in chronological order.
       * The boolean indicates if the chunk has been parsed at least once.
       *
       * This is used to know when all loaded chunks have been parsed, which
       * can be useful to e.g. construct metrics about the loaded segment.
       */
      const parsedChunks : boolean[] = [];

      /**
       * Addition of the duration of each encountered and parsed chunks.
       * Allows to have an idea of the real duration of the full segment once
       * all chunks have been parsed.
       *
       * `undefined` if at least one of the parsed chunks has unknown duration.
       */
      let segmentDurationAcc : number | undefined = 0;

      /** Set to `true` once network metrics have been sent. */
      let metricsSent = false;

      const loaderCallbacks = {
        /**
         * Callback called when the segment loader has progress information on
         * the request.
         * @param {Object} info
         */
        onProgress(info : ISegmentLoadingProgressInformation) : void {
          if (requestInfo !== undefined) {
            return; // Request already terminated
          }
          if (info.totalSize !== undefined && info.size < info.totalSize) {
            callbacks.onProgress?.({ duration: info.duration,
                                     size: info.size,
                                     totalSize: info.totalSize,
                                     timestamp: performance.now(),
                                     id: requestId });
          }
        },

        /**
         * Callback called when the segment is communicated by the loader
         * through decodable sub-segment(s) called chunk(s), with a chunk in
         * argument.
         * @param {*} chunkData
         */
        onNewChunk(chunkData : TLoadedFormat) : void {
          obs.next({ type: "chunk" as const,
                     parse: generateParserFunction(chunkData, true) });
        },
      };

      // Retrieve from cache if it exists
      const cached = cache !== undefined ? cache.get(content) :
                                           null;
      if (cached !== null) {
        log.debug("SF: Found wanted segment in cache", segmentIdString);
        obs.next({ type: "chunk" as const,
                   parse: generateParserFunction(cached, false) });
        obs.next({ type: "chunk-complete" as const });
        obs.complete();
        return undefined;
      }

      log.debug("SF: Beginning request", segmentIdString);
      callbacks.onRequestBegin?.({ requestTimestamp: performance.now(),
                                   id: requestId,
                                   content });

      tryURLsWithBackoff(segment.mediaURLs ?? [null],
                         callLoaderWithUrl,
                         objectAssign({ onRetry }, options),
                         canceller.signal)
        .then((res) => {
          log.debug("SF: Segment request ended with success", segmentIdString);

          if (res.resultType === "segment-loaded") {
            const loadedData = res.resultData.responseData;
            if (cache !== undefined) {
              cache.add(content, res.resultData.responseData);
            }
            obs.next({ type: "chunk" as const,
                       parse: generateParserFunction(loadedData, false) });
          } else if (res.resultType === "segment-created") {
            obs.next({ type: "chunk" as const,
                       parse: generateParserFunction(res.resultData, false) });
          }

          log.debug("SF: Segment request ended with success", segmentIdString);
          obs.next({ type: "chunk-complete" as const });

          if (res.resultType !== "segment-created") {
            requestInfo = res.resultData;
            sendNetworkMetricsIfAvailable();
          } else {
            requestInfo = null;
          }

          if (!canceller.isUsed) {
            // The current Observable could have been canceled as a result of one
            // of the previous `next` calls. In that case, we don't want to send
            // a "requestEnd" again as it has already been sent on cancellation.
            //
            // Note that we only perform this check for `onRequestEnd` on
            // purpose. Observable's events should have been ignored by RxJS if
            // the Observable has already been canceled and we don't care if
            // `"metrics"` is sent there.
            callbacks.onRequestEnd?.({ id: requestId });
          }
          obs.complete();
        })
        .catch((err) => {
          log.debug("SF: Segment request failed", segmentIdString);
          requestInfo = null;
          obs.error(errorSelector(err));
        });

      return () => {
        if (requestInfo !== undefined) {
          return; // Request already terminated
        }
        log.debug("SF: Segment request cancelled", segmentIdString);
        requestInfo = null;
        canceller.cancel();
        callbacks.onRequestEnd?.({ id: requestId });
      };

      /**
       * Call a segment loader for the given URL with the right arguments.
       * @param {string|null} url
       * @param {Object} cancellationSignal
       * @returns {Promise}
       */
      function callLoaderWithUrl(
        url : string | null,
        cancellationSignal: CancellationSignal
      ) {
        return loadSegment(url, content, cancellationSignal, loaderCallbacks);
      }

      /**
       * Generate function allowing to parse a loaded segment.
       * @param {*} data
       * @param {Boolean} isChunked
       * @returns {Function}
       */
      function generateParserFunction(data : TLoadedFormat, isChunked : boolean)  {
        parsedChunks.push(false);
        const parsedChunkId = parsedChunks.length - 1;
        return function parse(initTimescale? : number) :
          ISegmentParserParsedInitChunk<TSegmentDataType> |
          ISegmentParserParsedMediaChunk<TSegmentDataType>
        {
          const loaded = { data, isChunked };

          try {
            const parsed = parseSegment(loaded, content, initTimescale);

            if (!parsedChunks[parsedChunkId]) {
              segmentDurationAcc = segmentDurationAcc !== undefined &&
                                   parsed.segmentType === "media" &&
                                   parsed.chunkInfos !== null &&
                                   parsed.chunkInfos.duration !== undefined ?
                segmentDurationAcc + parsed.chunkInfos.duration :
                undefined;
              parsedChunks[parsedChunkId] = true;

              sendNetworkMetricsIfAvailable();
            }
            return parsed;
          } catch (error) {
            throw formatError(error, { defaultCode: "PIPELINE_PARSE_ERROR",
                                       defaultReason: "Unknown parsing error" });
          }
        };
      }

      /**
       * Function called when the function request is retried.
       * @param {*} err
       */
      function onRetry(err: unknown) : void {
        obs.next({ type: "retry" as const,
                   value: errorSelector(err) });
      }

      /**
       * Send netork metrics if they haven't yet been sent and if all data to
       * define them is available.
       */
      function sendNetworkMetricsIfAvailable() : void {
        if (metricsSent) {
          return;
        }
        if (!isNullOrUndefined(requestInfo) &&
            requestInfo.size !== undefined &&
            requestInfo.requestDuration !== undefined &&
            parsedChunks.length > 0 &&
            parsedChunks.every(isParsed => isParsed))
        {
          metricsSent = true;
          callbacks.onMetrics?.({ size: requestInfo.size,
                                  requestDuration: requestInfo.requestDuration,
                                  content,
                                  segmentDuration: segmentDurationAcc });
        }
      }
    });
  };
}

export type ISegmentFetcher<TSegmentDataType> = (content : ISegmentLoaderContent) =>
  Observable<ISegmentFetcherEvent<TSegmentDataType>>;

/** Event sent by the SegmentFetcher when fetching a segment. */
export type ISegmentFetcherEvent<TSegmentDataType> =
  ISegmentFetcherChunkEvent<TSegmentDataType> |
  ISegmentFetcherChunkCompleteEvent |
  ISegmentFetcherRetry;

/**
 * Event sent when a new "chunk" of the segment is available.
 * A segment can contain n chunk(s) for n >= 0.
 */
export interface ISegmentFetcherChunkEvent<TSegmentDataType> {
  type : "chunk";
  /** Parse the downloaded chunk. */
  /**
   * Parse the downloaded chunk.
   *
   * Take in argument the timescale value that might have been obtained by
   * parsing an initialization segment from the same Representation.
   * Can be left to `undefined` if unknown or inexistant, segment parsers should
   * be resilient and still work without that information.
   *
   * @param {number} initTimescale
   * @returns {Object}
   */
  parse(initTimescale? : number) : ISegmentParserParsedInitChunk<TSegmentDataType> |
                                   ISegmentParserParsedMediaChunk<TSegmentDataType>;
}

/**
 * Event sent when all "chunk" of the segments have been communicated through
 * `ISegmentFetcherChunkEvent` events.
 */
export interface ISegmentFetcherChunkCompleteEvent { type: "chunk-complete" }

/** Content used by the segment loader as a context to load a new segment. */
export interface ISegmentLoaderContent { manifest : Manifest;
                                         period : Period;
                                         adaptation : Adaptation;
                                         representation : Representation;
                                         segment : ISegment; }

/**
 * An Error happened while loading which led to a retry.
 * The request is retried from scratch.
 */
export interface ISegmentFetcherRetry { type : "retry";
                                        value : ICustomError; }

/**
 * Callbacks that can be bound when creating an `ISegmentFetcher`.
 * Those allows to be notified of an `ISegmentFetcher` various lifecycles and of
 * network information.
 */
export interface ISegmentFetcherCreatorCallbacks {
  /** Called when a segment request begins. */
  onRequestBegin? : (arg : IRequestBeginCallbackPayload) => void;
  /** Called when progress information is available on a pending segment request. */
  onProgress? : (arg : IRequestProgressCallbackPayload) => void;
  /**
   * Called when a segment request ends (either because it completed, it failed
   * or was canceled).
   */
  onRequestEnd? : (arg : IRequestEndCallbackPayload) => void;
  /**
   * Called when network metrics linked to a segment request are available,
   * once the request has terminated.
   * This callback may be called before or after the corresponding
   * `onRequestEnd` callback, you should not rely on the order between the two.
   */
  onMetrics? : (arg : IMetricsCallbackPayload) => void;
}

/** Options allowing to configure an `ISegmentFetcher`'s behavior. */
export interface ISegmentFetcherOptions {
  /**
   * Initial delay to wait if a request fails before making a new request, in
   * milliseconds.
   */
  baseDelay : number;
  /**
   * Maximum delay to wait if a request fails before making a new request, in
   * milliseconds.
   */
  maxDelay : number;
  /**
   * Maximum number of retries to perform on "regular" errors (e.g. due to HTTP
   * status, integrity errors, timeouts...).
   */
  maxRetryRegular : number;
  /**
   * Maximum number of retries to perform when it appears that the user is
   * currently offline.
   */
  maxRetryOffline : number;
}

/**
 * @param {string} bufferType
 * @param {Object}
 * @returns {Object}
 */
export function getSegmentFetcherOptions(
  bufferType : string,
  { maxRetryRegular,
    maxRetryOffline,
    lowLatencyMode } : { maxRetryRegular? : number | undefined;
                         maxRetryOffline? : number | undefined;
                         lowLatencyMode : boolean; }
) : ISegmentFetcherOptions {
  const { DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
          DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
          INITIAL_BACKOFF_DELAY_BASE,
          MAX_BACKOFF_DELAY_BASE } = config.getCurrent();
  return { maxRetryRegular: bufferType === "image" ? 0 :
                            maxRetryRegular ?? DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
           maxRetryOffline: maxRetryOffline ?? DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
           baseDelay: lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY :
                                       INITIAL_BACKOFF_DELAY_BASE.REGULAR,
           maxDelay: lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY :
                                      MAX_BACKOFF_DELAY_BASE.REGULAR };
}
