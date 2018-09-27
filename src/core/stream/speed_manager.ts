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
  Subject,
} from "rxjs";
import {
  startWith,
  switchMap,
  tap,
} from "rxjs/operators";
import log from "../../log";

export interface ISpeedManagerOptions {
  pauseWhenStalled? : boolean;
}

export interface IPauseRequestHandle {
  free() : void;
}

/**
 * Manage playback speed.
 * Set playback rate set by the user, pause playback when the player appear to
 * stall and restore the speed once it appears to un-stall.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} speed$ - emit speed set by the user
 * @param {Observable} isStalled$
 * @param {Object} options - Contains the following properties:
 *   - pauseWhenStalled {Boolean|undefined} - true if the player
 *     stalling should lead to a pause until it un-stalls. True by default.
 * @returns {Observable}
 */
export default function SpeedManager(
  mediaElement : HTMLMediaElement,
  speed$ : Observable<number>
) : {
  requestPause : () => IPauseRequestHandle;
  speedManager$: Observable<number>;
} {
  let activePauseRequests = 0;
  const forcePause$ = new Subject<boolean>();

  return {
    requestPause() {
      let freed : boolean = false;

      activePauseRequests++;
      log.debug(`SpeedManager: new pause request: ${activePauseRequests}`);
      if (activePauseRequests === 1) {
        forcePause$.next(true);
      }
      return {
        free() {
          if (freed) {
            log.warn("SpeedManager: handle already freed");
            return;
          }

          --activePauseRequests;
          log.debug(`SpeedManager: Pause requests remaining: ${activePauseRequests}`);
          if (activePauseRequests === 0) {
            forcePause$.next(false);
            freed = true;
          }
        },
      };
    },

    speedManager$: forcePause$
      .pipe(startWith(false), switchMap(shouldForcePause => {
        if (shouldForcePause) {
          return observableDefer(() => {
            log.info("SpeedManager: forcing pause on current playback");
            mediaElement.playbackRate = 0;
            return observableOf(0);
          });
        }
        return speed$
          .pipe(tap((speed) => {
            log.info("SpeedManager: resuming playback speed", speed);
            mediaElement.playbackRate = speed;
          }));
      })),
  };
}
