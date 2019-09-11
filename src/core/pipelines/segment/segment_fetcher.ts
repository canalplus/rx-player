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
import { Observable, Subject } from "rxjs";
import {
  catchError,
  filter,
  finalize,
  map,
  share,
  tap,
} from "rxjs/operators";
import { formatError } from "../../../errors";
import { ISegment } from "../../../manifest";
import {
  ISegmentLoaderArguments,
  ISegmentParserResponse,
  ISegmentTimingInfos,
  ITransportPipelines,
} from "../../../transports";
import idGenerator from "../../../utils/id_generator";
import {
  IABRMetric,
  IABRRequest,
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import createSegmentLoader, {
  IPipelineLoaderChunk,
  IPipelineLoaderChunkComplete,
  IPipelineLoaderWarning,
  ISegmentPipelineLoaderOptions,
} from "./create_segment_loader";

export type ISegmentFetcherWarning = IPipelineLoaderWarning;

export interface ISegmentFetcherChunkCompleteEvent { type: "chunk-complete"; }

export interface ISegmentFetcherChunkEvent<T> {
  type : "chunk";
  parse : (init? : ISegmentTimingInfos) => Observable<ISegmentParserResponse<T>>;
}

export type ISegmentFetcherEvent<T> = ISegmentFetcherChunkCompleteEvent |
                                      ISegmentFetcherChunkEvent<T> |
                                      ISegmentFetcherWarning;

export type ISegmentFetcher<T> = (content : ISegmentLoaderArguments) =>
                                   Observable<ISegmentFetcherEvent<T>>;

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
    return segmentLoader(content).pipe(
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
            const segment : ISegment|undefined = value && value.segment;
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

      filter((e) : e is IPipelineLoaderChunk<T> |
                        IPipelineLoaderChunkComplete |
                        ISegmentFetcherWarning =>
        e.type === "warning" || e.type === "chunk" || e.type === "chunk-complete"),

      map((response) => {
        if (response.type === "warning") {
          return response;
        }
        if (response.type === "chunk-complete") {
          return { type: "chunk-complete" as const };
        }
        return {
          type: "chunk" as const,
          /**
           * Parse the loaded data.
           * @param {Object} [init]
           * @returns {Observable}
           */
          parse(init? : ISegmentTimingInfos) : Observable<ISegmentParserResponse<T>> {
            const parserArg = objectAssign({ response: response.value, init }, content);
            return segmentParser(parserArg)
              .pipe(catchError((error: unknown) => {
                throw formatError(error, { defaultCode: "PIPELINE_PARSE_ERROR",
                                           defaultReason: "Unknown parsing error" });
              }));
          },
        };
      }),
      share() // avoid multiple side effects if multiple subs
    );
  };
}
