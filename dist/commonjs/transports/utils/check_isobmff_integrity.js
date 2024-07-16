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
var errors_1 = require("../../errors");
var isobmff_1 = require("../../parsers/containers/isobmff");
/**
 * Check if an ISOBMFF segment has all the right box needed to be decoded.
 * Throw if that's not the case.
 * @param {Uint8Array} buffer - The whole ISOBMFF segment
 * @param {boolean} isInitSegment - `true` if this is an initialization segment,
 * `false` otherwise.
 */
function checkISOBMFFIntegrity(buffer, isInitSegment) {
    if (isInitSegment) {
        var ftypIndex = (0, isobmff_1.findCompleteBox)(buffer, 0x66747970 /* ftyp */);
        if (ftypIndex < 0) {
            throw new errors_1.OtherError("INTEGRITY_ERROR", "Incomplete `ftyp` box");
        }
        var moovIndex = (0, isobmff_1.findCompleteBox)(buffer, 0x6d6f6f76 /* moov */);
        if (moovIndex < 0) {
            throw new errors_1.OtherError("INTEGRITY_ERROR", "Incomplete `moov` box");
        }
    }
    else {
        var moofIndex = (0, isobmff_1.findCompleteBox)(buffer, 0x6d6f6f66 /* moof */);
        if (moofIndex < 0) {
            throw new errors_1.OtherError("INTEGRITY_ERROR", "Incomplete `moof` box");
        }
        var mdatIndex = (0, isobmff_1.findCompleteBox)(buffer, 0x6d646174 /* mdat */);
        if (mdatIndex < 0) {
            throw new errors_1.OtherError("INTEGRITY_ERROR", "Incomplete `mdat` box");
        }
    }
}
exports.default = checkISOBMFFIntegrity;
