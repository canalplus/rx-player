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
 * Parse a single srt timestamp into seconds
 * @param {string} timestampString
 * @returns {Number|undefined}
 */
export default function parseTimestamp(
  timestampString : string
) : number|undefined {
  const splittedTS = timestampString.split(":");
  if (splittedTS[2]) {
    const hours = parseInt(splittedTS[0], 10);
    const minutes = parseInt(splittedTS[1], 10);
    const seconds = parseFloat(splittedTS[2].replace(",", "."));
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return;
    }
    return hours * 60 * 60 + minutes * 60 + seconds;
  }
}
