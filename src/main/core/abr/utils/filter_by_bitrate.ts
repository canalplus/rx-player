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

import { Representation } from "../../../manifest";
import arrayFindIndex from "../../../utils/array_find_index";

/**
 * Get only representations lower or equal to a given bitrate.
 * If no representation is lower than the given bitrate, returns an array containing
 * all Representation(s) with the lowest available bitrate.
 * @param {Array.<Object>} representations - All Representations available
 * @param {Number} bitrate
 * @returns {Array.<Object>}
 */
export default function filterByBitrate(
  representations : Representation[],
  bitrate : number
) : Representation[] {
  if (representations.length === 0) {
    return [];
  }
  representations.sort((ra, rb) => ra.bitrate - rb.bitrate);
  const minimumBitrate = representations[0].bitrate;
  const bitrateCeil = Math.max(bitrate, minimumBitrate);
  const firstSuperiorBitrateIndex = arrayFindIndex(
    representations,
    (representation) => representation.bitrate > bitrateCeil
  );
  if (firstSuperiorBitrateIndex === -1) {
    return representations; // All representations have lower bitrates.
  }
  return representations.slice(0, firstSuperiorBitrateIndex);
}
