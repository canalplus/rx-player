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
  distinctUntilChanged,
  filter,
  map,
  Observable,
  startWith,
} from "rxjs";
import Manifest from "../../../manifest";
import filterMap from "../../../utils/filter_map";
import { IStreamOrchestratorEvent, IStreamStatusEvent } from "../types";

/**
 * Returns an Observable which emits ``true`` when all PeriodStreams given are
 * _complete_.
 * Returns false otherwise.
 *
 * A PeriodStream for a given type is considered _complete_ when both of these
 * conditions are true:
 *   - it is the last PeriodStream in the content for the given type
 *   - it has finished downloading segments (it is _full_)
 *
 * Simply put a _complete_ PeriodStream for a given type means that every
 * segments needed for this Stream have been downloaded.
 *
 * When the Observable returned here emits, every Stream are finished.
 * @param {Object} manifest
 * @param {...Observable} streams
 * @returns {Observable}
 */
export default function areStreamsComplete(
  manifest : Manifest,
  ...streams : Array<Observable<IStreamOrchestratorEvent>>
) : Observable<boolean> {
  /**
   * Array of Observables linked to the Array of Streams which emit:
   *   - true when the corresponding Stream is considered _complete_.
   *   - false when the corresponding Stream is considered _active_.
   * @type {Array.<Observable>}
   */
  const isCompleteArray : Array<Observable<boolean>> = streams
    .map((stream) => {
      return stream.pipe(
        filter((evt) : evt is IStreamStatusEvent => evt.type === "stream-status"),
        filterMap<IStreamStatusEvent, boolean, null>((evt) => {
          if (evt.value.hasFinishedLoading || evt.value.isEmptyStream) {
            return manifest.getPeriodAfter(evt.value.period) === null ?
              true :
              null; // not the last Period: ignore event
          }
          return false;
        }, null),
        startWith(false),
        distinctUntilChanged()
      );
    });

  return observableCombineLatest(isCompleteArray).pipe(
    map((areComplete) => areComplete.every((isComplete) => isComplete)),
    distinctUntilChanged()
  );
}
