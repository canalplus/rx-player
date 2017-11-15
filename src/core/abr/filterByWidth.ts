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

import arrayFind = require("array-find");
import Representation from "../../manifest/representation";

/**
 * @param {Array.<Object>} representations - The representations array
 * @param {Number} width
 * @returns {Array.<Object>}
 */
export default function filterByWidth(
  representations : Representation[],
  width : number
) : Representation[] {
  const sortedRepsByWidth = representations.sort(
    (a, b) => (a.width || 0) - (b.width || 0));
  const repWithMaxWidth : Representation =
    arrayFind(sortedRepsByWidth, (r) => (r.width || 0) >= width);

  if (repWithMaxWidth) {
    const maxWidth = repWithMaxWidth.width || 0;
    return representations.filter(r => (r.width || 0) <= maxWidth);
  }
  return representations;
}
