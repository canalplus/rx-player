"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var regexps_1 = require("./regexps");
/**
 * Parses a TTML time into seconds.
 * @param {string} text
 * @param {Object} ttParams
 * @returns {Number|undefined}
 */
function parseTime(text, ttParams) {
    if (regexps_1.REGXP_TIME_COLON_FRAMES.test(text)) {
        return parseColonTimeWithFrames(ttParams, text);
    }
    else if (regexps_1.REGXP_TIME_COLON.test(text)) {
        return parseTimeFromRegExp(regexps_1.REGXP_TIME_COLON, text);
    }
    else if (regexps_1.REGXP_TIME_COLON_MS.test(text)) {
        return parseTimeFromRegExp(regexps_1.REGXP_TIME_COLON_MS, text);
    }
    else if (regexps_1.REGXP_TIME_FRAMES.test(text)) {
        return parseFramesTime(ttParams, text);
    }
    else if (regexps_1.REGXP_TIME_TICK.test(text)) {
        return parseTickTime(ttParams, text);
    }
    else if (regexps_1.REGXP_TIME_HMS.test(text)) {
        return parseTimeFromRegExp(regexps_1.REGXP_TIME_HMS, text);
    }
}
/**
 * Parses a TTML time in frame format
 * @param {Object} ttParams
 * @param {string} text
 * @returns {Number}
 */
function parseFramesTime(ttParams, text) {
    // 75f or 75.5f
    // (We cast as we're sure the regexp is respected here)
    var results = regexps_1.REGXP_TIME_FRAMES.exec(text);
    var frames = Number(results[1]);
    return frames / ttParams.frameRate;
}
/**
 * Parses a TTML time in tick format
 * @param {Object} ttParams
 * @param {string} text
 * @returns {Number}
 */
function parseTickTime(ttParams, text) {
    // 50t or 50.5t
    // (We cast as we're sure the regexp is respected here)
    var results = regexps_1.REGXP_TIME_TICK.exec(text);
    var ticks = Number(results[1]);
    return ticks / ttParams.tickRate;
}
/**
 * Parses a TTML colon formatted time containing frames
 * @param {Object} ttParams
 * @param {string} text
 * @returns {Number}
 */
function parseColonTimeWithFrames(ttParams, text) {
    // 01:02:43:07 ("07" is frames) or 01:02:43:07.1 (subframes)
    // (We cast as we're sure the regexp is respected here)
    var results = regexps_1.REGXP_TIME_COLON_FRAMES.exec(text);
    var hours = Number(results[1]);
    var minutes = Number(results[2]);
    var seconds = Number(results[3]);
    var frames = Number(results[4]);
    var subframes = Number(results[5]);
    if (isNaN(subframes)) {
        subframes = 0;
    }
    frames += subframes / ttParams.subFrameRate;
    seconds += frames / ttParams.frameRate;
    return seconds + minutes * 60 + hours * 3600;
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
    var results = regex.exec(text);
    if (results === null || results[0] === "") {
        return null;
    }
    // This capture is optional, but will still be in the array as undefined,
    // default to 0.
    var hours = Number(results[1]);
    if (isNaN(hours)) {
        hours = 0;
    }
    var minutes = Number(results[2]);
    if (isNaN(minutes)) {
        minutes = 0;
    }
    var seconds = Number(results[3]);
    if (isNaN(seconds)) {
        seconds = 0;
    }
    var milliseconds = Number(results[4]);
    if (isNaN(milliseconds)) {
        milliseconds = 0;
    }
    return milliseconds / 1000 + seconds + minutes * 60 + hours * 3600;
}
exports.default = parseTime;
