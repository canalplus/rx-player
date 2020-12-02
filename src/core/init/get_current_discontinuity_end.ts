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

import { Observable } from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
} from "rxjs/operators";
import { isPlaybackStuck } from "../../compat";
import config from "../../config";
import log from "../../log";
import Manifest from "../../manifest";
import { getNextRangeGap } from "../../utils/ranges";
import { IInitClockTick } from "./types";

const { BUFFER_DISCONTINUITY_THRESHOLD } = config;

/**
 * Perform various checks about discontinuities during playback.
 * If a discontinuity is encountered, return the theorical end of
 * discontinuity.
 * @param {Observable} clock$
 * @param {Object} manifest
 * @returns {Observable}
 */
export default function getCurrentDiscontinuityEnd(
  clock$: Observable<IInitClockTick>,
  manifest: Manifest
) : Observable<number> {
  return clock$.pipe(
    filter(({ stalled }) => stalled !== null),
    map((tick) : number | undefined => {
      const { buffered, position, currentRange, state, stalled } = tick;
      const nextBufferRangeGap = getNextRangeGap(buffered, position);
      // 1: Is it a browser bug? -> force seek at the same current time
      if (isPlaybackStuck(position, currentRange, state, stalled !== null)
      ) {
        log.warn("Init: After freeze seek", position, currentRange);
        return position;

      // 2. Is it a short discontinuity in buffer ? -> Seek at the beginning of the
      //                                               next range
      //
      // Discontinuity check in case we are close a buffered range but still
      // calculate a stalled state. This is useful for some
      // implementation that might drop an injected segment, or in
      // case of small discontinuity in the content.
      } else if (nextBufferRangeGap < BUFFER_DISCONTINUITY_THRESHOLD) {
        const seekTo = (position + nextBufferRangeGap + 1 / 60);
        return seekTo;
      }

      // 3. Is it a discontinuity between periods ? -> Seek at the beginning of the
      //                                               next period
      const currentPeriod = manifest.getPeriodForTime(position);
      if (currentPeriod != null) {
        const nextPeriod = manifest.getPeriodAfter(currentPeriod);
        if (currentPeriod != null &&
            currentPeriod.end != null &&
            nextPeriod != null &&
            position > (currentPeriod.end - 1) &&
            position <= nextPeriod.start &&
            nextPeriod.start - currentPeriod.end === 0) {
          return nextPeriod.start;
        }
      }
    }),
    filter((x): x is number => x !== undefined),
    distinctUntilChanged()
  );
}
