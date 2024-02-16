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
 * Caching object used to cache initialization segments.
 * This allow to have a faster representation switch and faster seeking.
 * @class InitializationSegmentCache
 */
var InitializationSegmentCache = /** @class */ (function () {
    function InitializationSegmentCache() {
        this._cache = new WeakMap();
    }
    /**
     * @param {Object} obj
     * @param {*} response
     */
    InitializationSegmentCache.prototype.add = function (_a, response) {
        var representation = _a.representation, segment = _a.segment;
        if (segment.isInit) {
            this._cache.set(representation, response);
        }
    };
    /**
     * @param {Object} obj
     * @returns {*} response
     */
    InitializationSegmentCache.prototype.get = function (_a) {
        var representation = _a.representation, segment = _a.segment;
        if (segment.isInit) {
            var value = this._cache.get(representation);
            if (value !== undefined) {
                return value;
            }
        }
        return null;
    };
    return InitializationSegmentCache;
}());
exports.default = InitializationSegmentCache;
