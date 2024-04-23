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
var array_includes_1 = require("../../../../utils/array_includes");
var is_non_empty_string_1 = require("../../../../utils/is_non_empty_string");
/**
 * Add the corresponding settings on the given cue.
 * /!\ Mutates the cue given.
 * @param {Object} settings - settings for the cue, as a key-value object.
 * @param {ICompatVTTCue|TextTrackCue} cue
 */
function setSettingsOnCue(settings, cue) {
    if ((0, is_non_empty_string_1.default)(settings.vertical) &&
        (settings.vertical === "rl" || settings.vertical === "lr")) {
        cue.vertical = settings.vertical;
    }
    if ((0, is_non_empty_string_1.default)(settings.line)) {
        // Capture groups:
        //   1 -> percentage position
        //   2 -> optional decimals from percentage position
        //   3 -> optional follow-up of the string indicating alignment value
        //   4 -> alignment value
        var percentagePosition = /^(\d+(\.\d+)?)%(,([a-z]+))?/;
        var percentageMatches = percentagePosition.exec(settings.line);
        if (Array.isArray(percentageMatches)) {
            cue.line = Number(percentageMatches[1]);
            cue.snapToLines = false;
            if ((0, array_includes_1.default)(["start", "center", "end"], percentageMatches[4])) {
                cue.lineAlign = percentageMatches[4];
            }
        }
        else {
            // Capture groups:
            //   1 -> line number
            //   2 -> optional follow-up of the string indicating alignment value
            //   3 -> alignment value
            var linePosition = /^(-?\d+)(,([a-z]+))?/;
            var lineMatches = linePosition.exec(settings.line);
            if (Array.isArray(lineMatches)) {
                cue.line = Number(lineMatches[1]);
                cue.snapToLines = true;
                if ((0, array_includes_1.default)(["start", "center", "end"], lineMatches[3])) {
                    cue.lineAlign = lineMatches[3];
                }
            }
        }
    }
    if ((0, is_non_empty_string_1.default)(settings.position)) {
        var positionRegex = /^([\d\.]+)%(?:,(line-left|line-right|center))?$/;
        var positionArr = positionRegex.exec(settings.position);
        if (Array.isArray(positionArr) && positionArr.length >= 2) {
            var position = parseInt(positionArr[1], 10);
            if (!isNaN(position)) {
                cue.position = position;
                if (positionArr[2] !== undefined) {
                    cue.positionAlign = positionArr[2];
                }
            }
        }
    }
    if ((0, is_non_empty_string_1.default)(settings.size)) {
        cue.size = settings.size;
    }
    if (typeof settings.align === "string" &&
        (0, array_includes_1.default)(["start", "center", "end", "left"], settings.align)) {
        cue.align = settings.align;
    }
}
exports.default = setSettingsOnCue;
