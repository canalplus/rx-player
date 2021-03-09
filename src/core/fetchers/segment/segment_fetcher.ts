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
import TaskCanceller from "../../../utils/task_canceller";
import {
  IABRMetricsEvent,
  IABRRequestBeginEvent,
  IABRRequestEndEvent,
  IABRRequestProgressEvent,
} from "../../abr";
import { IBufferType } from "../../segment_buffers";
import errorSelector from "../utils/error_selector";
import {
  IBackoffSettings,
  tryURLsWithBackoff2,
} from "../utils/try_urls_with_backoff";

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
  SegmentDataType,
>(
  bufferType : IBufferType,
  pipeline : ISegmentPipeline<LoadedFormat, SegmentDataType>,
  requests$ : Subject<IABRMetricsEvent |
                      IABRRequestBeginEvent |
                      IABRRequestProgressEvent |
                      IABRRequestEndEvent>,
  options : IBackoffSettings
) : ISegmentFetcher<SegmentDataType> {
  const cache = arrayIncludes(["audio", "video"], bufferType) ?
    new InitializationSegmentCache<LoadedFormat>() :
    undefined;

  const { loadSegment, parseSegment } = pipeline;

  /**
   * @param {Object} content
   * @returns {Observable}
   */
  return function fetchSegment(
    content : ISegmentLoaderContent
  ) : Observable<ISegmentFetcherEvent<SegmentDataType>> {
    const { segment } = content;
    return new Observable((obs) => {
      const cached = cache !== undefined ? cache.get(content) :
                                           null;
      if (cached !== null) {
        obs.next({ type: "chunk" as const,
                   parse: generateParserFunction(cached, false) });
        obs.next({ type: "chunk-complete" as const });
        obs.complete();
      }

      const id = generateRequestID();
      requests$.next({ type: "requestBegin",
                       value: { duration: segment.duration,
                                time: segment.time,
                                requestTimestamp: performance.now(),
                                id } });

      const canceller = new TaskCanceller();

      const loaderCallbacks = {
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
        onNewChunk(chunkData : LoadedFormat) : void {
          obs.next({ type: "chunk" as const,
                     parse: generateParserFunction(chunkData, true) });
        },
      };

      tryURLsWithBackoff2(segment.mediaURLs ?? [null],
                          callLoaderWithUrl,
                          options,
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

          obs.next({ type: "chunk-complete" as const });
          requests$.next({ type: "requestEnd", value: { id } });
          obs.complete();
        })
        .catch((err) => {
          obs.error(errorSelector(err));
        });

      return () => {
        canceller.cancel();
        requests$.next({ type: "requestEnd", value: { id } });
      };

      function callLoaderWithUrl(url : string | null) {
        return loadSegment(url, content, canceller.signal, loaderCallbacks);
      }

      function generateParserFunction(data : LoadedFormat, isChunked : boolean)  {
        return function parse(initTimescale? : number) :
          ISegmentParserParsedInitSegment<SegmentDataType> |
          ISegmentParserParsedSegment<SegmentDataType>
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
    });
  };
      // return segmentLoader(content).pipe(
      //   tap((arg) => {
      //     switch (arg.type) {
      //       case "metrics": {
      //         requests$.next(arg);
      //         break;
      //       }
      //     }
      //   }),

      //   finalize(() => {
      //     if (requestBeginSent) {
      //       requests$.next({ type: "requestEnd", value: { id } });
      //     }
      //   }),

      //   filter((e) : e is ISegmentLoaderChunk |
      //                     ISegmentLoaderChunkComplete |
      //                     ISegmentLoaderData<T> |
      //                     ISegmentFetcherWarning => {
      //     switch (e.type) {
      //       case "warning":
      //       case "chunk":
      //       case "chunk-complete":
      //       case "data":
      //         return true;
      //       case "progress":
      //       case "metrics":
      //       case "request":
      //         return false;
      //       default:
      //         assertUnreachable(e);
      //     }
      //   }),
      //   mergeMap((evt) => {
      //     if (evt.type === "warning") {
      //       return observableOf(evt);
      //     }
      //     if (evt.type === "chunk-complete") {
      //       return observableOf({ type: "chunk-complete" as const });
      //     }

      //     const isChunked = evt.type === "chunk";
      //     const data = {
      //       type: "chunk" as const,
      //       /**
      //        * Parse the loaded data.
      //        * @param {Object} [initTimescale]
      //        * @returns {Observable}
      //        */
      //       parse(initTimescale? : number) : Observable<ISegmentParserResponse<T>> {
      //         const response = { data: evt.value.responseData, isChunked };
      //         /* eslint-disable @typescript-eslint/no-unsafe-call */
      //         /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      //         /* eslint-disable @typescript-eslint/no-unsafe-return */
      //         return segmentParser({ response, initTimescale, content })
      //         /* eslint-enable @typescript-eslint/no-unsafe-call */
      //         /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      //         /* eslint-enable @typescript-eslint/no-unsafe-return */
      //           .pipe(catchError((error: unknown) => {
      //             throw formatError(error, { defaultCode: "PIPELINE_PARSE_ERROR",
      //                                        defaultReason: "Unknown parsing error" });
      //           }));
      //       },
      //     };

      //     if (isChunked) {
      //       return observableOf(data);
      //     }
      //     return observableConcat(observableOf(data),
      //                             observableOf({ type: "chunk-complete" as const }));
      //   }),
      //   share() // avoid multiple side effects if multiple subs
      // );
    // });
  // };
}

export type ISegmentFetcher<SegmentDataType> = (content : ISegmentLoaderContent) =>
  Observable<ISegmentFetcherEvent<SegmentDataType>>;

/** Event sent by the SegmentFetcher when fetching a segment. */
export type ISegmentFetcherEvent<SegmentDataType> =
  ISegmentFetcherChunkCompleteEvent |
  ISegmentFetcherChunkEvent<SegmentDataType> |
  ISegmentFetcherWarning;


/**
 * Event sent when a new "chunk" of the segment is available.
 * A segment can contain n chunk(s) for n >= 0.
 */
export interface ISegmentFetcherChunkEvent<SegmentDataType> {
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
  parse(initTimescale? : number) : ISegmentParserParsedInitSegment<SegmentDataType> |
                                   ISegmentParserParsedSegment<SegmentDataType>;
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
