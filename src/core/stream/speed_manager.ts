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

import { Observable } from "rxjs/Observable";
import log from "../../utils/log";

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
 * @param {BehaviorSubject} speed$ - emit speed set by the user
 * @param {Observable} clock$
 * @param {Object} options
 * @param {Boolean} [options.pauseWhenStalled=true] - true if the player
 * stalling should lead to a pause until it un-stalls.
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
    forcePause$ = Observable.of(false);
  } else {
    forcePause$ = clock$
      .pairwise()
      .map(([prevTiming, timing]) => {
        const isStalled = timing.stalled;
        const wasStalled = prevTiming.stalled;
        if (
          !wasStalled !== !isStalled || // xor
          (wasStalled && isStalled && wasStalled.state !== isStalled.state)
        ) {
          return !wasStalled;
        }
      })
        .filter(val => val != null)

        // TODO the filter is 2smart4TypeScript. Find better solution eventually
        .startWith(false) as Observable<boolean>;
  }

  return forcePause$
    .switchMap(shouldForcePause => {
      if (shouldForcePause) {
        return Observable.defer(() => {
          log.info("pause playback to build buffer");
          videoElement.playbackRate = 0;
          return Observable.of(0);
        });
      }
      return speed$
        .do((speed) => {
          log.info("resume playback speed", speed);
          videoElement.playbackRate = speed;
        });
    });
};

export default speedManager;
