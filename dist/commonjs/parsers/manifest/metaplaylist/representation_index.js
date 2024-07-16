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
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var object_assign_1 = require("../../../utils/object_assign");
/**
 * The MetaRepresentationIndex is wrapper for all kind of RepresentationIndex (from
 * dash, smooth, etc)
 *
 * It wraps methods from original RepresentationIndex, while taking into account
 * the time offset introduced by the MetaPlaylist content.
 *
 * It makes a bridge between the MetaPlaylist timeline, and the original
 * timeline of content. (e.g. the segment whose "meta" time is 1500, is actually a
 * segment whose original time is 200, played with an offset of 1300)
 * @class MetaRepresentationIndex
 */
var MetaRepresentationIndex = /** @class */ (function () {
    /**
     * Create a new `MetaRepresentationIndex`.
     * @param {Object} wrappedIndex - "Real" RepresentationIndex implementation of
     * the concerned Representation.
     * @param {Array.<number|undefined>} contentBounds - Start time and end time
     * the Representation will be played between, in seconds.
     * @param {string} transport - Transport for the "real" RepresentationIndex
     * (e.g. "dash" or "smooth").
     * @param {Object} baseContentInfos - Various information about the "real"
     * Representation.
     */
    function MetaRepresentationIndex(wrappedIndex, contentBounds, transport, baseContentInfos) {
        this._wrappedIndex = wrappedIndex;
        this._timeOffset = contentBounds[0];
        this._contentEnd = contentBounds[1];
        this._transport = transport;
        this._baseContentMetadata = baseContentInfos;
    }
    /**
     * Returns information about the initialization segment.
     */
    MetaRepresentationIndex.prototype.getInitSegment = function () {
        var segment = this._wrappedIndex.getInitSegment();
        if (segment === null) {
            return null;
        }
        return this._cloneWithPrivateInfos(segment);
    };
    /**
     * Returns information about the segments asked.
     * @param {number} up - Starting time wanted, in seconds.
     * @param {Number} duration - Amount of time wanted, in seconds
     * @returns {Array.<Object>}
     */
    MetaRepresentationIndex.prototype.getSegments = function (up, duration) {
        var _this = this;
        return this._wrappedIndex
            .getSegments(up - this._timeOffset, duration)
            .map(function (segment) {
            var clonedSegment = _this._cloneWithPrivateInfos(segment);
            clonedSegment.time += _this._timeOffset;
            clonedSegment.end += _this._timeOffset;
            return clonedSegment;
        });
    };
    /**
     * Whether this RepresentationIndex should be refreshed now.
     * Returns `false` as MetaPlaylist contents do not support underlying live
     * contents yet.
     * @returns {Boolean}
     */
    MetaRepresentationIndex.prototype.shouldRefresh = function () {
        return false;
    };
    /**
     * Returns first possible position the first segment plays at, in seconds.
     * `undefined` if we do not know this value.
     * @return {Number|undefined}
     */
    MetaRepresentationIndex.prototype.getFirstAvailablePosition = function () {
        var wrappedFirstPosition = this._wrappedIndex.getFirstAvailablePosition();
        return !(0, is_null_or_undefined_1.default)(wrappedFirstPosition)
            ? wrappedFirstPosition + this._timeOffset
            : undefined;
    };
    /**
     * Returns last possible position the last segment plays at, in seconds.
     * `undefined` if we do not know this value.
     * @return {Number|undefined}
     */
    MetaRepresentationIndex.prototype.getLastAvailablePosition = function () {
        var wrappedLastPosition = this._wrappedIndex.getLastAvailablePosition();
        return !(0, is_null_or_undefined_1.default)(wrappedLastPosition)
            ? wrappedLastPosition + this._timeOffset
            : undefined;
    };
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    MetaRepresentationIndex.prototype.getEnd = function () {
        var wrappedEnd = this._wrappedIndex.getEnd();
        return !(0, is_null_or_undefined_1.default)(wrappedEnd) ? wrappedEnd + this._timeOffset : undefined;
    };
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     * @param {number} start
     * @param {number} end
     * @returns {boolean|undefined}
     */
    MetaRepresentationIndex.prototype.awaitSegmentBetween = function (start, end) {
        return this._wrappedIndex.awaitSegmentBetween(start - this._timeOffset, end - this._timeOffset);
    };
    /**
     * Returns `false` if that segment is not currently available in the Manifest
     * (e.g. it corresponds to a segment which is before the current buffer
     * depth).
     * @param {Object} segment
     * @returns {boolean|undefined}
     */
    MetaRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        var _a;
        if (((_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.metaplaylistInfos) === undefined) {
            return false;
        }
        var originalSegment = segment.privateInfos.metaplaylistInfos.originalSegment;
        return this._wrappedIndex.isSegmentStillAvailable(originalSegment);
    };
    /**
     * @param {Error} error
     * @param {Object} segment
     * @returns {Boolean}
     */
    MetaRepresentationIndex.prototype.canBeOutOfSyncError = function (error, segment) {
        var _a;
        if (((_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.metaplaylistInfos) === undefined) {
            return false;
        }
        var originalSegment = segment.privateInfos.metaplaylistInfos.originalSegment;
        return this._wrappedIndex.canBeOutOfSyncError(error, originalSegment);
    };
    /**
     *
     * @param {Number} time
     * @returns {Number | null}
     */
    MetaRepresentationIndex.prototype.checkDiscontinuity = function (time) {
        return this._wrappedIndex.checkDiscontinuity(time - this._timeOffset);
    };
    /**
     * @returns {Boolean}
     */
    MetaRepresentationIndex.prototype.isStillAwaitingFutureSegments = function () {
        return this._wrappedIndex.isStillAwaitingFutureSegments();
    };
    /**
     * @returns {Boolean}
     */
    MetaRepresentationIndex.prototype.isInitialized = function () {
        return this._wrappedIndex.isInitialized();
    };
    MetaRepresentationIndex.prototype.initialize = function (indexSegments) {
        return this._wrappedIndex.initialize(indexSegments);
    };
    MetaRepresentationIndex.prototype.addPredictedSegments = function (nextSegments, currentSegment) {
        return this._wrappedIndex.addPredictedSegments(nextSegments, currentSegment);
    };
    /**
     * @param {Object} newIndex
     */
    MetaRepresentationIndex.prototype._replace = function (newIndex) {
        if (!(newIndex instanceof MetaRepresentationIndex)) {
            throw new Error("A MetaPlaylist can only be replaced with another MetaPlaylist");
        }
        this._wrappedIndex._replace(newIndex._wrappedIndex);
    };
    /**
     * @param {Object} newIndex
     */
    MetaRepresentationIndex.prototype._update = function (newIndex) {
        if (!(newIndex instanceof MetaRepresentationIndex)) {
            throw new Error("A MetaPlaylist can only be updated with another MetaPlaylist");
        }
        this._wrappedIndex._update(newIndex._wrappedIndex);
    };
    /**
     * Clone the given segment, presumably coming from its original
     * RepresentationIndex, and add the linked metaplaylist privateInfos to it.
     * Return that cloned and enhanced segment.
     * @param {Object} segment
     * @returns {Object}
     */
    MetaRepresentationIndex.prototype._cloneWithPrivateInfos = function (segment) {
        var clonedSegment = (0, object_assign_1.default)({}, segment);
        if (clonedSegment.privateInfos === undefined) {
            clonedSegment.privateInfos = {};
        }
        clonedSegment.privateInfos.metaplaylistInfos = {
            transportType: this._transport,
            contentStart: this._timeOffset,
            contentEnd: this._contentEnd,
            originalSegment: segment,
            isLive: this._baseContentMetadata.isLive,
            manifestPublishTime: this._baseContentMetadata.manifestPublishTime,
            periodStart: this._baseContentMetadata.periodStart,
            periodEnd: this._baseContentMetadata.periodEnd,
        };
        return clonedSegment;
    };
    return MetaRepresentationIndex;
}());
exports.default = MetaRepresentationIndex;
