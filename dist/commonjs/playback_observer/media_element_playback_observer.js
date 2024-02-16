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
var is_seeking_approximate_1 = require("../compat/is_seeking_approximate");
var config_1 = require("../config");
var log_1 = require("../log");
var monotonic_timestamp_1 = require("../utils/monotonic_timestamp");
var noop_1 = require("../utils/noop");
var object_assign_1 = require("../utils/object_assign");
var ranges_1 = require("../utils/ranges");
var reference_1 = require("../utils/reference");
var task_canceller_1 = require("../utils/task_canceller");
var generate_read_only_observer_1 = require("./utils/generate_read_only_observer");
var observation_position_1 = require("./utils/observation_position");
/**
 * HTMLMediaElement Events for which playback observations are calculated and
 * emitted.
 * @type {Array.<string>}
 */
var SCANNED_MEDIA_ELEMENTS_EVENTS = [
    "canplay",
    "ended",
    "play",
    "pause",
    "seeking",
    "seeked",
    "loadedmetadata",
    "ratechange",
];
/**
 * Class allowing to "observe" current playback conditions so the RxPlayer is
 * then able to react upon them.
 *
 * This is a central class of the RxPlayer as many modules rely on the
 * `PlaybackObserver` to know the current state of the media being played.
 *
 * You can use the PlaybackObserver to either get the last observation
 * performed, get the current media state or listen to media observation sent
 * at a regular interval.
 *
 * @class {PlaybackObserver}
 */
