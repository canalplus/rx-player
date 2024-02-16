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
var get_maximum_positions_1 = require("../../utils/get_maximum_positions");
var get_minimum_position_1 = require("../../utils/get_minimum_position");
/**
 * @param {Object} periods
 * @returns {Array.<number>}
 */
function getMinimumAndMaximumPositions(periods) {
    if (periods.length === 0) {
        throw new Error("DASH Parser: no period available for a dynamic content");
    }
    var minimumSafePosition = (0, get_minimum_position_1.default)(periods);
    var maxPositions = (0, get_maximum_positions_1.default)(periods);
    return {
        minimumSafePosition: minimumSafePosition,
        maximumSafePosition: maxPositions.safe,
        maximumUnsafePosition: maxPositions.unsafe,
    };
}
exports.default = getMinimumAndMaximumPositions;
