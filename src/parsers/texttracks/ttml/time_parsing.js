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
 * Parse TTML Time formats to seconds.
 *
 * Largely inspired from what the shaka-player does for TTML time parsing.
 * But rewritten to a more rx-player style.
 */

import {
  REGXP_TIME_COLON,
  REGXP_TIME_COLON_FRAMES,
  REGXP_TIME_COLON_MS,
  REGXP_TIME_FRAMES,
  REGXP_TIME_HMS,
  REGXP_TIME_TICK,
} from "./regexps.js";

/**
 * Parses a TTML time into seconds.
 * @param {string} text
 * @param {Object} rateInfo
 * @returns {Number|undefined}
 */
function parseTime(text, rateInfo) {
  if (REGXP_TIME_COLON_FRAMES.test(text)) {
    return parseColonTimeWithFrames(rateInfo, text);

  } else if (REGXP_TIME_COLON.test(text)) {
    return parseTimeFromRegExp(REGXP_TIME_COLON, text);

  } else if (REGXP_TIME_COLON_MS.test(text)) {
    return parseTimeFromRegExp(REGXP_TIME_COLON_MS, text);

  } else if (REGXP_TIME_FRAMES.test(text)) {
    return parseFramesTime(rateInfo, text);

  } else if (REGXP_TIME_TICK.test(text)) {
    return parseTickTime(rateInfo, text);

  } else if (REGXP_TIME_HMS.test(text)) {
    return parseTimeFromRegExp(REGXP_TIME_HMS, text);
  }
}

/**
 * Parses a TTML time in frame format
 * @param {Object} rateInfo
 * @param {string} text
 * @returns {Number}
 */
function parseFramesTime(rateInfo, text) {
  // 75f or 75.5f
  const results = REGXP_TIME_FRAMES.exec(text);
  const frames = Number(results[1]);
  return frames / rateInfo.frameRate;
}

/**
 * Parses a TTML time in tick format
 * @param {Object} rateInfo
 * @param {string} text
 * @returns {Number}
 */
function parseTickTime(rateInfo, text) {
  // 50t or 50.5t
  const results = REGXP_TIME_TICK.exec(text);
  const ticks = Number(results[1]);
  return ticks / rateInfo.tickRate;
}

/**
 * Parses a TTML colon formatted time containing frames
 * @param {Object} rateInfo
 * @param {string} text
 * @returns {Number}
 */
function parseColonTimeWithFrames(rateInfo, text) {
  // 01:02:43:07 ("07" is frames) or 01:02:43:07.1 (subframes)
  const results = REGXP_TIME_COLON_FRAMES.exec(text);

  const hours = Number(results[1]);
  const minutes = Number(results[2]);
  let seconds = Number(results[3]);
  let frames = Number(results[4]);
  const subframes = Number(results[5]) || 0;

  frames += subframes / rateInfo.subFrameRate;
  seconds += frames / rateInfo.frameRate;

  return seconds + (minutes * 60) + (hours * 3600);
}

/**
 * Parses a TTML time with a given regex. Expects regex to be some
 * sort of a time-matcher to match hours, minutes, seconds and milliseconds
 *
 * @param {RegExp} regex
 * @param {string} text
 * @returns {number|null}
 */
function parseTimeFromRegExp(regex, text) {
  const results = regex.exec(text);
  if (results == null || results[0] == "") {
    return null;
  }
  // This capture is optional, but will still be in the array as undefined,
  // default to 0.
  const hours = Number(results[1]) || 0;
  const minutes = Number(results[2]) || 0;
  const seconds = Number(results[3]) || 0;
  const miliseconds = Number(results[4]) || 0;

  return (miliseconds / 1000) + seconds + (minutes * 60) + (hours * 3600);
}

export default parseTime;
