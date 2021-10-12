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
  defer as observableDefer,
  EMPTY,
  filter,
  mapTo,
  merge as observableMerge,
  Observable,
  startWith,
  switchMapTo,
  take,
} from "rxjs";
import { IClockTick } from "./clock";

/**
 * Returns Observable which will emit:
 *   - `"seeking"` when we are seeking in the given mediaElement
 *   - `"seeked"` when a seek is considered as finished by the given clock$
 *     Observable.
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} clock$
 * @returns {Observable}
 */
export default function emitSeekEvents(
  mediaElement : HTMLMediaElement | null,
  clock$ : Observable<IClockTick>
) : Observable<"seeking" | "seeked"> {
  return observableDefer(() => {
    if (mediaElement === null) {
      return EMPTY;
    }

    const isSeeking$ = clock$.pipe(
      filter((tick : IClockTick) => tick.event === "seeking"),
      mapTo("seeking" as const)
    );
    const hasSeeked$ = isSeeking$.pipe(
      switchMapTo(
        clock$.pipe(
          filter((tick : IClockTick) => tick.event === "seeked"),
          mapTo("seeked" as const),
          take(1)))
    );
    const seekingEvents$ = observableMerge(isSeeking$, hasSeeked$);
    return mediaElement.seeking ? seekingEvents$.pipe(startWith("seeking" as const)) :
                                  seekingEvents$;
  });
}
