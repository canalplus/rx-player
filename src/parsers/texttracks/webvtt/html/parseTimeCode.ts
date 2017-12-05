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

import parseTimestamp from "../parseTimestamp";

/**
 * Parse the VTT timecode line given and construct an object with two
 * properties:
 *   - start {Number|undefined}: the corresponding start time in seconds
 *   - end {Number|undefined}: the corresponding end time in seconds
 * @example
 * ```js
 * parseTimeCode("00:02:30 --> 00:03:00");
 * // -> {
 * //      start: 150,
 * //      end: 180,
 * //    }
 * ```
 * @param {string} text
 * @returns {Object|undefined}
 */
export default function parseTimeCode(
  text : string
) : { start? : number; end? : number }|undefined {
  const tsRegex = "((?:[0-9]{2}\:)?[0-9]{2}:[0-9]{2}.[0-9]{2,3})";
  const startEndRegex = tsRegex + "(?:\ |\t)-->(?:\ |\t)" + tsRegex;
  const ranges = text.match(startEndRegex);

  if (ranges && ranges.length >= 3) {
    const start = parseTimestamp(ranges[1]);
    const end =  parseTimestamp(ranges[2]);
    return { start, end };
  }
}