var PlaybackObserver = /** @class */ (function () {
    /**
     * Create a new `PlaybackObserver`, which allows to produce new "playback
     * observations" on various media events and intervals.
     *
     * Note that creating a `PlaybackObserver` lead to the usage of resources,
     * such as event listeners which will only be freed once the `stop` method is
     * called.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} options
     */
    function PlaybackObserver(mediaElement, options) {
        var _this = this;
        this._internalSeeksIncoming = [];
        this._mediaElement = mediaElement;
        this._withMediaSource = options.withMediaSource;
        this._lowLatencyMode = options.lowLatencyMode;
        this._canceller = new task_canceller_1.default();
        this._observationRef = this._createSharedReference();
        this._expectedSeekingPosition = null;
        this._pendingSeek = null;
        var onLoadedMetadata = function () {
            if (_this._pendingSeek !== null) {
                var positionToSeekTo = _this._pendingSeek;
                _this._pendingSeek = null;
                _this._actuallySetCurrentTime(positionToSeekTo);
            }
        };
        mediaElement.addEventListener("loadedmetadata", onLoadedMetadata);
        this._canceller.signal.register(function () {
            mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata);
        });
    }
    /**
     * Stop the `PlaybackObserver` from emitting playback observations and free all
     * resources reserved to emitting them such as event listeners and intervals.
     *
     * Once `stop` is called, no new playback observation will ever be emitted.
     *
     * Note that it is important to call stop once the `PlaybackObserver` is no
     * more needed to avoid unnecessarily leaking resources.
     */
    PlaybackObserver.prototype.stop = function () {
        this._canceller.cancel();
    };
    /**
     * Returns the current position advertised by the `HTMLMediaElement`, in
     * seconds.
     * @returns {number}
     */
    PlaybackObserver.prototype.getCurrentTime = function () {
        return this._mediaElement.currentTime;
    };
    /**
     * Returns the current playback rate advertised by the `HTMLMediaElement`.
     * @returns {number}
     */
    PlaybackObserver.prototype.getPlaybackRate = function () {
        return this._mediaElement.playbackRate;
    };
    /**
     * Returns the current `paused` status advertised by the `HTMLMediaElement`.
     *
     * Use this instead of the same status emitted on an observation when you want
     * to be sure you're using the current value.
     * @returns {boolean}
     */
    PlaybackObserver.prototype.getIsPaused = function () {
        return this._mediaElement.paused;
    };
    /**
     * Update the current position (seek) on the `HTMLMediaElement`, by giving a
     * new position in seconds.
     *
     * Note that seeks performed through this method are caracherized as
     * "internal" seeks. They don't result into the exact same playback
     * observation than regular seeks (which most likely comes from the outside,
     * e.g. the user).
     * @param {number} time
     */
    PlaybackObserver.prototype.setCurrentTime = function (time) {
        if (this._mediaElement.readyState >= 1) {
            this._actuallySetCurrentTime(time);
        }
        else {
            this._internalSeeksIncoming = [];
            this._pendingSeek = time;
            this._generateObservationForEvent("manual");
        }
    };
    /**
     * Update the playback rate of the `HTMLMediaElement`.
     * @param {number} playbackRate
     */
    PlaybackObserver.prototype.setPlaybackRate = function (playbackRate) {
        this._mediaElement.playbackRate = playbackRate;
    };
    /**
     * Returns the current `readyState` advertised by the `HTMLMediaElement`.
     * @returns {number}
     */
    PlaybackObserver.prototype.getReadyState = function () {
        return this._mediaElement.readyState;
    };
    /**
     * Returns an `IReadOnlySharedReference` storing the last playback observation
     * produced by the `PlaybackObserver` and updated each time a new one is
     * produced.
     *
     * This value can then be for example listened to to be notified of future
     * playback observations.
     *
     * @returns {Object}
     */
    PlaybackObserver.prototype.getReference = function () {
        return this._observationRef;
    };
    /**
     * Register a callback so it regularly receives playback observations.
     * @param {Function} cb
     * @param {Object} options - Configuration options:
     *   - `includeLastObservation`: If set to `true` the last observation will
     *     be first emitted synchronously.
     *   - `clearSignal`: If set, the callback will be unregistered when this
     *     CancellationSignal emits.
     */
    PlaybackObserver.prototype.listen = function (cb, options) {
        var _a;
        if (this._canceller.isUsed() || ((_a = options === null || options === void 0 ? void 0 : options.clearSignal) === null || _a === void 0 ? void 0 : _a.isCancelled()) === true) {
            return noop_1.default;
        }
        this._observationRef.onUpdate(cb, {
            clearSignal: options === null || options === void 0 ? void 0 : options.clearSignal,
            emitCurrentValue: options === null || options === void 0 ? void 0 : options.includeLastObservation,
        });
    };
    /**
     * Generate a new playback observer which can listen to other
     * properties and which can only be accessed to read observations (e.g.
     * it cannot ask to perform a seek).
     *
     * The object returned will respect the `IReadOnlyPlaybackObserver` interface
     * and will inherit this `PlaybackObserver`'s lifecycle: it will emit when
     * the latter emits.
     *
     * As argument, this method takes a function which will allow to produce
     * the new set of properties to be present on each observation.
     * @param {Function} transform
     * @returns {Object}
     */
    PlaybackObserver.prototype.deriveReadOnlyObserver = function (transform) {
        return (0, generate_read_only_observer_1.default)(this, transform, this._canceller.signal);
    };
    PlaybackObserver.prototype._actuallySetCurrentTime = function (time) {
        log_1.default.info("API: Seeking internally", time);
        this._internalSeeksIncoming.push(time);
        this._mediaElement.currentTime = time;
    };
    /**
     * Creates the `IReadOnlySharedReference` that will generate playback
     * observations.
     * @returns {Object}
     */
    PlaybackObserver.prototype._createSharedReference = function () {
        var _this = this;
        if (this._observationRef !== undefined) {
            return this._observationRef;
        }
        var _a = config_1.default.getCurrent(), SAMPLING_INTERVAL_MEDIASOURCE = _a.SAMPLING_INTERVAL_MEDIASOURCE, SAMPLING_INTERVAL_LOW_LATENCY = _a.SAMPLING_INTERVAL_LOW_LATENCY, SAMPLING_INTERVAL_NO_MEDIASOURCE = _a.SAMPLING_INTERVAL_NO_MEDIASOURCE;
        var returnedSharedReference = new reference_1.default(this._getCurrentObservation("init"), this._canceller.signal);
        var interval;
        if (this._lowLatencyMode) {
            interval = SAMPLING_INTERVAL_LOW_LATENCY;
        }
        else if (this._withMediaSource) {
            interval = SAMPLING_INTERVAL_MEDIASOURCE;
        }
        else {
            interval = SAMPLING_INTERVAL_NO_MEDIASOURCE;
        }
        var onInterval = function () {
            _this._generateObservationForEvent("timeupdate");
        };
        var intervalId = setInterval(onInterval, interval);
        var removeEventListeners = SCANNED_MEDIA_ELEMENTS_EVENTS.map(function (eventName) {
            var onMediaEvent = function () {
                restartInterval();
                _this._generateObservationForEvent(eventName);
            };
            _this._mediaElement.addEventListener(eventName, onMediaEvent);
            return function () {
                _this._mediaElement.removeEventListener(eventName, onMediaEvent);
            };
        });
        this._canceller.signal.register(function () {
            clearInterval(intervalId);
            removeEventListeners.forEach(function (cb) { return cb(); });
            returnedSharedReference.finish();
        });
        return returnedSharedReference;
        function restartInterval() {
            clearInterval(intervalId);
            intervalId = setInterval(onInterval, interval);
        }
    };
    PlaybackObserver.prototype._getCurrentObservation = function (event) {
        var _a, _b;
        /** Actual event emitted through an observation. */
        var tmpEvt = event;
        // NOTE: `this._observationRef` may be `undefined` because we might here be
        // called in the constructor when that property is not yet set.
        var previousObservation = this._observationRef === undefined
            ? getInitialObservation(this._mediaElement)
            : this._observationRef.getValue();
        /**
         * If `true`, there is a seek operation ongoing but it was done from the
         * `PlaybackObserver`'s `setCurrentTime` method, not from external code.
         */
        var isInternalSeeking = false;
        /** If set, the position for which we plan to seek to as soon as possible. */
        var pendingPosition = this._pendingSeek;
        /** Initially-polled playback observation, before adjustments. */
        var mediaTimings = getMediaInfos(this._mediaElement);
        var buffered = mediaTimings.buffered, readyState = mediaTimings.readyState, position = mediaTimings.position, seeking = mediaTimings.seeking;
        if (tmpEvt === "seeking") {
            // We just began seeking.
            // Let's find out if the seek is internal or external and handle approximate
            // seeking
            if (this._internalSeeksIncoming.length > 0) {
                isInternalSeeking = true;
                tmpEvt = "internal-seeking";
                var startedInternalSeekTime = this._internalSeeksIncoming.shift();
                this._expectedSeekingPosition = is_seeking_approximate_1.default
                    ? Math.max(position, startedInternalSeekTime !== null && startedInternalSeekTime !== void 0 ? startedInternalSeekTime : 0)
                    : position;
            }
            else {
                this._expectedSeekingPosition = position;
            }
        }
        else if (seeking) {
            // we're still seeking, this time without a "seeking" event so it's an
            // already handled one, keep track of the last wanted position we wanted
            // to seek to, to work-around devices re-seeking silently.
            this._expectedSeekingPosition = Math.max(position, (_a = this._expectedSeekingPosition) !== null && _a !== void 0 ? _a : 0);
        }
        else if (is_seeking_approximate_1.default &&
            this._expectedSeekingPosition !== null &&
            position < this._expectedSeekingPosition) {
            // We're on a target with aproximate seeking, we're not seeking anymore, but
            // we're not yet at the expected seeking position.
            // Signal to the rest of the application that the intented position is not
            // the current position but the one contained in `this._expectedSeekingPosition`
            pendingPosition = this._expectedSeekingPosition;
        }
        else {
            this._expectedSeekingPosition = null;
        }
        if (seeking &&
            previousObservation.seeking === 1 /* SeekingState.Internal */ &&
            event !== "seeking") {
            isInternalSeeking = true;
        }
        // NOTE: Devices which decide to not exactly seek where we want to seek
        // (e.g. to start on an intra video frame instead) bother us when it
        // comes to defining rebuffering and freezing statuses, because we might
        // for example believe that we're rebuffering whereas it's just that the
        // device decided to bring us just before the buffered data.
        //
        // After many major issues on those devices (namely Tizen), we decided to
        // just consider the position WE wanted to seek to as the real current
        // position for buffer-starvation related metrics like the current range,
        // the bufferGap, the rebuffering status, the freezing status...
        //
        // This specificity should only apply to those devices, other devices rely
        // on the actual current position.
        var basePosition = (_b = this._expectedSeekingPosition) !== null && _b !== void 0 ? _b : position;
        var currentRange;
        var bufferGap;
        if (!this._withMediaSource && buffered.length === 0 && readyState >= 3) {
            // Sometimes `buffered` stay empty for directfile contents yet we are able
            // to play. This seems to be linked to browser-side issues but has been
            // encountered on enough platforms (Chrome desktop and PlayStation 4's
            // WebKit for us to do something about it in the player.
            currentRange = undefined;
            bufferGap = undefined;
        }
        else {
            currentRange = (0, ranges_1.getBufferedTimeRange)(buffered, basePosition);
            bufferGap =
                currentRange !== null
                    ? currentRange.end - basePosition
                    : // TODO null/0 would probably be
                        // more appropriate
                        Infinity;
        }
        var rebufferingStatus = getRebufferingStatus({
            previousObservation: previousObservation,
            currentObservation: mediaTimings,
            basePosition: basePosition,
            observationEvent: tmpEvt,
            lowLatencyMode: this._lowLatencyMode,
            withMediaSource: this._withMediaSource,
            bufferGap: bufferGap,
            currentRange: currentRange,
        });
        var freezingStatus = getFreezingStatus(previousObservation, mediaTimings, tmpEvt, bufferGap);
        var seekingState;
        if (isInternalSeeking) {
            seekingState = 1 /* SeekingState.Internal */;
        }
        else if (seeking) {
            seekingState = 2 /* SeekingState.External */;
        }
        else {
            seekingState = 0 /* SeekingState.None */;
        }
        var timings = (0, object_assign_1.default)({}, mediaTimings, {
            position: new observation_position_1.default(mediaTimings.position, pendingPosition),
            event: tmpEvt,
            seeking: seekingState,
            rebuffering: rebufferingStatus,
            freezing: freezingStatus,
            bufferGap: bufferGap,
            currentRange: currentRange,
        });
        if (log_1.default.hasLevel("DEBUG")) {
            log_1.default.debug("API: current media element state tick", "event", timings.event, "position", timings.position.getPolled(), "seeking", timings.seeking, "internalSeek", isInternalSeeking, "rebuffering", timings.rebuffering !== null, "freezing", timings.freezing !== null, "ended", timings.ended, "paused", timings.paused, "playbackRate", timings.playbackRate, "readyState", timings.readyState, "pendingPosition", pendingPosition);
        }
        return timings;
    };
    PlaybackObserver.prototype._generateObservationForEvent = function (event) {
        var newObservation = this._getCurrentObservation(event);
        if (log_1.default.hasLevel("DEBUG")) {
            log_1.default.debug("API: current playback timeline:\n" +
                prettyPrintBuffered(newObservation.buffered, newObservation.position.getPolled()), "\n".concat(event));
        }
        this._observationRef.setValue(newObservation);
    };
    return PlaybackObserver;
}());
exports.default = PlaybackObserver;
/**
 * Returns the amount of time in seconds the buffer should have ahead of the
 * current position before resuming playback. Based on the infos of the
 * rebuffering status.
 *
 * Waiting time differs between a rebuffering happening after a "seek" or one
 * happening after a buffer starvation occured.
 * @param {Object|null} rebufferingStatus
 * @param {Boolean} lowLatencyMode
 * @returns {Number}
 */
