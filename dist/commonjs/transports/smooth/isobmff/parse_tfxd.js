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
 * @returns {Object|undefined}
 */
function parseTfxd(traf) {
    var tfxd = (0, isobmff_1.getUuidContent)(traf, 0x6d1d9b05, 0x42d544e6, 0x80e2141d, 0xaff757b2);
    if (tfxd === undefined) {
        return undefined;
    }
    return {
        duration: (0, byte_parsing_1.be8toi)(tfxd, 12),
        time: (0, byte_parsing_1.be8toi)(tfxd, 4),
    };
}
exports.default = parseTfxd;
