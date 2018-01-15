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
    state : string;
    timestamp : number;
  } | null;
}

/**
 * TODO I'm not sure that's useful here.
 * seek gap in seconds.
 */
const SEEK_GAP = 2;

/**
 * Observable emitting each time the player is in a true seeking state.
 * That is, the player is seeking and no buffer has been constructed for this
 * range yet.
 * @param {Observable} clock$ - the clock$ observable emitting every
 * seeking events.
 * @returns {Observable}
 */
function getSeekings$(clock$ : Observable<IStreamClockTick>) : Observable<null> {
  return clock$
    .filter(timing => {
      return timing.state === "seeking" &&
        (timing.bufferGap === Infinity ||

        // TODO I don't think that's possible here:
        // the gap is based on the current position and the difference
        // between it and the end of the range this position is in.
        // I don't see how it could be negative.
        // It is Infinity when no range is found for the current position
          timing.bufferGap < -SEEK_GAP);
    })
    // skip the first seeking event generated by the set of the
    // initial seeking time in the video
    // TODO Always the case? check that up
    .skip(1)
    .map(() => null)
    .startWith(null); // TODO Why starting with something?
}

/**
 * Create clock$ and seekings$ Observables:
 *   - clock$ is the given clock$ observable with added informations.
 *   - seekings$ emits each time the player go in a seeking state.
 * @param {Object} manifest
 * @param {Observable} streamClock$
 * @param {Observable} hasDoneInitialSeek$
 * @param {Number} startTime
 * @returns {Object}
 */
export default function createBufferClock(
  manifest : Manifest,
  streamClock$ : Observable<IStreamClockTick>,
  hasDoneInitialSeek$ : Observable<null>,
  startTime : number
) : {
  clock$ : Observable<IBufferClockTick>;
  seekings$ : Observable<null>;
} {
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
  const updateTimeOffset$ = hasDoneInitialSeek$
    .take(1)
    .do(() => {
      timeOffset = 0;
    }).share().ignoreElements() as Observable<never>;

  const clock$ : Observable<IBufferClockTick> = streamClock$
    .map((timing) =>
      objectAssign({
        liveGap: manifest.isLive ?
        getMaximumBufferPosition(manifest) - timing.currentTime :
        Infinity,
        timeOffset,
      }, timing)
    );

  const seekings$ = getSeekings$(streamClock$);

  return {
    clock$: Observable.merge(clock$, updateTimeOffset$),
    seekings$,
  };
}
