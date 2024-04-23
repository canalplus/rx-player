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
import log from "../../../../../log";
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import { fromIndexTime, getIndexSegmentEnd, toIndexTime, } from "../../../utils/index_helpers";
import getInitSegment from "./get_init_segment";
import getSegmentsFromTimeline from "./get_segments_from_timeline";
import { constructRepresentationUrl } from "./tokens";
/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} segmentInfos
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(index, segmentInfos) {
    if (segmentInfos.timescale !== index.timescale) {
        const { timescale } = index;
        index.timeline.push({
            start: (segmentInfos.time / segmentInfos.timescale) * timescale,
            duration: (segmentInfos.duration / segmentInfos.timescale) * timescale,
            repeatCount: segmentInfos.count === undefined ? 0 : segmentInfos.count,
            range: segmentInfos.range,
        });
    }
    else {
        index.timeline.push({
            start: segmentInfos.time,
            duration: segmentInfos.duration,
            repeatCount: segmentInfos.count === undefined ? 0 : segmentInfos.count,
            range: segmentInfos.range,
        });
    }
    return true;
}
export default class BaseRepresentationIndex {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index, context) {
        var _a, _b, _c, _d;
        const { periodStart, periodEnd, representationId, representationBitrate, isEMSGWhitelisted, } = context;
        const timescale = (_a = index.timescale) !== null && _a !== void 0 ? _a : 1;
        const presentationTimeOffset = (_b = index.presentationTimeOffset) !== null && _b !== void 0 ? _b : 0;
        const indexTimeOffset = presentationTimeOffset - periodStart * timescale;
        const initializationUrl = ((_c = index.initialization) === null || _c === void 0 ? void 0 : _c.media) === undefined
            ? null
            : constructRepresentationUrl(index.initialization.media, representationId, representationBitrate);
        const segmentUrlTemplate = index.media === undefined
            ? null
            : constructRepresentationUrl(index.media, representationId, representationBitrate);
        // TODO If indexRange is either undefined or behind the initialization segment
        // the following logic will not work.
        // However taking the nth first bytes like `dash.js` does (where n = 1500) is
        // not straightforward as we would need to clean-up the segment after that.
        // The following logic corresponds to 100% of tested cases, so good enough for
        // now.
        let range;
        if (index.initialization !== undefined) {
            range = index.initialization.range;
        }
        else if (index.indexRange !== undefined) {
            range = [0, index.indexRange[0] - 1];
        }
        this._index = {
            indexRange: index.indexRange,
            indexTimeOffset,
            initialization: { url: initializationUrl, range },
            segmentUrlTemplate,
            startNumber: index.startNumber,
            endNumber: index.endNumber,
            timeline: (_d = index.timeline) !== null && _d !== void 0 ? _d : [],
            timescale,
        };
        this._manifestBoundsCalculator = context.manifestBoundsCalculator;
        this._scaledPeriodStart = toIndexTime(periodStart, this._index);
        this._scaledPeriodEnd = isNullOrUndefined(periodEnd)
            ? undefined
            : toIndexTime(periodEnd, this._index);
        this._isInitialized = this._index.timeline.length > 0;
        this._isEMSGWhitelisted = isEMSGWhitelisted;
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment() {
        return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    /**
     * Get the list of segments that are currently available from the `from`
     * position, in seconds, ending `dur` seconds after that position.
     *
     * Note that if not already done, you might need to "initialize" the
     * `BaseRepresentationIndex` first so that the list of available segments
     * is known.
     *
     * @see isInitialized for more information on `BaseRepresentationIndex`
     * initialization.
     * @param {Number} from
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(from, dur) {
        return getSegmentsFromTimeline(this._index, from, dur, this._manifestBoundsCalculator, this._scaledPeriodEnd, this._isEMSGWhitelisted);
    }
    /**
     * Returns false as no Segment-Base based index should need to be refreshed.
     * @returns {Boolean}
     */
    shouldRefresh() {
        return false;
    }
    /**
     * Returns first position in index.
     * @returns {Number|null}
     */
    getFirstAvailablePosition() {
        const index = this._index;
        if (index.timeline.length === 0) {
            return null;
        }
        return fromIndexTime(Math.max(this._scaledPeriodStart, index.timeline[0].start), index);
    }
    /**
     * Returns last position in index.
     * @returns {Number|null}
     */
    getLastAvailablePosition() {
        var _a;
        const { timeline } = this._index;
        if (timeline.length === 0) {
            return null;
        }
        const lastTimelineElement = timeline[timeline.length - 1];
        const lastTime = Math.min(getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd), (_a = this._scaledPeriodEnd) !== null && _a !== void 0 ? _a : Infinity);
        return fromIndexTime(lastTime, this._index);
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
     * Always `false` in a `BaseRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween() {
        return false;
    }
    /**
     * Segments in a segmentBase scheme should stay available.
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable() {
        return true;
    }
    /**
     * We do not check for discontinuity in SegmentBase-based indexes.
     * @returns {null}
     */
    checkDiscontinuity() {
        return null;
    }
    /**
     * Returns `false` as a `BaseRepresentationIndex` should not be dynamic and as
     * such segments should never fall out-of-sync.
     * @returns {Boolean}
     */
    canBeOutOfSyncError() {
        return false;
    }
    /**
     * Returns `true` as SegmentBase are not dynamic and as such no new segment
     * should become available in the future.
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments() {
        return false;
    }
    /**
     * No segment in a `BaseRepresentationIndex` are known initially.
     * It is only defined generally in an "index segment" that will thus need to
     * be first loaded and parsed.
     *
     * Once the index segment or equivalent has been parsed, the `initializeIndex`
     * method have to be called with the corresponding segment information so the
     * `BaseRepresentationIndex` can be considered as "initialized" (and so this
     * method can return `true`).
     * Until then this method will return `false` and segments linked to that
     * Representation may be missing.
     * @returns {Boolean}
     */
    isInitialized() {
        return this._isInitialized;
    }
    /**
     * No segment in a `BaseRepresentationIndex` are known initially.
     *
     * It is only defined generally in an "index segment" that will thus need to
     * be first loaded and parsed.
     * Until then, this `BaseRepresentationIndex` is considered as `uninitialized`
     * (@see isInitialized).
     *
     * Once that those information are available, the present
     * `BaseRepresentationIndex` can be "initialized" by adding that parsed
     * segment information through this method.
     * @param {Array.<Object>} indexSegments
     * @returns {Array.<Object>}
     */
    initialize(indexSegments) {
        if (this._isInitialized) {
            return;
        }
        for (let i = 0; i < indexSegments.length; i++) {
            _addSegmentInfos(this._index, indexSegments[i]);
        }
        this._isInitialized = true;
    }
    addPredictedSegments() {
        log.warn("Cannot add predicted segments to a `BaseRepresentationIndex`");
    }
    /**
     * Replace in-place this `BaseRepresentationIndex` information by the
     * information from another one.
     * @param {Object} newIndex
     */
    _replace(newIndex) {
        this._index = newIndex._index;
        this._isInitialized = newIndex._isInitialized;
        this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
        this._isEMSGWhitelisted = newIndex._isEMSGWhitelisted;
    }
    _update() {
        log.error("Base RepresentationIndex: Cannot update a SegmentList");
    }
}
