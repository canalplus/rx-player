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
  Observable,
  of as observableOf,
} from "rxjs";
import {
  map,
  mergeMap,
  take,
} from "rxjs/operators";
import { Period } from "../../manifest";
import EVENTS from "./events_generators";
import { INeedsMediaSourceReload } from "./types";

/**
 * Switching to another `Adaptation` and or `Representation` can necessitate a
 * complete reload of the MediaSource.
 *
 * This is done through the `INeedsMediaSourceReload` event which among other
 * things indicate the position the player should seek to after "reloading".
 * That position depends on the playback conditions at the time of the switch.
 *
 * When you already know you have to reload, you can call this function to take
 * care of that complex behavior:
 *
 *   - If `period` is not being played when that function is called, this
 *     function will emit regularly the `INeedsMediaSourceReload` event after
 *     applying the given `deltaPos` value to the reloading position.
 *
 *   - If `period` is not being when that function is called, it emits regularly
 *     the `INeedsMediaSourceReload` without applying the given `deltaPos` value
 *     to the reloading position.
 *     This is because that value is only applied when the previous Adaptation
 *     or Representation for the current Period was being played and should not
 *     be for cases like entering the current Period, or seeking _into_ th
 *     current Period.
 *     The main point of that configuration variable being to give back some
 *     context, there is no context to give back on those cases (as the Period
 *     was not already playing).
 *
 * @param {Object} period - The Period linked to the Adaptation or
 * Representation that you want to switch to.
 * @param {Observable} clock$ - Observable emitting playback conditions.
 * Has to emit last playback conditions immediately on subscribe.
 * @param {number} deltaPos - If the concerned Period is playing at the time
 * this function is called, we will add this value, in seconds, to the current
 * position to indicate the position we should reload at.
 * This value allows to give back context (by replaying some media data) after
 * a switch.
 * @returns {Observable}
 */
export default function reloadAfterSwitch(
  period : Period,
  clock$ : Observable<{
    getCurrentTime : () => number;
    position : number;
    isPaused : boolean;
  }>,
  deltaPos : number
) : Observable<INeedsMediaSourceReload> {
  return clock$.pipe(
    take(1), // only the first (current) event interests us here
    mergeMap((initialTick) => {
      if (period.start <= initialTick.position &&
          (period.end === undefined || period.end > initialTick.position))
      {
        // if the Period was playing at the time of the switch
        const pos = initialTick.getCurrentTime() + deltaPos;
        const reloadAt = Math.min(Math.max(period.start, pos),
                                  period.end ?? Infinity);
        return observableOf(EVENTS.needsMediaSourceReload(period,
                                                          reloadAt,
                                                          initialTick.isPaused));
      }

      // If the Period was not playing, just ask to reload to the exact same position
      return clock$.pipe(
        map(tick => EVENTS.needsMediaSourceReload(period,
                                                  tick.getCurrentTime(),
                                                  tick.isPaused)));
    }));
}
