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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { CustomError } from "../../../errors";
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
import { SupportedBufferTypes } from "../../source_buffers";
import BasePipeline, {
  IPipelineCache,
  IPipelineData,
  IPipelineOptions,
} from "../pipeline";

// Response that should be emitted by the given Pipeline
export interface IPipelineResponse<T> {
  parsed: {
    segmentData : T;
    segmentInfos : {
      duration : number;
      time : number;
      timescale : number;
    };
  };
}

export type IPipeline<T> = (
  content : ISegmentLoaderArguments
) => Observable<IPipelineResponse<T>>;

/**
 * TODO merge with Pipeline
 * Allows to easily create a pipeline adapted to the rest of the code:
 *   - only emit the result
 *   - dispatch the other infos through the right subjects.
 * @param {Subject} network$ - Subject through which network metrics will be
 * sent, for the ABR.
 * @param {Subject} requests$ - Subject through which requests infos will be
 * sent, for the ABR.
 * @param {Subject} warning$ - Subject through which minor requests error will
 * be sent.
 * @returns {Function}
 */
export default function PipelineFactory<T>(
  bufferType : SupportedBufferTypes,
  transport : ITransportPipelines,
  network$ : Subject<IABRMetric>,
  requests$ : Subject<Subject<IABRRequest>>,
  warning$ : Subject<Error|CustomError>,
  options : IPipelineOptions<any, any>
) : IPipeline<T> {
  const basePipeline$ = BasePipeline(transport[bufferType], options);
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
  return function createSegmentPipeline(
    content : ISegmentLoaderArguments
  ) : Observable<IPipelineResponse<T>> {
    return basePipeline$(content)

      .do(({ type, value }) => {
        if (type === "error") {
          // value is an Error. Add the pipeline type information to it.
          warning$.next(objectAssign(value, { pipelineType: bufferType }));
        } else {
          switch (type) {
            case "metrics": {
              // format it for ABR Handling
              network$.next({ type: bufferType, value });
              break;
            }

            case "request": {
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
              if (
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
        }
      })

      .filter((arg) : arg is IPipelineData|IPipelineCache =>
        arg.type === "data" || arg.type === "cache"
      )

      .map(({ value }) => value) // take only value from data/cache events

      .finally(() => {
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
      })

      .share(); // avoid multiple side effects if multiple subs
  };
}
