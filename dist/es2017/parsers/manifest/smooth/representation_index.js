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
import { NetworkError } from "../../../errors";
import log from "../../../log";
import assert from "../../../utils/assert";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import { checkDiscontinuity, getIndexSegmentEnd } from "../utils/index_helpers";
import { replaceSegmentSmoothTokens } from "./utils/tokens";
/**
 * @param {Number} start
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(start, up, duration) {
    const diff = up - start;
    return diff > 0 ? Math.floor(diff / duration) : 0;
}
/**
 * Convert second-based start time and duration to the timescale of the
 * manifest's index.
 * @param {Object} index
 * @param {Number} start
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function normalizeRange(timescale, start, duration) {
    const ts = timescale === undefined || timescale === 0 ? 1 : timescale;
    return { up: start * ts, to: (start + duration) * ts };
}
/**
 * Calculate the number of times a segment repeat based on the next segment.
 * @param {Object} segment
 * @param {Object} nextSegment
 * @returns {Number}
 */
function calculateRepeat(segment, nextSegment) {
    let repeatCount = segment.repeatCount;
    // A negative value of the @r attribute of the S element indicates
    // that the duration indicated in @d attribute repeats until the
    // start of the next S element, the end of the Period or until the
    // next MPD update.
    // TODO Also for SMOOTH????
    if (segment.duration !== undefined && repeatCount < 0) {
        const repeatEnd = nextSegment !== undefined ? nextSegment.start : Infinity;
        repeatCount = Math.ceil((repeatEnd - segment.start) / segment.duration) - 1;
    }
    return repeatCount;
}
/**
 * RepresentationIndex implementation for Smooth Manifests.
 *
 * Allows to interact with the index to create new Segments.
 *
 * @class SmoothRepresentationIndex
 */
