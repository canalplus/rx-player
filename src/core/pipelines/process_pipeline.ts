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

import Segment from "../../manifest/segment";

import {
  IMetricValue,
  IRequest
} from "../abr";

import { PipelineEvent } from "./types";

import { CustomError } from "../../errors";

import { SupportedBufferTypes } from "../types";

/**
 * Process a pipeline observable to adapt it to the Stream way:
 *   - use the network$ subject for network metrics (bandwitdh mesure)
 *   - use the requests subject for network requests and their progress
 *   - use the warning$ subject for retries' error messages
 *   - only emit the data
 *
 * @param {string} pipelineType
 * @param {Observable} pipeline$
 * @param {Subject} network$
 * @param {Subject} warning$
 * @returns {Observable}
 */
export function processPipeline(
    pipelineType : SupportedBufferTypes|"manifest",
    pipeline$ : Observable<PipelineEvent>,
    network$ : Subject<{
      type: SupportedBufferTypes;
      value: IMetricValue;
    }>,
    requests$ : Subject<Subject<IRequest>>,
    warning$ : Subject<Error|CustomError>
  ) : Observable<any> { // emit the segment data
    let request$ : Subject<IRequest>|undefined;
    let segmentId : string|number|undefined;
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
                segmentId = segment.id;

                const segmentInfos = {
                  duration,
                  time,
                  requestTimestamp: Date.now(),
                  id: segmentId,
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
              if (segmentId != null) {
                const progressInfos = {
                  duration: value.duration,
                  size: value.size,
                  totalSize: value.totalSize,
                  timestamp: Date.now(),
                  id: segmentId,
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
          if (pipelineType !== "manifest" && segmentId != null) {
            request$.next({
              type: pipelineType,
              event: "requestEnd",
              value: { id: segmentId },
            });
          }
          request$.complete();
        }
      })
      .share(); // avoid multiple side effects if multiple subs
  }

/**
 * Process a pipeline observable to adapt it to the Stream way:
 *   - use the warning$ subject for retries' error messages
 *   - only emit the data
 *
 * @param {string} pipelineType
 * @param {Observable} pipeline$
 * @param {Subject} network$
 * @param {Subject} warning$
 * @returns {Observable}
 */
export function processManifestPipeline(
  pipeline$ : Observable<PipelineEvent>,
  warning$ : Subject<Error|CustomError>
) : Observable<any> { // emit the segment data
  return pipeline$
    .filter(({ type, value } : PipelineEvent) => {
      if (type === "data" || type === "cache") {
        return true;
      }
      if (type === "error") {
        // value is an Error. Add the pipeline type information to it.
        value.pipelineType = "manifest";
        warning$.next(value);
      }
      return false;
    })
    .map(({ value }) => value) // take only value from data/cache events
    .share(); // avoid multiple side effects if multiple subs
}
