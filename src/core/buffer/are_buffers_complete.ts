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
  combineLatest as observableCombineLatest,
  Observable,
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  startWith,
} from "rxjs/operators";
import { IMultiplePeriodBuffersEvent } from "./types";

/**
 * Returns an Observable which emits ``true`` when all PeriodBuffers given are
 * _complete_.
 * Returns false otherwise.
 *
 * A PeriodBuffer for a given type is considered _complete_ when both of these
 * conditions are true:
 *   - it is the last PeriodBuffer in the content for the given type
 *   - it has finished downloading segments (it is _full_)
 *
 * Simply put a _complete_ PeriodBuffer for a given type means that every
 * segments needed for this Buffer have been downloaded.
 *
 * When the Observable returned here emits, every Buffer are finished.
 * @param {...Observable} buffers
 * @returns {Observable}
 */
export default function areBuffersComplete(
  ...buffers : Array<Observable<IMultiplePeriodBuffersEvent>>
) : Observable<boolean> {
  /**
   * Array of Observables linked to the Array of Buffers which emit:
   *   - true when the corresponding buffer is considered _complete_.
   *   - false when the corresponding buffer is considered _active_.
   * @type {Array.<Observable>}
   */
  const isCompleteArray : Array<Observable<boolean>> = buffers
    .map((buffer) => {
      return buffer.pipe(
        filter((evt) => {
          return evt.type === "complete-buffer" || evt.type === "active-buffer";
        }),
        map((evt) => evt.type === "complete-buffer"),
        startWith(false),
        distinctUntilChanged()
      );
    });

  return observableCombineLatest(...isCompleteArray)
    .pipe(
      map((areComplete) => areComplete.every((isComplete) => isComplete)),
      distinctUntilChanged()
    );
}
