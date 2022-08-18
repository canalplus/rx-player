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
import log from "../../../common/log";
import { IReadOnlySharedReference } from "../../../common/utils/reference";
import { IPlaybackObservation } from "../api";

export interface IPlaybackRateOptions { pauseWhenRebuffering? : boolean }

/**
 * Manage playback speed.
 * Set playback rate set by the user, pause playback when the player appear to
 * rebuffering and restore the speed once it appears to exit rebuffering status.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} speed - last speed set by the user
 * @param {Observable} observation$ - Current playback conditions
 * @returns {Observable}
 */
export default function updatePlaybackRate(
  mediaElement : HTMLMediaElement,
  speed : IReadOnlySharedReference<number>,
  observation$ : Observable<IPlaybackObservation>
) : Observable<number> {
  const forcePause$ = observation$
    .pipe(
      map((observation) => observation.rebuffering !== null),
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
      return speed.asObservable()
        .pipe(tap((lastSpeed) => {
          log.info("Init: Resume playback speed", lastSpeed);
          mediaElement.playbackRate = lastSpeed;
        }));
    }));
}
