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
var array_find_1 = require("../../../utils/array_find");
/**
 * Filter representations based on their resolution.
 *   - the highest resolution considered will be the one linked to the first
 *     representation which has a superior resolution or equal to the one
 *     given.
 * @param {Array.<Object>} representations - The representations array
 * @param {Object} resolution
 * @returns {Array.<Object>}
 */
function filterByResolution(representations, resolution) {
    if (resolution.width === undefined || resolution.height === undefined) {
        return representations;
    }
    var width = resolution.width * resolution.pixelRatio;
    var height = resolution.height * resolution.pixelRatio;
    var sortedRepsByWidth = representations
        .slice() // clone
        .sort(function (a, b) { var _a, _b; return ((_a = a.width) !== null && _a !== void 0 ? _a : 0) - ((_b = b.width) !== null && _b !== void 0 ? _b : 0); });
    var repWithMaxWidth = (0, array_find_1.default)(sortedRepsByWidth, function (representation) {
        return typeof representation.width === "number" &&
            representation.width >= width &&
            typeof representation.height === "number" &&
            representation.height >= height;
    });
    if (repWithMaxWidth === undefined) {
        return representations;
    }
    var maxWidth = typeof repWithMaxWidth.width === "number" ? repWithMaxWidth.width : 0;
    return representations.filter(function (representation) {
        return typeof representation.width === "number" ? representation.width <= maxWidth : true;
    });
}
exports.default = filterByResolution;
