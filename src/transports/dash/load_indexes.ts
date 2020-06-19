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
  combineLatest,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
  scan,
} from "rxjs/operators";
import {
  ISegment,
  Representation
} from "../../manifest";
import {
  getReferencesFromSidx,
  ISidxReference,
} from "../../parsers/containers/isobmff";
import request from "../../utils/request/xhr";
import {
  ILoaderDataLoadedValue,
  IScheduleRequestResponse,
  ITransportRetryEvent,
  ITransportWarningEvent,
} from "../types";
import byteRange from "../utils/byte_range";

interface ILoadIndexDataEvent {
  type: "done";
  value: undefined;
}

/**
 * Request arraybuffer resource.
 * @param {String} url
 * @param {Object} range
 * @returns {Observable<Object>}
 */
function requestArrayBufferResource(url : string,
                                    range? : [number, number]
) : Observable<ILoaderDataLoadedValue<ArrayBuffer>> {
  let headers = {};
  if (range !== undefined) {
    headers = { Range: byteRange(range) };
  }
  return request({ url,
                   responseType: "arraybuffer",
                   headers })
  .pipe(map((e) => e.value));
}

/**
 * Load 'sidx' boxes from indexes references.
 * @param {Array.<Object>} indexesToLoad
 * @param {Object} content
 * @param {Function} scheduleRequest
 * @returns {Observable}
 */
export default function loadIndexes(indexesToLoad: ISidxReference[],
                                    content: { segment: ISegment;
                                               representation: Representation; },
                                    scheduleRequest: <U>(request : () => Observable<U>) =>
                                      Observable<IScheduleRequestResponse<U> |
                                                 ITransportWarningEvent>
  ): Observable<ITransportRetryEvent|ILoadIndexDataEvent> {
  const url = content.segment.mediaURLs !== null ? (content.segment.mediaURLs[0] ?? "") :
                                                   "";
  if (url === null) {
    throw new Error("No URL for loading indexes.");
  }

  const loadedRessources$ = indexesToLoad.map(({ range }) => {
    return scheduleRequest(() => {
      return requestArrayBufferResource(url, range).pipe(
        map((r) => ({ response: r,
                      range }))
      );
    }).pipe(
      scan((acc: { retries: ITransportRetryEvent[];
                   scheduleResponseEvt: undefined|
                                        IScheduleRequestResponse<{
                                          response: ILoaderDataLoadedValue<ArrayBuffer>;
                                          range: [number, number];
                                        }>; }, evt) => {
        if (evt.type === "warning") {
          acc.retries.push({ type: "retry" as const,
                             value: { error: evt.value,
                                      segment: content.segment } });
        } else {
          acc.scheduleResponseEvt = evt;
        }
        return acc;
      }, { retries: [], scheduleResponseEvt: undefined }),
      filter((payload): payload is {
        retries: ITransportRetryEvent[];
        scheduleResponseEvt: IScheduleRequestResponse<{
          response: ILoaderDataLoadedValue<ArrayBuffer>;
          range: [number, number];
        }>;
      } => payload.scheduleResponseEvt !== undefined)
    );
  });

  return combineLatest(loadedRessources$).pipe(
    mergeMap((evts) => {
      const cumulatedRetries = [];
      const newIndexes: ISidxReference[] = [];
      for (let i = 0; i < evts.length; i++) {
        const evt = evts[i];
        const loadedRessource = evt.scheduleResponseEvt.value;
        cumulatedRetries.push(...evt.retries);
        const newSegments: ISidxReference[] = [];
        const { response: { responseData },
                range } = loadedRessource;
        if (responseData !== undefined) {
          const sidxBox = new Uint8Array(responseData);
          const indexOffset = range[0];
          const referencesFromSidx = getReferencesFromSidx(sidxBox, indexOffset);
          if (referencesFromSidx !== null) {
            const [indexReferences, segmentReferences] = referencesFromSidx;
            segmentReferences.forEach((segment) => {
              newSegments.push(segment);
            });
            indexReferences.forEach((index) => {
              newIndexes.push(index);
            });
          }
        }

        if (newSegments.length > 0) {
          content.representation.index._addSegments(newSegments);
        }
      }
      if (newIndexes.length > 0) {
        return loadIndexes(newIndexes, content, scheduleRequest);
      }
      return observableMerge(
        observableOf({ type: "done" as const, value: undefined }),
        observableOf(...cumulatedRetries)
      );
    })
  );
}
