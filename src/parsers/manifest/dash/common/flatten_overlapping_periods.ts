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

import log from "../../../../log";
import { IParsedPeriod } from "../../types";

/**
 * Avoid periods to overlap.
 *
 * According to DASH guidelines, if a period has media duration longer than
 * the distance between the start of this period and the start of the next period,
 * use of start times implies that the client will start the playout of the next
 * period at the time stated, rather than finishing the playout of the last period.
 *
 * Even if that case if defined when period last(s) segment(s) is/are a bit longer,
 * it can be meaningful when two periods are overlapping. We will always shorten
 * the first period, and even erase it if its duration is equal to zero.
 *
 * Example (Periods are numbered under their manifest order) :
 *
 * [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][ Period 3 ]
 *             [ Period 3 ]
 *
 * [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][  2  ][ Period 3 ]
 *                  [ Period 3 ]
 *
 * [ Period 1 ][ Period 2 ]       ------>  [  1  ][      Period 3     ]
 *        [      Period 3     ]
 *
 * @param {Array.<Object>} parsedPeriods
 * @return {Array.<Object>}
 */
export default function flattenOverlappingPeriods(
  parsedPeriods: IParsedPeriod[]
): IParsedPeriod[] {
  if (parsedPeriods.length === 0) {
    return [];
  }
  const flattenedPeriods : IParsedPeriod[] = [parsedPeriods[0]];
  for (let i = 1; i < parsedPeriods.length; i++) {
    const parsedPeriod = parsedPeriods[i];
    let lastFlattenedPeriod = flattenedPeriods[flattenedPeriods.length - 1];
    while (
      lastFlattenedPeriod.duration === undefined ||
      (lastFlattenedPeriod.start + lastFlattenedPeriod.duration) > parsedPeriod.start
    ) {
      log.warn("DASH: Updating overlapping Periods.",
               lastFlattenedPeriod?.start,
               parsedPeriod.start);
      lastFlattenedPeriod.duration = parsedPeriod.start - lastFlattenedPeriod.start;
      lastFlattenedPeriod.end = parsedPeriod.start;
      if (lastFlattenedPeriod.duration <= 0) {
        flattenedPeriods.pop();
        lastFlattenedPeriod = flattenedPeriods[flattenedPeriods.length - 1];
      }
    }
    flattenedPeriods.push(parsedPeriod);
  }
  return flattenedPeriods;
}
