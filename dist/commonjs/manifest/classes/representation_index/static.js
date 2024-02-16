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
var log_1 = require("../../../log");
/**
 * Simple RepresentationIndex implementation for static files.
 * @class StaticRepresentationIndex
 */
var StaticRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} infos
     */
    function StaticRepresentationIndex(infos) {
        this._url = infos.media;
    }
    /**
     * Static contents do not have any initialization segments.
     * Just return null.
     * @returns {null}
     */
    StaticRepresentationIndex.prototype.getInitSegment = function () {
        return null;
    };
    /**
     * Returns the only Segment available here.
     * @returns {Array.<Object>}
     */
    StaticRepresentationIndex.prototype.getSegments = function () {
        return [
            {
                id: "0",
                isInit: false,
                number: 0,
                url: this._url,
                time: 0,
                end: Number.MAX_VALUE,
                duration: Number.MAX_VALUE,
                complete: true,
                privateInfos: {},
                timescale: 1,
            },
        ];
    };
    /**
     * Returns first position in index.
     * @returns {undefined}
     */
    StaticRepresentationIndex.prototype.getFirstAvailablePosition = function () {
        return;
    };
    /**
     * Returns last position in index.
     * @returns {undefined}
     */
    StaticRepresentationIndex.prototype.getLastAvailablePosition = function () {
        return;
    };
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    StaticRepresentationIndex.prototype.getEnd = function () {
        return;
    };
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `StaticRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    StaticRepresentationIndex.prototype.awaitSegmentBetween = function () {
        return false;
    };
    /**
     * Returns false as a static file never need to be refreshed.
     * @returns {Boolean}
     */
    StaticRepresentationIndex.prototype.shouldRefresh = function () {
        return false;
    };
    /**
     * @returns {null}
     */
    StaticRepresentationIndex.prototype.checkDiscontinuity = function () {
        return null;
    };
    /**
     * Returns true as a static file should never need lose availability.
     * @returns {Boolean}
     */
    StaticRepresentationIndex.prototype.isSegmentStillAvailable = function () {
        return true;
    };
    /**
     * @returns {Boolean}
     */
    StaticRepresentationIndex.prototype.canBeOutOfSyncError = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    StaticRepresentationIndex.prototype.isStillAwaitingFutureSegments = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    StaticRepresentationIndex.prototype.isInitialized = function () {
        return true;
    };
    StaticRepresentationIndex.prototype.initialize = function () {
        log_1.default.error("A `StaticRepresentationIndex` does not need to be initialized");
    };
    StaticRepresentationIndex.prototype.addPredictedSegments = function () {
        log_1.default.warn("Cannot add predicted segments to a `StaticRepresentationIndex`");
    };
    StaticRepresentationIndex.prototype._replace = function () {
        log_1.default.warn("Tried to replace a static RepresentationIndex");
    };
    StaticRepresentationIndex.prototype._update = function () {
        log_1.default.warn("Tried to update a static RepresentationIndex");
    };
    return StaticRepresentationIndex;
}());
exports.default = StaticRepresentationIndex;
