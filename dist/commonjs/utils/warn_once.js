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
var array_includes_1 = require("./array_includes");
var WARNED_MESSAGES = [];
/**
 * Perform a console.warn only once in the application lifetime.
 *
 * Useful for deprecated messages, for example.
 *
 * @param {string} message
 */
function warnOnce(message) {
    if (!(0, array_includes_1.default)(WARNED_MESSAGES, message)) {
        // eslint-disable-next-line no-console
        console.warn(message);
        WARNED_MESSAGES.push(message);
    }
}
exports.default = warnOnce;
