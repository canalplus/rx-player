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
  Observable,
  Subject,
} from "rxjs";
import {
  catchError,
  filter,
  finalize,
  map,
  share,
  tap,
} from "rxjs/operators";
import {
  ICustomError,
  isKnownError,
  OtherError,
} from "../../../errors";
import { ISegment } from "../../../manifest";
import {
  ISegmentLoaderArguments,
  ISegmentTimingInfos,
  ITransportPipelines,
} from "../../../transports";
import idGenerator from "../../../utils/id_generator";
import {
  IABRMetric,
  IABRRequest
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import createLoader, {
  IPipelineLoaderOptions,
  IPipelineLoaderResponse,
} from "../utils/create_loader";

interface IParsedSegment<T> {
  segmentData : T;
  segmentInfos : {
    duration? : number;
    time : number;
    timescale : number;
  };
  segmentOffset : number;
}

export interface IFetchedSegment<T> {
  parse : (init? : ISegmentTimingInfos) => Observable<IParsedSegment<T>>;
}

export type ISegmentFetcher<T> =
  (content : ISegmentLoaderArguments) => Observable<IFetchedSegment<T>>;

const generateRequestID = idGenerator();

/**
 * Create a function which will fetch segments.
 *
 * This function will:
 *   - only emit the resulting data
 *   - dispatch the other infos through the right subjects.
 *
 * @param {string} bufferType
 * @param {Object} transport
 * @param {Subject} network$ - Subject through which network metrics will be
 * sent, for the ABR.
 * @param {Subject} requests$ - Subject through which requests infos will be
 * sent, for the ABR.
 * @param {Subject} warning$ - Subject through which minor requests error will
 * be sent.
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentFetcher<T>(
  bufferType : IBufferType,
  transport : ITransportPipelines,
  network$ : Subject<IABRMetric>,
  requests$ : Subject<Subject<IABRRequest>>,
  warning$ : Subject<Error|ICustomError>,
  options : IPipelineLoaderOptions<ISegmentLoaderArguments, T>
) : ISegmentFetcher<T> {
  const segmentLoader = createLoader(transport[bufferType], options);
  const segmentParser = transport[bufferType].parser as any; // deal with it
  let request$ : Subject<IABRRequest>|undefined;
  let id : string|undefined;

  /**
   * Process a pipeline observable to adapt it to the the rest of the code:
   *   - use the network$ subject for network metrics (bandwitdh mesure)
   *   - use the requests subject for network requests and their progress
   *   - use the warning$ subject for retries' error messages
   *   - only emit the data
   * @param {string} pipelineType
   * @param {Observable} pipeline$
   * @returns {Observable}
   */
  return function fetchSegment(
    content : ISegmentLoaderArguments
  ) : Observable<IFetchedSegment<T>> {
    return segmentLoader(content).pipe(

      tap((arg) => {
        switch (arg.type) {
          case "error":
            warning$.next(objectAssign(arg.value, { pipelineType: bufferType }));
            break;

          case "metrics": {
            const { value } = arg;
            const { size, duration } = value; // unwrapping for TS

            // format it for ABR Handling
            if (size != null && duration != null) {
              network$.next({
                type: bufferType,
                value: {
                  size,
                  duration,
                  content,
                },
              });
            }
            break;
          }

          case "request": {
            const { value } = arg;

            // format it for ABR Handling
            const segment : ISegment|undefined = value && value.segment;
            if (segment != null && segment.duration != null) {
              request$ = new Subject();
              requests$.next(request$);

              const duration = segment.duration / segment.timescale;
              const time = segment.time / segment.timescale;
              id = generateRequestID();
              request$.next({
                type: bufferType,
                event: "requestBegin",
                value: {
                  duration,
                  time,
                  requestTimestamp: performance.now(),
                  id,
                },
              });
            }
            break;
          }

          case "progress": {
            const { value } = arg;
            if (
              value.totalSize != null &&
              value.size < value.totalSize &&
              id != null &&
              request$ != null
            ) {
              request$.next({
                type: bufferType,
                event: "progress",
                value: {
                  duration: value.duration,
                  size: value.size,
                  totalSize: value.totalSize,
                  timestamp: performance.now(),
                  id,
                },
              });
            }
            break;
          }
        }
      }),

      filter((arg) : arg is IPipelineLoaderResponse<any> =>
        arg.type === "response"
      ),

      finalize(() => {
        if (request$ != null) {
          if (id != null) {
            request$.next({
              type: bufferType,
              event: "requestEnd",
              value: { id },
            });
          }
          request$.complete();
        }
      }),

      map((response) => {
        return {
          /**
           * Parse the loaded data.
           * @param {Object} [init]
           * @returns {Observable}
           */
          parse(init? : ISegmentTimingInfos) : Observable<IParsedSegment<T>> {
            const parserArg = objectAssign({ response: response.value, init }, content);
            return segmentParser(parserArg)
              .pipe(catchError((error) => {
                const formattedError = isKnownError(error) ?
                  error : new OtherError("PIPELINE_PARSING_ERROR", error, true);
                throw formattedError;
              }));
          },
        };
      }),

      share() // avoid multiple side effects if multiple subs
    );
  };
}
