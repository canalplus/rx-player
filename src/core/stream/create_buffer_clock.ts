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

import objectAssign from "object-assign";
import {
  combineLatest as observableCombineLatest,
  merge as observableMerge,
  Observable,
} from "rxjs";
import {
  ignoreElements,
  map,
  take,
  tap,
} from "rxjs/operators";
import Manifest from "../../manifest";
import { IPeriodBufferManagerClockTick } from "../buffer";
import { IStreamClockTick } from "./types";

/**
 * Create clock Observable for the Buffer.
 * @param {Object} manifest
 * @param {Observable} streamClock$
 * @param {Observable} initialSeek$
 * @param {Number} startTime
 * @returns {Observable}
 */
export default function createBufferClock(
  manifest : Manifest,
  streamClock$ : Observable<IStreamClockTick>,
  initialSeek$ : Observable<void>,
  speed$ : Observable<number>,
  startTime : number
) : Observable<IPeriodBufferManagerClockTick> {
  /**
   * wantedTimeOffset is an offset to add to the timing's current time to have
   * the "real" wanted position.
   * For now, this is seen when the media element has not yet seeked to its
   * initial position, the currentTime will most probably be 0 where the
   * effective starting position will be _startTime_.
   * Thus we initially set a wantedTimeOffset equal to startTime.
   * @type {Number}
   */
  let wantedTimeOffset = startTime;
  const updateTimeOffset$ = initialSeek$.pipe(
    take(1),
    tap(() => { wantedTimeOffset = 0; }), // (initial seek performed)
    ignoreElements()
  );

  const clock$ : Observable<IPeriodBufferManagerClockTick> =
    observableCombineLatest(streamClock$, speed$)
      .pipe(map(([tick, speed]) =>
        objectAssign({
          isLive: manifest.isLive,
          liveGap: manifest.isLive ?
            manifest.getMaximumPosition() - tick.currentTime :
            Infinity,
          wantedTimeOffset,
          speed,
        }, tick)
      ));

  return observableMerge(clock$, updateTimeOffset$);
}
