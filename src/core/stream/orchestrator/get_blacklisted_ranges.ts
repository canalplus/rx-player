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

import log from "../../../log";
import {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import { IRange } from "../../../utils/ranges";
import { SegmentBuffer } from "../../segment_buffers";

/**
 * Returns the buffered ranges which hold the given content.
 * Returns the whole buffered ranges if some of it is unknown.
 * @param {Object} segmentBuffer
 * @param {Array.<Object>} contents
 * @returns {Array.<Object>}
 */
export default function getBlacklistedRanges(
  segmentBuffer : SegmentBuffer<unknown>,
  contents : Array<{ adaptation : Adaptation;
                     period : Period;
                     representation : Representation; }>
) : IRange[] {
  if (contents.length === 0) {
    return [];
  }
  segmentBuffer.synchronizeInventory();
  const accumulator : IRange[] = [];
  const inventory = segmentBuffer.getInventory();

  for (let i = 0; i < inventory.length; i++) {
    const chunk = inventory[i];
    const hasContent = contents.some(content => {
      return chunk.infos.period.id === content.period.id &&
        chunk.infos.adaptation.id === content.adaptation.id &&
        chunk.infos.representation.id === content.representation.id;
    });
    if (hasContent) {
      const { bufferedStart, bufferedEnd } = chunk;
      if (bufferedStart === undefined || bufferedEnd === undefined) {
        log.warn("SO: No buffered start or end found from a segment.");
        const buffered = segmentBuffer.getBufferedRanges();
        const len = buffered.length;
        if (len === 0) {
          return [];
        }
        return [{ start: buffered.start(0), end: buffered.end(len - 1) }];
      }

      const previousLastElement = accumulator[accumulator.length - 1];
      if (previousLastElement !== undefined &&
          previousLastElement.end === bufferedStart) {
        previousLastElement.end = bufferedEnd;
      } else {
        accumulator.push({ start: bufferedStart, end: bufferedEnd });
      }
    }
  }
  return accumulator;
}
