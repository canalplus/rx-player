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
  map,
  Observable,
} from "rxjs";
import log from "../../log";
import getBufferLevels from "./get_buffer_levels";
import getEstimateFromBufferLevels, {
  IBufferBasedChooserClockTick,
} from "./get_estimate_from_buffer_levels";

/**
 * Choose a bitrate based on the currently available buffer.
 *
 * This algorithm is based on the deviation of the BOLA algorithm.
 * It is a hybrid solution that also relies on a given bitrate's
 * "maintainability".
 * Each time a chunk is downloaded, from the ratio between the chunk duration
 * and chunk's request time, we can assume that the representation is
 * "maintanable" or not.
 * If so, we may switch to a better quality, or conversely to a worse quality.
 *
 * @param {Observable} update$
 * @param {Array.<number>} bitrates
 * @returns {Observable}
 */
export default function BufferBasedChooser(
  update$ : Observable<IBufferBasedChooserClockTick>,
  bitrates: number[]
) : Observable<number|undefined> {
  const levelsMap = getBufferLevels(bitrates);
  log.debug("ABR: Steps for buffer based chooser.",
            levelsMap.map((l, i) => ({ bufferLevel: l, bitrate: bitrates[i] })));
  return update$.pipe(map((clockTick) => {
    return getEstimateFromBufferLevels(clockTick, bitrates, levelsMap);
  }));
}
