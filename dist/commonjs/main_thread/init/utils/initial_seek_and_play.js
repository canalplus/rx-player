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
var can_seek_directly_after_loaded_metadata_1 = require("../../../compat/can_seek_directly_after_loaded_metadata");
var should_validate_metadata_1 = require("../../../compat/should_validate_metadata");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var reference_1 = require("../../../utils/reference");
/**
 * Seek as soon as possible at the initially wanted position and play if
 * autoPlay is wanted.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function performInitialSeekAndPlay(_a, cancelSignal) {
    var mediaElement = _a.mediaElement, playbackObserver = _a.playbackObserver, startTime = _a.startTime, mustAutoPlay = _a.mustAutoPlay, isDirectfile = _a.isDirectfile, onWarning = _a.onWarning;
    var initialPlayPerformed = new reference_1.default(false, cancelSignal);
    var autoPlayResult = new Promise(function (resolveAutoPlay, rejectAutoPlay) {
        var deregisterCancellation = cancelSignal.register(function (err) {
            rejectAutoPlay(err);
        });
        if (cancelSignal.isCancelled()) {
            return;
        }
        /** `true` if we asked the `PlaybackObserver` to perform an initial seek. */
        var hasAskedForInitialSeek = false;
        var performInitialSeek = function (initialSeekTime) {
            playbackObserver.setCurrentTime(initialSeekTime);
            hasAskedForInitialSeek = true;
        };
        // `startTime` defined as a function might depend on metadata to make its
        // choice, such as the content duration, minimum and/or maximum position.
        //
        // The RxPlayer might already know those through the Manifest file for
        // non-Directfile contents, yet only through the `HTMLMediaElement` once a
        // a sufficient `readyState` has been reached for directfile contents.
        // So let's divide the two possibilities here.
        if (!isDirectfile || typeof startTime === "number") {
            var initiallySeekedTime = typeof startTime === "number" ? startTime : startTime();
            if (initiallySeekedTime !== 0) {
                performInitialSeek(initiallySeekedTime);
            }
            waitForSeekable();
        }
        else {
            playbackObserver.listen(function (obs, stopListening) {
                if (obs.readyState >= 1) {
                    stopListening();
                    var initiallySeekedTime_1 = typeof startTime === "number" ? startTime : startTime();
                    if (initiallySeekedTime_1 !== 0) {
                        if (can_seek_directly_after_loaded_metadata_1.default) {
                            performInitialSeek(initiallySeekedTime_1);
                        }
                        else {
                            setTimeout(function () {
                                performInitialSeek(initiallySeekedTime_1);
                            }, 0);
                        }
                    }
                    waitForSeekable();
                }
            }, { includeLastObservation: true, clearSignal: cancelSignal });
        }
        /**
         * Logic that should be run once the initial seek has been asked to the
         * PlaybackObserver.
         *
         * Actually wait until the seek has been performed, wait for the right moment
         * to perform autoplay, resolve the promise once everything has been done and
         * potentially send warning if a minor issue is detected.
         */
        function waitForSeekable() {
            /**
             * We only want to continue to `play` when a `seek` has actually been
             * performed (if it has been asked). This boolean keep track of if the
             * seek arised.
             */
            var hasStartedSeeking = false;
            playbackObserver.listen(function (obs, stopListening) {
                if (!hasStartedSeeking && obs.seeking !== 0 /* SeekingState.None */) {
                    hasStartedSeeking = true;
                }
                if ((hasAskedForInitialSeek && !hasStartedSeeking) || obs.readyState === 0) {
                    return;
                }
                stopListening();
                if ((0, should_validate_metadata_1.default)() && mediaElement.duration === 0) {
                    var error = new errors_1.MediaError("MEDIA_ERR_NOT_LOADED_METADATA", "Cannot load automatically: your browser " +
                        "falsely announced having loaded the content.");
                    onWarning(error);
                }
                if (cancelSignal.isCancelled()) {
                    return;
                }
                waitForPlayable();
            }, { includeLastObservation: true, clearSignal: cancelSignal });
        }
        /**
         * Logic that should be run once the initial seek has been properly performed.
         *
         * Wait for the media being playable before performing the autoplay operation
         * if asked. Potentially send warning if a minor issue has been detected while
         * doing so.
         */
        function waitForPlayable() {
            playbackObserver.listen(function (observation, stopListening) {
                if (observation.seeking === 0 /* SeekingState.None */ &&
                    observation.rebuffering === null &&
                    observation.readyState >= 1) {
                    stopListening();
                    onPlayable();
                }
            }, { includeLastObservation: true, clearSignal: cancelSignal });
        }
        /**
         * Callback called once the content is considered "playable".
         *
         * Perform the autoplay if needed, handling potential issues and resolve the
         * Promise when done.
         * Might also send warnings if minor issues arise.
         */
        function onPlayable() {
            var _a;
            log_1.default.info("Init: Can begin to play content");
            if (!mustAutoPlay) {
                if (mediaElement.autoplay) {
                    log_1.default.warn("Init: autoplay is enabled on HTML media element. " +
                        "Media will play as soon as possible.");
                }
                initialPlayPerformed.setValue(true);
                initialPlayPerformed.finish();
                deregisterCancellation();
                return resolveAutoPlay({ type: "skipped" });
            }
            else if (mediaElement.ended) {
                // the video has ended state to true, executing VideoElement.play() will
                // restart the video from the start, which is not wanted in most cases.
                // returning "skipped" prevents the call to play() and fix the issue
                log_1.default.warn("Init: autoplay is enabled but the video is ended. " +
                    "Skipping autoplay to prevent video to start again");
                initialPlayPerformed.setValue(true);
                initialPlayPerformed.finish();
                deregisterCancellation();
                return resolveAutoPlay({ type: "skipped" });
            }
            var playResult;
            try {
                playResult = (_a = mediaElement.play()) !== null && _a !== void 0 ? _a : Promise.resolve();
            }
            catch (playError) {
                deregisterCancellation();
                return rejectAutoPlay(playError);
            }
            playResult
                .then(function () {
                if (cancelSignal.isCancelled()) {
                    return;
                }
                initialPlayPerformed.setValue(true);
                initialPlayPerformed.finish();
                deregisterCancellation();
                return resolveAutoPlay({ type: "autoplay" });
            })
                .catch(function (playError) {
                deregisterCancellation();
                if (cancelSignal.isCancelled()) {
                    return;
                }
                if (playError instanceof Error && playError.name === "NotAllowedError") {
                    // auto-play was probably prevented.
                    log_1.default.warn("Init: Media element can't play." +
                        " It may be due to browser auto-play policies.");
                    var error = new errors_1.MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY", "Cannot trigger auto-play automatically: " +
                        "your browser does not allow it.");
                    onWarning(error);
                    if (cancelSignal.isCancelled()) {
                        return;
                    }
                    return resolveAutoPlay({ type: "autoplay-blocked" });
                }
                else {
                    rejectAutoPlay(playError);
                }
            });
        }
    });
    return { autoPlayResult: autoPlayResult, initialPlayPerformed: initialPlayPerformed };
}
exports.default = performInitialSeekAndPlay;
