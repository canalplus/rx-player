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
import log from "../../../../../log";
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import { getTimescaledRange } from "../../../utils/index_helpers";
import getInitSegment from "./get_init_segment";
import { constructRepresentationUrl } from "./tokens";
export default class ListRepresentationIndex {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index, context) {
        var _a, _b, _c;
        if (index.duration === undefined) {
            throw new Error("Invalid SegmentList: no duration");
        }
        const { periodStart, periodEnd, representationId, representationBitrate, isEMSGWhitelisted, } = context;
        this._isEMSGWhitelisted = isEMSGWhitelisted;
        this._periodStart = periodStart;
        this._periodEnd = periodEnd;
        const presentationTimeOffset = (_a = index.presentationTimeOffset) !== null && _a !== void 0 ? _a : 0;
        const timescale = (_b = index.timescale) !== null && _b !== void 0 ? _b : 1;
        const indexTimeOffset = presentationTimeOffset - periodStart * timescale;
        const initializationUrl = ((_c = index.initialization) === null || _c === void 0 ? void 0 : _c.media) === undefined
            ? null
            : constructRepresentationUrl(index.initialization.media, representationId, representationBitrate);
        const list = index.list.map((lItem) => ({
            url: lItem.media === undefined
                ? null
                : constructRepresentationUrl(lItem.media, representationId, representationBitrate),
            mediaRange: lItem.mediaRange,
        }));
        this._index = {
            list,
            timescale,
            duration: index.duration,
            indexTimeOffset,
            indexRange: index.indexRange,
            initialization: isNullOrUndefined(index.initialization)
                ? undefined
                : { url: initializationUrl, range: index.initialization.range },
        };
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment() {
        const initSegment = getInitSegment(this._index);
        if (initSegment.privateInfos === undefined) {
            initSegment.privateInfos = {};
        }
        initSegment.privateInfos.isEMSGWhitelisted = this._isEMSGWhitelisted;
        return initSegment;
    }
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(fromTime, dur) {
        const index = this._index;
        const { duration, list, timescale } = index;
        const durationInSeconds = duration / timescale;
        const fromTimeInPeriod = fromTime - this._periodStart;
        const [up, to] = getTimescaledRange(fromTimeInPeriod, dur, timescale);
        const length = Math.min(list.length - 1, Math.floor(to / duration));
        const segments = [];
        let i = Math.floor(up / duration);
        while (i <= length) {
            const range = list[i].mediaRange;
            const url = list[i].url;
            const time = i * durationInSeconds + this._periodStart;
            const segment = {
                id: String(i),
                time,
                isInit: false,
                range,
                duration: durationInSeconds,
                timescale: 1,
                end: time + durationInSeconds,
                url,
                timestampOffset: -(index.indexTimeOffset / timescale),
                complete: true,
                privateInfos: { isEMSGWhitelisted: this._isEMSGWhitelisted },
            };
            segments.push(segment);
            i++;
        }
        return segments;
    }
    /**
     * Returns whether the Manifest should be refreshed based on the
     * `ListRepresentationIndex`'s state and the time range the player is
     * currently considering.
     * @param {Number} _fromTime
     * @param {Number} _toTime
     * @returns {Boolean}
     */
    shouldRefresh(_fromTime, _toTime) {
        // DASH Manifests are usually refreshed through other means, i.e. thanks to
        // the `minimumUpdatePeriod` attribute.
        // Moreover, SegmentList are usually only found in static MPDs.
        return false;
    }
    /**
     * Returns first position in this index, in seconds.
     * @returns {Number}
     */
    getFirstAvailablePosition() {
        return this._periodStart;
    }
    /**
     * Returns last position in this index, in seconds.
     * @returns {Number}
     */
    getLastAvailablePosition() {
        var _a;
        const index = this._index;
        const { duration, list } = index;
        return Math.min((list.length * duration) / index.timescale + this._periodStart, (_a = this._periodEnd) !== null && _a !== void 0 ? _a : Infinity);
    }
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd() {
        return this.getLastAvailablePosition();
    }
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
    awaitSegmentBetween() {
        return false;
    }
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * @returns {Boolean}
     */
    isSegmentStillAvailable() {
        return true;
    }
    /**
     * We do not check for discontinuity in SegmentList-based indexes.
     * @returns {null}
     */
    checkDiscontinuity() {
        return null;
    }
    /**
     * SegmentList should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError() {
        return false;
    }
    /**
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments() {
        return false;
    }
    /**
     * @returns {Boolean}
     */
    isInitialized() {
        return true;
    }
    initialize() {
        log.error("A `ListRepresentationIndex` does not need to be initialized");
    }
    addPredictedSegments() {
        log.warn("Cannot add predicted segments to a `ListRepresentationIndex`");
    }
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex) {
        this._index = newIndex._index;
    }
    _update() {
        log.error("A `ListRepresentationIndex` cannot be updated");
    }
}
