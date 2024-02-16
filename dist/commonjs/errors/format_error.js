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
var is_known_error_1 = require("./is_known_error");
var other_error_1 = require("./other_error");
/*
 * Format an unknown error into an API-defined error.
 * @param {*} error
 * @returns {Error}
 */
function formatError(error, _a) {
    var defaultCode = _a.defaultCode, defaultReason = _a.defaultReason;
    if ((0, is_known_error_1.default)(error)) {
        return error;
    }
    var reason = error instanceof Error ? error.toString() : defaultReason;
    return new other_error_1.default(defaultCode, reason);
}
exports.default = formatError;
