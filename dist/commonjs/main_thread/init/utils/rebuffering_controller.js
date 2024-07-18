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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var event_emitter_1 = require("../../../utils/event_emitter");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var ranges_1 = require("../../../utils/ranges");
var task_canceller_1 = require("../../../utils/task_canceller");
/**
 * Work-around rounding errors with floating points by setting an acceptable,
 * very short, deviation when checking equalities.
 */
var EPSILON = 1 / 60;
/**
 * Monitor playback, trying to avoid stalling situation.
 * If stopping the player to build buffer is needed, temporarily set the
 * playback rate (i.e. speed) at `0` until enough buffer is available again.
 *
 * Emit "stalled" then "unstalled" respectively when an unavoidable stall is
 * encountered and exited.
 */
var RebufferingController = /** @class */ (function (_super) {
    __extends(RebufferingController, _super);
    /**
     * @param {object} playbackObserver - emit the current playback conditions.
     * @param {Object} manifest - The Manifest of the currently-played content.
     * @param {Object} speed - The last speed set by the user
     */
    function RebufferingController(playbackObserver, manifest, speed) {
        var _this = _super.call(this) || this;
        _this._playbackObserver = playbackObserver;
        _this._manifest = manifest;
        _this._speed = speed;
        _this._discontinuitiesStore = [];
        _this._isStarted = false;
        _this._canceller = new task_canceller_1.default();
        return _this;
    }
    RebufferingController.prototype.start = function () {
        var _this = this;
        if (this._isStarted) {
            return;
        }
        this._isStarted = true;
        var playbackRateUpdater = new PlaybackRateUpdater(this._playbackObserver, this._speed);
        this._canceller.signal.register(function () {
            playbackRateUpdater.dispose();
        });
        var prevFreezingState = null;
        this._playbackObserver.listen(function (observation) {
            var discontinuitiesStore = _this._discontinuitiesStore;
            var buffered = observation.buffered, position = observation.position, readyState = observation.readyState, rebuffering = observation.rebuffering, freezing = observation.freezing;
            var _a = config_1.default.getCurrent(), BUFFER_DISCONTINUITY_THRESHOLD = _a.BUFFER_DISCONTINUITY_THRESHOLD, FREEZING_STALLED_DELAY = _a.FREEZING_STALLED_DELAY, UNFREEZING_SEEK_DELAY = _a.UNFREEZING_SEEK_DELAY, UNFREEZING_DELTA_POSITION = _a.UNFREEZING_DELTA_POSITION;
            if (freezing !== null) {
                var now = (0, monotonic_timestamp_1.default)();
                var referenceTimestamp = prevFreezingState === null
                    ? freezing.timestamp
                    : prevFreezingState.attemptTimestamp;
                if (!position.isAwaitingFuturePosition() &&
                    now - referenceTimestamp > UNFREEZING_SEEK_DELAY) {
                    log_1.default.warn("Init: trying to seek to un-freeze player");
                    _this._playbackObserver.setCurrentTime(_this._playbackObserver.getCurrentTime() + UNFREEZING_DELTA_POSITION);
                    prevFreezingState = { attemptTimestamp: now };
                }
                if (now - freezing.timestamp > FREEZING_STALLED_DELAY) {
                    if (rebuffering === null) {
                        playbackRateUpdater.stopRebuffering();
                    }
                    else {
                        playbackRateUpdater.startRebuffering();
                    }
                    _this.trigger("stalled", "freezing");
                    return;
                }
            }
            else {
                prevFreezingState = null;
            }
            if (rebuffering === null) {
                playbackRateUpdater.stopRebuffering();
                if (readyState === 1) {
                    // With a readyState set to 1, we should still not be able to play:
                    // Return that we're stalled
                    var reason = void 0;
                    if (observation.seeking !== 0 /* SeekingState.None */) {
                        reason =
                            observation.seeking === 1 /* SeekingState.Internal */
                                ? "internal-seek"
                                : "seeking";
                    }
                    else {
                        reason = "not-ready";
                    }
                    _this.trigger("stalled", reason);
                    return;
                }
                _this.trigger("unstalled", null);
                return;
            }
            // We want to separate a stall situation when a seek is due to a seek done
            // internally by the player to when its due to a regular user seek.
            var stalledReason = rebuffering.reason === "seeking" &&
                observation.seeking === 1 /* SeekingState.Internal */
                ? "internal-seek"
                : rebuffering.reason;
            if (position.isAwaitingFuturePosition()) {
                playbackRateUpdater.stopRebuffering();
                log_1.default.debug("Init: let rebuffering happen as we're awaiting a future position");
                _this.trigger("stalled", stalledReason);
                return;
            }
            playbackRateUpdater.startRebuffering();
            if (_this._manifest === null) {
                _this.trigger("stalled", stalledReason);
                return;
            }
            /** Position at which data is awaited. */
            var stalledPosition = rebuffering.position;
            if (stalledPosition !== null &&
                stalledPosition !== undefined &&
                _this._speed.getValue() > 0) {
                var skippableDiscontinuity = findSeekableDiscontinuity(discontinuitiesStore, _this._manifest, stalledPosition);
                if (skippableDiscontinuity !== null) {
                    var realSeekTime = skippableDiscontinuity + 0.001;
                    if (realSeekTime <= _this._playbackObserver.getCurrentTime()) {
                        log_1.default.info("Init: position to seek already reached, no seeking", _this._playbackObserver.getCurrentTime(), realSeekTime);
                    }
                    else {
                        log_1.default.warn("SA: skippable discontinuity found in the stream", position.getPolled(), realSeekTime);
                        _this._playbackObserver.setCurrentTime(realSeekTime);
                        _this.trigger("warning", generateDiscontinuityError(stalledPosition, realSeekTime));
                        return;
                    }
                }
            }
            var positionBlockedAt = stalledPosition !== null && stalledPosition !== void 0 ? stalledPosition : position.getPolled();
            // Is it a very short discontinuity in buffer ? -> Seek at the beginning of the
            //                                                 next range
            //
            // Discontinuity check in case we are close a buffered range but still
            // calculate a stalled state. This is useful for some
            // implementation that might drop an injected segment, or in
            // case of small discontinuity in the content.
            var nextBufferRangeGap = (0, ranges_1.getNextBufferedTimeRangeGap)(buffered, positionBlockedAt);
            if (_this._speed.getValue() > 0 &&
                nextBufferRangeGap < BUFFER_DISCONTINUITY_THRESHOLD) {
                var seekTo = positionBlockedAt + nextBufferRangeGap + EPSILON;
                if (_this._playbackObserver.getCurrentTime() < seekTo) {
                    log_1.default.warn("Init: discontinuity encountered inferior to the threshold", positionBlockedAt, seekTo, BUFFER_DISCONTINUITY_THRESHOLD);
                    _this._playbackObserver.setCurrentTime(seekTo);
                    _this.trigger("warning", generateDiscontinuityError(positionBlockedAt, seekTo));
                    return;
                }
            }
            // Are we in a discontinuity between periods ? -> Seek at the beginning of the
            //                                                next period
            for (var i = _this._manifest.periods.length - 2; i >= 0; i--) {
                var period = _this._manifest.periods[i];
                if (period.end !== undefined && period.end <= positionBlockedAt) {
                    if (_this._manifest.periods[i + 1].start > positionBlockedAt &&
                        _this._manifest.periods[i + 1].start >
                            _this._playbackObserver.getCurrentTime()) {
                        var nextPeriod = _this._manifest.periods[i + 1];
                        _this._playbackObserver.setCurrentTime(nextPeriod.start);
                        _this.trigger("warning", generateDiscontinuityError(positionBlockedAt, nextPeriod.start));
                        return;
                    }
                    break;
                }
            }
            _this.trigger("stalled", stalledReason);
        }, { includeLastObservation: true, clearSignal: this._canceller.signal });
    };
    /**
     * Update information on an upcoming discontinuity for a given buffer type and
     * Period.
     * Each new update for the same Period and type overwrites the previous one.
     * @param {Object} evt
     */
    RebufferingController.prototype.updateDiscontinuityInfo = function (evt) {
        if (!this._isStarted) {
            this.start();
        }
        var lastObservation = this._playbackObserver.getReference().getValue();
        updateDiscontinuitiesStore(this._discontinuitiesStore, evt, lastObservation);
    };
    /**
     * Function to call when a Stream is currently locked, i.e. we cannot load
     * segments for the corresponding Period and buffer type until it is seeked
     * to.
     * @param {string} bufferType - Buffer type for which no segment will
     * currently load.
     * @param {Object} period - Period for which no segment will currently load.
     */
    RebufferingController.prototype.onLockedStream = function (bufferType, period) {
        var _a;
        if (!this._isStarted) {
            this.start();
        }
        var observation = this._playbackObserver.getReference().getValue();
        if (!observation.rebuffering ||
            observation.paused ||
            this._speed.getValue() <= 0 ||
            (bufferType !== "audio" && bufferType !== "video")) {
            return;
        }
        var loadedPos = observation.position.getWanted();
        var rebufferingPos = (_a = observation.rebuffering.position) !== null && _a !== void 0 ? _a : loadedPos;
        var lockedPeriodStart = period.start;
        if (loadedPos < lockedPeriodStart &&
            Math.abs(rebufferingPos - lockedPeriodStart) < 1) {
            log_1.default.warn("Init: rebuffering because of a future locked stream.\n" +
                "Trying to unlock by seeking to the next Period");
            this._playbackObserver.setCurrentTime(lockedPeriodStart + 0.001);
        }
    };
    /**
     * Stops the `RebufferingController` from montoring stalling situations,
     * forever.
     */
    RebufferingController.prototype.destroy = function () {
        this._canceller.cancel();
    };
    return RebufferingController;
}(event_emitter_1.default));
exports.default = RebufferingController;
/**
 * @param {Array.<Object>} discontinuitiesStore
 * @param {Object} manifest
 * @param {number} stalledPosition
 * @returns {number|null}
 */
