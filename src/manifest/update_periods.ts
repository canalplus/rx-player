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

import Period from "./period";
import updatePeriodInPlace from "./update_period_in_place";

/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 */
export default function updatePeriods(
  oldPeriods: Period[],
  newPeriods: Period[]
): void {
  let lastHandledNewPeriodIdx = 0;
  for (let i = 0; i < newPeriods.length; i++) {
    const newPeriod = newPeriods[i];
    for (let j = lastHandledNewPeriodIdx; j < oldPeriods.length; j++) {
      const oldPeriod = oldPeriods[j];
      if (oldPeriod && newPeriod && newPeriod.id === oldPeriod.id) {
        updatePeriodInPlace(oldPeriod, newPeriod);
        const periodsToInclude = newPeriods.slice(lastHandledNewPeriodIdx, i);
        oldPeriods.splice(j, 0, ...periodsToInclude);
        lastHandledNewPeriodIdx = i + 1;
        break;
      }
    }
  }

  // take the remaining new periods and replace undesired periods with them
  const lastNewPeriods = newPeriods.slice(lastHandledNewPeriodIdx,
                                          newPeriods.length);
  oldPeriods.splice(lastHandledNewPeriodIdx,
                    oldPeriods.length - lastHandledNewPeriodIdx,
                    ...lastNewPeriods);
}
