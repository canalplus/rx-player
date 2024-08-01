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
var parse_ttml_1 = require("../parse_ttml");
var apply_default_ttml_paragraph_style_1 = require("./apply_default_ttml_paragraph_style");
var parse_cue_1 = require("./parse_cue");
/**
 * Create array of objects which should represent the given TTML text track.
 * These objects have the following structure
 *   - start {Number}: start time, in seconds, at which the cue should
 *     be displayed
 *   - end {Number}: end time, in seconds, at which the cue should
 *     be displayed
 *   - element {HTMLElement}: <div> element representing the cue, with the
 *     right style. This div should then be appended to an element having
 *     the exact size of the wanted region the text track provide cues for.
 *
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string} str
 * @param {number} timeOffset
 */
function parseTTMLToDiv(str, timeOffset) {
    var parsedCues = (0, parse_ttml_1.default)(str, timeOffset);
    var cues = [];
    for (var i = 0; i < parsedCues.length; i++) {
        var paragraphStyle = parsedCues[i].paragraphStyle;
        if ((0, apply_default_ttml_paragraph_style_1.shouldApplyDefaultTTMLStyle)(paragraphStyle)) {
            (0, apply_default_ttml_paragraph_style_1.applyDefaultTTMLStyle)(paragraphStyle);
        }
        var cue = (0, parse_cue_1.default)(parsedCues[i]);
        if (cue !== null) {
            cues.push(cue);
        }
    }
    return cues;
}
exports.default = parseTTMLToDiv;
