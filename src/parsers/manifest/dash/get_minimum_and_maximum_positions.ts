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

import { IParsedManifest } from "../types";
import getMaximumPosition from "../utils/get_maximum_position";
import getMinimumPosition from "../utils/get_minimum_position";

/**
 * @param {Object} manifest
 * @returns {Array.<number>}
 */
export default function getMinimumAndMaximumPosition(
  manifest: IParsedManifest
) : [number|undefined, number|undefined] {
  if (manifest.periods.length === 0) {
    throw new Error("DASH Parser: no period available for a dynamic content");
  }

  return [ getMinimumPosition(manifest),
           getMaximumPosition(manifest) ];
}
