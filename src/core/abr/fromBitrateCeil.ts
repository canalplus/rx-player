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

import arrayFindIndex = require("array-find-index");
import Representation from "../../manifest/representation";

/**
 * @param {Array.<Representation>} representations - The representations array
 * @param {Number} bitrate
 * @returns {Representation}
 */
export default function fromBitrateCeil(
  representations : Representation[],
  bitrate : number
) : Representation {
  const tooHighIndex : number = arrayFindIndex(
    representations,
    (representation) => representation.bitrate > bitrate
  );
  if (tooHighIndex === -1) {
    return representations[representations.length - 1];
  }
  return representations[tooHighIndex - 1];
}
