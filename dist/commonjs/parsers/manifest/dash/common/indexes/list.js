"use strict";
/*
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../../log");
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var index_helpers_1 = require("../../../utils/index_helpers");
var get_init_segment_1 = require("./get_init_segment");
var tokens_1 = require("./tokens");
var ListRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function ListRepresentationIndex(index, context) {
        var _a, _b, _c;
        if (index.duration === undefined) {
            throw new Error("Invalid SegmentList: no duration");
        }
        var periodStart = context.periodStart, periodEnd = context.periodEnd, representationId = context.representationId, representationBitrate = context.representationBitrate, isEMSGWhitelisted = context.isEMSGWhitelisted;
        this._isEMSGWhitelisted = isEMSGWhitelisted;
        this._periodStart = periodStart;
        this._periodEnd = periodEnd;
        var presentationTimeOffset = (_a = index.presentationTimeOffset) !== null && _a !== void 0 ? _a : 0;
        var timescale = (_b = index.timescale) !== null && _b !== void 0 ? _b : 1;
        var indexTimeOffset = presentationTimeOffset - periodStart * timescale;
        var initializationUrl = ((_c = index.initialization) === null || _c === void 0 ? void 0 : _c.media) === undefined
            ? null
            : (0, tokens_1.constructRepresentationUrl)(index.initialization.media, representationId, representationBitrate);
        var list = index.list.map(function (lItem) { return ({
            url: lItem.media === undefined
                ? null
                : (0, tokens_1.constructRepresentationUrl)(lItem.media, representationId, representationBitrate),
            mediaRange: lItem.mediaRange,
        }); });
        this._index = {
            list: list,
            timescale: timescale,
            duration: index.duration,
            indexTimeOffset: indexTimeOffset,
            indexRange: index.indexRange,
            initialization: (0, is_null_or_undefined_1.default)(index.initialization)
                ? undefined
                : { url: initializationUrl, range: index.initialization.range },
        };
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    ListRepresentationIndex.prototype.getInitSegment = function () {
        var initSegment = (0, get_init_segment_1.default)(this._index);
        if (initSegment.privateInfos === undefined) {
            initSegment.privateInfos = {};
        }
        initSegment.privateInfos.isEMSGWhitelisted = this._isEMSGWhitelisted;
        return initSegment;
    };
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    ListRepresentationIndex.prototype.getSegments = function (fromTime, dur) {
        var index = this._index;
        var duration = index.duration, list = index.list, timescale = index.timescale;
        var durationInSeconds = duration / timescale;
        var fromTimeInPeriod = fromTime - this._periodStart;
        var _a = __read((0, index_helpers_1.getTimescaledRange)(fromTimeInPeriod, dur, timescale), 2), up = _a[0], to = _a[1];
        var length = Math.min(list.length - 1, Math.floor(to / duration));
        var segments = [];
        var i = Math.floor(up / duration);
        while (i <= length) {
            var range = list[i].mediaRange;
            var url = list[i].url;
            var time = i * durationInSeconds + this._periodStart;
            var segment = {
                id: String(i),
                time: time,
                isInit: false,
                range: range,
                duration: durationInSeconds,
                timescale: 1,
                end: time + durationInSeconds,
                url: url,
                timestampOffset: -(index.indexTimeOffset / timescale),
                complete: true,
                privateInfos: { isEMSGWhitelisted: this._isEMSGWhitelisted },
            };
            segments.push(segment);
            i++;
        }
        return segments;
    };
    /**
     * Returns whether the Manifest should be refreshed based on the
     * `ListRepresentationIndex`'s state and the time range the player is
     * currently considering.
     * @param {Number} _fromTime
     * @param {Number} _toTime
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.shouldRefresh = function (_fromTime, _toTime) {
        // DASH Manifests are usually refreshed through other means, i.e. thanks to
        // the `minimumUpdatePeriod` attribute.
        // Moreover, SegmentList are usually only found in static MPDs.
        return false;
    };
    /**
     * Returns first position in this index, in seconds.
     * @returns {Number}
     */
    ListRepresentationIndex.prototype.getFirstAvailablePosition = function () {
        return this._periodStart;
    };
    /**
     * Returns last position in this index, in seconds.
     * @returns {Number}
     */
    ListRepresentationIndex.prototype.getLastAvailablePosition = function () {
        var _a;
        var index = this._index;
        var duration = index.duration, list = index.list;
        return Math.min((list.length * duration) / index.timescale + this._periodStart, (_a = this._periodEnd) !== null && _a !== void 0 ? _a : Infinity);
    };
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    ListRepresentationIndex.prototype.getEnd = function () {
        return this.getLastAvailablePosition();
    };
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `ListRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    ListRepresentationIndex.prototype.awaitSegmentBetween = function () {
        return false;
    };
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.isSegmentStillAvailable = function () {
        return true;
    };
    /**
     * We do not check for discontinuity in SegmentList-based indexes.
     * @returns {null}
     */
    ListRepresentationIndex.prototype.checkDiscontinuity = function () {
        return null;
    };
    /**
     * SegmentList should not be updated.
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.canBeOutOfSyncError = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.isStillAwaitingFutureSegments = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.isInitialized = function () {
        return true;
    };
    ListRepresentationIndex.prototype.initialize = function () {
        log_1.default.error("A `ListRepresentationIndex` does not need to be initialized");
    };
    ListRepresentationIndex.prototype.addPredictedSegments = function () {
        log_1.default.warn("Cannot add predicted segments to a `ListRepresentationIndex`");
    };
    /**
     * @param {Object} newIndex
     */
    ListRepresentationIndex.prototype._replace = function (newIndex) {
        this._index = newIndex._index;
    };
    ListRepresentationIndex.prototype._update = function () {
        log_1.default.error("A `ListRepresentationIndex` cannot be updated");
    };
    return ListRepresentationIndex;
}());
exports.default = ListRepresentationIndex;
