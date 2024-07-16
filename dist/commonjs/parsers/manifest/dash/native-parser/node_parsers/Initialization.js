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
 * @param {Element} root
 * @returns {Array.<Object>}
 */
function parseInitialization(root) {
    var parsedInitialization = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(parsedInitialization, warnings);
    for (var i = 0; i < root.attributes.length; i++) {
        var attribute = root.attributes[i];
        switch (attribute.name) {
            case "range":
                parseValue(attribute.value, {
                    asKey: "range",
                    parser: utils_1.parseByteRange,
                    dashName: "range",
                });
                break;
            case "sourceURL":
                parsedInitialization.media = attribute.value;
                break;
        }
    }
    return [parsedInitialization, warnings];
}
exports.default = parseInitialization;
