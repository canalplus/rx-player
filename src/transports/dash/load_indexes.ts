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
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  map,
  mergeMap,
} from "rxjs/operators";
import { IScheduleRequestResponse } from "../../core/pipelines/segment/segment_fetcher";
import {
  getReferencesFromSidx,
  ISidxReference,
} from "../../parsers/containers/isobmff";
import request from "../../utils/request/xhr";
import {
  IContent,
  ILoaderDataLoadedValue,
  ITransportWarningEvent,
} from "../types";
import byteRange from "../utils/byte_range";

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
  scheduleRequest?: <U>(request : () => Observable<U>) =>
    Observable<IScheduleRequestResponse<U> | ITransportWarningEvent>
  ): Observable<ITransportWarningEvent> {
  if (scheduleRequest == null) {
    throw new Error("Can't schedule request for loading indexes.");
  }

  const url = content.segment.mediaURL;
  if (url === null) {
    throw new Error("No URL for loading indexes.");
  }
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
    });
  });

  return observableMerge(...loadedRessources$).pipe(
    mergeMap((evt) => {
      if (evt.type === "warning") {
        return observableOf(evt);
      }
      const loadedRessource = evt.value;
      const newSegments: ISidxReference[] = [];
      const newIndexes: ISidxReference[] = [];
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
      if (newIndexes.length > 0) {
        return loadIndexes(newIndexes, content, scheduleRequest);
      }
      return EMPTY;
    })
  );
}
