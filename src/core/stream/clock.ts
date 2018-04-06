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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import Manifest from "../../manifest";
import { getMaximumBufferPosition } from "../../manifest/timings";
import { IBufferClockTick } from "../buffer";

// Object emitted when the stream's clock tick
export interface IStreamClockTick {
  currentTime : number;
  buffered : TimeRanges;
  duration : number;
  bufferGap : number;
  state : string;
  playbackRate : number;
  currentRange : {
    start : number;
      end : number;
  } | null;
  readyState : number;
  paused : boolean;
  stalled : {
    reason : "seeking" | "not-ready" | "buffering";
    timestamp : number;
  } | null;
}

/**
 * Create clock$ and seekings$ Observables:
 *   - clock$ is the given clock$ observable with added informations.
 *   - seekings$ emits each time the player go in a seeking state.
 * @param {Object} manifest
 * @param {Observable} streamClock$
 * @param {Observable} initialSeek$
 * @param {Number} startTime
 * @returns {Object}
 */
export default function createBufferClock(
  manifest : Manifest,
  streamClock$ : Observable<IStreamClockTick>,
  initialSeek$ : Observable<void>,
  startTime : number
) : Observable<IBufferClockTick> {
  /**
   * Time offset is an offset to add to the timing's current time to have
   * the "real" position.
   * For now, this is seen when the video has not yet seeked to its initial
   * position, the currentTime will most probably be 0 where the effective
   * starting position will be _startTime_.
   * Thus we initially set a timeOffset equal to startTime.
   * @type {Number}
   */
  let timeOffset = startTime;
  const updateTimeOffset$ = initialSeek$
    .take(1)
    .do(() => {
      timeOffset = 0; // (initial seek performed)
    })
    .ignoreElements() as Observable<never>;

  const clock$ : Observable<IBufferClockTick> = streamClock$
    .map((timing) =>
      objectAssign({
        liveGap: manifest.isLive ?
          getMaximumBufferPosition(manifest) - timing.currentTime :
          Infinity,
        timeOffset,
      }, timing)
    );

  return Observable.merge(clock$, updateTimeOffset$);
}
