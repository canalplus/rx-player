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

import { Period } from "../../../manifest";
import { IBufferedChunk } from "./segment_inventory";

/**
 * Returns the last segment in the `inventory` which is linked to a Period
 * before `period`.
 * @param {Array.<Object>} inventory
 * @param {Object} period
 * @returns {Object|null}
 */
export function getLastSegmentBeforePeriod(
  inventory : IBufferedChunk[],
  period : Period
) : IBufferedChunk | null {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i].infos.period.start >= period.start) {
      if (i > 0) {
        return inventory[i - 1];
      }
      return null;
    }
  }
  return inventory.length > 0 ? inventory[inventory.length - 1] :
                                null;
}

/**
 * Returns the first segment in the `inventory` which is linked to a Period
 * after `period`.
 * @param {Array.<Object>} inventory
 * @param {Object} period
 * @returns {Object|null}
 */
export function getFirstSegmentAfterPeriod(
  inventory : IBufferedChunk[],
  period : Period
) : IBufferedChunk | null {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i].infos.period.start > period.start) {
      return inventory[i];
    }
  }
  return null;
}

