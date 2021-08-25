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
import { map } from "rxjs/operators";
import { Period } from "../../manifest";
import EVENTS from "./events_generators";
import { INeedsMediaSourceReload } from "./types";

/**
 * Regularly ask to reload the MediaSource on each `clock$` tick.
 *
 * If and only if the Period currently played corresponds to `Period`, applies
 * an offset to the reloaded position corresponding to `deltaPos`.
 * This can be useful for example when switching the audio/video track, where
 * you might want to give back some context if that was the currently played
 * track.
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
    map((tick) => {
      const currentTime = tick.getCurrentTime();
      if (currentTime < period.start ||
          (period.end !== undefined && currentTime > period.end))
      {
        // The Period was not playing, ask to reload to the same position we're
        // currently at
        return EVENTS.needsMediaSourceReload(period, currentTime, !tick.isPaused);
      }

      // The Period was playing at the time of the switch, add `deltaPos`
      const pos = currentTime + deltaPos;

      // Bind to Period start and end
      const reloadAt = Math.min(Math.max(period.start, pos),
                                period.end ?? Infinity);
      return EVENTS.needsMediaSourceReload(period, reloadAt, !tick.isPaused);
    }));
}
