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

import { IBaseURL } from "./node_parsers/BaseURL";

/**
 * Get addition of period availability time offset and representation
 * availability time offset
 * @param {number} adaptationAvailabilityTimeOffset
 * @param {Object}
 * @returns {number}
 */
function getRepAvailabilityTimeOffset(adaptationAvailabilityTimeOffset: number,
                                      baseURL?: IBaseURL,
                                      availabilityTimeOffset?: number
): number {
  const fromRepBaseURL: number = baseURL?.attributes.availabilityTimeOffset ?? 0;
  const fromRepIndex: number = availabilityTimeOffset ?? 0;

  return adaptationAvailabilityTimeOffset +
    fromRepBaseURL +
    fromRepIndex;
}

export default getRepAvailabilityTimeOffset;
