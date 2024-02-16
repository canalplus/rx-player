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
var make_vtt_cue_1 = require("../../../compat/make_vtt_cue");
var get_cue_blocks_1 = require("./get_cue_blocks");
var parse_cue_1 = require("./parse_cue");
/**
 * Parse whole srt file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string} srtStr
 * @param {Number} timeOffset
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
function parseSRTStringToVTTCues(srtStr, timeOffset) {
    // Even if srt only authorize CRLF, we will also take LF or CR as line
    // terminators for resilience
    var lines = srtStr.split(/\r\n|\n|\r/);
    var cueBlocks = (0, get_cue_blocks_1.default)(lines);
    var cues = [];
    for (var i = 0; i < cueBlocks.length; i++) {
        var cueObject = (0, parse_cue_1.default)(cueBlocks[i], timeOffset);
        if (cueObject !== null) {
            var nativeCue = toNativeCue(cueObject);
            if (nativeCue !== null) {
                cues.push(nativeCue);
            }
        }
    }
    return cues;
}
exports.default = parseSRTStringToVTTCues;
/**
 * @param {Object} cue Object
 * @returns {TextTrackCue|VTTCue|null}
 */
function toNativeCue(cueObj) {
    var start = cueObj.start, end = cueObj.end, payload = cueObj.payload;
    var text = payload.join("\n");
    return (0, make_vtt_cue_1.default)(start, end, text);
}
