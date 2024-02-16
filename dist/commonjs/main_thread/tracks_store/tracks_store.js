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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
/**
 * This file is used to abstract the notion of text, audio and video tracks
 * switching for an easier API management.
 */
var config_1 = require("../../config");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var manifest_1 = require("../../manifest");
var array_find_1 = require("../../utils/array_find");
var assert_1 = require("../../utils/assert");
var event_emitter_1 = require("../../utils/event_emitter");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var object_assign_1 = require("../../utils/object_assign");
var reference_1 = require("../../utils/reference");
var track_dispatcher_1 = require("./track_dispatcher");
/**
 * Class helping with the management of the audio, video and text tracks and
 * qualities.
 *
 * The `TracksStore` allows to choose a track and qualities for different types
 * of media through a simpler API.
 *
 * @class TracksStore
 */
var TracksStore = /** @class */ (function (_super) {
    __extends(TracksStore, _super);
    function TracksStore(args) {
        var _a;
        var _this = _super.call(this) || this;
        _this._storedPeriodInfo = [];
        _this._isDisposed = false;
        _this._cachedPeriodInfo = new WeakMap();
        _this._isTrickModeTrackEnabled = args.preferTrickModeTracks;
        _this._defaultAudioTrackSwitchingMode =
            (_a = args.defaultAudioTrackSwitchingMode) !== null && _a !== void 0 ? _a : config_1.default.getCurrent().DEFAULT_AUDIO_TRACK_SWITCHING_MODE;
        return _this;
    }
    /**
     * Return Array of Period information, to allow an outside application to
     * modify the track of any Period.
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailablePeriods = function () {
        return this._storedPeriodInfo.reduce(function (acc, p) {
            if (p.isPeriodAdvertised) {
                acc.push(toExposedPeriod(p.period));
            }
            return acc;
        }, []);
    };
    /**
     * Update the list of Periods handled by the TracksStore and make a
     * track choice decision for each of them.
     * @param {Object} manifest - The new Manifest object
     */
    TracksStore.prototype.onManifestUpdate = function (manifest) {
        var _a, e_1, _b;
        var _this = this;
        var _c, _d, _e, _f, _g, _h;
        var DEFAULT_VIDEO_TRACK_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
        var periods = manifest.periods;
        // We assume that they are always sorted chronologically
        // In dev mode, perform a runtime check that this is the case
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            for (var i = 1; i < periods.length; i++) {
                (0, assert_1.default)(periods[i - 1].start <= periods[i].start);
            }
        }
        /** Periods which have just been added. */
        var addedPeriods = [];
        var newPListIdx = 0;
        var _loop_1 = function (i) {
            var oldPeriod = this_1._storedPeriodInfo[i].period;
            var newPeriod = periods[newPListIdx];
            if (newPeriod === undefined) {
                // We reached the end of the new Periods, remove remaining old Periods
                for (var j = this_1._storedPeriodInfo.length - 1; j >= i; j--) {
                    this_1._storedPeriodInfo[j].inManifest = false;
                    if (isPeriodItemRemovable(this_1._storedPeriodInfo[j])) {
                        this_1._removePeriodObject(j);
                    }
                }
            }
            else if (oldPeriod === newPeriod) {
                newPListIdx++;
                var curWantedTextTrack_1 = this_1._storedPeriodInfo[i].text.storedSettings;
                if (curWantedTextTrack_1 !== null) {
                    var textAdaptations = (0, manifest_1.getSupportedAdaptations)(newPeriod, "text");
                    var stillHere = textAdaptations.some(function (a) { return a.id === curWantedTextTrack_1.adaptation.id; });
                    if (!stillHere) {
                        log_1.default.warn("TS: Chosen text Adaptation not available anymore");
                        var periodInfo = this_1._storedPeriodInfo[i];
                        periodInfo.text.storedSettings = null;
                        this_1.trigger("trackUpdate", {
                            period: toExposedPeriod(newPeriod),
                            trackType: "text",
                            reason: "missing",
                        });
                        // The previous event trigger could have had side-effects, so we
                        // re-check if we're still mostly in the same state
                        if (this_1._isDisposed) {
                            return { value: void 0 };
                        }
                        var periodItem = getPeriodItem(this_1._storedPeriodInfo, periodInfo.period.id);
                        if (periodItem !== undefined && periodItem.text.storedSettings === null) {
                            (_c = periodItem.text.dispatcher) === null || _c === void 0 ? void 0 : _c.updateTrack(null);
                        }
                    }
                }
                var curWantedVideoTrack_1 = this_1._storedPeriodInfo[i].video.storedSettings;
                if (curWantedVideoTrack_1 !== null) {
                    var videoAdaptations = (0, manifest_1.getSupportedAdaptations)(newPeriod, "video");
                    var stillHere = videoAdaptations.some(function (a) { return a.id === curWantedVideoTrack_1.adaptation.id; });
                    if (!stillHere) {
                        log_1.default.warn("TS: Chosen video Adaptation not available anymore");
                        var periodItem = this_1._storedPeriodInfo[i];
                        var storedSettings = void 0;
                        if (videoAdaptations.length === 0) {
                            storedSettings = null;
                        }
                        else {
                            var adaptationBase = videoAdaptations[0];
                            var adaptation = getRightVideoTrack(adaptationBase, this_1._isTrickModeTrackEnabled);
                            var lockedRepresentations = new reference_1.default(null);
                            storedSettings = {
                                adaptationBase: adaptationBase,
                                adaptation: adaptation,
                                switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                                lockedRepresentations: lockedRepresentations,
                            };
                        }
                        periodItem.video.storedSettings = storedSettings;
                        this_1.trigger("trackUpdate", {
                            period: toExposedPeriod(newPeriod),
                            trackType: "video",
                            reason: "missing",
                        });
                        // The previous event trigger could have had side-effects, so we
                        // re-check if we're still mostly in the same state
                        if (this_1._isDisposed) {
                            return { value: void 0 };
                        }
                        var newPeriodItem = getPeriodItem(this_1._storedPeriodInfo, periodItem.period.id);
                        if (newPeriodItem !== undefined &&
                            newPeriodItem.video.storedSettings === storedSettings) {
                            (_d = newPeriodItem.video.dispatcher) === null || _d === void 0 ? void 0 : _d.updateTrack(storedSettings);
                        }
                    }
                }
                var curWantedAudioTrack_1 = this_1._storedPeriodInfo[i].audio.storedSettings;
                if (curWantedAudioTrack_1 !== null) {
                    var audioAdaptations = (0, manifest_1.getSupportedAdaptations)(newPeriod, "audio");
                    var stillHere = audioAdaptations.some(function (a) { return a.id === curWantedAudioTrack_1.adaptation.id; });
                    if (!stillHere) {
                        log_1.default.warn("TS: Chosen audio Adaptation not available anymore");
                        var periodItem = this_1._storedPeriodInfo[i];
                        var storedSettings = audioAdaptations.length === 0
                            ? null
                            : {
                                adaptation: audioAdaptations[0],
                                switchingMode: this_1._defaultAudioTrackSwitchingMode,
                                lockedRepresentations: new reference_1.default(null),
                            };
                        periodItem.audio.storedSettings = storedSettings;
                        this_1.trigger("trackUpdate", {
                            period: toExposedPeriod(newPeriod),
                            trackType: "audio",
                            reason: "missing",
                        });
                        // The previous event trigger could have had side-effects, so we
                        // re-check if we're still mostly in the same state
                        if (this_1._isDisposed) {
                            return { value: void 0 };
                        }
                        var newPeriodItem = getPeriodItem(this_1._storedPeriodInfo, periodItem.period.id);
                        if (newPeriodItem !== undefined &&
                            newPeriodItem.audio.storedSettings === storedSettings) {
                            (_e = newPeriodItem.audio.dispatcher) === null || _e === void 0 ? void 0 : _e.updateTrack(storedSettings);
                        }
                    }
                }
                // (If not, what do?)
            }
            else if (oldPeriod.start <= newPeriod.start) {
                // This old Period does not exist anymore.
                this_1._storedPeriodInfo[i].inManifest = false;
                if (isPeriodItemRemovable(this_1._storedPeriodInfo[i])) {
                    this_1._removePeriodObject(i);
                    i--;
                }
            }
            else {
                var newPeriodInfo = generatePeriodInfo(newPeriod, true, this_1._isTrickModeTrackEnabled, this_1._defaultAudioTrackSwitchingMode);
                // oldPeriod.start > newPeriod.start: insert newPeriod before
                this_1._storedPeriodInfo.splice(i, 0, newPeriodInfo);
                addedPeriods.push(newPeriodInfo);
                newPListIdx++;
                // Note: we don't increment `i` on purpose here, as we want to check the
                // same oldPeriod at the next loop iteration
            }
            out_i_1 = i;
        };
        var this_1 = this, out_i_1;
        for (var i = 0; i < this._storedPeriodInfo.length; i++) {
            var state_1 = _loop_1(i);
            i = out_i_1;
            if (typeof state_1 === "object")
                return state_1.value;
        }
        if (newPListIdx < periods.length) {
            // Add further new Period
            var periodsToAdd = periods
                .slice(newPListIdx)
                .map(function (p) {
                return generatePeriodInfo(p, true, _this._isTrickModeTrackEnabled, _this._defaultAudioTrackSwitchingMode);
            });
            (_a = this._storedPeriodInfo).push.apply(_a, __spreadArray([], __read(periodsToAdd), false));
            addedPeriods.push.apply(addedPeriods, __spreadArray([], __read(periodsToAdd), false));
        }
        try {
            for (var _j = __values(this._storedPeriodInfo), _k = _j.next(); !_k.done; _k = _j.next()) {
                var storedPeriodInfo = _k.value;
                (_f = storedPeriodInfo.audio.dispatcher) === null || _f === void 0 ? void 0 : _f.refresh();
                (_g = storedPeriodInfo.video.dispatcher) === null || _g === void 0 ? void 0 : _g.refresh();
                (_h = storedPeriodInfo.text.dispatcher) === null || _h === void 0 ? void 0 : _h.refresh();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    TracksStore.prototype.onDecipherabilityUpdates = function () {
        var e_2, _a;
        var _b, _c, _d;
        try {
            for (var _e = __values(this._storedPeriodInfo), _f = _e.next(); !_f.done; _f = _e.next()) {
                var storedPeriodInfo = _f.value;
                (_b = storedPeriodInfo.audio.dispatcher) === null || _b === void 0 ? void 0 : _b.refresh();
                (_c = storedPeriodInfo.video.dispatcher) === null || _c === void 0 ? void 0 : _c.refresh();
                (_d = storedPeriodInfo.text.dispatcher) === null || _d === void 0 ? void 0 : _d.refresh();
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    /**
     * Add shared reference to choose Adaptation for new "audio", "video" or
     * "text" Period.
     *
     * Note that such reference has to be removed through `removeTrackReference`
     * so ressources can be freed.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     * @param {Object} adaptationRef - A reference through which
     * the choice will be given.
     */
    TracksStore.prototype.addTrackReference = function (bufferType, period, adaptationRef) {
        var _this = this;
        var periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined) {
            // The Period has not yet been added.
            periodObj = generatePeriodInfo(period, false, this._isTrickModeTrackEnabled, this._defaultAudioTrackSwitchingMode);
            var found = false;
            for (var i = 0; i < this._storedPeriodInfo.length; i++) {
                if (this._storedPeriodInfo[i].period.start > period.start) {
                    this._storedPeriodInfo.splice(i, 0, periodObj);
                    found = true;
                }
            }
            if (!found) {
                this._storedPeriodInfo.push(periodObj);
            }
        }
        if (!periodObj.isPeriodAdvertised) {
            periodObj.isPeriodAdvertised = true;
            this.trigger("newAvailablePeriods", [
                { id: period.id, start: period.start, end: period.end },
            ]);
            if (this._isDisposed) {
                return;
            }
        }
        if (periodObj[bufferType].dispatcher !== null) {
            log_1.default.error("TS: Subject already added for ".concat(bufferType, " ") + "and Period ".concat(period.start));
            return;
        }
        var trackSetting = periodObj[bufferType].storedSettings;
        var dispatcher = new track_dispatcher_1.default(adaptationRef);
        periodObj[bufferType].dispatcher = dispatcher;
        dispatcher.addEventListener("noPlayableRepresentation", function () {
            var _a, _b, _c, _d;
            var nextAdaptation = (0, array_find_1.default)((_a = period.adaptations[bufferType]) !== null && _a !== void 0 ? _a : [], function (a) {
                if (a.isSupported === false) {
                    return false;
                }
                var playableRepresentations = a.representations.filter(function (r) { return r.isSupported === true && r.decipherable !== false; });
                return playableRepresentations.length > 0;
            });
            if (nextAdaptation === undefined) {
                var noRepErr = new errors_1.MediaError("NO_PLAYABLE_REPRESENTATION", "No ".concat(bufferType, " Representation can be played"), { tracks: undefined });
                _this.trigger("error", noRepErr);
                _this.dispose();
                return;
            }
            var typeInfo = (_b = getPeriodItem(_this._storedPeriodInfo, period.id)) === null || _b === void 0 ? void 0 : _b[bufferType];
            if ((0, is_null_or_undefined_1.default)(typeInfo)) {
                return;
            }
            var switchingMode = bufferType === "audio" ? _this._defaultAudioTrackSwitchingMode : "reload";
            var storedSettings = {
                adaptation: nextAdaptation,
                switchingMode: switchingMode,
                lockedRepresentations: new reference_1.default(null),
            };
            typeInfo.storedSettings = storedSettings;
            _this.trigger("trackUpdate", {
                period: toExposedPeriod(period),
                trackType: bufferType,
                reason: "no-playable-representation",
            });
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (_this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            typeInfo = (_c = getPeriodItem(_this._storedPeriodInfo, period.id)) === null || _c === void 0 ? void 0 : _c[bufferType];
            if ((0, is_null_or_undefined_1.default)(typeInfo) || typeInfo.storedSettings !== storedSettings) {
                return;
            }
            (_d = typeInfo.dispatcher) === null || _d === void 0 ? void 0 : _d.updateTrack(storedSettings);
        });
        dispatcher.addEventListener("noPlayableLockedRepresentation", function () {
            // TODO check that it doesn't already lead to segment loading or MediaSource
            // reloading
            trackSetting === null || trackSetting === void 0 ? void 0 : trackSetting.lockedRepresentations.setValue(null);
            _this.trigger("brokenRepresentationsLock", {
                period: { id: period.id, start: period.start, end: period.end },
                trackType: bufferType,
            });
        });
        dispatcher.start(trackSetting);
    };
    /**
     * Remove shared reference to choose an "audio", "video" or "text" Adaptation
     * for a Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     */
    TracksStore.prototype.removeTrackReference = function (bufferType, period) {
        var periodIndex = findPeriodIndex(this._storedPeriodInfo, period);
        if (periodIndex === undefined) {
            log_1.default.warn("TS: ".concat(bufferType, " not found for period"), period.start);
            return;
        }
        var periodObj = this._storedPeriodInfo[periodIndex];
        var choiceItem = periodObj[bufferType];
        if ((choiceItem === null || choiceItem === void 0 ? void 0 : choiceItem.dispatcher) === null) {
            log_1.default.warn("TS: TrackDispatcher already removed for ".concat(bufferType, " ") +
                "and Period ".concat(period.start));
            return;
        }
        choiceItem.dispatcher.dispose();
        choiceItem.dispatcher = null;
        if (isPeriodItemRemovable(periodObj)) {
            this._removePeriodObject(periodIndex);
        }
    };
    /**
     * Allows to recuperate a "Period Object" - used in get/set methods of the
     * `TracksStore` - by giving the Period itself.
     *
     * This method should be preferred when possible over `getPeriodObjectFromId`
     * because it is able to fallback on an internal cache in case the
     * corresponding Period is not stored anymore.
     * This for example could happen when a Period has been removed from the
     * Manifest yet may still be needed (e.g. because its linked segments might
     * still live in the buffers).
     *
     * Note however that this cache-retrieval logic is based on a Map whose key
     * is the Period's JavaScript reference. As such, the cache won't be used if
     * `Period` corresponds to a copy of the original `Period` object.
     *
     * @param {Object} period
     * @returns {Object}
     */
    TracksStore.prototype.getPeriodObjectFromPeriod = function (period) {
        var periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined && period !== undefined) {
            return this._cachedPeriodInfo.get(period);
        }
        return periodObj;
    };
    /**
     * Allows to recuperate a "Period Object" - used in get/set methods of the
     * `TracksStore` - by giving the Period's id.
     *
     * Note that unlike `getPeriodObjectFromPeriod` this method is only going to look
     * into currently stored Period and as such old Periods not in the Manifest
     * anymore might not be retrievable.
     * If you want to retrieve Period objects linked to such Period, you might
     * prefer to use `getPeriodObjectFromPeriod` (which necessitates the original
     * Period object).
     *
     * @param {string} periodId - The concerned Period's id
     * @returns {Object}
     */
    TracksStore.prototype.getPeriodObjectFromId = function (periodId) {
        return getPeriodItem(this._storedPeriodInfo, periodId);
    };
    TracksStore.prototype.disableVideoTrickModeTracks = function () {
        if (!this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = false;
        this._resetVideoTrackChoices("trickmode-disabled");
    };
    TracksStore.prototype.enableVideoTrickModeTracks = function () {
        if (this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = true;
        this._resetVideoTrackChoices("trickmode-enabled");
    };
    /**
     * Reset the TracksStore's Period objects:
     *   - All Period which are not in the manifest currently will be removed.
     *   - All References used to communicate the wanted track will be removed.
     *
     * You might want to call this API when restarting playback.
     */
    TracksStore.prototype.resetPeriodObjects = function () {
        var _a, _b, _c;
        for (var i = this._storedPeriodInfo.length - 1; i >= 0; i--) {
            var storedObj = this._storedPeriodInfo[i];
            (_a = storedObj.audio.dispatcher) === null || _a === void 0 ? void 0 : _a.dispose();
            storedObj.audio.dispatcher = null;
            (_b = storedObj.video.dispatcher) === null || _b === void 0 ? void 0 : _b.dispose();
            storedObj.video.dispatcher = null;
            (_c = storedObj.text.dispatcher) === null || _c === void 0 ? void 0 : _c.dispose();
            storedObj.text.dispatcher = null;
            if (!storedObj.inManifest) {
                this._removePeriodObject(i);
            }
        }
    };
    /**
     * @returns {boolean}
     */
    TracksStore.prototype.isTrickModeEnabled = function () {
        return this._isTrickModeTrackEnabled;
    };
    /**
     * Set audio track based on the ID of its Adaptation for a given added Period.
     * @param {Object} params
     * @param {Object} params.periodRef - The concerned Period's object.
     * @param {string} params.trackId - adaptation id of the wanted track.
     * @param {string} params.switchingMode - Behavior when replacing the track by
     * another.
     * @param {Object|null} params.lockedRepresentations - Audio Representations
     * that should be locked after switching to that track.
     * `null` if no Audio Representation should be locked.
     * @param {number} params.relativeResumingPosition
     */
    TracksStore.prototype.setAudioTrack = function (payload) {
        var periodRef = payload.periodRef, trackId = payload.trackId, switchingMode = payload.switchingMode, lockedRepresentations = payload.lockedRepresentations, relativeResumingPosition = payload.relativeResumingPosition;
        return this._setAudioOrTextTrack({
            bufferType: "audio",
            periodRef: periodRef,
            trackId: trackId,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : this._defaultAudioTrackSwitchingMode,
            lockedRepresentations: lockedRepresentations,
            relativeResumingPosition: relativeResumingPosition,
        });
    };
    /**
     * Set text track based on the ID of its Adaptation for a given added Period.
     * @param {Object} periodObj - The concerned Period's object.
     * @param {string} wantedId - adaptation id of the wanted track.
     */
    TracksStore.prototype.setTextTrack = function (periodObj, wantedId) {
        return this._setAudioOrTextTrack({
            bufferType: "text",
            periodRef: periodObj,
            trackId: wantedId,
            switchingMode: "direct",
            lockedRepresentations: null,
            relativeResumingPosition: undefined,
        });
    };
    /**
     * Set audio track based on the ID of its Adaptation for a given added Period.
     * @param {Object} params
     * @param {string} params.bufferType
     * @param {Object} params.periodRef - The concerned Period's object.
     * @param {string} params.trackId - adaptation id of the wanted track.
     * @param {string} params.switchingMode - Behavior when replacing the track by
     * another.
     * @param {Array.<string>|null} params.lockedRepresentations - Audio
     * Representations that should be locked after switchingMode to that track.
     * `null` if no Audio Representation should be locked.
     * @param {number|undefined} params.relativeResumingPosition
     */
    TracksStore.prototype._setAudioOrTextTrack = function (_a) {
        var _b, _c;
        var bufferType = _a.bufferType, periodRef = _a.periodRef, trackId = _a.trackId, switchingMode = _a.switchingMode, lockedRepresentations = _a.lockedRepresentations, relativeResumingPosition = _a.relativeResumingPosition;
        var period = periodRef.period;
        var wantedAdaptation = (0, array_find_1.default)((_b = period.adaptations[bufferType]) !== null && _b !== void 0 ? _b : [], function (_a) {
            var id = _a.id, isSupported = _a.isSupported;
            return isSupported === true && id === trackId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Wanted ".concat(bufferType, " track not found."));
        }
        var typeInfo = periodRef[bufferType];
        var lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new reference_1.default(null);
        }
        else {
            var representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            var repSwitchingMode = bufferType === "audio"
                ? this._defaultAudioTrackSwitchingMode
                : "direct";
            lockedRepresentationsRef = new reference_1.default({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        var storedSettings = {
            adaptation: wantedAdaptation,
            switchingMode: switchingMode,
            lockedRepresentations: lockedRepresentationsRef,
            relativeResumingPosition: relativeResumingPosition,
        };
        typeInfo.storedSettings = storedSettings;
        this.trigger("trackUpdate", {
            period: toExposedPeriod(period),
            trackType: bufferType,
            reason: "manual",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        var newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === storedSettings) {
            (_c = newPeriodItem[bufferType].dispatcher) === null || _c === void 0 ? void 0 : _c.updateTrack(storedSettings);
        }
    };
    /**
     * Set video track based on the ID of its Adaptation for a given added Period.
     * @param {Object} params
     * @param {Object} params.periodRef - The concerned Period's object.
     * @param {string} params.trackId - adaptation id of the wanted track.
     * @param {string} params.switchingMode - Behavior when replacing the track by
     * another.
     * @param {Array.<string>|null} params.lockedRepresentations - Video
     * Representations that should be locked after switching to that track.
     * `null` if no Video Representation should be locked.
     * @param {number|undefined} params.relativeResumingPosition
     */
    TracksStore.prototype.setVideoTrack = function (payload) {
        var _a, _b;
        var periodRef = payload.periodRef, trackId = payload.trackId, switchingMode = payload.switchingMode, lockedRepresentations = payload.lockedRepresentations, relativeResumingPosition = payload.relativeResumingPosition;
        var period = periodRef.period;
        var wantedAdaptation = (0, array_find_1.default)((_a = period.adaptations.video) !== null && _a !== void 0 ? _a : [], function (_a) {
            var id = _a.id, isSupported = _a.isSupported;
            return isSupported === true && id === trackId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Wanted video track not found.");
        }
        var DEFAULT_VIDEO_TRACK_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
        var typeInfo = periodRef.video;
        var newAdaptation = getRightVideoTrack(wantedAdaptation, this._isTrickModeTrackEnabled);
        var lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new reference_1.default(null);
        }
        else {
            var representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            var repSwitchingMode = DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
            lockedRepresentationsRef = new reference_1.default({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        var storedSettings = {
            adaptationBase: wantedAdaptation,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
            adaptation: newAdaptation,
            relativeResumingPosition: relativeResumingPosition,
            lockedRepresentations: lockedRepresentationsRef,
        };
        typeInfo.storedSettings = storedSettings;
        this.trigger("trackUpdate", {
            period: toExposedPeriod(period),
            trackType: "video",
            reason: "manual",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        var newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem.video.storedSettings === storedSettings) {
            (_b = newPeriodItem.video.dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
        }
    };
    /**
     * Disable the current text track for a given period.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {string} bufferType - The type of track to disable.
     * @throws Error - Throws if the period given has not been added
     */
    TracksStore.prototype.disableTrack = function (periodObj, bufferType) {
        var _a, _b;
        var trackInfo = periodObj[bufferType];
        if (trackInfo.storedSettings === null) {
            return;
        }
        if (bufferType !== "text") {
            // Potentially unneeded, but let's be clean
            (_a = periodObj[bufferType].storedSettings) === null || _a === void 0 ? void 0 : _a.lockedRepresentations.finish();
        }
        trackInfo.storedSettings = null;
        this.trigger("trackUpdate", {
            period: toExposedPeriod(periodObj.period),
            trackType: bufferType,
            reason: "manual",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        var newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodObj.period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === null) {
            (_b = newPeriodItem[bufferType].dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(null);
        }
    };
    /**
     * Returns an object describing the chosen audio track for the given audio
     * Period.
     *
     * Returns `null` is the the current audio track is disabled or not
     * set yet.a pas bcp de marge de manoeuvre j'ai l'impression
     *
     * Returns `undefined` if the given Period's id is not currently found in the
     * `TracksStore`. The cause being most probably that the corresponding
     * Period is not available anymore.
     * If you're in that case and if still have the corresponding JavaScript
     * reference to the wanted Period, you can call `getOldAudioTrack` with it. It
     * will try retrieving the choice it made from its cache.
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Object|null|undefined} - The audio track chosen for this Period.
     * `null` if audio tracks were disabled and `undefined` if the Period is not
     * known.
     */
    TracksStore.prototype.getChosenAudioTrack = function (periodObj) {
        return periodObj.audio.storedSettings === null
            ? null
            : (0, manifest_1.toAudioTrack)(periodObj.audio.storedSettings.adaptation, true);
    };
    /**
     * Returns an object describing the chosen text track for the given text
     * Period.
     *
     * Returns null is the the current text track is disabled or not
     * set yet.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Object|null} - The text track chosen for this Period
     */
    TracksStore.prototype.getChosenTextTrack = function (periodObj) {
        return periodObj.text.storedSettings === null
            ? null
            : (0, manifest_1.toTextTrack)(periodObj.text.storedSettings.adaptation);
    };
    /**
     * Returns an object describing the chosen video track for the given video
     * Period.
     *
     * Returns null is the the current video track is disabled or not
     * set yet.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Object|null} - The video track chosen for this Period
     */
    TracksStore.prototype.getChosenVideoTrack = function (periodObj) {
        if (periodObj.video.storedSettings === null) {
            return null;
        }
        return (0, manifest_1.toVideoTrack)(periodObj.video.storedSettings.adaptation, true);
    };
    /**
     * Returns all available audio tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailableAudioTracks = function (periodObj) {
        var storedSettings = periodObj.audio.storedSettings;
        var currentId = storedSettings !== null ? storedSettings.adaptation.id : null;
        var adaptations = (0, manifest_1.getSupportedAdaptations)(periodObj.period, "audio");
        return adaptations.map(function (adaptation) {
            var active = currentId === null ? false : currentId === adaptation.id;
            return (0, object_assign_1.default)((0, manifest_1.toAudioTrack)(adaptation, true), { active: active });
        });
    };
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailableTextTracks = function (periodObj) {
        var storedSettings = periodObj.text.storedSettings;
        var currentId = storedSettings !== null ? storedSettings.adaptation.id : null;
        var adaptations = (0, manifest_1.getSupportedAdaptations)(periodObj.period, "text");
        return adaptations.map(function (adaptation) {
            var active = currentId === null ? false : currentId === adaptation.id;
            return (0, object_assign_1.default)((0, manifest_1.toTextTrack)(adaptation), { active: active });
        });
    };
    /**
     * Returns all available video tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailableVideoTracks = function (periodObj) {
        var storedSettings = periodObj.video.storedSettings;
        var currentId = storedSettings === null ? undefined : storedSettings.adaptation.id;
        var adaptations = (0, manifest_1.getSupportedAdaptations)(periodObj.period, "video");
        return adaptations.map(function (adaptation) {
            var active = currentId === null ? false : currentId === adaptation.id;
            var track = (0, manifest_1.toVideoTrack)(adaptation, true);
            var trickModeTracks = track.trickModeTracks !== undefined
                ? track.trickModeTracks.map(function (trickModeAdaptation) {
                    var isActive = currentId === null ? false : currentId === trickModeAdaptation.id;
                    return (0, object_assign_1.default)(trickModeAdaptation, { active: isActive });
                })
                : [];
            var availableTrack = (0, object_assign_1.default)(track, { active: active });
            if (trickModeTracks !== undefined) {
                availableTrack.trickModeTracks = trickModeTracks;
            }
            return availableTrack;
        });
    };
    TracksStore.prototype.getLockedAudioRepresentations = function (periodObj) {
        var storedSettings = periodObj.audio.storedSettings;
        if (storedSettings === null) {
            return null;
        }
        var lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    };
    TracksStore.prototype.getLockedVideoRepresentations = function (periodObj) {
        var storedSettings = periodObj.video.storedSettings;
        if (storedSettings === null) {
            return null;
        }
        var lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    };
    TracksStore.prototype.lockAudioRepresentations = function (periodObj, lockSettings) {
        var _a;
        var storedSettings = periodObj.audio.storedSettings;
        if (storedSettings === null) {
            return;
        }
        var DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
        var filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        var switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode: switchingMode,
        });
    };
    TracksStore.prototype.lockVideoRepresentations = function (periodObj, lockSettings) {
        var _a;
        var storedSettings = periodObj.video.storedSettings;
        if (storedSettings === null) {
            return;
        }
        var DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
        var filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        var switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode: switchingMode,
        });
    };
    TracksStore.prototype.unlockAudioRepresentations = function (periodObj) {
        var storedSettings = periodObj.audio.storedSettings;
        if (storedSettings === null ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    };
    TracksStore.prototype.unlockVideoRepresentations = function (periodObj) {
        var storedSettings = periodObj.video.storedSettings;
        if (storedSettings === null ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    };
    TracksStore.prototype.dispose = function () {
        this._isDisposed = true;
        while (true) {
            var lastPeriod = this._storedPeriodInfo.pop();
            if (lastPeriod === undefined) {
                return;
            }
            lastPeriod.isRemoved = true;
        }
    };
    TracksStore.prototype._resetVideoTrackChoices = function (reason) {
        var _a;
        for (var i = 0; i < this._storedPeriodInfo.length; i++) {
            var periodObj = this._storedPeriodInfo[i];
            if (periodObj.video.storedSettings !== null) {
                var chosenBaseTrack = periodObj.video.storedSettings.adaptationBase;
                if (chosenBaseTrack !== null) {
                    var chosenTrack = getRightVideoTrack(chosenBaseTrack, this._isTrickModeTrackEnabled);
                    periodObj.video.storedSettings.adaptationBase = chosenBaseTrack;
                    periodObj.video.storedSettings.adaptation = chosenTrack;
                }
            }
        }
        // Clone the current Period list to not be influenced if Periods are removed
        // or added while the loop is running.
        var sliced = this._storedPeriodInfo.slice();
        for (var i = 0; i < sliced.length; i++) {
            var period = sliced[i].period;
            var videoItem = sliced[i].video;
            var storedSettings = videoItem.storedSettings;
            this.trigger("trackUpdate", {
                period: toExposedPeriod(period),
                trackType: "video",
                reason: reason,
            });
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            var newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
            if (newPeriodItem !== undefined &&
                newPeriodItem.video.storedSettings === storedSettings) {
                (_a = newPeriodItem.video.dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(storedSettings);
            }
        }
    };
    TracksStore.prototype._removePeriodObject = function (index) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            (0, assert_1.default)(index < this._storedPeriodInfo.length, "Invalid index for Period removal");
        }
        var oldPeriodItem = this._storedPeriodInfo[index];
        this._storedPeriodInfo[index].isRemoved = true;
        this._storedPeriodInfo.splice(index, 1);
        this._cachedPeriodInfo.set(oldPeriodItem.period, oldPeriodItem);
    };
    TracksStore.prototype._getRepresentationsToLock = function (adaptation, representationIds) {
        var filtered = representationIds.reduce(function (acc, repId) {
            var foundRep = (0, array_find_1.default)(adaptation.representations, function (r) {
                return r.id === repId;
            });
            if (foundRep === undefined) {
                log_1.default.warn("API: Wanted locked Representation not found.");
            }
            else {
                acc.push(foundRep.id);
            }
            return acc;
        }, []);
        if (filtered.length === 0) {
            throw new Error("Cannot lock Representations: " + "None of the given Representation id are found");
        }
        return filtered;
    };
    return TracksStore;
}(event_emitter_1.default));
exports.default = TracksStore;
/**
 * Returns the index of the given `period` in the given `periods`
 * Array.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {Object} period
 * @returns {number|undefined}
 */
function findPeriodIndex(periods, period) {
    for (var i = 0; i < periods.length; i++) {
        var periodI = periods[i];
        if (periodI.period.id === period.id) {
            return i;
        }
    }
}
/**
 * Returns element in the given `periods` Array that corresponds to the
 * `period` given.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {string} periodId
 * @returns {Object|undefined}
 */
function getPeriodItem(periods, periodId) {
    for (var i = 0; i < periods.length; i++) {
        var periodI = periods[i];
        if (periodI.period.id === periodId) {
            return periodI;
        }
    }
}
/**
 * A `ITSPeriodObject` should only be removed once all References linked to it
 * do not exist anymore, to keep the possibility of making track choices.
 * @param {Object} periodObj
 * @returns {boolean}
 */
function isPeriodItemRemovable(periodObj) {
    var _a, _b, _c;
    return (!periodObj.inManifest &&
        ((_a = periodObj.text) === null || _a === void 0 ? void 0 : _a.dispatcher) === null &&
        ((_b = periodObj.audio) === null || _b === void 0 ? void 0 : _b.dispatcher) === null &&
        ((_c = periodObj.video) === null || _c === void 0 ? void 0 : _c.dispatcher) === null);
}
function getRightVideoTrack(adaptation, isTrickModeEnabled) {
    var _a;
    if (isTrickModeEnabled && ((_a = adaptation.trickModeTracks) === null || _a === void 0 ? void 0 : _a[0]) !== undefined) {
        return adaptation.trickModeTracks[0];
    }
    return adaptation;
}
/**
 * Generate an `ITSPeriodObject` object for the given Period, selecting the
 * default track for each type.
 * @param {Object} period
 * @param {boolean} inManifest
 * @param {boolean} isTrickModeTrackEnabled
 * @returns {object}
 */
function generatePeriodInfo(period, inManifest, isTrickModeTrackEnabled, defaultAudioTrackSwitchingMode) {
    var _a, _b;
    var audioAdaptation = (0, manifest_1.getSupportedAdaptations)(period, "audio")[0];
    var baseVideoAdaptation = (0, manifest_1.getSupportedAdaptations)(period, "video")[0];
    var videoAdaptation = getRightVideoTrack(baseVideoAdaptation, isTrickModeTrackEnabled);
    var DEFAULT_VIDEO_TRACK_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
    var audioSettings = audioAdaptation !== undefined
        ? {
            adaptation: audioAdaptation,
            switchingMode: defaultAudioTrackSwitchingMode,
            lockedRepresentations: new reference_1.default(null),
        }
        : null;
    var videoSettings = videoAdaptation !== undefined
        ? {
            adaptation: videoAdaptation,
            adaptationBase: baseVideoAdaptation,
            switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
            lockedRepresentations: new reference_1.default(null),
        }
        : null;
    var textAdaptation = null;
    var forcedSubtitles = ((_a = period.adaptations.text) !== null && _a !== void 0 ? _a : []).filter(function (ad) { return ad.isForcedSubtitles === true; });
    if (forcedSubtitles.length > 0) {
        if (audioAdaptation !== null && audioAdaptation !== undefined) {
            var sameLanguage = (0, array_find_1.default)(forcedSubtitles, function (f) { return f.normalizedLanguage === audioAdaptation.normalizedLanguage; });
            if (sameLanguage !== undefined) {
                textAdaptation = sameLanguage;
            }
        }
        if (textAdaptation === null) {
            textAdaptation =
                (_b = (0, array_find_1.default)(forcedSubtitles, function (f) { return f.normalizedLanguage === undefined; })) !== null && _b !== void 0 ? _b : null;
        }
    }
    var textSettings = null;
    if (textAdaptation !== null) {
        textSettings = {
            adaptation: textAdaptation,
            switchingMode: "direct",
            lockedRepresentations: new reference_1.default(null),
        };
    }
    return {
        period: period,
        inManifest: inManifest,
        isPeriodAdvertised: false,
        isRemoved: false,
        audio: { storedSettings: audioSettings, dispatcher: null },
        video: { storedSettings: videoSettings, dispatcher: null },
        text: { storedSettings: textSettings, dispatcher: null },
    };
}
function toExposedPeriod(p) {
    return { start: p.start, end: p.end, id: p.id };
}
