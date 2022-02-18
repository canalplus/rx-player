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
  map,
  Observable,
} from "rxjs";
import { IPeriod } from "../../manifest";
import { IReadOnlyPlaybackObserver } from "../api";
import { IBufferType } from "../segment_buffers";
import EVENTS from "./events_generators";
import { IWaitingMediaSourceReloadInternalEvent } from "./types";

/**
 * Regularly ask to reload the MediaSource on each playback observation
 * performed by the playback observer.
 *
 * If and only if the Period currently played corresponds to `Period`, applies
 * an offset to the reloaded position corresponding to `deltaPos`.
 * This can be useful for example when switching the audio/video track, where
 * you might want to give back some context if that was the currently played
 * track.
 *
 * @param {Object} period - The Period linked to the Adaptation or
 * Representation that you want to switch to.
 * @param {Observable} playbackObserver - emit playback conditions.
 * Has to emit last playback conditions immediately on subscribe.
 * @param {number} deltaPos - If the concerned Period is playing at the time
 * this function is called, we will add this value, in seconds, to the current
 * position to indicate the position we should reload at.
 * This value allows to give back context (by replaying some media data) after
 * a switch.
 * @returns {Observable}
 */
export default function reloadAfterSwitch(
  period : IPeriod,
  bufferType : IBufferType,
  playbackObserver : IReadOnlyPlaybackObserver<{
    position : number;
    isPaused : boolean;
  }>,
  deltaPos : number
) : Observable<IWaitingMediaSourceReloadInternalEvent> {
  return playbackObserver.observe(true).pipe(
    map((observation) => {
      const currentTime = playbackObserver.getCurrentTime();
      const pos = currentTime + deltaPos;

      // Bind to Period start and end
      const reloadAt = Math.min(Math.max(period.start, pos),
                                period.end ?? Infinity);
      return EVENTS.waitingMediaSourceReload(bufferType,
                                             period,
                                             reloadAt,
                                             !observation.isPaused);
    }));
}
