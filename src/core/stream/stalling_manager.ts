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
  merge as observableMerge,
  Observable,
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  pairwise,
  scan,
  share,
  tap,
} from "rxjs/operators";
import { isPlaybackStuck } from "../../compat";
import config from "../../config";
import log from "../../log";
import { getNextRangeGap } from "../../utils/ranges";
import { IPauseRequestHandle } from "./speed_manager";
import { IStreamClockTick } from "./types";

const { DISCONTINUITY_THRESHOLD } = config;

export interface IStallingItem {
  reason : string;
  timestamp : number;
}

/**
 * Receive "stalling" events from the clock, try to get out of it, and re-emit
 * them for the player if the stalling status changed.
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} clock$
 * @returns {Observable}
 */
function StallingManager(
  mediaElement : HTMLMediaElement,
  clock$ : Observable<IStreamClockTick>,
  requestPause : () => IPauseRequestHandle
) : Observable<IStallingItem|null> {
  const pauseWhenStalled$ : Observable<never> = clock$.pipe(
    pairwise(),
    map(([{ stalled: wasStalled }, { stalled: isStalled }]) =>
      !wasStalled !== !isStalled /* xor */ ? !wasStalled : null
    ),
    filter((val) : val is boolean => val != null),
    scan((pauseRequest : IPauseRequestHandle|null, shouldPause : boolean) => {
      if (shouldPause) {
        if (pauseRequest == null) {
          log.info("StallingManager: requesting pause to build buffer");
          return requestPause();
        }
        return pauseRequest;
      }

      if (pauseRequest != null) {
        log.info("StallingManager: freeing pause request");
        pauseRequest.free();
      }
      return null;
    }, null),
    ignoreElements()
  );

  const stalledEvents$ = clock$.pipe(
    tap((clockTick) => {
      if (!clockTick.stalled) {
        return;
      }

      // Perform various checks to try to get out of the stalled state:
      //   1. is it a browser bug? -> force seek at the same current time
      //   2. is it a short discontinuity? -> Seek at the beginning of the
      //                                      next range
      const { buffered, currentTime, stalled, state, currentRange } = clockTick;
      const nextRangeGap = getNextRangeGap(buffered, currentTime);

      // Discontinuity check in case we are close a buffer but still
      // calculate a stalled state. This is useful for some
      // implementation that might drop an injected segment, or in
      // case of small discontinuity in the stream.
      if (isPlaybackStuck(currentTime, currentRange, state, !!stalled)) {
        log.warn("after freeze seek", currentTime, currentRange);
        mediaElement.currentTime = currentTime;
      } else if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
        const seekTo = (currentTime + nextRangeGap + 1 / 60);
        log.warn("discontinuity seek", currentTime, nextRangeGap, seekTo);
        mediaElement.currentTime = seekTo;
      }
    }),
    share(),
    map(({ stalled }) => stalled),
    distinctUntilChanged((wasStalled, isStalled) => {
      return !wasStalled && !isStalled ||
        (!!wasStalled && !!isStalled && wasStalled.reason === isStalled.reason);
    })
  );

  return observableMerge(pauseWhenStalled$, stalledEvents$);
}

export default StallingManager;
