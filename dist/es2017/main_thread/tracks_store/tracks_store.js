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
/**
 * This file is used to abstract the notion of text, audio and video tracks
 * switching for an easier API management.
 */
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import { getSupportedAdaptations, toAudioTrack, toTextTrack, toVideoTrack, } from "../../manifest";
import arrayFind from "../../utils/array_find";
import assert from "../../utils/assert";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import SharedReference from "../../utils/reference";
import TrackDispatcher from "./track_dispatcher";
/**
 * Class helping with the management of the audio, video and text tracks and
 * qualities.
 *
 * The `TracksStore` allows to choose a track and qualities for different types
 * of media through a simpler API.
 *
 * @class TracksStore
 */
export default class TracksStore extends EventEmitter {
    constructor(args) {
        var _a;
        super();
        this._storedPeriodInfo = [];
        this._isDisposed = false;
        this._cachedPeriodInfo = new WeakMap();
        this._isTrickModeTrackEnabled = args.preferTrickModeTracks;
        this._defaultAudioTrackSwitchingMode =
            (_a = args.defaultAudioTrackSwitchingMode) !== null && _a !== void 0 ? _a : config.getCurrent().DEFAULT_AUDIO_TRACK_SWITCHING_MODE;
    }
    /**
     * Return Array of Period information, to allow an outside application to
     * modify the track of any Period.
     * @returns {Array.<Object>}
     */
    getAvailablePeriods() {
        return this._storedPeriodInfo.reduce((acc, p) => {
            if (p.isPeriodAdvertised) {
                acc.push(toExposedPeriod(p.period));
            }
            return acc;
        }, []);
    }
    /**
     * Update the list of Periods handled by the TracksStore and make a
     * track choice decision for each of them.
     * @param {Object} manifest - The new Manifest object
     */
    onManifestUpdate(manifest) {
        var _a, _b, _c, _d, _e, _f;
        const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
        const { periods } = manifest;
        // We assume that they are always sorted chronologically
        // In dev mode, perform a runtime check that this is the case
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            for (let i = 1; i < periods.length; i++) {
                assert(periods[i - 1].start <= periods[i].start);
            }
        }
        /** Periods which have just been added. */
        const addedPeriods = [];
        let newPListIdx = 0;
        for (let i = 0; i < this._storedPeriodInfo.length; i++) {
            const oldPeriod = this._storedPeriodInfo[i].period;
            const newPeriod = periods[newPListIdx];
            if (newPeriod === undefined) {
                // We reached the end of the new Periods, remove remaining old Periods
                for (let j = this._storedPeriodInfo.length - 1; j >= i; j--) {
                    this._storedPeriodInfo[j].inManifest = false;
                    if (isPeriodItemRemovable(this._storedPeriodInfo[j])) {
                        this._removePeriodObject(j);
                    }
                }
            }
            else if (oldPeriod === newPeriod) {
                newPListIdx++;
                const curWantedTextTrack = this._storedPeriodInfo[i].text.storedSettings;
                if (curWantedTextTrack !== null) {
                    const textAdaptations = getSupportedAdaptations(newPeriod, "text");
                    const stillHere = textAdaptations.some((a) => a.id === curWantedTextTrack.adaptation.id);
                    if (!stillHere) {
                        log.warn("TS: Chosen text Adaptation not available anymore");
                        const periodInfo = this._storedPeriodInfo[i];
                        periodInfo.text.storedSettings = null;
                        this.trigger("trackUpdate", {
                            period: toExposedPeriod(newPeriod),
                            trackType: "text",
                            reason: "missing",
                        });
                        // The previous event trigger could have had side-effects, so we
                        // re-check if we're still mostly in the same state
                        if (this._isDisposed) {
                            return; // The current TracksStore is disposed, we can abort
                        }
                        const periodItem = getPeriodItem(this._storedPeriodInfo, periodInfo.period.id);
                        if (periodItem !== undefined && periodItem.text.storedSettings === null) {
                            (_a = periodItem.text.dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(null);
                        }
                    }
                }
                const curWantedVideoTrack = this._storedPeriodInfo[i].video.storedSettings;
                if (curWantedVideoTrack !== null) {
                    const videoAdaptations = getSupportedAdaptations(newPeriod, "video");
                    const stillHere = videoAdaptations.some((a) => a.id === curWantedVideoTrack.adaptation.id);
                    if (!stillHere) {
                        log.warn("TS: Chosen video Adaptation not available anymore");
                        const periodItem = this._storedPeriodInfo[i];
                        let storedSettings;
                        if (videoAdaptations.length === 0) {
                            storedSettings = null;
                        }
                        else {
                            const adaptationBase = videoAdaptations[0];
                            const adaptation = getRightVideoTrack(adaptationBase, this._isTrickModeTrackEnabled);
                            const lockedRepresentations = new SharedReference(null);
                            storedSettings = {
                                adaptationBase,
                                adaptation,
                                switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                                lockedRepresentations,
                            };
                        }
                        periodItem.video.storedSettings = storedSettings;
                        this.trigger("trackUpdate", {
                            period: toExposedPeriod(newPeriod),
                            trackType: "video",
                            reason: "missing",
                        });
                        // The previous event trigger could have had side-effects, so we
                        // re-check if we're still mostly in the same state
                        if (this._isDisposed) {
                            return; // Someone disposed the `TracksStore` on the previous side-effect
                        }
                        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodItem.period.id);
                        if (newPeriodItem !== undefined &&
                            newPeriodItem.video.storedSettings === storedSettings) {
                            (_b = newPeriodItem.video.dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
                        }
                    }
                }
                const curWantedAudioTrack = this._storedPeriodInfo[i].audio.storedSettings;
                if (curWantedAudioTrack !== null) {
                    const audioAdaptations = getSupportedAdaptations(newPeriod, "audio");
                    const stillHere = audioAdaptations.some((a) => a.id === curWantedAudioTrack.adaptation.id);
                    if (!stillHere) {
                        log.warn("TS: Chosen audio Adaptation not available anymore");
                        const periodItem = this._storedPeriodInfo[i];
                        const storedSettings = audioAdaptations.length === 0
                            ? null
                            : {
                                adaptation: audioAdaptations[0],
                                switchingMode: this._defaultAudioTrackSwitchingMode,
                                lockedRepresentations: new SharedReference(null),
                            };
                        periodItem.audio.storedSettings = storedSettings;
                        this.trigger("trackUpdate", {
                            period: toExposedPeriod(newPeriod),
                            trackType: "audio",
                            reason: "missing",
                        });
                        // The previous event trigger could have had side-effects, so we
                        // re-check if we're still mostly in the same state
                        if (this._isDisposed) {
                            return; // Someone disposed the `TracksStore` on the previous side-effect
                        }
                        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodItem.period.id);
                        if (newPeriodItem !== undefined &&
                            newPeriodItem.audio.storedSettings === storedSettings) {
                            (_c = newPeriodItem.audio.dispatcher) === null || _c === void 0 ? void 0 : _c.updateTrack(storedSettings);
                        }
                    }
                }
                // (If not, what do?)
            }
            else if (oldPeriod.start <= newPeriod.start) {
                // This old Period does not exist anymore.
                this._storedPeriodInfo[i].inManifest = false;
                if (isPeriodItemRemovable(this._storedPeriodInfo[i])) {
                    this._removePeriodObject(i);
                    i--;
                }
            }
            else {
                const newPeriodInfo = generatePeriodInfo(newPeriod, true, this._isTrickModeTrackEnabled, this._defaultAudioTrackSwitchingMode);
                // oldPeriod.start > newPeriod.start: insert newPeriod before
                this._storedPeriodInfo.splice(i, 0, newPeriodInfo);
                addedPeriods.push(newPeriodInfo);
                newPListIdx++;
                // Note: we don't increment `i` on purpose here, as we want to check the
                // same oldPeriod at the next loop iteration
            }
        }
        if (newPListIdx < periods.length) {
            // Add further new Period
            const periodsToAdd = periods
                .slice(newPListIdx)
                .map((p) => generatePeriodInfo(p, true, this._isTrickModeTrackEnabled, this._defaultAudioTrackSwitchingMode));
            this._storedPeriodInfo.push(...periodsToAdd);
            addedPeriods.push(...periodsToAdd);
        }
        for (const storedPeriodInfo of this._storedPeriodInfo) {
            (_d = storedPeriodInfo.audio.dispatcher) === null || _d === void 0 ? void 0 : _d.refresh();
            (_e = storedPeriodInfo.video.dispatcher) === null || _e === void 0 ? void 0 : _e.refresh();
            (_f = storedPeriodInfo.text.dispatcher) === null || _f === void 0 ? void 0 : _f.refresh();
        }
    }
    onDecipherabilityUpdates() {
        var _a, _b, _c;
        for (const storedPeriodInfo of this._storedPeriodInfo) {
            (_a = storedPeriodInfo.audio.dispatcher) === null || _a === void 0 ? void 0 : _a.refresh();
            (_b = storedPeriodInfo.video.dispatcher) === null || _b === void 0 ? void 0 : _b.refresh();
            (_c = storedPeriodInfo.text.dispatcher) === null || _c === void 0 ? void 0 : _c.refresh();
        }
    }
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
    addTrackReference(bufferType, period, adaptationRef) {
        let periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined) {
            // The Period has not yet been added.
            periodObj = generatePeriodInfo(period, false, this._isTrickModeTrackEnabled, this._defaultAudioTrackSwitchingMode);
            let found = false;
            for (let i = 0; i < this._storedPeriodInfo.length; i++) {
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
            log.error(`TS: Subject already added for ${bufferType} ` + `and Period ${period.start}`);
            return;
        }
        const trackSetting = periodObj[bufferType].storedSettings;
        const dispatcher = new TrackDispatcher(adaptationRef);
        periodObj[bufferType].dispatcher = dispatcher;
        dispatcher.addEventListener("noPlayableRepresentation", () => {
            var _a, _b, _c, _d;
            const nextAdaptation = arrayFind((_a = period.adaptations[bufferType]) !== null && _a !== void 0 ? _a : [], (a) => {
                if (a.isSupported === false) {
                    return false;
                }
                const playableRepresentations = a.representations.filter((r) => r.isSupported === true && r.decipherable !== false);
                return playableRepresentations.length > 0;
            });
            if (nextAdaptation === undefined) {
                const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION", `No ${bufferType} Representation can be played`, { tracks: undefined });
                this.trigger("error", noRepErr);
                this.dispose();
                return;
            }
            let typeInfo = (_b = getPeriodItem(this._storedPeriodInfo, period.id)) === null || _b === void 0 ? void 0 : _b[bufferType];
            if (isNullOrUndefined(typeInfo)) {
                return;
            }
            const switchingMode = bufferType === "audio" ? this._defaultAudioTrackSwitchingMode : "reload";
            const storedSettings = {
                adaptation: nextAdaptation,
                switchingMode,
                lockedRepresentations: new SharedReference(null),
            };
            typeInfo.storedSettings = storedSettings;
            this.trigger("trackUpdate", {
                period: toExposedPeriod(period),
                trackType: bufferType,
                reason: "no-playable-representation",
            });
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            typeInfo = (_c = getPeriodItem(this._storedPeriodInfo, period.id)) === null || _c === void 0 ? void 0 : _c[bufferType];
            if (isNullOrUndefined(typeInfo) || typeInfo.storedSettings !== storedSettings) {
                return;
            }
            (_d = typeInfo.dispatcher) === null || _d === void 0 ? void 0 : _d.updateTrack(storedSettings);
        });
        dispatcher.addEventListener("noPlayableLockedRepresentation", () => {
            // TODO check that it doesn't already lead to segment loading or MediaSource
            // reloading
            trackSetting === null || trackSetting === void 0 ? void 0 : trackSetting.lockedRepresentations.setValue(null);
            this.trigger("brokenRepresentationsLock", {
                period: { id: period.id, start: period.start, end: period.end },
                trackType: bufferType,
            });
        });
        dispatcher.start(trackSetting);
    }
    /**
     * Remove shared reference to choose an "audio", "video" or "text" Adaptation
     * for a Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     */
    removeTrackReference(bufferType, period) {
        const periodIndex = findPeriodIndex(this._storedPeriodInfo, period);
        if (periodIndex === undefined) {
            log.warn(`TS: ${bufferType} not found for period`, period.start);
            return;
        }
        const periodObj = this._storedPeriodInfo[periodIndex];
        const choiceItem = periodObj[bufferType];
        if ((choiceItem === null || choiceItem === void 0 ? void 0 : choiceItem.dispatcher) === null) {
            log.warn(`TS: TrackDispatcher already removed for ${bufferType} ` +
                `and Period ${period.start}`);
            return;
        }
        choiceItem.dispatcher.dispose();
        choiceItem.dispatcher = null;
        if (isPeriodItemRemovable(periodObj)) {
            this._removePeriodObject(periodIndex);
        }
    }
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
    getPeriodObjectFromPeriod(period) {
        const periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined && period !== undefined) {
            return this._cachedPeriodInfo.get(period);
        }
        return periodObj;
    }
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
    getPeriodObjectFromId(periodId) {
        return getPeriodItem(this._storedPeriodInfo, periodId);
    }
    disableVideoTrickModeTracks() {
        if (!this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = false;
        this._resetVideoTrackChoices("trickmode-disabled");
    }
    enableVideoTrickModeTracks() {
        if (this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = true;
        this._resetVideoTrackChoices("trickmode-enabled");
    }
    /**
     * Reset the TracksStore's Period objects:
     *   - All Period which are not in the manifest currently will be removed.
     *   - All References used to communicate the wanted track will be removed.
     *
     * You might want to call this API when restarting playback.
     */
    resetPeriodObjects() {
        var _a, _b, _c;
        for (let i = this._storedPeriodInfo.length - 1; i >= 0; i--) {
            const storedObj = this._storedPeriodInfo[i];
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
    }
    /**
     * @returns {boolean}
     */
    isTrickModeEnabled() {
        return this._isTrickModeTrackEnabled;
    }
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
    setAudioTrack(payload) {
        const { periodRef, trackId, switchingMode, lockedRepresentations, relativeResumingPosition, } = payload;
        return this._setAudioOrTextTrack({
            bufferType: "audio",
            periodRef,
            trackId,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : this._defaultAudioTrackSwitchingMode,
            lockedRepresentations,
            relativeResumingPosition,
        });
    }
    /**
     * Set text track based on the ID of its Adaptation for a given added Period.
     * @param {Object} periodObj - The concerned Period's object.
     * @param {string} wantedId - adaptation id of the wanted track.
     */
    setTextTrack(periodObj, wantedId) {
        return this._setAudioOrTextTrack({
            bufferType: "text",
            periodRef: periodObj,
            trackId: wantedId,
            switchingMode: "direct",
            lockedRepresentations: null,
            relativeResumingPosition: undefined,
        });
    }
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
    _setAudioOrTextTrack({ bufferType, periodRef, trackId, switchingMode, lockedRepresentations, relativeResumingPosition, }) {
        var _a, _b;
        const period = periodRef.period;
        const wantedAdaptation = arrayFind((_a = period.adaptations[bufferType]) !== null && _a !== void 0 ? _a : [], ({ id, isSupported }) => isSupported === true && id === trackId);
        if (wantedAdaptation === undefined) {
            throw new Error(`Wanted ${bufferType} track not found.`);
        }
        const typeInfo = periodRef[bufferType];
        let lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new SharedReference(null);
        }
        else {
            const representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            const repSwitchingMode = bufferType === "audio"
                ? this._defaultAudioTrackSwitchingMode
                : "direct";
            lockedRepresentationsRef = new SharedReference({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        const storedSettings = {
            adaptation: wantedAdaptation,
            switchingMode,
            lockedRepresentations: lockedRepresentationsRef,
            relativeResumingPosition,
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
        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === storedSettings) {
            (_b = newPeriodItem[bufferType].dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
        }
    }
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
    setVideoTrack(payload) {
        var _a, _b;
        const { periodRef, trackId, switchingMode, lockedRepresentations, relativeResumingPosition, } = payload;
        const period = periodRef.period;
        const wantedAdaptation = arrayFind((_a = period.adaptations.video) !== null && _a !== void 0 ? _a : [], ({ id, isSupported }) => isSupported === true && id === trackId);
        if (wantedAdaptation === undefined) {
            throw new Error("Wanted video track not found.");
        }
        const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
        const typeInfo = periodRef.video;
        const newAdaptation = getRightVideoTrack(wantedAdaptation, this._isTrickModeTrackEnabled);
        let lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new SharedReference(null);
        }
        else {
            const representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            const repSwitchingMode = DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
            lockedRepresentationsRef = new SharedReference({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        const storedSettings = {
            adaptationBase: wantedAdaptation,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
            adaptation: newAdaptation,
            relativeResumingPosition,
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
        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem.video.storedSettings === storedSettings) {
            (_b = newPeriodItem.video.dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
        }
    }
    /**
     * Disable the current text track for a given period.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {string} bufferType - The type of track to disable.
     * @throws Error - Throws if the period given has not been added
     */
    disableTrack(periodObj, bufferType) {
        var _a, _b;
        const trackInfo = periodObj[bufferType];
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
        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodObj.period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === null) {
            (_b = newPeriodItem[bufferType].dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(null);
        }
    }
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
    getChosenAudioTrack(periodObj) {
        return periodObj.audio.storedSettings === null
            ? null
            : toAudioTrack(periodObj.audio.storedSettings.adaptation, true);
    }
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
    getChosenTextTrack(periodObj) {
        return periodObj.text.storedSettings === null
            ? null
            : toTextTrack(periodObj.text.storedSettings.adaptation);
    }
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
    getChosenVideoTrack(periodObj) {
        if (periodObj.video.storedSettings === null) {
            return null;
        }
        return toVideoTrack(periodObj.video.storedSettings.adaptation, true);
    }
    /**
     * Returns all available audio tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(periodObj) {
        const storedSettings = periodObj.audio.storedSettings;
        const currentId = storedSettings !== null ? storedSettings.adaptation.id : null;
        const adaptations = getSupportedAdaptations(periodObj.period, "audio");
        return adaptations.map((adaptation) => {
            const active = currentId === null ? false : currentId === adaptation.id;
            return objectAssign(toAudioTrack(adaptation, true), { active });
        });
    }
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(periodObj) {
        const storedSettings = periodObj.text.storedSettings;
        const currentId = storedSettings !== null ? storedSettings.adaptation.id : null;
        const adaptations = getSupportedAdaptations(periodObj.period, "text");
        return adaptations.map((adaptation) => {
            const active = currentId === null ? false : currentId === adaptation.id;
            return objectAssign(toTextTrack(adaptation), { active });
        });
    }
    /**
     * Returns all available video tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(periodObj) {
        const storedSettings = periodObj.video.storedSettings;
        const currentId = storedSettings === null ? undefined : storedSettings.adaptation.id;
        const adaptations = getSupportedAdaptations(periodObj.period, "video");
        return adaptations.map((adaptation) => {
            const active = currentId === null ? false : currentId === adaptation.id;
            const track = toVideoTrack(adaptation, true);
            const trickModeTracks = track.trickModeTracks !== undefined
                ? track.trickModeTracks.map((trickModeAdaptation) => {
                    const isActive = currentId === null ? false : currentId === trickModeAdaptation.id;
                    return objectAssign(trickModeAdaptation, { active: isActive });
                })
                : [];
            const availableTrack = objectAssign(track, { active });
            if (trickModeTracks !== undefined) {
                availableTrack.trickModeTracks = trickModeTracks;
            }
            return availableTrack;
        });
    }
    getLockedAudioRepresentations(periodObj) {
        const { storedSettings } = periodObj.audio;
        if (storedSettings === null) {
            return null;
        }
        const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    }
    getLockedVideoRepresentations(periodObj) {
        const { storedSettings } = periodObj.video;
        if (storedSettings === null) {
            return null;
        }
        const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    }
    lockAudioRepresentations(periodObj, lockSettings) {
        var _a;
        const { storedSettings } = periodObj.audio;
        if (storedSettings === null) {
            return;
        }
        const { DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
        const filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        const switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode,
        });
    }
    lockVideoRepresentations(periodObj, lockSettings) {
        var _a;
        const { storedSettings } = periodObj.video;
        if (storedSettings === null) {
            return;
        }
        const { DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
        const filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        const switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode,
        });
    }
    unlockAudioRepresentations(periodObj) {
        const { storedSettings } = periodObj.audio;
        if (storedSettings === null ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    }
    unlockVideoRepresentations(periodObj) {
        const { storedSettings } = periodObj.video;
        if (storedSettings === null ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    }
    dispose() {
        this._isDisposed = true;
        while (true) {
            const lastPeriod = this._storedPeriodInfo.pop();
            if (lastPeriod === undefined) {
                return;
            }
            lastPeriod.isRemoved = true;
        }
    }
    _resetVideoTrackChoices(reason) {
        var _a;
        for (let i = 0; i < this._storedPeriodInfo.length; i++) {
            const periodObj = this._storedPeriodInfo[i];
            if (periodObj.video.storedSettings !== null) {
                const chosenBaseTrack = periodObj.video.storedSettings.adaptationBase;
                if (chosenBaseTrack !== null) {
                    const chosenTrack = getRightVideoTrack(chosenBaseTrack, this._isTrickModeTrackEnabled);
                    periodObj.video.storedSettings.adaptationBase = chosenBaseTrack;
                    periodObj.video.storedSettings.adaptation = chosenTrack;
                }
            }
        }
        // Clone the current Period list to not be influenced if Periods are removed
        // or added while the loop is running.
        const sliced = this._storedPeriodInfo.slice();
        for (let i = 0; i < sliced.length; i++) {
            const period = sliced[i].period;
            const videoItem = sliced[i].video;
            const storedSettings = videoItem.storedSettings;
            this.trigger("trackUpdate", {
                period: toExposedPeriod(period),
                trackType: "video",
                reason,
            });
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
            if (newPeriodItem !== undefined &&
                newPeriodItem.video.storedSettings === storedSettings) {
                (_a = newPeriodItem.video.dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(storedSettings);
            }
        }
    }
    _removePeriodObject(index) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            assert(index < this._storedPeriodInfo.length, "Invalid index for Period removal");
        }
        const oldPeriodItem = this._storedPeriodInfo[index];
        this._storedPeriodInfo[index].isRemoved = true;
        this._storedPeriodInfo.splice(index, 1);
        this._cachedPeriodInfo.set(oldPeriodItem.period, oldPeriodItem);
    }
    _getRepresentationsToLock(adaptation, representationIds) {
        const filtered = representationIds.reduce((acc, repId) => {
            const foundRep = arrayFind(adaptation.representations, (r) => {
                return r.id === repId;
            });
            if (foundRep === undefined) {
                log.warn("API: Wanted locked Representation not found.");
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
    }
}
/**
 * Returns the index of the given `period` in the given `periods`
 * Array.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {Object} period
 * @returns {number|undefined}
 */
function findPeriodIndex(periods, period) {
    for (let i = 0; i < periods.length; i++) {
        const periodI = periods[i];
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
    for (let i = 0; i < periods.length; i++) {
        const periodI = periods[i];
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
    const audioAdaptation = getSupportedAdaptations(period, "audio")[0];
    const baseVideoAdaptation = getSupportedAdaptations(period, "video")[0];
    const videoAdaptation = getRightVideoTrack(baseVideoAdaptation, isTrickModeTrackEnabled);
    const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
    const audioSettings = audioAdaptation !== undefined
        ? {
            adaptation: audioAdaptation,
            switchingMode: defaultAudioTrackSwitchingMode,
            lockedRepresentations: new SharedReference(null),
        }
        : null;
    const videoSettings = videoAdaptation !== undefined
        ? {
            adaptation: videoAdaptation,
            adaptationBase: baseVideoAdaptation,
            switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
            lockedRepresentations: new SharedReference(null),
        }
        : null;
    let textAdaptation = null;
    const forcedSubtitles = ((_a = period.adaptations.text) !== null && _a !== void 0 ? _a : []).filter((ad) => ad.isForcedSubtitles === true);
    if (forcedSubtitles.length > 0) {
        if (audioAdaptation !== null && audioAdaptation !== undefined) {
            const sameLanguage = arrayFind(forcedSubtitles, (f) => f.normalizedLanguage === audioAdaptation.normalizedLanguage);
            if (sameLanguage !== undefined) {
                textAdaptation = sameLanguage;
            }
        }
        if (textAdaptation === null) {
            textAdaptation =
                (_b = arrayFind(forcedSubtitles, (f) => f.normalizedLanguage === undefined)) !== null && _b !== void 0 ? _b : null;
        }
    }
    let textSettings = null;
    if (textAdaptation !== null) {
        textSettings = {
            adaptation: textAdaptation,
            switchingMode: "direct",
            lockedRepresentations: new SharedReference(null),
        };
    }
    return {
        period,
        inManifest,
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
