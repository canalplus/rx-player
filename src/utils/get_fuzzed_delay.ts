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

const FUZZ_FACTOR = 0.3;

/**
 * Perform "fuzzing" on the delay given.
 * @param {Number} retryDelay
 * @returns {Number}
 */
export default function getFuzzedDelay(retryDelay: number): number {
  const fuzzingFactor = (Math.random() * 2 - 1) * FUZZ_FACTOR;
  return retryDelay * (fuzzingFactor + 1); // Max 1.3 Min 0.7
}
