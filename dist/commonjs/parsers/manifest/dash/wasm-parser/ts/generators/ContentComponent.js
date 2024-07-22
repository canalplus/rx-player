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
exports.generateContentComponentAttrParser = void 0;
var utils_1 = require("../utils");
/**
 * Generate an "attribute parser" once inside a `BaseURL` node.
 * @param {Object} ccAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generateContentComponentAttrParser(ccAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
        switch (attr) {
            case 0 /* AttributeName.Id */:
                ccAttrs.id = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 60 /* AttributeName.Language */:
                ccAttrs.language = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 61 /* AttributeName.ContentType */:
                ccAttrs.contentType = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 62 /* AttributeName.Par */:
                ccAttrs.par = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
        }
    };
}
exports.generateContentComponentAttrParser = generateContentComponentAttrParser;
