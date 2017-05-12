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

/**
 * Average bandwidth rule
 */

// Exponential moving-average
// http://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
function ema(a) {
  return (s, x) => s == null ? x : (a * x + (1 - a) * s);
}

module.exports = function(metrics, options) {
  return metrics
    .map((metric) => metric.value.response)
    // do not take into account small chunks < 2KB. filters out init
    // segments and small manifests in particular, but keep loading errors (timeout).
    .filter((response) => !response || response.size > 2000)
    // converts response metadata in bits-per-seconds
    .map((response) => response ? response.size / response.duration * 8000 : 0)
    .scan(ema(options.alpha));
};