function getRebufferingEndGap(rebufferingStatus, lowLatencyMode) {
    if (rebufferingStatus === null) {
        return 0;
    }
    var suffix = lowLatencyMode ? "LOW_LATENCY" : "DEFAULT";
    var _a = config_1.default.getCurrent(), RESUME_GAP_AFTER_SEEKING = _a.RESUME_GAP_AFTER_SEEKING, RESUME_GAP_AFTER_NOT_ENOUGH_DATA = _a.RESUME_GAP_AFTER_NOT_ENOUGH_DATA, RESUME_GAP_AFTER_BUFFERING = _a.RESUME_GAP_AFTER_BUFFERING;
    switch (rebufferingStatus.reason) {
        case "seeking":
            return RESUME_GAP_AFTER_SEEKING[suffix];
        case "not-ready":
            return RESUME_GAP_AFTER_NOT_ENOUGH_DATA[suffix];
        case "buffering":
            return RESUME_GAP_AFTER_BUFFERING[suffix];
    }
}
/**
 * @param {Object} currentRange
 * @param {Number} duration
 * @param {Boolean} lowLatencyMode
 * @returns {Boolean}
 */
function hasLoadedUntilTheEnd(currentTime, currentRange, ended, duration, lowLatencyMode) {
    var REBUFFERING_GAP = config_1.default.getCurrent().REBUFFERING_GAP;
    var suffix = lowLatencyMode ? "LOW_LATENCY" : "DEFAULT";
    if (currentRange === undefined) {
        return ended && Math.abs(duration - currentTime) <= REBUFFERING_GAP[suffix];
    }
    return currentRange !== null && duration - currentRange.end <= REBUFFERING_GAP[suffix];
}
/**
 * Get basic playback information.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Object}
 */
