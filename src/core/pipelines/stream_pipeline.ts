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

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { CustomError } from "../../errors";
import { Segment } from "../../manifest";
import generateID from "../../utils/id";
import {
  IABRMetric,
  IABRRequest
} from "../abr";
import { SupportedBufferTypes } from "../source_buffers";
import { PipelineEvent } from "./pipeline";

/**
 * TODO merge with regular pipeline?
 * Factory to easily creates pipelines adapted to the Stream:
 *   - Only take the type of buffer and the corresponding pipeline in arguments
 *     and only emit the result while dispatching the other infos through the
 *     right subjects.
 * @param {Subject} network$ - Subject through which network metrics will be
 * sent, for the ABR.
 * @param {Subject} requests$ - Subject through which requests infos will be
 * sent, for the ABR.
 * @param {Subject} warning$ - Subject through which minor requests error will
 * be sent.
 * @returns {Function}
 */
export default function streamPipelineFactory(
  network$ : Subject<IABRMetric>,
  requests$ : Subject<Subject<IABRRequest>>,
  warning$ : Subject<Error|CustomError>
) {
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
  return function createStreamPipeline(
    pipelineType : SupportedBufferTypes|"manifest",
    pipeline$ : Observable<PipelineEvent>
  ) : Observable<any> {
    let request$ : Subject<IABRRequest>|undefined;
    let id : string|undefined;
    return pipeline$
      .filter(({ type, value } : PipelineEvent) => {
        if (type === "data" || type === "cache") {
          return true;
        }

        // -- SIDE EFFECTS --
        // ugly to do side effect in a filter, but heh

        if (type === "error") {
          // value is an Error. Add the pipeline type information to it.
          value.pipelineType = pipelineType;
          warning$.next(value);
        } else if (pipelineType !== "manifest") {
          switch (type) {
            case "metrics": {
              // format it for ABR Handling
              network$.next({ type: pipelineType, value });
              break;
            }

            case "request": {
              // format it for ABR Handling if the right format
              const segment : Segment|undefined = value && value.segment;
              if (segment != null && segment.duration != null) {
                const duration = segment.duration / segment.timescale;
                const time = segment.time / segment.timescale;
                id = generateID();

                const segmentInfos = {
                  duration,
                  time,
                  requestTimestamp: Date.now(),
                  id,
                };

                request$ = new Subject();
                requests$.next(request$);

                request$.next({
                  type: pipelineType,
                  event: "requestBegin",
                  value: segmentInfos,
                });
              }
              break;
            }

            case "progress": {
              if (value.size === value.totalSize) {
                return false;
              }
              if (id != null) {
                const progressInfos = {
                  duration: value.duration,
                  size: value.size,
                  totalSize: value.totalSize,
                  timestamp: Date.now(),
                  id,
                };

                if (request$ != null) {
                  request$.next({
                    type: pipelineType,
                    event: "progress",
                    value: progressInfos,
                  });
                }
              }
              break;
            }
          }
        }
        return false;
      })
      .map(({ value }) => value) // take only value from data/cache events
      .finally(() => {
        if (request$ != null) {
          if (pipelineType !== "manifest" && id != null) {
            request$.next({
              type: pipelineType,
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
