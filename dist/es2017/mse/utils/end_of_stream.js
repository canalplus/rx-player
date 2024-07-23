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
import { onRemoveSourceBuffers, onSourceOpen, onSourceBufferUpdate, } from "../../compat/event_listeners";
import log from "../../log";
import TaskCanceller from "../../utils/task_canceller";
/**
 * Get "updating" SourceBuffers from a SourceBufferList.
 * @param {SourceBufferList} sourceBuffers
 * @returns {Array.<SourceBuffer>}
 */
function getUpdatingSourceBuffers(sourceBuffers) {
    const updatingSourceBuffers = [];
    for (let i = 0; i < sourceBuffers.length; i++) {
        const SourceBuffer = sourceBuffers[i];
        if (SourceBuffer.updating) {
            updatingSourceBuffers.push(SourceBuffer);
        }
    }
    return updatingSourceBuffers;
}
/**
 * Trigger the `endOfStream` method of a MediaSource.
 *
 * If the MediaSource is ended/closed, do not call this method.
 * If SourceBuffers are updating, wait for them to be updated before closing
 * it.
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 */
export default function triggerEndOfStream(mediaSource, cancelSignal) {
    log.debug("Init: Trying to call endOfStream");
    if (mediaSource.readyState !== "open") {
        log.debug("Init: MediaSource not open, cancel endOfStream");
        return;
    }
    const { sourceBuffers } = mediaSource;
    const updatingSourceBuffers = getUpdatingSourceBuffers(sourceBuffers);
    if (updatingSourceBuffers.length === 0) {
        log.info("Init: Triggering end of stream");
        try {
            mediaSource.endOfStream();
        }
        catch (err) {
            log.error("Unable to call endOfStream", err instanceof Error ? err : new Error("Unknown error"));
        }
        return;
    }
    log.debug("Init: Waiting SourceBuffers to be updated before calling endOfStream.");
    const innerCanceller = new TaskCanceller();
    innerCanceller.linkToSignal(cancelSignal);
    for (const sourceBuffer of updatingSourceBuffers) {
        onSourceBufferUpdate(sourceBuffer, () => {
            innerCanceller.cancel();
            triggerEndOfStream(mediaSource, cancelSignal);
        }, innerCanceller.signal);
    }
    onRemoveSourceBuffers(sourceBuffers, () => {
        innerCanceller.cancel();
        triggerEndOfStream(mediaSource, cancelSignal);
    }, innerCanceller.signal);
}
/**
 * Trigger the `endOfStream` method of a MediaSource each times it opens.
 * @see triggerEndOfStream
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 */
export function maintainEndOfStream(mediaSource, cancelSignal) {
    let endOfStreamCanceller = new TaskCanceller();
    endOfStreamCanceller.linkToSignal(cancelSignal);
    onSourceOpen(mediaSource, () => {
        log.debug("Init: MediaSource re-opened while end-of-stream is active");
        endOfStreamCanceller.cancel();
        endOfStreamCanceller = new TaskCanceller();
        endOfStreamCanceller.linkToSignal(cancelSignal);
        triggerEndOfStream(mediaSource, endOfStreamCanceller.signal);
    }, cancelSignal);
    triggerEndOfStream(mediaSource, endOfStreamCanceller.signal);
}