function getMediaInfos(mediaElement) {
    var buffered = mediaElement.buffered, currentTime = mediaElement.currentTime, duration = mediaElement.duration, ended = mediaElement.ended, paused = mediaElement.paused, playbackRate = mediaElement.playbackRate, readyState = mediaElement.readyState, seeking = mediaElement.seeking;
    return {
        buffered: buffered,
        position: currentTime,
        duration: duration,
        ended: ended,
        paused: paused,
        playbackRate: playbackRate,
        readyState: readyState,
        seeking: seeking,
    };
}
/**
 * Infer the rebuffering status.
 * @param {Object} options
 * @returns {Object|null}
 */
function getRebufferingStatus(_a) {
    var previousObservation = _a.previousObservation, currentObservation = _a.currentObservation, basePosition = _a.basePosition, observationEvent = _a.observationEvent, withMediaSource = _a.withMediaSource, lowLatencyMode = _a.lowLatencyMode, bufferGap = _a.bufferGap, currentRange = _a.currentRange;
    var REBUFFERING_GAP = config_1.default.getCurrent().REBUFFERING_GAP;
    var currentTime = currentObservation.position, duration = currentObservation.duration, paused = currentObservation.paused, readyState = currentObservation.readyState, ended = currentObservation.ended;
    var prevRebuffering = previousObservation.rebuffering, prevEvt = previousObservation.event, prevTime = previousObservation.position;
    var fullyLoaded = hasLoadedUntilTheEnd(basePosition, currentRange, ended, duration, lowLatencyMode);
    var canSwitchToRebuffering = readyState >= 1 &&
        observationEvent !== "loadedmetadata" &&
        prevRebuffering === null &&
        !(fullyLoaded || ended);
    var rebufferEndPosition = null;
    var shouldRebuffer;
    var shouldStopRebuffer;
    var rebufferGap = lowLatencyMode
        ? REBUFFERING_GAP.LOW_LATENCY
        : REBUFFERING_GAP.DEFAULT;
    if (withMediaSource) {
        if (canSwitchToRebuffering) {
            if (bufferGap === Infinity) {
                shouldRebuffer = true;
                rebufferEndPosition = basePosition;
            }
            else if (bufferGap === undefined) {
                if (readyState < 3) {
                    shouldRebuffer = true;
                    rebufferEndPosition = undefined;
                }
            }
            else if (bufferGap <= rebufferGap) {
                shouldRebuffer = true;
                rebufferEndPosition = basePosition + bufferGap;
            }
        }
        else if (prevRebuffering !== null) {
            var resumeGap = getRebufferingEndGap(prevRebuffering, lowLatencyMode);
            if ((shouldRebuffer !== true &&
                prevRebuffering !== null &&
                readyState > 1 &&
                (fullyLoaded ||
                    ended ||
                    (bufferGap !== undefined && isFinite(bufferGap) && bufferGap > resumeGap))) ||
                (bufferGap === undefined && readyState >= 3)) {
                shouldStopRebuffer = true;
            }
            else if (bufferGap === undefined) {
                rebufferEndPosition = undefined;
            }
            else if (bufferGap === Infinity) {
                rebufferEndPosition = basePosition;
            }
            else if (bufferGap <= resumeGap) {
                rebufferEndPosition = basePosition + bufferGap;
            }
        }
    }
    // when using a direct file, the media will stall and unstall on its
    // own, so we only try to detect when the media timestamp has not changed
    // between two consecutive timeupdates
    else {
        if (canSwitchToRebuffering && // TODO what about when paused: e.g. when loading initially the content
            ((!paused &&
                observationEvent === "timeupdate" &&
                prevEvt === "timeupdate" &&
                currentTime === prevTime.getPolled()) ||
                (observationEvent === "seeking" &&
                    (bufferGap === Infinity || (bufferGap === undefined && readyState < 3))))) {
            shouldRebuffer = true;
        }
        else if (prevRebuffering !== null &&
            ((observationEvent !== "seeking" && currentTime !== prevTime.getPolled()) ||
                observationEvent === "canplay" ||
                (bufferGap === undefined && readyState >= 3) ||
                (bufferGap !== undefined &&
                    bufferGap < Infinity &&
                    (bufferGap > getRebufferingEndGap(prevRebuffering, lowLatencyMode) ||
                        fullyLoaded ||
                        ended)))) {
            shouldStopRebuffer = true;
        }
    }
    if (shouldStopRebuffer === true) {
        return null;
    }
    else if (shouldRebuffer === true || prevRebuffering !== null) {
        var reason = void 0;
        if (observationEvent === "seeking" ||
            (prevRebuffering !== null && prevRebuffering.reason === "seeking")) {
            reason = "seeking";
        }
        else if (currentObservation.seeking) {
            reason = "seeking";
        }
        else if (readyState === 1) {
            reason = "not-ready";
        }
        else {
            reason = "buffering";
        }
        if (prevRebuffering !== null && prevRebuffering.reason === reason) {
            return {
                reason: prevRebuffering.reason,
                timestamp: prevRebuffering.timestamp,
                position: rebufferEndPosition,
            };
        }
        return {
            reason: reason,
            timestamp: (0, monotonic_timestamp_1.default)(),
            position: rebufferEndPosition,
        };
    }
    return null;
}
/**
 * Detect if the current media can be considered as "freezing" (i.e. not
 * advancing for unknown reasons).
 *
 * Returns a corresponding `IFreezingStatus` object if that's the case and
 * `null` if not.
 * @param {Object} prevObservation
 * @param {Object} currentInfo
 * @param {string} currentEvt
 * @param {number|undefined} bufferGap
 * @returns {Object|null}
 */
