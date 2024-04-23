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
var errors_1 = require("../../../errors");
var event_emitter_1 = require("../../../utils/event_emitter");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var sorted_list_1 = require("../../../utils/sorted_list");
var task_canceller_1 = require("../../../utils/task_canceller");
/**
 * Observes what's being played and take care of media events relating to time
 * boundaries:
 *   - Emits a `endingPositionChange` when the known maximum playable position
 *     of the current content is known and every time it changes.
 *   - Emits `endOfStream` API once segments have been pushed until the end and
 *     `resumeStream` if downloads starts back.
 *   - Emits a `periodChange` event when the currently-playing Period seemed to
 *     have changed.
 *   - emit "warning" events when what is being played is outside of the
 *     Manifest range.
 * @class ContentTimeBoundariesObserver
 */
var ContentTimeBoundariesObserver = /** @class */ (function (_super) {
    __extends(ContentTimeBoundariesObserver, _super);
    /**
     * @param {Object} manifest
     * @param {Object} playbackObserver
     */
    function ContentTimeBoundariesObserver(manifest, playbackObserver, bufferTypes) {
        var _this = _super.call(this) || this;
        _this._canceller = new task_canceller_1.default();
        _this._manifest = manifest;
        _this._activeStreams = new Map();
        _this._allBufferTypes = bufferTypes;
        _this._lastCurrentPeriodId = null;
        /**
         * Allows to calculate the minimum and maximum playable position on the
         * whole content.
         */
        var maximumPositionCalculator = new MaximumPositionCalculator(manifest);
        _this._maximumPositionCalculator = maximumPositionCalculator;
        var cancelSignal = _this._canceller.signal;
        playbackObserver.listen(function (_a) {
            var position = _a.position;
            var wantedPosition = position.getWanted();
            if (wantedPosition < manifest.getMinimumSafePosition()) {
                var warning = new errors_1.MediaError("MEDIA_TIME_BEFORE_MANIFEST", "The current position is behind the " +
                    "earliest time announced in the Manifest.");
                _this.trigger("warning", warning);
            }
            else if (wantedPosition > maximumPositionCalculator.getMaximumAvailablePosition()) {
                var warning = new errors_1.MediaError("MEDIA_TIME_AFTER_MANIFEST", "The current position is after the latest " +
                    "time announced in the Manifest.");
                _this.trigger("warning", warning);
            }
        }, { includeLastObservation: true, clearSignal: cancelSignal });
        manifest.addEventListener("manifestUpdate", function () {
            _this.trigger("endingPositionChange", _this._getManifestEndTime());
            if (cancelSignal.isCancelled()) {
                return;
            }
            _this._checkEndOfStream();
        }, cancelSignal);
        return _this;
    }
    /**
     * Returns an estimate of the current last position which may be played in
     * the content at the moment.
     * @returns {Object}
     */
    ContentTimeBoundariesObserver.prototype.getCurrentEndingTime = function () {
        return this._getManifestEndTime();
    };
    /**
     * Method to call any time an Adaptation has been selected.
     *
     * That Adaptation switch will be considered as active until the
     * `onPeriodCleared` method has been called for the same `bufferType` and
     * `Period`, or until `dispose` is called.
     * @param {string} bufferType - The type of buffer concerned by the Adaptation
     * switch
     * @param {Object} period - The Period concerned by the Adaptation switch
     * @param {Object|null} adaptation - The Adaptation selected. `null` if the
     * absence of `Adaptation` has been explicitely selected for this Period and
     * buffer type (e.g. no video).
     */
    ContentTimeBoundariesObserver.prototype.onAdaptationChange = function (bufferType, period, adaptation) {
        if (this._manifest.isLastPeriodKnown) {
            var lastPeriod = this._manifest.periods[this._manifest.periods.length - 1];
            if (period.id === (lastPeriod === null || lastPeriod === void 0 ? void 0 : lastPeriod.id)) {
                if (bufferType === "audio" || bufferType === "video") {
                    if (bufferType === "audio") {
                        this._maximumPositionCalculator.updateLastAudioAdaptation(adaptation);
                    }
                    else {
                        this._maximumPositionCalculator.updateLastVideoAdaptation(adaptation);
                    }
                    var endingPosition = this._maximumPositionCalculator.getEndingPosition();
                    var newEndingPosition = endingPosition !== undefined
                        ? { isEnd: true, endingPosition: endingPosition }
                        : {
                            isEnd: false,
                            endingPosition: this._maximumPositionCalculator.getMaximumAvailablePosition(),
                        };
                    this.trigger("endingPositionChange", newEndingPosition);
                }
            }
        }
        if (this._canceller.isUsed()) {
            return;
        }
        if (adaptation === null) {
            this._addActivelyLoadedPeriod(period, bufferType);
        }
    };
    /**
     * Method to call any time a Representation has been selected.
     *
     * That Representation switch will be considered as active until the
     * `onPeriodCleared` method has been called for the same `bufferType` and
     * `Period`, or until `dispose` is called.
     * @param {string} bufferType - The type of buffer concerned by the
     * Representation switch
     * @param {Object} period - The Period concerned by the Representation switch
     */
    ContentTimeBoundariesObserver.prototype.onRepresentationChange = function (bufferType, period) {
        this._addActivelyLoadedPeriod(period, bufferType);
    };
    /**
     * Method to call any time a Period and type combination is not considered
     * anymore.
     *
     * Calling this method allows to signal that a previous Adaptation and/or
     * Representation change respectively indicated by an `onAdaptationChange` and
     * an `onRepresentationChange` call, are not active anymore.
     * @param {string} bufferType - The type of buffer concerned
     * @param {Object} period - The Period concerned
     */
    ContentTimeBoundariesObserver.prototype.onPeriodCleared = function (bufferType, period) {
        this._removeActivelyLoadedPeriod(period, bufferType);
    };
    /**
     * Method to call when the last chronological segment for a given buffer type
     * is known to have been loaded and is either pushed or in the process of
     * being pushed to the corresponding MSE `SourceBuffer` or equivalent.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    ContentTimeBoundariesObserver.prototype.onLastSegmentFinishedLoading = function (bufferType) {
        var streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
        if (!streamInfo.hasFinishedLoadingLastPeriod) {
            streamInfo.hasFinishedLoadingLastPeriod = true;
            this._checkEndOfStream();
        }
    };
    /**
     * Method to call to "cancel" a previous call to
     * `onLastSegmentFinishedLoading`.
     *
     * That is, calling this method indicates that the last chronological segment
     * of a given buffer type is now either not loaded or it is not known.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    ContentTimeBoundariesObserver.prototype.onLastSegmentLoadingResume = function (bufferType) {
        var streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
        if (streamInfo.hasFinishedLoadingLastPeriod) {
            streamInfo.hasFinishedLoadingLastPeriod = false;
            this._checkEndOfStream();
        }
    };
    /**
     * Free all resources used by the `ContentTimeBoundariesObserver` and cancels
     * all recurring processes it performs.
     */
    ContentTimeBoundariesObserver.prototype.dispose = function () {
        this.removeEventListener();
        this._canceller.cancel();
    };
    ContentTimeBoundariesObserver.prototype._addActivelyLoadedPeriod = function (period, bufferType) {
        var streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
        if (!streamInfo.activePeriods.has(period)) {
            streamInfo.activePeriods.add(period);
            this._checkCurrentPeriod();
        }
    };
    ContentTimeBoundariesObserver.prototype._removeActivelyLoadedPeriod = function (period, bufferType) {
        var streamInfo = this._activeStreams.get(bufferType);
        if (streamInfo === undefined) {
            return;
        }
        if (streamInfo.activePeriods.has(period)) {
            streamInfo.activePeriods.removeElement(period);
            this._checkCurrentPeriod();
        }
    };
    ContentTimeBoundariesObserver.prototype._checkCurrentPeriod = function () {
        var e_1, _a;
        if (this._allBufferTypes.length === 0) {
            return;
        }
        var streamInfo = this._activeStreams.get(this._allBufferTypes[0]);
        if (streamInfo === undefined) {
            return;
        }
        var _loop_1 = function (period) {
            var wasFoundInAllTypes = true;
            for (var i = 1; i < this_1._allBufferTypes.length; i++) {
                var streamInfo2 = this_1._activeStreams.get(this_1._allBufferTypes[i]);
                if (streamInfo2 === undefined) {
                    return { value: void 0 };
                }
                var activePeriods = streamInfo2.activePeriods.toArray();
                var hasPeriod = activePeriods.some(function (p) { return p.id === period.id; });
                if (!hasPeriod) {
                    wasFoundInAllTypes = false;
                    break;
                }
            }
            if (wasFoundInAllTypes) {
                if (this_1._lastCurrentPeriodId !== period.id) {
                    this_1._lastCurrentPeriodId = period.id;
                    this_1.trigger("periodChange", period);
                }
                return { value: void 0 };
            }
        };
        var this_1 = this;
        try {
            for (var _b = __values(streamInfo.activePeriods.toArray()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var period = _c.value;
                var state_1 = _loop_1(period);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    ContentTimeBoundariesObserver.prototype._getManifestEndTime = function () {
        var endingPosition = this._maximumPositionCalculator.getEndingPosition();
        return endingPosition !== undefined
            ? { isEnd: true, endingPosition: endingPosition }
            : {
                isEnd: false,
                endingPosition: this._maximumPositionCalculator.getMaximumAvailablePosition(),
            };
    };
    ContentTimeBoundariesObserver.prototype._lazilyCreateActiveStreamInfo = function (bufferType) {
        var streamInfo = this._activeStreams.get(bufferType);
        if (streamInfo === undefined) {
            streamInfo = {
                activePeriods: new sorted_list_1.default(function (a, b) { return a.start - b.start; }),
                hasFinishedLoadingLastPeriod: false,
            };
            this._activeStreams.set(bufferType, streamInfo);
        }
        return streamInfo;
    };
    ContentTimeBoundariesObserver.prototype._checkEndOfStream = function () {
        var _this = this;
        if (!this._manifest.isLastPeriodKnown) {
            return;
        }
        var everyBufferTypeLoaded = this._allBufferTypes.every(function (bt) {
            var streamInfo = _this._activeStreams.get(bt);
            return streamInfo !== undefined && streamInfo.hasFinishedLoadingLastPeriod;
        });
        if (everyBufferTypeLoaded) {
            this.trigger("endOfStream", null);
        }
        else {
            this.trigger("resumeStream", null);
        }
    };
    return ContentTimeBoundariesObserver;
}(event_emitter_1.default));
exports.default = ContentTimeBoundariesObserver;
/**
 * Calculate the last position from the last chosen audio and video Adaptations
 * for the last Period (or a default one, if no Adaptations has been chosen).
 * @class MaximumPositionCalculator
 */
var MaximumPositionCalculator = /** @class */ (function () {
    /**
     * @param {Object} manifest
     */
    function MaximumPositionCalculator(manifest) {
        this._manifest = manifest;
        this._lastAudioAdaptation = undefined;
        this._lastVideoAdaptation = undefined;
    }
    /**
     * Update the last known audio Adaptation for the last Period.
     * If no Adaptation has been set, it should be set to `null`.
     *
     * Allows to calculate the maximum position more precizely in
     * `getMaximumAvailablePosition` and `getEndingPosition`.
     * @param {Object|null} adaptation
     */
    MaximumPositionCalculator.prototype.updateLastAudioAdaptation = function (adaptation) {
        this._lastAudioAdaptation = adaptation;
    };
    /**
     * Update the last known video Adaptation for the last Period.
     * If no Adaptation has been set, it should be set to `null`.
     *
     * Allows to calculate the maximum position more precizely in
     * `getMaximumAvailablePosition` and `getEndingPosition`.
     * @param {Object|null} adaptation
     */
    MaximumPositionCalculator.prototype.updateLastVideoAdaptation = function (adaptation) {
        this._lastVideoAdaptation = adaptation;
    };
    /**
     * Returns an estimate of the maximum position currently reachable (i.e.
     * segments are available) under the current circumstances.
     * @returns {number}
     */
    MaximumPositionCalculator.prototype.getMaximumAvailablePosition = function () {
        if (this._manifest.isDynamic) {
            return this._manifest.getMaximumSafePosition();
        }
        if (this._lastVideoAdaptation === undefined ||
            this._lastAudioAdaptation === undefined) {
            return this._manifest.getMaximumSafePosition();
        }
        else if (this._lastAudioAdaptation === null) {
            if (this._lastVideoAdaptation === null) {
                return this._manifest.getMaximumSafePosition();
            }
            else {
                var lastVideoPosition = getLastAvailablePositionFromAdaptation(this._lastVideoAdaptation);
                if (typeof lastVideoPosition !== "number") {
                    return this._manifest.getMaximumSafePosition();
                }
                return lastVideoPosition;
            }
        }
        else if (this._lastVideoAdaptation === null) {
            var lastAudioPosition = getLastAvailablePositionFromAdaptation(this._lastAudioAdaptation);
            if (typeof lastAudioPosition !== "number") {
                return this._manifest.getMaximumSafePosition();
            }
            return lastAudioPosition;
        }
        else {
            var lastAudioPosition = getLastAvailablePositionFromAdaptation(this._lastAudioAdaptation);
            var lastVideoPosition = getLastAvailablePositionFromAdaptation(this._lastVideoAdaptation);
            if (typeof lastAudioPosition !== "number" ||
                typeof lastVideoPosition !== "number") {
                return this._manifest.getMaximumSafePosition();
            }
            else {
                return Math.min(lastAudioPosition, lastVideoPosition);
            }
        }
    };
    /**
     * Returns an estimate of the actual ending position once
     * the full content is available.
     * Returns `undefined` if that could not be determined, for various reasons.
     * @returns {number|undefined}
     */
    MaximumPositionCalculator.prototype.getEndingPosition = function () {
        var _a, _b;
        if (!this._manifest.isDynamic) {
            return this.getMaximumAvailablePosition();
        }
        if (this._lastVideoAdaptation === undefined ||
            this._lastAudioAdaptation === undefined) {
            return undefined;
        }
        else if (this._lastAudioAdaptation === null) {
            if (this._lastVideoAdaptation === null) {
                return undefined;
            }
            else {
                return (_a = getEndingPositionFromAdaptation(this._lastVideoAdaptation)) !== null && _a !== void 0 ? _a : undefined;
            }
        }
        else if (this._lastVideoAdaptation === null) {
            return (_b = getEndingPositionFromAdaptation(this._lastAudioAdaptation)) !== null && _b !== void 0 ? _b : undefined;
        }
        else {
            var lastAudioPosition = getEndingPositionFromAdaptation(this._lastAudioAdaptation);
            var lastVideoPosition = getEndingPositionFromAdaptation(this._lastVideoAdaptation);
            if (typeof lastAudioPosition !== "number" ||
                typeof lastVideoPosition !== "number") {
                return undefined;
            }
            else {
                return Math.min(lastAudioPosition, lastVideoPosition);
            }
        }
    };
    return MaximumPositionCalculator;
}());
/**
 * Returns last currently available position from the Adaptation given.
 * `undefined` if a time could not be found.
 * `null` if the Adaptation has no segments (it could be that it didn't started or
 * that it already finished for example).
 *
 * We consider the earliest last available position from every Representation
 * in the given Adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined|null}
 */
function getLastAvailablePositionFromAdaptation(adaptation) {
    var representations = adaptation.representations;
    var min = null;
    /**
     * Some Manifest parsers use the exact same `IRepresentationIndex` reference
     * for each Representation of a given Adaptation, because in the actual source
     * Manifest file, indexing data is often defined at Adaptation-level.
     * This variable allows to optimize the logic here when this is the case.
     */
    var lastIndex;
    for (var i = 0; i < representations.length; i++) {
        if (representations[i].index !== lastIndex) {
            lastIndex = representations[i].index;
            var lastPosition = representations[i].index.getLastAvailablePosition();
            if (lastPosition === undefined) {
                // we cannot tell
                return undefined;
            }
            if (lastPosition !== null) {
                min = (0, is_null_or_undefined_1.default)(min) ? lastPosition : Math.min(min, lastPosition);
            }
        }
    }
    return min;
}
/**
 * Returns ending time from the Adaptation given, once all its segments are
 * available.
 * `undefined` if a time could not be found.
 * `null` if the Adaptation has no segments (it could be that it already
 * finished for example).
 *
 * We consider the earliest ending time from every Representation in the given
 * Adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined|null}
 */
function getEndingPositionFromAdaptation(adaptation) {
    var representations = adaptation.representations;
    var min = null;
    /**
     * Some Manifest parsers use the exact same `IRepresentationIndex` reference
     * for each Representation of a given Adaptation, because in the actual source
     * Manifest file, indexing data is often defined at Adaptation-level.
     * This variable allows to optimize the logic here when this is the case.
     */
    var lastIndex;
    for (var i = 0; i < representations.length; i++) {
        if (representations[i].index !== lastIndex) {
            lastIndex = representations[i].index;
            var lastPosition = representations[i].index.getEnd();
            if (lastPosition === undefined) {
                // we cannot tell
                return undefined;
            }
            if (lastPosition !== null) {
                min = (0, is_null_or_undefined_1.default)(min) ? lastPosition : Math.min(min, lastPosition);
            }
        }
    }
    return min;
}
