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
 * Parse a single webvtt timestamp into seconds
 * @param {string} timestampString
 * @returns {Number|undefined}
 */
export default function parseTimestamp(
  timestampString : string
) : number|undefined {
  const splittedTS = timestampString.split(":").reverse();

  if (splittedTS[2] || splittedTS[1]) {
    const hours = splittedTS[2] ? parseInt(splittedTS[2], 10) : 0;
    const minutes = parseInt(splittedTS[1], 10);
    const seconds = parseFloat(splittedTS[0].replace(",", "."));

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return;
    }
    return hours * 60 * 60 + minutes * 60 + seconds;
  }
}
