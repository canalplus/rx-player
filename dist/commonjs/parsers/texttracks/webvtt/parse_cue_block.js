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
var parse_timestamp_1 = require("./parse_timestamp");
/**
 * Parse the settings part of a cue, into key-value object.
 * @param {string} settingsString
 * @returns {Object}
 */
function parseSettings(settingsString) {
    var splittedSettings = settingsString.split(/ |\t/);
    return splittedSettings.reduce(function (acc, setting) {
        var splittedSetting = setting.split(":");
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
function parseTimeAndSettings(timeString) {
    // RegExp for the timestamps + settings line.
    // Capture groups:
    //   1 -> start timestamp
    //   2 -> end timestamp
    //   3 - settings
    var lineRegex = /^([\d:.]+)[ |\t]+-->[ |\t]+([\d:.]+)[ |\t]*(.*)$/;
    var matches = lineRegex.exec(timeString);
    if (matches === null) {
        return null;
    }
    var start = (0, parse_timestamp_1.default)(matches[1]);
    var end = (0, parse_timestamp_1.default)(matches[2]);
    if (start === undefined || end === undefined) {
        return null;
    }
    var settings = parseSettings(matches[3]);
    return { start: start, end: end, settings: settings };
}
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
function parseCueBlock(cueLines, timeOffset) {
    var timingRegexp = /-->/;
    var timeString;
    var payload;
    var header;
    if (!timingRegexp.test(cueLines[0])) {
        if (!timingRegexp.test(cueLines[1])) {
            // not a cue
            return null;
        }
        header = cueLines[0];
        timeString = cueLines[1];
        payload = cueLines.slice(2, cueLines.length);
    }
    else {
        timeString = cueLines[0];
        payload = cueLines.slice(1, cueLines.length);
    }
    var timeAndSettings = parseTimeAndSettings(timeString);
    if (timeAndSettings === null) {
        return null;
    }
    var start = timeAndSettings.start, end = timeAndSettings.end, settings = timeAndSettings.settings;
    return {
        start: start + timeOffset,
        end: end + timeOffset,
        settings: settings,
        payload: payload,
        header: header,
    };
}
exports.default = parseCueBlock;
