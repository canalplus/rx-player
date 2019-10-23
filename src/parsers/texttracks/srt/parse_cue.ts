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

import isNonEmptyString from "../../../utils/is_non_empty_string";
import parseTimestamp from "./parse_timestamp";

export interface ISRTCueObject { start : number;
                                 end : number;
                                 payload : string[]; }

/**
 * Parse cue block into a cue object which contains:
 *   - start {number}: the start of the cue as a timestamp in seconds
 *   - end {number}: the end of the cue as a timestamp in seconds
 *   - payload {Array.<string>}: the payload of the cue
 * @param {Array.<string>} cueLines
 * @param {Number} timeOffset
 * @returns {Object}
 */
export default function parseCueBlock(
  cueLines : string[],
  timeOffset : number
) : ISRTCueObject | null {
  if (cueLines.length === 0) {
    return null;
  }

  let startTimeString : string|undefined;
  let endTimeString : string|undefined;
  let payload : string[] = [];

  // normally in srt, the timing is at second position.
  // We still authorize to put it in the first position for resilience
  if (isNonEmptyString(cueLines[1]) && cueLines[1].indexOf("-->") !== -1) {
    [startTimeString, endTimeString] = cueLines[1].split("-->")
      .map(s => s.trim());
    payload = cueLines.slice(2, cueLines.length);
  }

  if (!isNonEmptyString(startTimeString) ||
      !isNonEmptyString(endTimeString))
  {
    // Try to see if we find them in the first position
    [startTimeString, endTimeString] = cueLines[0].split("-->")
      .map(s => s.trim());
    payload = cueLines.slice(1, cueLines.length);
  }

  if (!isNonEmptyString(startTimeString) || !isNonEmptyString(endTimeString)) {
    // if the time is still not found, exit
    return null;
  }

  const start = parseTimestamp(startTimeString);
  const end = parseTimestamp(endTimeString);
  if (start === undefined || end === undefined) {
    return null;
  }

  return { start: start + timeOffset,
           end : end + timeOffset,
           payload };
}