function getFreezingStatus(prevObservation, currentInfo, currentEvt, bufferGap) {
    var MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING = config_1.default.getCurrent().MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING;
    if (prevObservation.freezing) {
        if (currentInfo.ended ||
            currentInfo.paused ||
            currentInfo.readyState === 0 ||
            currentInfo.playbackRate === 0 ||
            prevObservation.position.getPolled() !== currentInfo.position) {
            return null; // Quit freezing status
        }
        return prevObservation.freezing; // Stay in it
    }
    return currentEvt === "timeupdate" &&
        bufferGap !== undefined &&
        bufferGap > MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING &&
        !currentInfo.ended &&
        !currentInfo.paused &&
        currentInfo.readyState >= 1 &&
        currentInfo.playbackRate !== 0 &&
        currentInfo.position === prevObservation.position.getPolled()
        ? { timestamp: (0, monotonic_timestamp_1.default)() }
        : null;
}
/**
 * Pretty print a TimeRanges Object, to see the current content of it in a
 * one-liner string.
 *
 * @example
 * This function is called by giving it directly the TimeRanges, such as:
 * ```js
 * prettyPrintBuffered(document.getElementsByTagName("video")[0].buffered);
 * ```
 *
 * Let's consider this possible return:
 *
 * ```
 * 0.00|==29.95==|29.95 ~30.05~ 60.00|==29.86==|89.86
 *          ^14
 * ```
 * This means that our video element has 29.95 seconds of buffer between 0 and
 * 29.95 seconds.
 * Then 30.05 seconds where no buffer is found.
 * Then 29.86 seconds of buffer between 60.00 and 89.86 seconds.
 *
 * A caret on the second line indicates the current time we're at.
 * The number coming after it is the current time.
 * @param {TimeRanges} buffered
 * @param {number} currentTime
 * @returns {string}
 */
