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
import { parseString } from "../utils";
/**
 * Generate an "attribute parser" once inside a `BaseURL` node.
 * @param {Object} schemeAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateSchemeAttrParser(schemeAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
        switch (attr) {
            case 16 /* AttributeName.SchemeIdUri */:
                schemeAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 17 /* AttributeName.SchemeValue */:
                schemeAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
        }
    };
}
