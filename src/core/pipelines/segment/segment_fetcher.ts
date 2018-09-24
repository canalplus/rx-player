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
  Observable ,
  Subject
} from "rxjs";
import {
  filter,
  finalize,
  map,
  share,
  tap,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import { ISegment } from "../../../manifest";
import {
  ISegmentLoaderArguments,
  ITransportPipelines,
} from "../../../net/types";
import generateID from "../../../utils/id";
import {
  IABRMetric,
  IABRRequest
} from "../../abr";
import { IBufferType } from "../../source_buffers";
import BasePipeline, {
  IPipelineCache,
  IPipelineData,
  IPipelineOptions,
} from "../core_pipeline";

interface ISegmentResponseParsed<T> {
  segmentData : T;
  segmentInfos : {
    duration? : number;
    time : number;
    timescale : number;
  };
  segmentOffset : number;
}

// Response that should be emitted by the given Pipeline
export interface ISegmentResponse<T> {
  parsed: ISegmentResponseParsed<T>;
}

export type ISegmentFetcher<T> = (
  content : ISegmentLoaderArguments
) => Observable<ISegmentResponse<T>>;

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
  transportPipelines : ITransportPipelines,
  network$ : Subject<IABRMetric>,
  requests$ : Subject<Subject<IABRRequest>>,
  warning$ : Subject<Error|ICustomError>,
  options : IPipelineOptions<ISegmentLoaderArguments, ISegmentResponse<T>>
) : ISegmentFetcher<T> {
  const basePipeline$ = BasePipeline(transportPipelines[bufferType], options);
  let request$ : Subject<IABRRequest>|undefined;
  let id : string|undefined;

  /**
   * Process a pipeline observable to adapt it to the Stream way:
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
  ) : Observable<ISegmentResponse<T>> {
    return basePipeline$(content).pipe(

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
              id = generateID();
              request$.next({
                type: bufferType,
                event: "requestBegin",
                value: {
                  duration,
                  time,
                  requestTimestamp: Date.now(),
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
                  timestamp: Date.now(),
                  id,
                },
              });
            }
            break;
          }
        }
      }),

      filter((
        arg
      ) : arg is
        IPipelineData<ISegmentResponseParsed<T>>|
        IPipelineCache<ISegmentResponseParsed<T>> =>
        arg.type === "data" || arg.type === "cache"
      ),

      // take only value from data/cache events
      map(({ value }) => value),

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

      share() // avoid multiple side effects if multiple subs
    );
  };
}
