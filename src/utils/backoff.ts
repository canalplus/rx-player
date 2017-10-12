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
function getFuzzedDelay(retryDelay : number) : number {
  const fuzzingFactor = ((Math.random() * 2) - 1) * FUZZ_FACTOR;
  return retryDelay * (1.0 + fuzzingFactor); // Max 1.3 Min 0.7
}

/**
 * Calculate a "backed off" fuzzed delay.
 * That is, a delay augmented depending on the current retry count.
 * @param {Number} retryDelay
 * @param {Number} [retryCount=1]
 * @returns {Number}
 */
function getBackedoffDelay(
  retryDelay : number,
  retryCount : number = 1
) : number {
  return getFuzzedDelay(retryDelay * Math.pow(2, retryCount - 1));
}

export {
  getFuzzedDelay,
  getBackedoffDelay,
};
