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

import { Observable } from "rxjs";
import {
  distinctUntilChanged,
  map,
  share,
} from "rxjs/operators";
import { IInitClockTick } from "./types";

export interface IStallingItem { reason : "freezing" |
                                          "seeking" |
                                          "not-ready" |
                                          "buffering";
                                 timestamp : number; }

/**
 * Receive "stalling" events from the clock, try to get out of it, and re-emit
 * them for the player if the stalling status changed.
 * @param {Observable} clock$
 * @returns {Observable}
 */
export default function getStalledEvents(
  clock$ : Observable<IInitClockTick>
) : Observable<IStallingItem|null> {
  return clock$.pipe(
    share(),
    map(tick => tick.stalled),
    distinctUntilChanged((wasStalled, isStalled) => {
      return wasStalled === null && isStalled === null ||
             (wasStalled !== null && isStalled !== null &&
              wasStalled.reason === isStalled.reason);
    })
  );
}
