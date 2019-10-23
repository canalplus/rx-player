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

import parseTimestamp from "./parse_timestamp";

/**
 * Parse the settings part of a cue, into key-value object.
 * @param {string} settingsString
 * @returns {Object}
 */
function parseSettings(
  settingsString : string
) : Partial<Record<string, string>> {
  const splittedSettings = settingsString.split(/ |\t/);
  return splittedSettings
    .reduce<Partial<Record<string, string>>>((acc, setting : string) => {
      const splittedSetting = setting.split(":");
      if (splittedSetting.length === 2) {
        acc[splittedSetting[0]] = splittedSetting[1];
      }
      return acc;
    }, {});
}

/**
 * Parse the line containing the timestamp and settings in a cue.
 * The returned object has the following properties:
 *   - start {Number}: start of the cue, in seconds
 *   - end {Number}: end of the cue, in seconds
 *   - settings {Object}: settings for the cue as a key-value object.
 * @param {string} timeString
 * @returns {Object|null}
 */
function parseTimeAndSettings(
  timeString : string
) : { start : number;
      end : number;
      settings : Partial<Record<string, string>>; } |
    null
{
  // RegExp for the timestamps + settings line.
  // Capture groups:
  //   1 -> start timestamp
  //   2 -> end timestamp
  //   3 - settings
  const lineRegex = /^([\d:.]+)[ |\t]+-->[ |\t]+([\d:.]+)[ |\t]*(.*)$/;

  const matches = timeString.match(lineRegex);
  if (matches === null) {
    return null;
  }

  const start = parseTimestamp(matches[1]);
  const end = parseTimestamp(matches[2]);
  if (start == null || end == null) {
    return null;
  }

  const settings = parseSettings(matches[3]);

  return { start,
           end,
           settings };
}

export interface IVTTCueObject { start : number;
                                 end : number;
                                 header? : string;
                                 settings: Partial<Record<string, string>>;
                                 payload : string[]; }

/**
 * Parse cue block into a cue object which contains:
 *   - start {number}: the start of the cue as a timestamp in seconds
 *   - end {number}: the end of the cue as a timestamp in seconds
 *   - header {string|undefined}: The optional cue identifier
 *   - payload {Array.<string>}: the payload of the cue
 * @param {Array.<string>} cueLines
 * @param {Number} timeOffset
 * @returns {Object}
 */
export default function parseCueBlock(
  cueLines : string[],
  timeOffset : number
) : IVTTCueObject | null {
  const timingRegexp = /-->/;
  let timeString : string;
  let payload;
  let header : string|undefined;

  if (!timingRegexp.test(cueLines[0])) {
    if (!timingRegexp.test(cueLines[1])) {
      // not a cue
      return null;
    }
    header = cueLines[0];
    timeString = cueLines[1];
    payload = cueLines.slice(2, cueLines.length);
  } else {
    timeString = cueLines[0];
    payload = cueLines.slice(1, cueLines.length);
  }

  const timeAndSettings = parseTimeAndSettings(timeString);
  if (timeAndSettings === null) {
    return null;
  }

  const { start, end, settings } = timeAndSettings;
  return { start: start + timeOffset,
           end: end + timeOffset,
           settings,
           payload,
           header };
}
