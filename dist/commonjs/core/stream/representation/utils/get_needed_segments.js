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
var config_1 = require("../../../../config");
var log_1 = require("../../../../log");
var manifest_1 = require("../../../../manifest");
var object_assign_1 = require("../../../../utils/object_assign");
/**
 * Return the list of segments that can currently be downloaded to fill holes
 * in the buffer in the given range, including already-pushed segments currently
 * incomplete in the buffer.
 * This list might also include already-loaded segments in a higher bitrate,
 * according to the given configuration.
 * Excludes segment that are already being pushed.
 * @param {Object} args
 * @returns {Array.<Object>}
 */
function getNeededSegments(_a) {
    var bufferedSegments = _a.bufferedSegments, content = _a.content, currentPlaybackTime = _a.currentPlaybackTime, fastSwitchThreshold = _a.fastSwitchThreshold, getBufferedHistory = _a.getBufferedHistory, neededRange = _a.neededRange, segmentsBeingPushed = _a.segmentsBeingPushed, maxBufferSize = _a.maxBufferSize;
    var adaptation = content.adaptation, representation = content.representation;
    var availableBufferSize = getAvailableBufferSize(bufferedSegments, segmentsBeingPushed, maxBufferSize);
    var availableSegmentsForRange = representation.index.getSegments(neededRange.start, neededRange.end - neededRange.start);
    // Remove from `bufferedSegments` any segments we would prefer to replace:
    //   - segments in the wrong track / bad quality
    //   - garbage-collected segments
    var segmentsToKeep = bufferedSegments
        .filter(function (bufferedSegment) {
        return !shouldContentBeReplaced(bufferedSegment.infos, content, currentPlaybackTime, fastSwitchThreshold);
    })
        .filter(function (currentSeg, i, consideredSegments) {
        var prevSeg = i === 0 ? null : consideredSegments[i - 1];
        var nextSeg = i >= consideredSegments.length - 1 ? null : consideredSegments[i + 1];
        var lazySegmentHistory = null;
        if (doesStartSeemGarbageCollected(currentSeg, prevSeg, neededRange.start)) {
            lazySegmentHistory = getBufferedHistory(currentSeg.infos);
            if (shouldReloadSegmentGCedAtTheStart(lazySegmentHistory, currentSeg.bufferedStart)) {
                return false;
            }
            log_1.default.debug("Stream: skipping segment gc-ed at the start", currentSeg.start, currentSeg.bufferedStart);
        }
        if (doesEndSeemGarbageCollected(currentSeg, nextSeg, neededRange.end)) {
            lazySegmentHistory = lazySegmentHistory !== null && lazySegmentHistory !== void 0 ? lazySegmentHistory : getBufferedHistory(currentSeg.infos);
            if (shouldReloadSegmentGCedAtTheEnd(lazySegmentHistory, currentSeg.bufferedEnd)) {
                return false;
            }
            log_1.default.debug("Stream: skipping segment gc-ed at the end", currentSeg.end, currentSeg.bufferedEnd);
        }
        return true;
    });
    var _b = config_1.default.getCurrent(), MINIMUM_SEGMENT_SIZE = _b.MINIMUM_SEGMENT_SIZE, MIN_BUFFER_AHEAD = _b.MIN_BUFFER_AHEAD;
    var shouldStopLoadingSegments = false;
    /**
     * Epsilon compensating for rounding errors when comparing the start and end
     * time of multiple segments.
     */
    var ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    var isBufferFull = false;
    var segmentsOnHold = [];
    var segmentsToLoad = availableSegmentsForRange.filter(function (segment) {
        var contentObject = (0, object_assign_1.default)({ segment: segment }, content);
        // First, check that the segment is not already being pushed
        if (segmentsBeingPushed.length > 0) {
            var isAlreadyBeingPushed = segmentsBeingPushed.some(function (pendingSegment) {
                return (0, manifest_1.areSameContent)(contentObject, pendingSegment);
            });
            if (isAlreadyBeingPushed) {
                return false;
            }
        }
        var duration = segment.duration, time = segment.time, end = segment.end;
        if (segment.isInit) {
            return true; // never skip initialization segments
        }
        if (shouldStopLoadingSegments) {
            segmentsOnHold.push(segment);
            return false;
        }
        if (segment.complete && duration < MINIMUM_SEGMENT_SIZE) {
            return false; // too small, don't download
        }
        // Check if the same segment from another Representation is not already
        // being pushed.
        if (segmentsBeingPushed.length > 0) {
            var waitForPushedSegment = segmentsBeingPushed.some(function (pendingSegment) {
                if (pendingSegment.period.id !== content.period.id ||
                    pendingSegment.adaptation.id !== content.adaptation.id) {
                    return false;
                }
                var oldSegment = pendingSegment.segment;
                if (oldSegment.time - ROUNDING_ERROR > time) {
                    return false;
                }
                if (oldSegment.end + ROUNDING_ERROR < end) {
                    return false;
                }
                return !shouldContentBeReplaced(pendingSegment, contentObject, currentPlaybackTime, fastSwitchThreshold);
            });
            if (waitForPushedSegment) {
                return false;
            }
        }
        // check if the segment is already downloaded
        for (var i = 0; i < segmentsToKeep.length; i++) {
            var completeSeg = segmentsToKeep[i];
            var areFromSamePeriod = completeSeg.infos.period.id === content.period.id;
            // Check if content are from same period, as there can't be overlapping
            // periods, we should consider a segment as already downloaded if
            // it is from same period (but can be from different adaptation or
            // representation)
            if (areFromSamePeriod) {
                var completeSegInfos = completeSeg.infos.segment;
                if (time - completeSegInfos.time > -ROUNDING_ERROR &&
                    completeSegInfos.end - end > -ROUNDING_ERROR) {
                    return false; // already downloaded
                }
            }
        }
        var estimatedSegmentSize = duration * content.representation.bitrate; // in bits
        if (availableBufferSize - estimatedSegmentSize < 0) {
            isBufferFull = true;
            if (time > neededRange.start + MIN_BUFFER_AHEAD) {
                shouldStopLoadingSegments = true;
                segmentsOnHold.push(segment);
                return false;
            }
        }
        // check if the browser is not just garbage collecting it
        var segmentHistory = getBufferedHistory(contentObject);
        if (segmentHistory.length > 1) {
            var lastTimeItWasPushed = segmentHistory[segmentHistory.length - 1];
            var beforeLastTimeItWasPushed = segmentHistory[segmentHistory.length - 2];
            if (lastTimeItWasPushed.buffered === null &&
                beforeLastTimeItWasPushed.buffered === null) {
                log_1.default.warn("Stream: Segment GCed multiple times in a row, ignoring it.", "If this happens a lot and lead to unpleasant experience, please " +
                    " check your device's available memory. If it's low when this message " +
                    "is emitted, you might want to update the RxPlayer's settings (" +
                    "`maxBufferAhead`, `maxVideoBufferSize` etc.) so less memory is used " +
                    "by regular media data buffering." +
                    adaptation.type, representation.id, segment.time);
                return false;
            }
        }
        // check if there is an hole in place of the segment currently
        for (var i = 0; i < segmentsToKeep.length; i++) {
            var completeSeg = segmentsToKeep[i];
            // For the first already-loaded segment, take the first one ending after
            // this one' s start
            if (completeSeg.end + ROUNDING_ERROR > time) {
                var shouldLoad = completeSeg.start > time + ROUNDING_ERROR ||
                    getLastContiguousSegment(segmentsToKeep, i).end < end - ROUNDING_ERROR;
                if (shouldLoad) {
                    availableBufferSize -= estimatedSegmentSize;
                }
                return shouldLoad;
            }
        }
        availableBufferSize -= estimatedSegmentSize;
        return true;
    });
    return { segmentsToLoad: segmentsToLoad, segmentsOnHold: segmentsOnHold, isBufferFull: isBufferFull };
}
exports.default = getNeededSegments;
/**
 * Compute the estimated available buffer size in memory in kilobytes
 * @param bufferedSegments
 * @param segmentsBeingPushed
 * @param maxVideoBufferSize
 * @returns availableBufferSize in bits
 */
