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
exports.getVideoCodecs = exports.getAudioCodecs = void 0;
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
/**
 * @param {string} codecPrivateData
 * @param {string|undefined} fourCC
 * @returns {string}
 */
function getAudioCodecs(codecPrivateData, fourCC) {
    var mpProfile;
    if (fourCC === "AACH") {
        mpProfile = 5; // High Efficiency AAC Profile
    }
    else {
        mpProfile = (0, is_non_empty_string_1.default)(codecPrivateData)
            ? (parseInt(codecPrivateData.substring(0, 2), 16) & 0xf8) >> 3
            : 2;
    }
    if (mpProfile === 0) {
        // Return default audio codec
        return "mp4a.40.2";
    }
    return "mp4a.40.".concat(mpProfile);
}
exports.getAudioCodecs = getAudioCodecs;
/**
 * @param {string} codecPrivateData
 * @returns {string}
 */
function getVideoCodecs(codecPrivateData) {
    // we can extract codes only if fourCC is on of "H264", "X264", "DAVC", "AVC1"
    var arr = /00000001\d7([0-9a-fA-F]{6})/.exec(codecPrivateData);
    if (arr === null || !(0, is_non_empty_string_1.default)(arr[1])) {
        // Return default video codec
        return "avc1.4D401E";
    }
    return "avc1." + arr[1];
}
exports.getVideoCodecs = getVideoCodecs;
