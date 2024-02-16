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
var utils_1 = require("./utils");
/**
 * Parse an BaseURL element into an BaseURL intermediate
 * representation.
 * @param {Object | string} root - The BaseURL root element.
 * @returns {Array.<Object|undefined>}
 */
function parseBaseURL(root) {
    var value = typeof root === "string" ? root : (0, utils_1.textContent)(root.children);
    var warnings = [];
    if (value === null || value.length === 0) {
        return [undefined, warnings];
    }
    return [{ value: value }, warnings];
}
exports.default = parseBaseURL;
