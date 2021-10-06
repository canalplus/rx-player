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
  Observable,
} from "rxjs";
import { map } from "rxjs/operators";
import Manifest from "../../manifest";
import { IReadOnlySharedReference } from "../../utils/reference";
import { IStreamOrchestratorClockTick } from "../stream";
import { IInitClockTick } from "./types";

export interface IStreamClockArguments {
  /** If true, the player will auto-play when `initialPlayPerformed` becomes `true`. */
  autoPlay : boolean;
  /** Becomes `true` after the initial play has been taken care of. */
  initialPlayPerformed : IReadOnlySharedReference<boolean>;
  /** Becomes `true` after the initial seek has been taken care of. */
  initialSeekPerformed : IReadOnlySharedReference<boolean>;
  /** The last speed requested by the user. */
  speed$ : Observable<number>;
  /** The time the player will seek when `initialSeekPerformed` becomes `true`. */
  startTime : number;

  manifest : Manifest;
}

/**
 * Create clock Observable for the `Stream` part of the code.
 * @param {Observable} initClock$
 * @param {Object} streamClockArgument
 * @returns {Observable}
 */
export default function createStreamClock(
  initClock$ : Observable<IInitClockTick>,
  { autoPlay,
    initialPlayPerformed,
    initialSeekPerformed,
    manifest,
    speed$,
    startTime } : IStreamClockArguments
) : Observable<IStreamOrchestratorClockTick> {
  return observableCombineLatest([initClock$, speed$]).pipe(map(([tick, speed]) => {
    const { isLive } = manifest;
    return {
      position: tick.position,
      getCurrentTime: tick.getCurrentTime,
      duration: tick.duration,
      isPaused: initialPlayPerformed.getValue() ? tick.paused :
                                                  !autoPlay,
      liveGap: isLive ? manifest.getMaximumPosition() - tick.position :
                        Infinity,
      readyState: tick.readyState,
      speed,

      // wantedTimeOffset is an offset to add to the timing's current time to have
      // the "real" wanted position.
      // For now, this is seen when the media element has not yet seeked to its
      // initial position, the currentTime will most probably be 0 where the
      // effective starting position will be _startTime_.
      // Thus we initially set a wantedTimeOffset equal to startTime.
      wantedTimeOffset: initialSeekPerformed.getValue() ? 0 :
                                                          startTime - tick.position,
    };
  }));
}
