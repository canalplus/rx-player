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
import {
  canPlay,
  canSeek,
} from "../../compat";
import log from "../../utils/log";
import { IBufferClockTick } from "../buffer/types";
import { ITimingsClockTick } from "./timings";
import { ILoadedEvent } from "./types";

/**
 * Creates an observable waiting for the "loadedmetadata" and "canplay"
 * events, and emitting a "loaded" event as both are received.
 *
 * /!\ This has also the side effect of setting the initial time as soon as
 * the loadedmetadata event pops up.
 */
export default function createVideoEventsObservables(
  videoElement : HTMLMediaElement,
  startTime : number,
  autoPlay : boolean,
  timings : Observable<ITimingsClockTick>
) : {
  clock$ : Observable<IBufferClockTick>;
  loaded$ : Observable<ILoadedEvent>;
} {

  /**
   * Time offset is an offset to add to the timing's current time to have
   * the "real" position.
   * For now, this is seen when the video has not yet seeked to its initial
   * position, the currentTime will most probably be 0 where the effective
   * starting position will be _startTime_.
   * Thus we initially set a timeOffset equal to startTime.
   * TODO That look ugly, find better solution?
   * @type {Number}
   */
  let timeOffset = startTime;

  const canSeek$ = canSeek(videoElement)
    .do(() => {
      log.info("set initial time", startTime);

      // reset playbackRate to 1 in case we were at 0 (from a stalled
      // retry for instance)
      videoElement.playbackRate = 1;
      videoElement.currentTime = startTime;
      timeOffset = 0;
    });

  const canPlay$ = canPlay(videoElement)
    .do(() => {
      log.info("canplay event");
      if (autoPlay) {
        /* tslint:disable no-floating-promises */
        videoElement.play();
        /* tslint:enable no-floating-promises */
      }
    });

  return {
    clock$: timings
      .map(timing =>
        objectAssign({ timeOffset }, timing)
      ),

    loaded$: Observable.combineLatest(canSeek$, canPlay$)
      .take(1)
      .mapTo({
        type: "loaded" as "loaded",
        value: true as true,
      }),
  };
}
