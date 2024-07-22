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
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
/**
 * Returns the base time of the Manifest.
 * @param {Object} rootAttributes
 * @param {number|undefined} [referenceDateTime]
 * @returns {number}
 */
function parseAvailabilityStartTime(rootAttributes, referenceDateTime) {
    if (rootAttributes.type !== "dynamic") {
        return 0;
    }
    if ((0, is_null_or_undefined_1.default)(rootAttributes.availabilityStartTime)) {
        return referenceDateTime !== null && referenceDateTime !== void 0 ? referenceDateTime : 0;
    }
    return rootAttributes.availabilityStartTime;
}
exports.default = parseAvailabilityStartTime;
