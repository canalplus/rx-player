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
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
/**
 * This class allows to easily calculate the first and last available positions
 * in a content at any time.
 *
 * By centralizing the manifest bounds calculation in this class and by giving
 * an instance of it to each parsed elements which might depend on it, we
 * ensure that we can provide it once it is known to every one of those
 * elements without needing to parse a second time the MPD.
 * @class ManifestBoundsCalculator
 */
export default class ManifestBoundsCalculator {
    /**
     * @param {Object} args
     */
    constructor(args) {
        this._isDynamic = args.isDynamic;
        this._timeShiftBufferDepth =
            !args.isDynamic || args.timeShiftBufferDepth === undefined
                ? null
                : args.timeShiftBufferDepth;
        this._serverTimestampOffset = args.serverTimestampOffset;
        this._availabilityStartTime = args.availabilityStartTime;
    }
    /**
     * Set the last position and the position time (the value of the RxPlayer's
     * monotonically-raising timestamp at the time that position was true
     * converted into seconds).
     *
     * @example
     * Example if you trust `Date.now()` to give you a reliable offset:
     * ```js
     * const lastPosition = Date.now();
     * const positionTime = getMonotonicTimeStamp() / 1000;
     * manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
     * ```
     *
     * @param {number} lastPosition
     * @param {number|undefined} positionTime
     */
    setLastPosition(lastPosition, positionTime) {
        this._lastPosition = lastPosition;
        this._positionTime = positionTime;
    }
    /**
     * Returns `true` if the last position and the position time
     * (for dynamic content only) have been comunicated.
     * `false` otherwise.
     * @returns {boolean}
     */
    lastPositionIsKnown() {
        if (this._isDynamic) {
            return this._positionTime !== undefined && this._lastPosition !== undefined;
        }
        return this._lastPosition !== undefined;
    }
    /**
     * Estimate a minimum bound for the content from the last set segment time
     * and buffer depth.
     * Consider that it is only an estimate, not the real value.
     * @param {number} segmentDuration - In DASH, the buffer depth actually also
     * depend on a corresponding's segment duration (e.g. a segment become
     * unavailable once the `timeShiftBufferDepth` + its duration has elapsed).
     * This argument can thus be set the approximate duration of a segment.
     * @return {number|undefined}
     */
    getEstimatedMinimumSegmentTime(segmentDuration) {
        var _a;
        if (!this._isDynamic || this._timeShiftBufferDepth === null) {
            return 0;
        }
        const maximumBound = (_a = this.getEstimatedLiveEdge()) !== null && _a !== void 0 ? _a : this.getEstimatedMaximumPosition(0);
        if (maximumBound === undefined) {
            return undefined;
        }
        const minimumBound = maximumBound - (this._timeShiftBufferDepth + segmentDuration);
        return minimumBound;
    }
    /**
     * Estimate the segment time in seconds that corresponds to what could be
     * considered the live edge (or `undefined` for non-live contents).
     *
     * Note that for some contents which just anounce segments in advance, this
     * value might be very different than the maximum position that is
     * requestable.
     * @return {number|undefined}
     */
    getEstimatedLiveEdge() {
        if (!this._isDynamic || this._serverTimestampOffset === undefined) {
            return undefined;
        }
        return ((getMonotonicTimeStamp() + this._serverTimestampOffset) / 1000 -
            this._availabilityStartTime);
    }
    /**
     * Produce a rough estimate of the ending time of the last requestable segment
     * in that content.
     *
     * This value is only an estimate and may be far from reality.
     *
     * The `availabilityTimeOffset` in argument is the corresponding
     * `availabilityTimeOffset` that applies to the current wanted segment, or `0`
     * if none exist. It will be applied on live content to deduce the maximum
     * segment time available.
     */
    getEstimatedMaximumPosition(availabilityTimeOffset) {
        if (!this._isDynamic) {
            return this._lastPosition;
        }
        const liveEdge = this.getEstimatedLiveEdge();
        if (liveEdge !== undefined && availabilityTimeOffset !== Infinity) {
            return liveEdge + availabilityTimeOffset;
        }
        else if (this._positionTime !== undefined && this._lastPosition !== undefined) {
            return Math.max(this._lastPosition - this._positionTime + getMonotonicTimeStamp() / 1000, 0);
        }
        return this._lastPosition;
    }
}
