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
var event_listeners_1 = require("../../compat/event_listeners");
var has_issues_with_high_media_source_duration_1 = require("../../compat/has_issues_with_high_media_source_duration");
var log_1 = require("../../log");
var reference_1 = require("../../utils/reference");
var task_canceller_1 = require("../../utils/task_canceller");
/** Number of seconds in a regular year. */
var YEAR_IN_SECONDS = 365 * 24 * 3600;
/**
 * Keep the MediaSource's `duration` attribute up-to-date with the duration of
 * the content played on it.
 * @class MediaSourceDurationUpdater
 */
var MediaSourceDurationUpdater = /** @class */ (function () {
    /**
     * Create a new `MediaSourceDurationUpdater`,
     * @param {MediaSource} mediaSource - The MediaSource on which the content is
     * played.
     */
    function MediaSourceDurationUpdater(mediaSource) {
        this._mediaSource = mediaSource;
        this._currentMediaSourceDurationUpdateCanceller = null;
    }
    /**
     * Indicate to the `MediaSourceDurationUpdater` the currently known duration
     * of the content.
     *
     * The `MediaSourceDurationUpdater` will then use that value to determine
     * which `duration` attribute should be set on the `MediaSource` associated
     *
     * @param {number} newDuration
     * @param {boolean} isRealEndKnown - If set to `false`, the current content is
     * a dynamic content (it might evolve in the future) and the `newDuration`
     * communicated might be greater still. In effect the
     * `MediaSourceDurationUpdater` will actually set a much higher value to the
     * `MediaSource`'s duration to prevent being annoyed by the HTML-related
     * side-effects of having a too low duration (such as the impossibility to
     * seek over that value).
     */
    MediaSourceDurationUpdater.prototype.updateDuration = function (newDuration, isRealEndKnown) {
        if (this._currentMediaSourceDurationUpdateCanceller !== null) {
            this._currentMediaSourceDurationUpdateCanceller.cancel();
        }
        this._currentMediaSourceDurationUpdateCanceller = new task_canceller_1.default();
        var mediaSource = this._mediaSource;
        var currentSignal = this._currentMediaSourceDurationUpdateCanceller.signal;
        var isMediaSourceOpened = createMediaSourceOpenReference(mediaSource, currentSignal);
        /** TaskCanceller triggered each time the MediaSource switches to and from "open". */
        var msOpenStatusCanceller = new task_canceller_1.default();
        msOpenStatusCanceller.linkToSignal(currentSignal);
        isMediaSourceOpened.onUpdate(onMediaSourceOpenedStatusChanged, {
            emitCurrentValue: true,
            clearSignal: currentSignal,
        });
        function onMediaSourceOpenedStatusChanged() {
            msOpenStatusCanceller.cancel();
            if (!isMediaSourceOpened.getValue()) {
                return;
            }
            msOpenStatusCanceller = new task_canceller_1.default();
            msOpenStatusCanceller.linkToSignal(currentSignal);
            var areSourceBuffersUpdating = createSourceBuffersUpdatingReference(mediaSource.sourceBuffers, msOpenStatusCanceller.signal);
            /** TaskCanceller triggered each time SourceBuffers' updating status changes */
            var sourceBuffersUpdatingCanceller = new task_canceller_1.default();
            sourceBuffersUpdatingCanceller.linkToSignal(msOpenStatusCanceller.signal);
            return areSourceBuffersUpdating.onUpdate(function (areUpdating) {
                sourceBuffersUpdatingCanceller.cancel();
                sourceBuffersUpdatingCanceller = new task_canceller_1.default();
                sourceBuffersUpdatingCanceller.linkToSignal(msOpenStatusCanceller.signal);
                if (areUpdating) {
                    return;
                }
                recursivelyForceDurationUpdate(mediaSource, newDuration, isRealEndKnown, sourceBuffersUpdatingCanceller.signal);
            }, { clearSignal: msOpenStatusCanceller.signal, emitCurrentValue: true });
        }
    };
    /**
     * Abort the last duration-setting operation and free its resources.
     */
    MediaSourceDurationUpdater.prototype.stopUpdating = function () {
        if (this._currentMediaSourceDurationUpdateCanceller !== null) {
            this._currentMediaSourceDurationUpdateCanceller.cancel();
            this._currentMediaSourceDurationUpdateCanceller = null;
        }
    };
    return MediaSourceDurationUpdater;
}());
exports.default = MediaSourceDurationUpdater;
/**
 * Checks that duration can be updated on the MediaSource, and then
 * sets it.
 *
 * Returns either:
 *   - the new duration it has been updated to if it has
 *   - `null` if it hasn'nt been updated
 *
 * @param {MediaSource} mediaSource
 * @param {number} duration
 * @param {boolean} isRealEndKnown
 * @returns {string}
 */