function prettyPrintBuffered(buffered, currentTime) {
    var str = "";
    var currentTimeStr = "";
    for (var i = 0; i < buffered.length; i++) {
        var start = buffered.start(i);
        var end = buffered.end(i);
        var fixedStart = start.toFixed(2);
        var fixedEnd = end.toFixed(2);
        var fixedDuration = (end - start).toFixed(2);
        var newIntervalStr = "".concat(fixedStart, "|==").concat(fixedDuration, "==|").concat(fixedEnd);
        str += newIntervalStr;
        if (currentTimeStr.length === 0 && end > currentTime) {
            var padBefore = str.length - Math.floor(newIntervalStr.length / 2);
            currentTimeStr = " ".repeat(padBefore) + "^".concat(currentTime);
        }
        if (i < buffered.length - 1) {
            var nextStart = buffered.start(i + 1);
            var fixedDiff = (nextStart - end).toFixed(2);
            var holeStr = " ~".concat(fixedDiff, "~ ");
            str += holeStr;
            if (currentTimeStr.length === 0 && currentTime < nextStart) {
                var padBefore = str.length - Math.floor(holeStr.length / 2);
                currentTimeStr = " ".repeat(padBefore) + "^".concat(currentTime);
            }
        }
    }
    if (currentTimeStr.length === 0) {
        currentTimeStr = " ".repeat(str.length) + "^".concat(currentTime);
    }
    return str + "\n" + currentTimeStr;
}
/**
 * Generate the initial playback observation for when no event has yet been
 * emitted to lead to one.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Object}
 */
function getInitialObservation(mediaElement) {
    var mediaTimings = getMediaInfos(mediaElement);
    return (0, object_assign_1.default)(mediaTimings, {
        rebuffering: null,
        event: "init",
        seeking: 0 /* SeekingState.None */,
        position: new observation_position_1.default(mediaTimings.position, null),
        freezing: null,
        bufferGap: 0,
        currentRange: null,
    });
}
