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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var byte_parsing_1 = require("../../../utils/byte_parsing");
var find_complete_box_1 = require("./find_complete_box");
/**
 * Take a chunk of ISOBMFF data and extract complete `moof`+`mdat` subsegments
 * which are ready to be decoded.
 * Returns a tuple of two containing first an array of those subsegments
 * followed by tha last un-decodable part.
 * @param {Uint8Array} buffer
 * @returns {Array}
 */
function extractCompleteChunks(buffer) {
    var _position = 0;
    var chunks = [];
    var currentBuffer = null;
    while (_position <= buffer.length) {
        if (_position === buffer.length) {
            currentBuffer = null;
            break;
        }
        currentBuffer = buffer.subarray(_position, Infinity);
        var moofIndex = (0, find_complete_box_1.default)(currentBuffer, 0x6d6f6f66 /* moof */);
        if (moofIndex < 0) {
            // no moof, not a media segment.
            break;
        }
        var moofLen = (0, byte_parsing_1.be4toi)(buffer, moofIndex + _position);
        var moofEnd = _position + moofIndex + moofLen;
        if (moofEnd > buffer.length) {
            // not a complete moof segment
            break;
        }
        var mdatIndex = (0, find_complete_box_1.default)(currentBuffer, 0x6d646174 /* mdat */);
        if (mdatIndex < 0) {
            // no mdat, not a segment.
            break;
        }
        var mdatLen = (0, byte_parsing_1.be4toi)(buffer, mdatIndex + _position);
        var mdatEnd = _position + mdatIndex + mdatLen;
        if (mdatEnd > buffer.length) {
            // not a complete mdat segment
            break;
        }
        var maxEnd = Math.max(moofEnd, mdatEnd);
        var chunk = buffer.subarray(_position, maxEnd);
        chunks.push(chunk);
        _position = maxEnd;
    }
    if (chunks.length === 0) {
        return [null, currentBuffer];
    }
    return [byte_parsing_1.concat.apply(void 0, __spreadArray([], __read(chunks), false)), currentBuffer];
}
exports.default = extractCompleteChunks;