function getAvailableBufferSize(bufferedSegments, segmentsBeingPushed, maxVideoBufferSize) {
    var availableBufferSize = maxVideoBufferSize * 8000; // in bits
    availableBufferSize -= segmentsBeingPushed.reduce(function (size, segment) {
        var bitrate = segment.representation.bitrate;
        // Not taking into account the fact that the segment
        // can still be generated and the duration not fully exact
        var duration = segment.segment.duration;
        return size + bitrate * duration;
    }, 0);
    return bufferedSegments.reduce(function (size, chunk) {
        if (chunk.chunkSize !== undefined) {
            return size - chunk.chunkSize * 8; // in bits
        }
        else {
            return size;
        }
    }, availableBufferSize);
}
/**
 * From the given array of buffered chunks (`bufferedSegments`) returns the last
 * buffered chunk contiguous with the one at the `startIndex` index given.
 * @param {Array.<Object>}
 * @param {number} startIndex
 * @returns {Object}
 */
function getLastContiguousSegment(bufferedSegments, startIndex) {
    var j = startIndex + 1;
    var MINIMUM_SEGMENT_SIZE = config_1.default.getCurrent().MINIMUM_SEGMENT_SIZE;
    /**
     * Epsilon compensating for rounding errors when comparing the start and end
     * time of multiple segments.
     */
    var ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    // go through all contiguous segments and take the last one
    while (j < bufferedSegments.length - 1 &&
        bufferedSegments[j - 1].end + ROUNDING_ERROR > bufferedSegments[j].start) {
        j++;
    }
    j--; // index of last contiguous segment
    return bufferedSegments[j];
}
/**
 * Returns `true` if segments linked to the given `oldContent` currently present
 * in the buffer should be replaced by segments coming from `currentContent`.
 * @param {Object} oldContent
 * @param {Object} currentContent
 * @param {number} currentPlaybackTime
 * @param {number} [fastSwitchThreshold]
 * @returns {boolean}
 */
