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

import config from "../../../../../config";

const { DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR } = config;

/**
 * In Javascript, numbers are encoded in a way that a floating number may be
 * represented internally with a rounding error.
 *
 * As the period end is the result of a multiplication between a floating or integer
 * number (period end * timescale), this function takes into account the potential
 * rounding error to tell if the period is fulfilled with content.
 * @param {number} timescale
 * @param {number} lastSegmentEnd
 * @param {number} periodEnd
 * @returns {boolean}
 */
export default function isPeriodFulfilled(
  timescale: number,
  lastSegmentEnd: number,
  periodEnd: number
): boolean {
  const scaledRoundingError =
    DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR * timescale;
  return (lastSegmentEnd + scaledRoundingError) >= periodEnd;
}

