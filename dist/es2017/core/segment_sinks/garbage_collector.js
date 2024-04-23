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
import log from "../../log";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { getInnerAndOuterRanges } from "../../utils/ranges";
/**
 * Perform cleaning of the buffer according to the values set by the user
 * each time `playbackObserver` emits and each times the
 * maxBufferBehind/maxBufferAhead values change.
 *
 * Abort this operation when the `cancellationSignal` emits.
 *
 * @param {Object} opt
 * @param {Object} cancellationSignal
 *
 * TODO Move to main thread?
 */
export default function BufferGarbageCollector({ segmentSink, playbackObserver, maxBufferBehind, maxBufferAhead, }, cancellationSignal) {
    let lastPosition;
    let lastBuffered = [];
    playbackObserver.listen((o) => {
        lastPosition = o.position.getWanted();
        lastBuffered = o.buffered[segmentSink.bufferType];
        clean();
    }, { includeLastObservation: true, clearSignal: cancellationSignal });
    function clean() {
        if (lastBuffered === null) {
            return;
        }
        clearBuffer(segmentSink, lastPosition, lastBuffered, maxBufferBehind.getValue(), maxBufferAhead.getValue(), cancellationSignal).catch((e) => {
            const errMsg = e instanceof Error ? e.message : "Unknown error";
            log.error("Could not run BufferGarbageCollector:", errMsg);
        });
    }
    maxBufferBehind.onUpdate(clean, { clearSignal: cancellationSignal });
    maxBufferAhead.onUpdate(clean, { clearSignal: cancellationSignal });
    clean();
}
/**
 * Remove buffer from the browser's memory based on the user's
 * maxBufferAhead / maxBufferBehind settings.
 *
 * Normally, the browser garbage-collect automatically old-added chunks of
 * buffer data when memory is scarce. However, you might want to control
 * the size of memory allocated. This function takes the current position
 * and a "depth" behind and ahead wanted for the buffer, in seconds.
 *
 * Anything older than the depth will be removed from the buffer.
 * @param {Object} segmentSink
 * @param {Number} position - The current position
 * @param {Array.<Object>} buffered
 * @param {Number} maxBufferBehind
 * @param {Number} maxBufferAhead
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
async function clearBuffer(segmentSink, position, buffered, maxBufferBehind, maxBufferAhead, cancellationSignal) {
    if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
        return Promise.resolve();
    }
    const cleanedupRanges = [];
    const { innerRange, outerRanges } = getInnerAndOuterRanges(buffered, position);
    const collectBufferBehind = () => {
        if (!isFinite(maxBufferBehind)) {
            return;
        }
        // begin from the oldest
        for (let i = 0; i < outerRanges.length; i++) {
            const outerRange = outerRanges[i];
            if (position - maxBufferBehind >= outerRange.end) {
                cleanedupRanges.push(outerRange);
            }
            else if (position >= outerRange.end &&
                position - maxBufferBehind > outerRange.start &&
                position - maxBufferBehind < outerRange.end) {
                cleanedupRanges.push({
                    start: outerRange.start,
                    end: position - maxBufferBehind,
                });
            }
        }
        if (!isNullOrUndefined(innerRange)) {
            if (position - maxBufferBehind > innerRange.start) {
                cleanedupRanges.push({
                    start: innerRange.start,
                    end: position - maxBufferBehind,
                });
            }
        }
    };
    const collectBufferAhead = () => {
        if (!isFinite(maxBufferAhead)) {
            return;
        }
        // begin from the oldest
        for (let i = 0; i < outerRanges.length; i++) {
            const outerRange = outerRanges[i];
            if (position + maxBufferAhead <= outerRange.start) {
                cleanedupRanges.push(outerRange);
            }
            else if (position <= outerRange.start &&
                position + maxBufferAhead < outerRange.end &&
                position + maxBufferAhead > outerRange.start) {
                cleanedupRanges.push({
                    start: position + maxBufferAhead,
                    end: outerRange.end,
                });
            }
        }
        if (!isNullOrUndefined(innerRange)) {
            if (position + maxBufferAhead < innerRange.end) {
                cleanedupRanges.push({
                    start: position + maxBufferAhead,
                    end: innerRange.end,
                });
            }
        }
    };
    collectBufferBehind();
    collectBufferAhead();
    for (const range of cleanedupRanges) {
        if (range.start < range.end) {
            log.debug("GC: cleaning range from SegmentSink", range.start, range.end);
            if (cancellationSignal.cancellationError !== null) {
                throw cancellationSignal.cancellationError;
            }
            await segmentSink.removeBuffer(range.start, range.end);
        }
    }
}