function setMediaSourceDuration(mediaSource, duration, isRealEndKnown) {
    var newDuration = duration;
    if (!isRealEndKnown) {
        newDuration = (0, has_issues_with_high_media_source_duration_1.default)()
            ? Infinity
            : getMaximumLiveSeekablePosition(duration);
    }
    var maxBufferedEnd = 0;
    for (var i = 0; i < mediaSource.sourceBuffers.length; i++) {
        var sourceBuffer = mediaSource.sourceBuffers[i];
        var sbBufferedLen = sourceBuffer.buffered.length;
        if (sbBufferedLen > 0) {
            maxBufferedEnd = Math.max(sourceBuffer.buffered.end(sbBufferedLen - 1));
        }
    }
    if (newDuration === mediaSource.duration) {
        return "success" /* MediaSourceDurationUpdateStatus.Success */;
    }
    else if (maxBufferedEnd > newDuration) {
        // We already buffered further than the duration we want to set.
        // Keep the duration that was set at that time as a security.
        if (maxBufferedEnd < mediaSource.duration) {
            try {
                log_1.default.info("Init: Updating duration to what is currently buffered", maxBufferedEnd);
                mediaSource.duration = maxBufferedEnd;
            }
            catch (err) {
                log_1.default.warn("Duration Updater: Can't update duration on the MediaSource.", err instanceof Error ? err : "");
                return "failed" /* MediaSourceDurationUpdateStatus.Failed */;
            }
        }
        return "partial" /* MediaSourceDurationUpdateStatus.Partial */;
    }
    else {
        var oldDuration = mediaSource.duration;
        try {
            log_1.default.info("Init: Updating duration", newDuration);
            mediaSource.duration = newDuration;
            if (mediaSource.readyState === "open" && !isFinite(newDuration)) {
                var maxSeekable = getMaximumLiveSeekablePosition(duration);
                log_1.default.info("Init: calling `mediaSource.setLiveSeekableRange`", maxSeekable);
                mediaSource.setLiveSeekableRange(0, maxSeekable);
            }
        }
        catch (err) {
            log_1.default.warn("Duration Updater: Can't update duration on the MediaSource.", err instanceof Error ? err : "");
            return "failed" /* MediaSourceDurationUpdateStatus.Failed */;
        }
        var deltaToExpected = Math.abs(mediaSource.duration - newDuration);
        if (deltaToExpected >= 0.1) {
            var deltaToBefore = Math.abs(mediaSource.duration - oldDuration);
            return deltaToExpected < deltaToBefore
                ? "partial" /* MediaSourceDurationUpdateStatus.Partial */
                : "failed" /* MediaSourceDurationUpdateStatus.Failed */;
        }
        return "success" /* MediaSourceDurationUpdateStatus.Success */;
    }
}
/**
 * Returns a `SharedReference` wrapping a boolean that tells if all the
 * SourceBuffers ended all pending updates.
 * @param {SourceBufferList} sourceBuffers
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createSourceBuffersUpdatingReference(sourceBuffers, cancelSignal) {
    if (sourceBuffers.length === 0) {
        var notOpenedRef = new reference_1.default(false);
        notOpenedRef.finish();
        return notOpenedRef;
    }
    var areUpdatingRef = new reference_1.default(false, cancelSignal);
    reCheck();
    var _loop_1 = function (i) {
        var sourceBuffer = sourceBuffers[i];
        sourceBuffer.addEventListener("updatestart", reCheck);
        sourceBuffer.addEventListener("update", reCheck);
        cancelSignal.register(function () {
            sourceBuffer.removeEventListener("updatestart", reCheck);
            sourceBuffer.removeEventListener("update", reCheck);
        });
    };
    for (var i = 0; i < sourceBuffers.length; i++) {
        _loop_1(i);
    }
    return areUpdatingRef;
    function reCheck() {
        for (var i = 0; i < sourceBuffers.length; i++) {
            var sourceBuffer = sourceBuffers[i];
            if (sourceBuffer.updating) {
                areUpdatingRef.setValueIfChanged(true);
                return;
            }
        }
        areUpdatingRef.setValueIfChanged(false);
    }
}
/**
 * Returns a `SharedReference` wrapping a boolean that tells if the media
 * source is opened or not.
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createMediaSourceOpenReference(mediaSource, cancelSignal) {
    var isMediaSourceOpen = new reference_1.default(mediaSource.readyState === "open", cancelSignal);
    (0, event_listeners_1.onSourceOpen)(mediaSource, function () {
        log_1.default.debug("Init: Reacting to MediaSource open in duration updater");
        isMediaSourceOpen.setValueIfChanged(true);
    }, cancelSignal);
    (0, event_listeners_1.onSourceEnded)(mediaSource, function () {
        log_1.default.debug("Init: Reacting to MediaSource ended in duration updater");
        isMediaSourceOpen.setValueIfChanged(false);
    }, cancelSignal);
    (0, event_listeners_1.onSourceClose)(mediaSource, function () {
        log_1.default.debug("Init: Reacting to MediaSource close in duration updater");
        isMediaSourceOpen.setValueIfChanged(false);
    }, cancelSignal);
    return isMediaSourceOpen;
}
/**
 * Immediately tries to set the MediaSource's duration to the most appropriate
 * one.
 *
 * If it fails, wait 2 seconds and retries.
 *
 * @param {MediaSource} mediaSource
 * @param {number} duration
 * @param {boolean} isRealEndKnown
 * @param {Object} cancelSignal
 */
function recursivelyForceDurationUpdate(mediaSource, duration, isRealEndKnown, cancelSignal) {
    var res = setMediaSourceDuration(mediaSource, duration, isRealEndKnown);
    if (res === "success" /* MediaSourceDurationUpdateStatus.Success */) {
        return;
    }
    var timeoutId = setTimeout(function () {
        unregisterClear();
        recursivelyForceDurationUpdate(mediaSource, duration, isRealEndKnown, cancelSignal);
    }, 2000);
    var unregisterClear = cancelSignal.register(function () {
        clearTimeout(timeoutId);
    });
}
function getMaximumLiveSeekablePosition(contentLastPosition) {
    // Some targets poorly support setting a very high number for seekable
    // ranges.
    // Yet, in contents whose end is not yet known (e.g. live contents), we
    // would prefer setting a value as high as possible to still be able to
    // seek anywhere we want to (even ahead of the Manifest if we want to).
    // As such, we put it at a safe default value of 2^32 excepted when the
    // maximum position is already relatively close to that value, where we
    // authorize exceptionally going over it.
    return Math.max(Math.pow(2, 32), contentLastPosition + YEAR_IN_SECONDS);
}
