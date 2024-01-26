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

/**
 * In Javascript, numbers are encoded in a way that a floating number may be
 * represented internally with a rounding error.
 *
 * This function returns a small number allowing to accound for rounding many
 * rounding errors.
 * @param {number} timescale
 * @returns {boolean}
 */
export function getSegmentTimeRoundingError(timescale: number): number {
  return config.getCurrent().DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR * timescale;
}
