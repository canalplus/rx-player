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

import { IParsedAdaptation } from "../types";

/**
 * Returns "first time of reference" from the adaptation given, considering a
 * dynamic content.
 * Undefined if a time could not be found.
 *
 * We consider the latest first time from every representations in the given
 * adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
export default function getFirstPositionFromAdaptation(
  adaptation: IParsedAdaptation
) : number | undefined | null {
  const { representations } = adaptation;
  let max : null | number = null;
  for (let i = 0; i < representations.length; i++) {
    const firstPosition = representations[i].index.getFirstPosition();
    if (firstPosition === undefined) { // we cannot tell
      return undefined;
    }
    if (firstPosition !== null) {
      max = max == null ? firstPosition :
                          Math.max(max, firstPosition);
    }
  }
  if (max === null) { // It means that all positions were null === no segments (yet?)
    return null;
  }
  return max;
}