function findSeekableDiscontinuity(discontinuitiesStore, manifest, stalledPosition) {
    var e_1, _a;
    if (discontinuitiesStore.length === 0) {
        return null;
    }
    var maxDiscontinuityEnd = null;
    try {
        for (var discontinuitiesStore_1 = __values(discontinuitiesStore), discontinuitiesStore_1_1 = discontinuitiesStore_1.next(); !discontinuitiesStore_1_1.done; discontinuitiesStore_1_1 = discontinuitiesStore_1.next()) {
            var discontinuityInfo = discontinuitiesStore_1_1.value;
            var period = discontinuityInfo.period;
            if (period.start > stalledPosition) {
                return maxDiscontinuityEnd;
            }
            var discontinuityEnd = void 0;
            if (period.end === undefined || period.end > stalledPosition) {
                var discontinuity = discontinuityInfo.discontinuity, position = discontinuityInfo.position;
                var start = discontinuity.start, end = discontinuity.end;
                var discontinuityLowerLimit = start !== null && start !== void 0 ? start : position;
                if (stalledPosition >= discontinuityLowerLimit - EPSILON) {
                    if (end === null) {
                        var nextPeriod = (0, manifest_1.getPeriodAfter)(manifest, period);
                        if (nextPeriod !== null) {
                            discontinuityEnd = nextPeriod.start + EPSILON;
                        }
                        else {
                            log_1.default.warn("Init: discontinuity at Period's end but no next Period");
                        }
                    }
                    else if (stalledPosition < end + EPSILON) {
                        discontinuityEnd = end + EPSILON;
                    }
                }
                if (discontinuityEnd !== undefined) {
                    log_1.default.info("Init: discontinuity found", stalledPosition, discontinuityEnd);
                    maxDiscontinuityEnd =
                        maxDiscontinuityEnd !== null && maxDiscontinuityEnd > discontinuityEnd
                            ? maxDiscontinuityEnd
                            : discontinuityEnd;
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (discontinuitiesStore_1_1 && !discontinuitiesStore_1_1.done && (_a = discontinuitiesStore_1.return)) _a.call(discontinuitiesStore_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return maxDiscontinuityEnd;
}
/**
 * Return `true` if the given event indicates that a discontinuity is present.
 * @param {Object} evt
 * @returns {Array.<Object>}
 */
function eventContainsDiscontinuity(evt) {
    return evt.discontinuity !== null;
}
/**
 * Update the `discontinuitiesStore` Object with the given event information:
 *
 *   - If that event indicates than no discontinuity is found for a Period
 *     and buffer type, remove a possible existing discontinuity for that
 *     combination.
 *
 *   - If that event indicates that a discontinuity can be found for a Period
 *     and buffer type, replace previous occurences for that combination and
 *     store it in Period's chronological order in the Array.
 * @param {Array.<Object>} discontinuitiesStore
 * @param {Object} evt
 * @param {Object} observation
 * @returns {Array.<Object>}
 */
function updateDiscontinuitiesStore(discontinuitiesStore, evt, observation) {
    var gcTime = Math.min(observation.position.getPolled(), observation.position.getWanted());
    // First, perform clean-up of old discontinuities
    while (discontinuitiesStore.length > 0 &&
        discontinuitiesStore[0].period.end !== undefined &&
        discontinuitiesStore[0].period.end + 10 < gcTime) {
        discontinuitiesStore.shift();
    }
    var period = evt.period, bufferType = evt.bufferType;
    if (bufferType !== "audio" && bufferType !== "video") {
        return;
    }
    for (var i = 0; i < discontinuitiesStore.length; i++) {
        if (discontinuitiesStore[i].period.id === period.id) {
            if (discontinuitiesStore[i].bufferType === bufferType) {
                if (!eventContainsDiscontinuity(evt)) {
                    discontinuitiesStore.splice(i, 1);
                }
                else {
                    discontinuitiesStore[i] = evt;
                }
                return;
            }
        }
        else if (discontinuitiesStore[i].period.start > period.start) {
            if (eventContainsDiscontinuity(evt)) {
                discontinuitiesStore.splice(i, 0, evt);
            }
            return;
        }
    }
    if (eventContainsDiscontinuity(evt)) {
        discontinuitiesStore.push(evt);
    }
    return;
}
/**
 * Generate error emitted when a discontinuity has been encountered.
 * @param {number} stalledPosition
 * @param {number} seekTo
 * @returns {Error}
 */
function generateDiscontinuityError(stalledPosition, seekTo) {
    return new errors_1.MediaError("DISCONTINUITY_ENCOUNTERED", "A discontinuity has been encountered at position " +
        String(stalledPosition) +
        ", seeked at position " +
        String(seekTo));
}
/**
 * Manage playback speed, allowing to force a playback rate of `0` when
 * rebuffering is wanted.
 *
 * Only one `PlaybackRateUpdater` should be created per HTMLMediaElement.
 * Note that the `PlaybackRateUpdater` reacts to playback event and wanted
 * speed change. You should call its `dispose` method once you don't need it
 * anymore.
 * @class PlaybackRateUpdater
 */
var PlaybackRateUpdater = /** @class */ (function () {
    /**
     * Create a new `PlaybackRateUpdater`.
     * @param {Object} playbackObserver
     * @param {Object} speed
     */
    function PlaybackRateUpdater(playbackObserver, speed) {
        this._speedUpdateCanceller = new task_canceller_1.default();
        this._isRebuffering = false;
        this._playbackObserver = playbackObserver;
        this._isDisposed = false;
        this._speed = speed;
        this._updateSpeed();
    }
    /**
     * Force the playback rate to `0`, to start a rebuffering phase.
     *
     * You can call `stopRebuffering` when you want the rebuffering phase to end.
     */
    PlaybackRateUpdater.prototype.startRebuffering = function () {
        if (this._isRebuffering || this._isDisposed) {
            return;
        }
        this._isRebuffering = true;
        this._speedUpdateCanceller.cancel();
        log_1.default.info("Init: Pause playback to build buffer");
        this._playbackObserver.setPlaybackRate(0);
    };
    /**
     * If in a rebuffering phase (during which the playback rate is forced to
     * `0`), exit that phase to apply the wanted playback rate instead.
     *
     * Do nothing if not in a rebuffering phase.
     */
    PlaybackRateUpdater.prototype.stopRebuffering = function () {
        if (!this._isRebuffering || this._isDisposed) {
            return;
        }
        this._isRebuffering = false;
        this._speedUpdateCanceller = new task_canceller_1.default();
        this._updateSpeed();
    };
    /**
     * The `PlaybackRateUpdater` allocate resources to for example listen to
     * wanted speed changes and react to it.
     *
     * Consequently, you should call the `dispose` method, when you don't want the
     * `PlaybackRateUpdater` to have an effect anymore.
     */
    PlaybackRateUpdater.prototype.dispose = function () {
        this._speedUpdateCanceller.cancel();
        this._isDisposed = true;
    };
    PlaybackRateUpdater.prototype._updateSpeed = function () {
        var _this = this;
        this._speed.onUpdate(function (lastSpeed) {
            log_1.default.info("Init: Resume playback speed", lastSpeed);
            _this._playbackObserver.setPlaybackRate(lastSpeed);
        }, {
            clearSignal: this._speedUpdateCanceller.signal,
            emitCurrentValue: true,
        });
    };
    return PlaybackRateUpdater;
}());
