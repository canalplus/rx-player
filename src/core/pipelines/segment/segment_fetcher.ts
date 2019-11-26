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
  concat as observableConcat,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  catchError,
  filter,
  finalize,
  mergeMap,
  share,
  tap,
} from "rxjs/operators";
import { formatError, ICustomError } from "../../../errors";
import { ISegment } from "../../../manifest";
import {
  IChunkTimingInfos,
  ISegmentLoaderArguments,
  ISegmentParserResponseEvent,
  ITransportPipelines,
} from "../../../transports";
import idGenerator from "../../../utils/id_generator";
import tryCatch from "../../../utils/rx-try_catch";
import {
  IABRMetric,
  IABRRequest,
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import backoff from "../utils/backoff";
import errorSelector from "../utils/error_selector";
import createSegmentLoader, {
  IPipelineLoaderChunk,
  IPipelineLoaderChunkComplete,
  IPipelineLoaderData,
  IPipelineLoaderWarning,
  ISegmentPipelineLoaderOptions,
} from "./create_segment_loader";

export type ISegmentFetcherWarning = IPipelineLoaderWarning;

interface IPipelineWarningEvent {
  type: "warning";
  value: ICustomError;
}

export interface ISegmentFetcherChunkEvent<T> {
  type : "chunk";
  parse : (init? : IChunkTimingInfos) =>
    Observable<ISegmentParserResponseEvent<T> | IPipelineWarningEvent>;
}

export interface ISegmentFetcherChunkCompleteEvent { type: "chunk-complete"; }

export type ISegmentFetcherEvent<T> = ISegmentFetcherChunkCompleteEvent |
                                      ISegmentFetcherChunkEvent<T> |
                                      ISegmentFetcherWarning;

export type ISegmentFetcher<T> = (content : ISegmentLoaderArguments) =>
                                   Observable<ISegmentFetcherEvent<T>>;

export interface IScheduleRequestResponse<U> {
  type: "schedule-request-response";
  value: U;
}

const generateRequestID = idGenerator();

/**
 * Create a function which will fetch segments.
 *
 * @param {string} bufferType
 * @param {Object} transport
 * @param {Subject} requests$
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentFetcher<T>(
  bufferType : IBufferType,
  transport : ITransportPipelines,
  requests$ : Subject<IABRMetric | IABRRequest>,
  options : ISegmentPipelineLoaderOptions<any>
) : ISegmentFetcher<T> {
  const segmentLoader = createSegmentLoader(transport[bufferType].loader, options);
  const segmentParser = transport[bufferType].parser as any; // deal with it

  /**
   * Allow the parser to schedule a new request.
   * @param {Object} transportPipeline
   * @param {Object} options
   * @returns {Function}
   */
  function scheduleRequest<U>(
    request : () => Observable<U>
  ) : Observable<IScheduleRequestResponse<U> | IPipelineWarningEvent> {
    const backoffOptions = { baseDelay: options.initialBackoffDelay,
                             maxDelay: options.maximumBackoffDelay,
                             maxRetryRegular: options.maxRetry,
                             maxRetryOffline: options.maxRetryOffline };
    return backoff(tryCatch(request, undefined), backoffOptions).pipe(
      mergeMap(evt => {
        if (evt.type === "retry") {
          const error = errorSelector(evt.value);
          return observableOf({
            type: "warning" as const,
            value: error,
          });
        }
        return observableOf({
          type: "schedule-request-response" as const,
          value: evt.value,
        });
      }),
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }));
  }

  /**
   * Process a pipeline observable to adapt it to the the rest of the code:
   *   - use the requests subject for network requests and their progress
   *   - use the warning$ subject for retries' error messages
   *   - only emit the data
   * @param {string} pipelineType
   * @param {Observable} pipeline$
   * @returns {Observable}
   */
  return function fetchSegment(
    content : ISegmentLoaderArguments
  ) : Observable<ISegmentFetcherEvent<T>> {
    const id = generateRequestID();
    let requestBeginSent = false;
    const segmentLoader$ = segmentLoader(content).pipe(
      tap((arg) => {
        switch (arg.type) {
          case "metrics": {
            const { value } = arg;
            const { size, duration } = value; // unwrapping for TS

            // format it for ABR Handling
            if (size != null && duration != null) {
              requests$.next({ type: "metrics",
                              value: { size, duration, content } });
            }
            break;
          }

          case "request": {
            const { value } = arg;

            // format it for ABR Handling
            const segment : ISegment|undefined = value.segment;
            if (segment == null || segment.duration == null) {
              return;
            }
            requestBeginSent = true;
            const duration = segment.duration / segment.timescale;
            const time = segment.time / segment.timescale;
            requests$.next({ type: "requestBegin",
                             value: { duration,
                                      time,
                                      requestTimestamp: performance.now(),
                                      id } });
            break;
          }

          case "progress": {
            const { value } = arg;
            if (value.totalSize != null && value.size < value.totalSize) {
              requests$.next({ type: "progress",
                               value: { duration: value.duration,
                                        size: value.size,
                                        totalSize: value.totalSize,
                                        timestamp: performance.now(),
                                        id } });
            }
            break;
          }
        }
      }),

      finalize(() => {
        if (requestBeginSent) {
          requests$.next({ type: "requestEnd", value: { id } });
        }
      }),

      filter((e) : e is IPipelineLoaderChunk |
                        IPipelineLoaderChunkComplete |
                        IPipelineLoaderData<T> |
                        ISegmentFetcherWarning => e.type === "warning" ||
                                                  e.type === "chunk" ||
                                                  e.type === "chunk-complete" ||
                                                  e.type === "data"),

      mergeMap((evt) => {
        if (evt.type === "warning") {
          return observableOf(evt);
        }
        if (evt.type === "chunk-complete") {
          return observableOf({ type: "chunk-complete" as const });
        }

        const isChunked = evt.type === "chunk";
        const data = {
          type: "chunk" as const,
          /**
           * Parse the loaded data.
           * @param {Object} [init]
           * @returns {Observable}
           */
          parse(init? : IChunkTimingInfos) :
            Observable<ISegmentParserResponseEvent<T> | IPipelineWarningEvent> {
            const response = { data: evt.value.responseData, isChunked };
            /* tslint:disable no-unsafe-any */
            return segmentParser({ response, init, content, scheduleRequest })
            /* tslint:enable no-unsafe-any */
              .pipe(catchError((error: unknown) => {
                throw formatError(error, { defaultCode: "PIPELINE_PARSE_ERROR",
                                           defaultReason: "Unknown parsing error" });
              }));
          },
        };

        if (isChunked) {
          return observableOf(data);
        }
        return observableConcat(observableOf(data),
                                observableOf({ type: "chunk-complete" as const }));
      }),
      share() // avoid multiple side effects if multiple subs
    );

    return segmentLoader$;
  };
}
