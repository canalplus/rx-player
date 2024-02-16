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
var isobmff_1 = require("../../../parsers/containers/isobmff");
var byte_parsing_1 = require("../../../utils/byte_parsing");
/**
 * @param {Uint8Array} traf
 * @returns {Array.<Object>}
 */
function parseTfrf(traf) {
    var tfrf = (0, isobmff_1.getUuidContent)(traf, 0xd4807ef2, 0xca394695, 0x8e5426cb, 0x9e46a79f);
    if (tfrf === undefined) {
        return [];
    }
    var frags = [];
    var version = tfrf[0];
    var fragCount = tfrf[4];
    for (var i = 0; i < fragCount; i++) {
        var duration = void 0;
        var time = void 0;
        if (version === 1) {
            time = (0, byte_parsing_1.be8toi)(tfrf, i * 16 + 5);
            duration = (0, byte_parsing_1.be8toi)(tfrf, i * 16 + 5 + 8);
        }
        else {
            time = (0, byte_parsing_1.be4toi)(tfrf, i * 8 + 5);
            duration = (0, byte_parsing_1.be4toi)(tfrf, i * 8 + 5 + 4);
        }
        frags.push({
            time: time,
            duration: duration,
        });
    }
    return frags;
}
exports.default = parseTfrf;
