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
var is_vtt_cue_1 = require("../../../../compat/is_vtt_cue");
var get_cue_blocks_1 = require("../get_cue_blocks");
var parse_cue_block_1 = require("../parse_cue_block");
var utils_1 = require("../utils");
var set_settings_on_cue_1 = require("./set_settings_on_cue");
var to_native_cue_1 = require("./to_native_cue");
// Simple VTT to ICompatVTTCue parser:
// Just parse cues and associated settings.
// Does not take into consideration STYLE and REGION blocks.
/**
 * Parse whole WEBVTT file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string} vttStr
 * @param {Number} timeOffset
 * @returns {Array.<ICompatVTTCue|TextTrackCue>}
 */
function parseVTTStringToVTTCues(vttStr, timeOffset) {
    // WEBVTT authorize CRLF, LF or CR as line terminators
    var lines = vttStr.split(/\r\n|\n|\r/);
    if (!/^WEBVTT($| |\t)/.test(lines[0])) {
        throw new Error("Can't parse WebVTT: Invalid file.");
    }
    var firstLineAfterHeader = (0, utils_1.getFirstLineAfterHeader)(lines);
    var cueBlocks = (0, get_cue_blocks_1.default)(lines, firstLineAfterHeader);
    var cues = [];
    for (var i = 0; i < cueBlocks.length; i++) {
        var cueObject = (0, parse_cue_block_1.default)(cueBlocks[i], timeOffset);
        if (cueObject !== null) {
            var nativeCue = (0, to_native_cue_1.default)(cueObject);
            if (nativeCue !== null) {
                if ((0, is_vtt_cue_1.default)(nativeCue)) {
                    (0, set_settings_on_cue_1.default)(cueObject.settings, nativeCue);
                }
                cues.push(nativeCue);
            }
        }
    }
    return cues;
}
exports.default = parseVTTStringToVTTCues;
