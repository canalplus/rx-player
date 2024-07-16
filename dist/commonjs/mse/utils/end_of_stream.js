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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintainEndOfStream = void 0;
var event_listeners_1 = require("../../compat/event_listeners");
var log_1 = require("../../log");
var task_canceller_1 = require("../../utils/task_canceller");
/**
 * Get "updating" SourceBuffers from a SourceBufferList.
 * @param {SourceBufferList} sourceBuffers
 * @returns {Array.<SourceBuffer>}
 */
function getUpdatingSourceBuffers(sourceBuffers) {
    var updatingSourceBuffers = [];
    for (var i = 0; i < sourceBuffers.length; i++) {
        var SourceBuffer_1 = sourceBuffers[i];
        if (SourceBuffer_1.updating) {
            updatingSourceBuffers.push(SourceBuffer_1);
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
function triggerEndOfStream(mediaSource, cancelSignal) {
    var e_1, _a;
    log_1.default.debug("Init: Trying to call endOfStream");
    if (mediaSource.readyState !== "open") {
        log_1.default.debug("Init: MediaSource not open, cancel endOfStream");
        return;
    }
    var sourceBuffers = mediaSource.sourceBuffers;
    var updatingSourceBuffers = getUpdatingSourceBuffers(sourceBuffers);
    if (updatingSourceBuffers.length === 0) {
        log_1.default.info("Init: Triggering end of stream");
        try {
            mediaSource.endOfStream();
        }
        catch (err) {
            log_1.default.error("Unable to call endOfStream", err instanceof Error ? err : new Error("Unknown error"));
        }
        return;
    }
    log_1.default.debug("Init: Waiting SourceBuffers to be updated before calling endOfStream.");
    var innerCanceller = new task_canceller_1.default();
    innerCanceller.linkToSignal(cancelSignal);
    try {
        for (var updatingSourceBuffers_1 = __values(updatingSourceBuffers), updatingSourceBuffers_1_1 = updatingSourceBuffers_1.next(); !updatingSourceBuffers_1_1.done; updatingSourceBuffers_1_1 = updatingSourceBuffers_1.next()) {
            var sourceBuffer = updatingSourceBuffers_1_1.value;
            (0, event_listeners_1.onSourceBufferUpdate)(sourceBuffer, function () {
                innerCanceller.cancel();
                triggerEndOfStream(mediaSource, cancelSignal);
            }, innerCanceller.signal);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (updatingSourceBuffers_1_1 && !updatingSourceBuffers_1_1.done && (_a = updatingSourceBuffers_1.return)) _a.call(updatingSourceBuffers_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    (0, event_listeners_1.onRemoveSourceBuffers)(sourceBuffers, function () {
        innerCanceller.cancel();
        triggerEndOfStream(mediaSource, cancelSignal);
    }, innerCanceller.signal);
}
exports.default = triggerEndOfStream;
/**
 * Trigger the `endOfStream` method of a MediaSource each times it opens.
 * @see triggerEndOfStream
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 */
function maintainEndOfStream(mediaSource, cancelSignal) {
    var endOfStreamCanceller = new task_canceller_1.default();
    endOfStreamCanceller.linkToSignal(cancelSignal);
    (0, event_listeners_1.onSourceOpen)(mediaSource, function () {
        log_1.default.debug("Init: MediaSource re-opened while end-of-stream is active");
        endOfStreamCanceller.cancel();
        endOfStreamCanceller = new task_canceller_1.default();
        endOfStreamCanceller.linkToSignal(cancelSignal);
        triggerEndOfStream(mediaSource, endOfStreamCanceller.signal);
    }, cancelSignal);
    triggerEndOfStream(mediaSource, endOfStreamCanceller.signal);
}
exports.maintainEndOfStream = maintainEndOfStream;
