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
  combineLatest as observableCombineLatest,
  merge as observableMerge,
  Observable,
} from "rxjs";
import {
  ignoreElements,
  map,
  tap,
} from "rxjs/operators";
import Manifest from "../../manifest";
import { IBufferOrchestratorClockTick } from "../buffers";
import { IInitClockTick } from "./types";

/**
 * Create clock Observable for the Buffers part of the code.
 * @param {Object} manifest
 * @param {Observable} initClock$
 * @param {Observable} speed$
 * @param {Observable} initialSeek$
 * @param {Observable} initialPlay$
 * @param {Number} startTime
 * @param {boolean} shouldAutoPlay
 * @returns {Observable}
 */
export default function createBufferClock(
  manifest : Manifest,
  initClock$ : Observable<IInitClockTick>,
  speed$ : Observable<number>,
  initialSeek$ : Observable<unknown>,
  initialPlay$ : Observable<unknown>,
  startTime : number,
  shouldAutoPlay : boolean
) : Observable<IBufferOrchestratorClockTick> {
  let initialPlayPerformed = false;
  let initialSeekPerformed = false;

  const updateIsPlaying$ = initialPlay$.pipe(
    tap(() => { initialPlayPerformed = true; }),
    ignoreElements());

  const updateTimeOffset$ = initialSeek$.pipe(
    tap(() => { initialSeekPerformed = true; }),
    ignoreElements());

  const clock$ : Observable<IBufferOrchestratorClockTick> =
    observableCombineLatest([initClock$, speed$])
      .pipe(map(([tick, speed]) => {
        const { isLive } = manifest;
        return {
          currentTime: tick.currentTime,
          duration: tick.duration,
          isPaused: initialPlayPerformed ? tick.paused :
                                           !shouldAutoPlay,
          isLive,
          liveGap: isLive ? manifest.getMaximumPosition() - tick.currentTime :
                            Infinity,
          readyState: tick.readyState,
          speed,
          stalled: tick.stalled,

          // wantedTimeOffset is an offset to add to the timing's current time to have
          // the "real" wanted position.
          // For now, this is seen when the media element has not yet seeked to its
          // initial position, the currentTime will most probably be 0 where the
          // effective starting position will be _startTime_.
          // Thus we initially set a wantedTimeOffset equal to startTime.
          wantedTimeOffset: initialSeekPerformed ? 0 :
                                                   startTime - tick.currentTime,
        };
      }));

  return observableMerge(updateIsPlaying$, updateTimeOffset$, clock$);
}