export default class SmoothRepresentationIndex {
    /**
     * Creates a new `SmoothRepresentationIndex`.
     * @param {Object} index
     * @param {Object} options
     */
    constructor(options) {
        const { isLive, segmentPrivateInfos, media, sharedSmoothTimeline } = options;
        this._sharedSmoothTimeline = sharedSmoothTimeline;
        this._initSegmentInfos = {
            bitsPerSample: segmentPrivateInfos.bitsPerSample,
            channels: segmentPrivateInfos.channels,
            codecPrivateData: segmentPrivateInfos.codecPrivateData,
            packetSize: segmentPrivateInfos.packetSize,
            samplingRate: segmentPrivateInfos.samplingRate,
            timescale: sharedSmoothTimeline.timescale,
            height: segmentPrivateInfos.height,
            width: segmentPrivateInfos.width,
            protection: segmentPrivateInfos.protection,
        };
        this._isLive = isLive;
        this._media = media;
        if (sharedSmoothTimeline.timeline.length !== 0 && isLive) {
            const { timeline, validityTime } = sharedSmoothTimeline;
            const lastItem = timeline[timeline.length - 1];
            const scaledEnd = getIndexSegmentEnd(lastItem, null);
            const scaledTimelineValidityTime = (validityTime / 1000) * sharedSmoothTimeline.timescale;
            this._scaledLiveGap = scaledTimelineValidityTime - scaledEnd;
        }
    }
    /**
     * Construct init Segment compatible with a Smooth Manifest.
     * @returns {Object}
     */
    getInitSegment() {
        return {
            id: "init",
            isInit: true,
            privateInfos: { smoothInitSegment: this._initSegmentInfos },
            url: null,
            time: 0,
            end: 0,
            duration: 0,
            timescale: 1,
            complete: true,
        };
    }
    /**
     * Generate a list of Segments for a particular period of time.
     *
     * @param {Number} from
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(from, dur) {
        this._refreshTimeline();
        const { timescale, timeline } = this._sharedSmoothTimeline;
        const { up, to } = normalizeRange(timescale, from, dur);
        const media = this._media;
        let currentNumber;
        const segments = [];
        const timelineLength = timeline.length;
        const maxPosition = this._scaledLiveGap === undefined
            ? undefined
            : (getMonotonicTimeStamp() / 1000) * timescale - this._scaledLiveGap;
        for (let i = 0; i < timelineLength; i++) {
            const segmentRange = timeline[i];
            const { duration, start } = segmentRange;
            const repeat = calculateRepeat(segmentRange, timeline[i + 1]);
            let segmentNumberInCurrentRange = getSegmentNumber(start, up, duration);
            let segmentTime = start + segmentNumberInCurrentRange * duration;
            const timeToAddToCheckMaxPosition = duration;
            while (segmentTime < to &&
                segmentNumberInCurrentRange <= repeat &&
                (maxPosition === undefined ||
                    segmentTime + timeToAddToCheckMaxPosition <= maxPosition)) {
                const time = segmentTime;
                const number = currentNumber !== undefined
                    ? currentNumber + segmentNumberInCurrentRange
                    : undefined;
                const segment = {
                    id: String(segmentTime),
                    isInit: false,
                    time: time / timescale,
                    end: (time + duration) / timescale,
                    duration: duration / timescale,
                    timescale: 1,
                    number,
                    url: replaceSegmentSmoothTokens(media, time),
                    complete: true,
                    privateInfos: { smoothMediaSegment: { time, duration } },
                };
                segments.push(segment);
                // update segment number and segment time for the next segment
                segmentNumberInCurrentRange++;
                segmentTime = start + segmentNumberInCurrentRange * duration;
            }
            if (segmentTime >= to) {
                // we reached ``to``, we're done
                return segments;
            }
            if (currentNumber !== undefined) {
                currentNumber += repeat + 1;
            }
        }
        return segments;
    }
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * (If we should re-fetch the manifest)
     * @param {Number} up
     * @param {Number} to
     * @returns {Boolean}
     */
    shouldRefresh(up, to) {
        this._refreshTimeline();
        if (!this._isLive) {
            return false;
        }
        const { timeline, timescale } = this._sharedSmoothTimeline;
        const lastSegmentInCurrentTimeline = timeline[timeline.length - 1];
        if (lastSegmentInCurrentTimeline === undefined) {
            return false;
        }
        const repeat = lastSegmentInCurrentTimeline.repeatCount;
        const endOfLastSegmentInCurrentTimeline = lastSegmentInCurrentTimeline.start +
            (repeat + 1) * lastSegmentInCurrentTimeline.duration;
        if (to * timescale < endOfLastSegmentInCurrentTimeline) {
            return false;
        }
        if (up * timescale >= endOfLastSegmentInCurrentTimeline) {
            return true;
        }
        // ----
        const startOfLastSegmentInCurrentTimeline = lastSegmentInCurrentTimeline.start + repeat * lastSegmentInCurrentTimeline.duration;
        return up * timescale > startOfLastSegmentInCurrentTimeline;
    }
    /**
     * Returns first position available in the index.
     * @returns {Number|null}
     */
    getFirstAvailablePosition() {
        this._refreshTimeline();
        const { timeline, timescale } = this._sharedSmoothTimeline;
        if (timeline.length === 0) {
            return null;
        }
        return timeline[0].start / timescale;
    }
    /**
     * Returns last position available in the index.
     * @returns {Number}
     */
    getLastAvailablePosition() {
        this._refreshTimeline();
        const { timeline, timescale } = this._sharedSmoothTimeline;
        if (this._scaledLiveGap === undefined) {
            const lastTimelineElement = timeline[timeline.length - 1];
            return getIndexSegmentEnd(lastTimelineElement, null) / timescale;
        }
        for (let i = timeline.length - 1; i >= 0; i--) {
            const timelineElt = timeline[i];
            const timescaledNow = (getMonotonicTimeStamp() / 1000) * timescale;
            const { start, duration, repeatCount } = timelineElt;
            for (let j = repeatCount; j >= 0; j--) {
                const end = start + duration * (j + 1);
                const positionToReach = end;
                if (positionToReach <= timescaledNow - this._scaledLiveGap) {
                    return end / timescale;
                }
            }
        }
        return undefined;
    }
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd() {
        if (!this._isLive) {
            return this.getLastAvailablePosition();
        }
        return undefined;
    }
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
    awaitSegmentBetween(start, end) {
        var _a;
        assert(start <= end);
        if (this.isStillAwaitingFutureSegments()) {
            return false;
        }
        const lastAvailablePosition = this.getLastAvailablePosition();
        if (lastAvailablePosition !== undefined && end < lastAvailablePosition) {
            return false;
        }
        return end > ((_a = this.getFirstAvailablePosition()) !== null && _a !== void 0 ? _a : 0) ? undefined : false;
    }
    /**
     * Checks if `timeSec` is in a discontinuity.
     * That is, if there's no segment available for the `timeSec` position.
     * @param {number} timeSec - The time to check if it's in a discontinuity, in
     * seconds.
     * @returns {number | null} - If `null`, no discontinuity is encountered at
     * `time`. If this is a number instead, there is one and that number is the
     * position for which a segment is available in seconds.
     */
    checkDiscontinuity(timeSec) {
        this._refreshTimeline();
        return checkDiscontinuity(this._sharedSmoothTimeline, timeSec, undefined);
    }
    /**
     * Returns `true` if a Segment returned by this index is still considered
     * available.
     * Returns `false` if it is not available anymore.
     * Returns `undefined` if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable(segment) {
        if (segment.isInit) {
            return true;
        }
        this._refreshTimeline();
        const { timeline, timescale } = this._sharedSmoothTimeline;
        for (let i = 0; i < timeline.length; i++) {
            const tSegment = timeline[i];
            const tSegmentTime = tSegment.start / timescale;
            if (tSegmentTime > segment.time) {
                return false; // We went over it without finding it
            }
            else if (tSegmentTime === segment.time) {
                return true;
            }
            else {
                // tSegment.start < segment.time
                if (tSegment.repeatCount >= 0 && tSegment.duration !== undefined) {
                    const timeDiff = tSegmentTime - tSegment.start;
                    const repeat = timeDiff / tSegment.duration - 1;
                    return repeat % 1 === 0 && repeat <= tSegment.repeatCount;
                }
            }
        }
        return false;
    }
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    canBeOutOfSyncError(error) {
        if (!this._isLive) {
            return false;
        }
        return (error instanceof NetworkError && (error.isHttpError(404) || error.isHttpError(412)));
    }
    /**
     * Replace this RepresentationIndex by a newly downloaded one.
     * Check if the old index had more information about new segments and re-add
     * them if that's the case.
     * @param {Object} newIndex
     */
    _replace(newIndex) {
        this._initialScaledLastPosition = newIndex._initialScaledLastPosition;
        this._scaledLiveGap = newIndex._scaledLiveGap;
        this._sharedSmoothTimeline.replace(newIndex._sharedSmoothTimeline);
    }
    /**
     * Update the current index with a new, partial, version.
     * This method might be use to only add information about new segments.
     * @param {Object} newIndex
     */
    _update(newIndex) {
        this._scaledLiveGap = newIndex._scaledLiveGap;
        this._sharedSmoothTimeline.update(newIndex._sharedSmoothTimeline);
    }
    /**
     * Returns `false` if the last segments in this index have already been
     * generated.
     * Returns `true` if the index is still waiting on future segments to be
     * generated.
     *
     * For Smooth, it should only depend on whether the content is a live content
     * or not.
     * TODO What about Smooth live content that finishes at some point?
     * @returns {boolean}
     */
    isStillAwaitingFutureSegments() {
        return this._isLive;
    }
    /**
     * @returns {Boolean}
     */
    isInitialized() {
        return true;
    }
    initialize() {
        log.error("A `SmoothRepresentationIndex` does not need to be initialized");
    }
    /**
     * Add segments to a `SharedSmoothSegmentTimeline` that were predicted to come
     * after `currentSegment`.
     * @param {Array.<Object>} nextSegments - The segment information parsed.
     * @param {Object} currentSegment - Information on the segment which contained
     * that new segment information.
     */
    addPredictedSegments(nextSegments, currentSegment) {
        this._sharedSmoothTimeline.addPredictedSegments(nextSegments, currentSegment);
    }
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to the timeshift window
     */
    _refreshTimeline() {
        this._sharedSmoothTimeline.refresh();
    }
}
