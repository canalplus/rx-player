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
exports.generateContentProtectionAttrParser = void 0;
var base64_1 = require("../../../../../../utils/base64");
var string_parsing_1 = require("../../../../../../utils/string_parsing");
var utils_1 = require("../utils");
/**
 * @param {Object} cp
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generateContentProtectionAttrParser(cp, linearMemory) {
    var cpAttrs = cp.attributes;
    var cpChildren = cp.children;
    var textDecoder = new TextDecoder();
    return function onContentProtectionAttribute(attr, ptr, len) {
        switch (attr) {
            case 16 /* AttributeName.SchemeIdUri */:
                cpAttrs.schemeIdUri = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 13 /* AttributeName.ContentProtectionValue */:
                cpAttrs.value = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 14 /* AttributeName.ContentProtectionKeyId */:
                var kid = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                cpAttrs.keyId = (0, string_parsing_1.hexToBytes)(kid.replace(/-/g, ""));
                break;
            case 15 /* AttributeName.ContentProtectionCencPSSH */:
                try {
                    var b64 = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                    cpChildren.cencPssh.push((0, base64_1.base64ToBytes)(b64));
                }
                catch (_) {
                    /* TODO log error? register as warning? */
                }
                break;
        }
    };
}
exports.generateContentProtectionAttrParser = generateContentProtectionAttrParser;
