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
/**
 * @param {Object} root
 * @returns {Function}
 */
function createSegmentTimelineParser(root) {
    var result = root.children;
    return function () {
        // In the great majority of cases, there's only `S` elements inside.
        // However still clean-up just in rare occasions when that's not the case.
        for (var i = result.length - 1; i >= 0; i--) {
            var item = result[i];
            if (typeof item === "string" || item.tagName !== "S") {
                result.splice(i, 1);
            }
        }
        return result;
    };
}
exports.default = createSegmentTimelineParser;
