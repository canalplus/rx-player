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
 * From the given array of Representations (sorted by bitrate order ascending),
 * returns the one corresponding to the given optimal, minimum and maximum
 * bitrates.
 * @param {Array.<Representation>} representations - The representations array,
 * sorted in bitrate ascending order.
 * @param {Number} optimalBitrate - The optimal bitrate the Representation
 * should have under the current condition.
 * @param {Number} minBitrate - The minimum bitrate the chosen Representation
 * should have. We will take the Representation with the maximum bitrate if none
 * is found.
 * @param {Number} maxBitrate - The maximum bitrate the chosen Representation
 * should have. We will take the Representation with the minimum bitrate if none
 * is found.
 * @returns {Representation|undefined}
 */
export default function selectOptimalRepresentation(
  representations : Representation[],
  optimalBitrate : number,
  minBitrate : number,
  maxBitrate : number
) : Representation {
  const wantedBitrate = optimalBitrate <= minBitrate ? minBitrate :
                        optimalBitrate >= maxBitrate ? maxBitrate :
                                                       optimalBitrate;
  const firstIndexTooHigh = arrayFindIndex(
    representations,
    (representation) => representation.bitrate > wantedBitrate);
  if (firstIndexTooHigh === -1) {
    return representations[representations.length - 1];
  } else if (firstIndexTooHigh === 0) {
    return representations[0];
  }
  return representations[firstIndexTooHigh - 1];
}
