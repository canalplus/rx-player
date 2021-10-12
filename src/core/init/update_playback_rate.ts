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
  distinctUntilChanged,
  map,
  Observable,
  of as observableOf,
  startWith,
  switchMap,
  tap,
} from "rxjs";
import log from "../../log";
import { IInitClockTick } from "./types";

export interface IPlaybackRateOptions { pauseWhenRebuffering? : boolean }

/**
 * Manage playback speed.
 * Set playback rate set by the user, pause playback when the player appear to
 * rebuffering and restore the speed once it appears to exit rebuffering status.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} speed$ - emit speed set by the user
 * @param {Observable} clock$ - Current playback conditions
 * @returns {Observable}
 */
export default function updatePlaybackRate(
  mediaElement : HTMLMediaElement,
  speed$ : Observable<number>,
  clock$ : Observable<IInitClockTick>
) : Observable<number> {
  const forcePause$ = clock$
    .pipe(
      map((timing) => timing.rebuffering !== null),
      startWith(false),
      distinctUntilChanged()
    );

  return forcePause$
    .pipe(switchMap(shouldForcePause => {
      if (shouldForcePause) {
        return observableDefer(() => {
          log.info("Init: Pause playback to build buffer");
          mediaElement.playbackRate = 0;
          return observableOf(0);
        });
      }
      return speed$
        .pipe(tap((speed) => {
          log.info("Init: Resume playback speed", speed);
          mediaElement.playbackRate = speed;
        }));
    }));
}
