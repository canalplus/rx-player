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
  filter,
  map,
} from "rxjs/operators";
import { isPlaybackStuck } from "../../compat";
import config from "../../config";
import log from "../../log";
import { getNextRangeGap } from "../../utils/ranges";
import { IInitClockTick } from "./types";

const { DISCONTINUITY_THRESHOLD } = config;

export default function getBufferDiscontinuities(
  clock$: Observable<IInitClockTick>
): Observable<[number, number]> {
  return clock$.pipe(
    filter(({ stalled }) => !!stalled),
    map((tick) => {
      // Perform various checks to try to get out of the stalled state:
      //   1. is it a browser bug? -> force seek at the same current time
      //   2. is it a short discontinuity? -> Seek at the beginning of the
      //                                      next range
      const { buffered, currentTime } = tick;
      const nextRangeGap = getNextRangeGap(buffered, currentTime);

      // Discontinuity check in case we are close a buffered range but still
      // calculate a stalled state. This is useful for some
      // implementation that might drop an injected segment, or in
      // case of small discontinuity in the content.
      if (isPlaybackStuck(tick.currentTime,
        tick.currentRange,
        tick.state,
        !!tick.stalled)
      ) {
        log.warn("Init: After freeze seek", currentTime, tick.currentRange);
        return [currentTime, currentTime];
      } else if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
        const seekTo = (currentTime + nextRangeGap + 1 / 60);
        return [currentTime, seekTo];
      }
    }),
    filter((x): x is [number, number] => !!x)
  );
}
