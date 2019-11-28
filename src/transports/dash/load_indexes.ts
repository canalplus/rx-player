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
  Subject,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
  takeUntil,
  tap,
} from "rxjs/operators";
import {
  getReferencesFromSidx,
  ISidxReference,
} from "../../parsers/containers/isobmff";
import request from "../../utils/request/xhr";
import {
  IContent,
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
 * Request 'sidx' box from segment.
 * @param {String} url
 * @param {Object} range
 * @returns {Observable<Object>}
 */
function requestArrayBufferResource(
  url : string,
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
 * @returns {Observable}
 */
export default function loadIndexes(indexesToLoad: ISidxReference[],
  content: IContent,
  scheduleRequest: <U>(request : () => Observable<U>) =>
    Observable<IScheduleRequestResponse<U> | ITransportWarningEvent>
  ): Observable<ITransportRetryEvent|ILoadIndexDataEvent> {
  const url = content.segment.mediaURL;
  if (url === null) {
    throw new Error("No URL for loading indexes.");
  }

  const retry$: Subject<ITransportRetryEvent> = new Subject();

  const loadedRessources$ = indexesToLoad.map(({ range }) => {
    return scheduleRequest(() => {
      return requestArrayBufferResource(url, range).pipe(
        map((r) => {
          return {
            response: r,
            range,
          };
        })
      );
    }).pipe(
      tap((evt) => {
        if (evt.type === "warning") {
          retry$.next({
                type: "retry" as const,
                value: {
                  error: evt.value,
                  segment: content.segment,
                },
              });
        }
      }),
      filter((evt): evt is IScheduleRequestResponse<{
        range: [number, number];
        response: ILoaderDataLoadedValue<ArrayBuffer|Uint8Array>;
      }> => evt.type !== "warning")
    );
  });

  const ressourceLoaded$ = combineLatest(loadedRessources$).pipe(
    mergeMap((evts) => {
      const newIndexes: ISidxReference[] = [];
      for (let i = 0; i < evts.length; i++) {
        const evt = evts[i];
        const loadedRessource = evt.value;
        const newSegments: ISidxReference[] = [];
        const {
          response: { responseData },
          range,
        } = loadedRessource;
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
      return observableOf({ type: "done" as const, value: undefined });
    })
  );

  return observableMerge(ressourceLoaded$,
                         retry$.pipe(takeUntil(ressourceLoaded$)));
}
