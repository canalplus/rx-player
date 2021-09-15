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
  Subject,
} from "rxjs";
import config from "../../../config";
import { formatError, ICustomError } from "../../../errors";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import {
  ISegmentLoadingProgressInformation,
  ISegmentParserParsedInitSegment,
  ISegmentParserParsedSegment,
  ISegmentPipeline,
} from "../../../transports";
import arrayIncludes from "../../../utils/array_includes";
import idGenerator from "../../../utils/id_generator";
import InitializationSegmentCache from "../../../utils/initialization_segment_cache";
import objectAssign from "../../../utils/object_assign";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import {
  IABRMetricsEvent,
  IABRRequestBeginEvent,
  IABRRequestEndEvent,
  IABRRequestProgressEvent,
} from "../../abr";
import { IBufferType } from "../../segment_buffers";
import errorSelector from "../utils/error_selector";
import { tryURLsWithBackoff } from "../utils/try_urls_with_backoff";

const { DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
        DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
        INITIAL_BACKOFF_DELAY_BASE,
        MAX_BACKOFF_DELAY_BASE } = config;

const generateRequestID = idGenerator();

/**
 * Create a function which will fetch and parse segments.
 * @param {string} bufferType
 * @param {Object} transport
 * @param {Subject} requests$
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentFetcher<
  LoadedFormat,
  TSegmentDataType,
>(
  bufferType : IBufferType,
  pipeline : ISegmentPipeline<LoadedFormat, TSegmentDataType>,
  requests$ : Subject<IABRMetricsEvent |
                      IABRRequestBeginEvent |
                      IABRRequestProgressEvent |
                      IABRRequestEndEvent>,
  options : ISegmentFetcherOptions
) : ISegmentFetcher<TSegmentDataType> {

  /**
   * Cache audio and video initialization segments.
   * This allows to avoid doing too many requests for what are usually very
   * small files.
   */
  const cache = arrayIncludes(["audio", "video"], bufferType) ?
    new InitializationSegmentCache<LoadedFormat>() :
    undefined;

  const { loadSegment, parseSegment } = pipeline;

  /**
   * Fetch a specific segment.
   *
   * This function returns an Observable which will fetch the segment on
   * subscription.
   * This Observable will emit various events during that request lifecycle and
   * throw if the segment request(s) (including potential retries) fail.
   *
   * The Observable will automatically complete once no events are left to be
   * sent.
   * @param {Object} content
   * @returns {Observable}
   */
  return function fetchSegment(
    content : ISegmentLoaderContent
  ) : Observable<ISegmentFetcherEvent<TSegmentDataType>> {
    const { segment } = content;
    return new Observable((obs) => {
      // Retrieve from cache if it exists
      const cached = cache !== undefined ? cache.get(content) :
                                           null;
      if (cached !== null) {
        obs.next({ type: "chunk" as const,
                   parse: generateParserFunction(cached, false) });
        obs.next({ type: "chunk-complete" as const });
        obs.complete();
        return undefined;
      }

      const id = generateRequestID();
      requests$.next({ type: "requestBegin",
                       value: { duration: segment.duration,
                                time: segment.time,
                                requestTimestamp: performance.now(),
                                id } });

      const canceller = new TaskCanceller();
      let hasRequestEnded = false;

      const loaderCallbacks = {
        /**
         * Callback called when the segment loader has progress information on
         * the request.
         * @param {Object} info
         */
        onProgress(info : ISegmentLoadingProgressInformation) : void {
          if (info.totalSize !== undefined && info.size < info.totalSize) {
            requests$.next({ type: "progress",
                             value: { duration: info.duration,
                                      size: info.size,
                                      totalSize: info.totalSize,
                                      timestamp: performance.now(),
                                      id } });
          }
        },

        /**
         * Callback called when the segment is communicated by the loader
         * through decodable sub-segment(s) called chunk(s), with a chunk in
         * argument.
         * @param {*} chunkData
         */
        onNewChunk(chunkData : LoadedFormat) : void {
          obs.next({ type: "chunk" as const,
                     parse: generateParserFunction(chunkData, true) });
        },
      };


      tryURLsWithBackoff(segment.mediaURLs ?? [null],
                         callLoaderWithUrl,
                         objectAssign({ onRetry }, options),
                         canceller.signal)
        .then((res) => {
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

          hasRequestEnded = true;
          obs.next({ type: "chunk-complete" as const });

          if ((res.resultType === "segment-loaded" ||
               res.resultType === "chunk-complete") &&
               res.resultData.size !== undefined &&
               res.resultData.duration !== undefined)
          {
            requests$.next({ type: "metrics",
                             value: { size: res.resultData.size,
                                      duration: res.resultData.duration,
                                      content } });
          }

          if (!canceller.isUsed) {
            // The current Observable could have been canceled as a result of one
            // of the previous `next` calls. In that case, we don't want to send
            // a "requestEnd" again as it has already been sent on cancellation.
            //
            // Note that we only perform this check for `"requestEnd"` on
            // purpose. Observable's events should have been ignored by RxJS if
            // the Observable has already been canceled and we don't care if
            // `"metrics"` is sent there.
            requests$.next({ type: "requestEnd", value: { id } });
          }
          obs.complete();
        })
        .catch((err) => {
          hasRequestEnded = true;
          obs.error(errorSelector(err));
        });

      return () => {
        if (!hasRequestEnded) {
          canceller.cancel();
          requests$.next({ type: "requestEnd", value: { id } });
        }
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
      function generateParserFunction(data : LoadedFormat, isChunked : boolean)  {
        return function parse(initTimescale? : number) :
          ISegmentParserParsedInitSegment<TSegmentDataType> |
          ISegmentParserParsedSegment<TSegmentDataType>
        {
          const loaded = { data, isChunked };

          try {
            return parseSegment(loaded, content, initTimescale);
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
        obs.next({ type: "warning" as const,
                   value: errorSelector(err) });
      }
    });
  };
}

export type ISegmentFetcher<TSegmentDataType> = (content : ISegmentLoaderContent) =>
  Observable<ISegmentFetcherEvent<TSegmentDataType>>;

/** Event sent by the SegmentFetcher when fetching a segment. */
export type ISegmentFetcherEvent<TSegmentDataType> =
  ISegmentFetcherChunkCompleteEvent |
  ISegmentFetcherChunkEvent<TSegmentDataType> |
  ISegmentFetcherWarning;


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
  parse(initTimescale? : number) : ISegmentParserParsedInitSegment<TSegmentDataType> |
                                   ISegmentParserParsedSegment<TSegmentDataType>;
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

/** An Error happened while loading (usually a request error). */
export interface ISegmentFetcherWarning { type : "warning";
                                          value : ICustomError; }

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
    lowLatencyMode } : { maxRetryRegular? : number;
                         maxRetryOffline? : number;
                         lowLatencyMode : boolean; }
) : ISegmentFetcherOptions {
  return { maxRetryRegular: bufferType === "image" ? 0 :
                            maxRetryRegular ?? DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
           maxRetryOffline: maxRetryOffline ?? DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
           baseDelay: lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY :
                                       INITIAL_BACKOFF_DELAY_BASE.REGULAR,
           maxDelay: lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY :
                                      MAX_BACKOFF_DELAY_BASE.REGULAR };
}
