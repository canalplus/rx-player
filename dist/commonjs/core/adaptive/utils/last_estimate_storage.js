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
/** Stores the last estimate made by the `RepresentationEstimator`. */
var LastEstimateStorage = /** @class */ (function () {
    function LastEstimateStorage() {
        this.bandwidth = undefined;
        this.representation = null;
        this.algorithmType = 3 /* ABRAlgorithmType.None */;
    }
    /**
     * Update this `LastEstimateStorage` with new values.
     * @param {Object} representation - Estimated Representation.
     * @param {number|undefined} bandwidth - Estimated bandwidth.
     * @param {number} algorithmType - The type of algorithm used to produce that
     * estimate.
     */
    LastEstimateStorage.prototype.update = function (representation, bandwidth, algorithmType) {
        this.representation = representation;
        this.bandwidth = bandwidth;
        this.algorithmType = algorithmType;
    };
    return LastEstimateStorage;
}());
exports.default = LastEstimateStorage;