function shouldContentBeReplaced(oldContent, currentContent, currentPlaybackTime, fastSwitchThreshold) {
    var CONTENT_REPLACEMENT_PADDING = config_1.default.getCurrent().CONTENT_REPLACEMENT_PADDING;
    if (oldContent.period.id !== currentContent.period.id) {
        return false; // keep segments from another Period by default.
    }
    var segment = oldContent.segment;
    if (segment.time < currentPlaybackTime + CONTENT_REPLACEMENT_PADDING) {
        return false;
    }
    if (oldContent.adaptation.id !== currentContent.adaptation.id) {
        return true; // replace segments from another Adaptation
    }
    return canFastSwitch(oldContent.representation, currentContent.representation, fastSwitchThreshold);
}
/**
 * Returns `true` if segments from the new Representation can replace
 * previously-loaded segments from the old Representation given.
 *
 * This behavior is called "fast-switching".
 * @param {Object} oldSegmentRepresentation
 * @param {Object} newSegmentRepresentation
 * @param {number|undefined} fastSwitchThreshold
 * @returns {boolean}
 */
function canFastSwitch(oldSegmentRepresentation, newSegmentRepresentation, fastSwitchThreshold) {
    var oldContentBitrate = oldSegmentRepresentation.bitrate;
    var BITRATE_REBUFFERING_RATIO = config_1.default.getCurrent().BITRATE_REBUFFERING_RATIO;
    if (fastSwitchThreshold === undefined) {
        // only re-load comparatively-poor bitrates for the same Adaptation.
        var bitrateCeil = oldContentBitrate * BITRATE_REBUFFERING_RATIO;
        return newSegmentRepresentation.bitrate > bitrateCeil;
    }
    return (oldContentBitrate < fastSwitchThreshold &&
        newSegmentRepresentation.bitrate > oldContentBitrate);
}
/**
 * From buffered segment information, return `true` if the given `currentSeg`
 * might have been garbage collected at the start.
 * Return `false` if the segment is complete at least from `maximumStartTime`.
 * @param {Object} currentSeg - The segment information for the segment in
 * question.
 * @param {Object|null} prevSeg - The segment information for the previous
 * buffered segment, if one (`null` if none).
 * @param {number} maximumStartTime - Only consider the data after that time.
 * If `currentSeg` has only been garbage collected for some data which is before
 * that time, we will return `false`.
 */
function doesStartSeemGarbageCollected(currentSeg, prevSeg, maximumStartTime) {
    var MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT = config_1.default.getCurrent().MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT;
    if (currentSeg.bufferedStart === undefined) {
        return false;
    }
    if (prevSeg !== null &&
        prevSeg.bufferedEnd !== undefined &&
        currentSeg.bufferedStart - prevSeg.bufferedEnd < 0.1) {
        return false;
    }
    if (maximumStartTime < currentSeg.bufferedStart &&
        currentSeg.bufferedStart - currentSeg.start > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
        log_1.default.info("Stream: The start of the wanted segment has been garbage collected", currentSeg.start, currentSeg.bufferedStart);
        return true;
    }
    return false;
}
/**
 * From buffered segment information, return `true` if the given `currentSeg`
 * might have been garbage collected at the end.
 * Return `false` if the segment is complete at least until `minimumEndTime`.
 * @param {Object} currentSeg - The segment information for the segment in
 * question.
 * @param {Object|null} nextSeg - The segment information for the next buffered
 * segment, if one (`null` if none).
 * @param {number} minimumEndTime - Only consider the data before that time.
 * If `currentSeg` has only been garbage collected for some data which is after
 * that time, we will return `false`.
 */
