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
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var regexps_1 = require("../regexps");
/**
 * Translate a color indicated in TTML-style to a CSS-style color.
 * @param {string} color
 * @returns {string} color
 */
function ttmlColorToCSSColor(color) {
    // TODO check all possible color fomats
    var regRes;
    regRes = regexps_1.REGXP_8_HEX_COLOR.exec(color);
    if (!(0, is_null_or_undefined_1.default)(regRes)) {
        return ("rgba(" +
            String(parseInt(regRes[1], 16)) +
            "," +
            String(parseInt(regRes[2], 16)) +
            "," +
            String(parseInt(regRes[3], 16)) +
            "," +
            String(parseInt(regRes[4], 16) / 255) +
            ")");
    }
    regRes = regexps_1.REGXP_4_HEX_COLOR.exec(color);
    if (!(0, is_null_or_undefined_1.default)(regRes)) {
        return ("rgba(" +
            String(parseInt(regRes[1] + regRes[1], 16)) +
            "," +
            String(parseInt(regRes[2] + regRes[2], 16)) +
            "," +
            String(parseInt(regRes[3] + regRes[3], 16)) +
            "," +
            String(parseInt(regRes[4] + regRes[4], 16) / 255) +
            ")");
    }
    regRes = regexps_1.REGXP_RGB_COLOR.exec(color);
    if (!(0, is_null_or_undefined_1.default)(regRes)) {
        return ("rgb(" +
            String(+regRes[1]) +
            "," +
            String(+regRes[2]) +
            "," +
            String(+regRes[3]) +
            ")");
    }
    regRes = regexps_1.REGXP_RGBA_COLOR.exec(color);
    if (!(0, is_null_or_undefined_1.default)(regRes)) {
        return ("rgba(" +
            String(+regRes[1]) +
            "," +
            String(+regRes[2]) +
            "," +
            String(+regRes[3]) +
            "," +
            String(+regRes[4] / 255) +
            ")");
    }
    return color;
}
exports.default = ttmlColorToCSSColor;
