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
var errors_1 = require("../../../errors");
var request_1 = require("../../../utils/request");
/**
 * Generate a new error from the infos given.
 * @param {Error} error
 * @returns {Error}
 */
function errorSelector(error) {
    if (error instanceof request_1.RequestError) {
        return new errors_1.NetworkError("PIPELINE_LOAD_ERROR", error);
    }
    return (0, errors_1.formatError)(error, {
        defaultCode: "PIPELINE_LOAD_ERROR",
        defaultReason: "Unknown error when fetching the Manifest",
    });
}
exports.default = errorSelector;