function doesEndSeemGarbageCollected(currentSeg, nextSeg, minimumEndTime) {
    var MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT = config_1.default.getCurrent().MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT;
    if (currentSeg.bufferedEnd === undefined) {
        return false;
    }
    if (nextSeg !== null &&
        nextSeg.bufferedStart !== undefined &&
        nextSeg.bufferedStart - currentSeg.bufferedEnd < 0.1) {
        return false;
    }
    if (minimumEndTime > currentSeg.bufferedEnd &&
        currentSeg.end - currentSeg.bufferedEnd > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
        log_1.default.info("Stream: The end of the wanted segment has been garbage collected", currentSeg.end, currentSeg.bufferedEnd);
        return true;
    }
    return false;
}
/**
 * Returns `true` if a segment that has been garbage-collected at the start
 * might profit from being re-loaded.
 *
 * Returns `false` if we have a high chance of staying in the same situation
 * after re-loading the segment.
 *
 * This function takes in argument the entries of a SegmentSink's history
 * related to the corresponding segment and check if the segment appeared
 * garbage-collected at the start directly after the last few times it was
 * pushed, indicating that the issue might be sourced at a browser issue instead
 * of classical garbage collection.
 *
 * @param {Array.<Object>} segmentEntries
 * @param {number|undefined} currentBufferedStart
 * @returns {boolean}
 */
function shouldReloadSegmentGCedAtTheStart(segmentEntries, currentBufferedStart) {
    var _a, _b;
    if (segmentEntries.length < 2) {
        return true;
    }
    var lastEntry = segmentEntries[segmentEntries.length - 1];
    var lastBufferedStart = (_a = lastEntry.buffered) === null || _a === void 0 ? void 0 : _a.start;
    // If the current segment's buffered start is much higher than what it
    // initially was when we pushed it, the segment has a very high chance of
    // having been truly garbage-collected.
    if (currentBufferedStart !== undefined &&
        lastBufferedStart !== undefined &&
        currentBufferedStart - lastBufferedStart > 0.05) {
        return true;
    }
    var prevEntry = segmentEntries[segmentEntries.length - 2];
    var prevBufferedStart = (_b = prevEntry.buffered) === null || _b === void 0 ? void 0 : _b.start;
    if (prevBufferedStart === undefined || lastBufferedStart === undefined) {
        return true;
    }
    // Compare `bufferedStart` from the last time this segment was pushed
    // (`entry.bufferedStart`) to the previous time it was pushed
    // (`prevSegEntry.bufferedStart`).
    //
    // If in both cases, we notice that their initial `bufferedStart` are close,
    // it means that in recent history the same segment has been accused to be
    // garbage collected two times at roughly the same positions just after being
    // pushed.
    // This is very unlikely and might be linked to either a content or browser
    // issue. In that case, don't try to reload.
    return Math.abs(prevBufferedStart - lastBufferedStart) > 0.01;
}
/**
 * Returns `true` if a segment that has been garbage-collected at the end
 * might profit from being re-loaded.
 *
 * Returns `false` if we have a high chance of staying in the same situation
 * after re-loading the segment.
 *
 * This function takes in argument the entries of a SegmentSink's history
 * related to the corresponding segment and check if the segment appeared
 * garbage-collected at the end directly after the last few times it was
 * pushed, indicating that the issue might be sourced at a browser issue instead
 * of classical garbage collection.
 *
 * @param {Array.<Object>} segmentEntries
 * @param {number|undefined} currentBufferedEnd
 * @returns {boolean}
 */
function shouldReloadSegmentGCedAtTheEnd(segmentEntries, currentBufferedEnd) {
    var _a, _b;
    if (segmentEntries.length < 2) {
        return true;
    }
    var lastEntry = segmentEntries[segmentEntries.length - 1];
    var lastBufferedEnd = (_a = lastEntry.buffered) === null || _a === void 0 ? void 0 : _a.end;
    // If the current segment's buffered end is much lower than what it
    // initially was when we pushed it, the segment has a very high chance of
    // having been truly garbage-collected.
    if (currentBufferedEnd !== undefined &&
        lastBufferedEnd !== undefined &&
        lastBufferedEnd - currentBufferedEnd > 0.05) {
        return true;
    }
    var prevEntry = segmentEntries[segmentEntries.length - 2];
    var prevBufferedEnd = (_b = prevEntry.buffered) === null || _b === void 0 ? void 0 : _b.end;
    if (prevBufferedEnd === undefined || lastBufferedEnd === undefined) {
        return true;
    }
    // Compare `bufferedEnd` from the last time this segment was pushed
    // (`entry.bufferedEnd`) to the previous time it was pushed
    // (`prevSegEntry.bufferedEnd`).
    //
    // If in both cases, we notice that their initial `bufferedEnd` are close,
    // it means that in recent history the same segment has been accused to be
    // garbage collected two times at roughly the same positions just after being
    // pushed.
    // This is very unlikely and might be linked to either a content or browser
    // issue. In that case, don't try to reload.
    return Math.abs(prevBufferedEnd - lastBufferedEnd) > 0.01;
}
