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
exports.createBoxWithChildren = exports.createBox = void 0;
var byte_parsing_1 = require("../../../utils/byte_parsing");
var string_parsing_1 = require("../../../utils/string_parsing");
var constants_1 = require("./constants");
/**
 * Speed up string to bytes conversion by memorizing the result
 *
 * The keys here are ISOBMFF box names. The values are the corresponding
 * bytes conversion for putting as an ISOBMFF boxes.
 *
 * Used by the boxName method.
 * @type {Object}
 */
var boxNamesMem = {};
/**
 * Convert the string name of an ISOBMFF box into the corresponding bytes.
 * Has a memorization mechanism to speed-up if you want to translate the
 * same string multiple times.
 * @param {string} str
 * @returns {Uint8Array}
 */
function boxName(str) {
    if (boxNamesMem[str] !== undefined) {
        return boxNamesMem[str];
    }
    var nameInBytes = (0, string_parsing_1.strToUtf8)(str);
    boxNamesMem[str] = nameInBytes;
    return nameInBytes;
}
/**
 * Create a new ISOBMFF "box" with the given name.
 * @param {string} name - name of the box you want to create, must always
 * be 4 characters (uuid boxes not supported)
 * @param {Uint8Array} buff - content of the box
 * @returns {Uint8Array} - The entire ISOBMFF box (length+name+content)
 */
function createBox(name, buff) {
    var len = buff.length + 8;
    return len <= constants_1.MAX_32_BIT_INT
        ? (0, byte_parsing_1.concat)((0, byte_parsing_1.itobe4)(len), boxName(name), buff)
        : (0, byte_parsing_1.concat)((0, byte_parsing_1.itobe4)(1), boxName(name), (0, byte_parsing_1.itobe8)(len + 8), buff);
}
exports.createBox = createBox;
/**
 * @param {string} name
 * @param {Array.<Uint8Array>} children
 * @returns {Uint8Array}
 */
function createBoxWithChildren(name, children) {
    return createBox(name, byte_parsing_1.concat.apply(void 0, __spreadArray([], __read(children), false)));
}
exports.createBoxWithChildren = createBoxWithChildren;
