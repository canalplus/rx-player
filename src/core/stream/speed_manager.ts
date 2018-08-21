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
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  pairwise,
  startWith,
  switchMap,
  tap,
} from "rxjs/operators";
import log from "../../log";
import { IStreamClockTick } from "./types";

export interface ISpeedManagerOptions {
  pauseWhenStalled? : boolean;
}

/**
 * Manage playback speed.
 * Set playback rate set by the user, pause playback when the player appear to
 * stall and restore the speed once it appears to un-stall.
 *
 * @param {HTMLMediaElement} videoElement
 * @param {Observable} speed$ - emit speed set by the user
 * @param {Observable} clock$
 * @param {Object} options - Contains the following properties:
 *   - pauseWhenStalled {Boolean|undefined} - true if the player
 *     stalling should lead to a pause until it un-stalls. True by default.
 * @returns {Observable}
 */
const speedManager = (
  videoElement : HTMLMediaElement,
  speed$ : Observable<number>,
  clock$ : Observable<IStreamClockTick>,
  { pauseWhenStalled = true } : ISpeedManagerOptions
) : Observable<number> => {
  let forcePause$ : Observable<boolean>;

  if (!pauseWhenStalled) {
    forcePause$ = observableOf(false);
  } else {
    const lastTwoTicks$ : Observable<[IStreamClockTick, IStreamClockTick]> =
      clock$.pipe(pairwise());

    forcePause$ = lastTwoTicks$
      .pipe(
        map(([prevTiming, timing]) => {
          const isStalled = timing.stalled;
          const wasStalled = prevTiming.stalled;
          if (
            !wasStalled !== !isStalled || // xor
            (wasStalled && isStalled && wasStalled.reason !== isStalled.reason)
          ) {
            return !wasStalled;
          }
        }),
        filter((val : boolean|undefined) : val is boolean => val != null),
        startWith(false)
      );
  }

  return forcePause$
    .pipe(switchMap(shouldForcePause => {
      if (shouldForcePause) {
        return observableDefer(() => {
          log.info("pause playback to build buffer");
          videoElement.playbackRate = 0;
          return observableOf(0);
        });
      }
      return speed$
        .pipe(tap((speed) => {
          log.info("resume playback speed", speed);
          videoElement.playbackRate = speed;
        }));
    }));
};

export default speedManager;
