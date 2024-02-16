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
import { MediaError } from "../../../errors";
import EventEmitter from "../../../utils/event_emitter";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import SortedList from "../../../utils/sorted_list";
import TaskCanceller from "../../../utils/task_canceller";
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
export default class ContentTimeBoundariesObserver extends EventEmitter {
    /**
     * @param {Object} manifest
     * @param {Object} playbackObserver
     */
    constructor(manifest, playbackObserver, bufferTypes) {
        super();
        this._canceller = new TaskCanceller();
        this._manifest = manifest;
        this._activeStreams = new Map();
        this._allBufferTypes = bufferTypes;
        this._lastCurrentPeriodId = null;
        /**
         * Allows to calculate the minimum and maximum playable position on the
         * whole content.
         */
        const maximumPositionCalculator = new MaximumPositionCalculator(manifest);
        this._maximumPositionCalculator = maximumPositionCalculator;
        const cancelSignal = this._canceller.signal;
        playbackObserver.listen(({ position }) => {
            const wantedPosition = position.getWanted();
            if (wantedPosition < manifest.getMinimumSafePosition()) {
                const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", "The current position is behind the " +
                    "earliest time announced in the Manifest.");
                this.trigger("warning", warning);
            }
            else if (wantedPosition > maximumPositionCalculator.getMaximumAvailablePosition()) {
                const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST", "The current position is after the latest " +
                    "time announced in the Manifest.");
                this.trigger("warning", warning);
            }
        }, { includeLastObservation: true, clearSignal: cancelSignal });
        manifest.addEventListener("manifestUpdate", () => {
            this.trigger("endingPositionChange", this._getManifestEndTime());
            if (cancelSignal.isCancelled()) {
                return;
            }
            this._checkEndOfStream();
        }, cancelSignal);
    }
    /**
     * Returns an estimate of the current last position which may be played in
     * the content at the moment.
     * @returns {Object}
     */
    getCurrentEndingTime() {
        return this._getManifestEndTime();
    }
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
    onAdaptationChange(bufferType, period, adaptation) {
        if (this._manifest.isLastPeriodKnown) {
            const lastPeriod = this._manifest.periods[this._manifest.periods.length - 1];
            if (period.id === (lastPeriod === null || lastPeriod === void 0 ? void 0 : lastPeriod.id)) {
                if (bufferType === "audio" || bufferType === "video") {
                    if (bufferType === "audio") {
                        this._maximumPositionCalculator.updateLastAudioAdaptation(adaptation);
                    }
                    else {
                        this._maximumPositionCalculator.updateLastVideoAdaptation(adaptation);
                    }
                    const endingPosition = this._maximumPositionCalculator.getEndingPosition();
                    const newEndingPosition = endingPosition !== undefined
                        ? { isEnd: true, endingPosition }
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
    }
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
    onRepresentationChange(bufferType, period) {
        this._addActivelyLoadedPeriod(period, bufferType);
    }
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
    onPeriodCleared(bufferType, period) {
        this._removeActivelyLoadedPeriod(period, bufferType);
    }
    /**
     * Method to call when the last chronological segment for a given buffer type
     * is known to have been loaded and is either pushed or in the process of
     * being pushed to the corresponding MSE `SourceBuffer` or equivalent.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    onLastSegmentFinishedLoading(bufferType) {
        const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
        if (!streamInfo.hasFinishedLoadingLastPeriod) {
            streamInfo.hasFinishedLoadingLastPeriod = true;
            this._checkEndOfStream();
        }
    }
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
    onLastSegmentLoadingResume(bufferType) {
        const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
        if (streamInfo.hasFinishedLoadingLastPeriod) {
            streamInfo.hasFinishedLoadingLastPeriod = false;
            this._checkEndOfStream();
        }
    }
    /**
     * Free all resources used by the `ContentTimeBoundariesObserver` and cancels
     * all recurring processes it performs.
     */
    dispose() {
        this.removeEventListener();
        this._canceller.cancel();
    }
    _addActivelyLoadedPeriod(period, bufferType) {
        const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
        if (!streamInfo.activePeriods.has(period)) {
            streamInfo.activePeriods.add(period);
            this._checkCurrentPeriod();
        }
    }
    _removeActivelyLoadedPeriod(period, bufferType) {
        const streamInfo = this._activeStreams.get(bufferType);
        if (streamInfo === undefined) {
            return;
        }
        if (streamInfo.activePeriods.has(period)) {
            streamInfo.activePeriods.removeElement(period);
            this._checkCurrentPeriod();
        }
    }
    _checkCurrentPeriod() {
        if (this._allBufferTypes.length === 0) {
            return;
        }
        const streamInfo = this._activeStreams.get(this._allBufferTypes[0]);
        if (streamInfo === undefined) {
            return;
        }
        for (const period of streamInfo.activePeriods.toArray()) {
            let wasFoundInAllTypes = true;
            for (let i = 1; i < this._allBufferTypes.length; i++) {
                const streamInfo2 = this._activeStreams.get(this._allBufferTypes[i]);
                if (streamInfo2 === undefined) {
                    return;
                }
                const activePeriods = streamInfo2.activePeriods.toArray();
                const hasPeriod = activePeriods.some((p) => p.id === period.id);
                if (!hasPeriod) {
                    wasFoundInAllTypes = false;
                    break;
                }
            }
            if (wasFoundInAllTypes) {
                if (this._lastCurrentPeriodId !== period.id) {
                    this._lastCurrentPeriodId = period.id;
                    this.trigger("periodChange", period);
                }
                return;
            }
        }
    }
    _getManifestEndTime() {
        const endingPosition = this._maximumPositionCalculator.getEndingPosition();
        return endingPosition !== undefined
            ? { isEnd: true, endingPosition }
            : {
                isEnd: false,
                endingPosition: this._maximumPositionCalculator.getMaximumAvailablePosition(),
            };
    }
    _lazilyCreateActiveStreamInfo(bufferType) {
        let streamInfo = this._activeStreams.get(bufferType);
        if (streamInfo === undefined) {
            streamInfo = {
                activePeriods: new SortedList((a, b) => a.start - b.start),
                hasFinishedLoadingLastPeriod: false,
            };
            this._activeStreams.set(bufferType, streamInfo);
        }
        return streamInfo;
    }
    _checkEndOfStream() {
        if (!this._manifest.isLastPeriodKnown) {
            return;
        }
        const everyBufferTypeLoaded = this._allBufferTypes.every((bt) => {
            const streamInfo = this._activeStreams.get(bt);
            return streamInfo !== undefined && streamInfo.hasFinishedLoadingLastPeriod;
        });
        if (everyBufferTypeLoaded) {
            this.trigger("endOfStream", null);
        }
        else {
            this.trigger("resumeStream", null);
        }
    }
}
/**
 * Calculate the last position from the last chosen audio and video Adaptations
 * for the last Period (or a default one, if no Adaptations has been chosen).
 * @class MaximumPositionCalculator
 */
class MaximumPositionCalculator {
    /**
     * @param {Object} manifest
     */
    constructor(manifest) {
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
    updateLastAudioAdaptation(adaptation) {
        this._lastAudioAdaptation = adaptation;
    }
    /**
     * Update the last known video Adaptation for the last Period.
     * If no Adaptation has been set, it should be set to `null`.
     *
     * Allows to calculate the maximum position more precizely in
     * `getMaximumAvailablePosition` and `getEndingPosition`.
     * @param {Object|null} adaptation
     */
    updateLastVideoAdaptation(adaptation) {
        this._lastVideoAdaptation = adaptation;
    }
    /**
     * Returns an estimate of the maximum position currently reachable (i.e.
     * segments are available) under the current circumstances.
     * @returns {number}
     */
    getMaximumAvailablePosition() {
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
                const lastVideoPosition = getLastAvailablePositionFromAdaptation(this._lastVideoAdaptation);
                if (typeof lastVideoPosition !== "number") {
                    return this._manifest.getMaximumSafePosition();
                }
                return lastVideoPosition;
            }
        }
        else if (this._lastVideoAdaptation === null) {
            const lastAudioPosition = getLastAvailablePositionFromAdaptation(this._lastAudioAdaptation);
            if (typeof lastAudioPosition !== "number") {
                return this._manifest.getMaximumSafePosition();
            }
            return lastAudioPosition;
        }
        else {
            const lastAudioPosition = getLastAvailablePositionFromAdaptation(this._lastAudioAdaptation);
            const lastVideoPosition = getLastAvailablePositionFromAdaptation(this._lastVideoAdaptation);
            if (typeof lastAudioPosition !== "number" ||
                typeof lastVideoPosition !== "number") {
                return this._manifest.getMaximumSafePosition();
            }
            else {
                return Math.min(lastAudioPosition, lastVideoPosition);
            }
        }
    }
    /**
     * Returns an estimate of the actual ending position once
     * the full content is available.
     * Returns `undefined` if that could not be determined, for various reasons.
     * @returns {number|undefined}
     */
    getEndingPosition() {
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
            const lastAudioPosition = getEndingPositionFromAdaptation(this._lastAudioAdaptation);
            const lastVideoPosition = getEndingPositionFromAdaptation(this._lastVideoAdaptation);
            if (typeof lastAudioPosition !== "number" ||
                typeof lastVideoPosition !== "number") {
                return undefined;
            }
            else {
                return Math.min(lastAudioPosition, lastVideoPosition);
            }
        }
    }
}
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
    const { representations } = adaptation;
    let min = null;
    /**
     * Some Manifest parsers use the exact same `IRepresentationIndex` reference
     * for each Representation of a given Adaptation, because in the actual source
     * Manifest file, indexing data is often defined at Adaptation-level.
     * This variable allows to optimize the logic here when this is the case.
     */
    let lastIndex;
    for (let i = 0; i < representations.length; i++) {
        if (representations[i].index !== lastIndex) {
            lastIndex = representations[i].index;
            const lastPosition = representations[i].index.getLastAvailablePosition();
            if (lastPosition === undefined) {
                // we cannot tell
                return undefined;
            }
            if (lastPosition !== null) {
                min = isNullOrUndefined(min) ? lastPosition : Math.min(min, lastPosition);
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
    const { representations } = adaptation;
    let min = null;
    /**
     * Some Manifest parsers use the exact same `IRepresentationIndex` reference
     * for each Representation of a given Adaptation, because in the actual source
     * Manifest file, indexing data is often defined at Adaptation-level.
     * This variable allows to optimize the logic here when this is the case.
     */
    let lastIndex;
    for (let i = 0; i < representations.length; i++) {
        if (representations[i].index !== lastIndex) {
            lastIndex = representations[i].index;
            const lastPosition = representations[i].index.getEnd();
            if (lastPosition === undefined) {
                // we cannot tell
                return undefined;
            }
            if (lastPosition !== null) {
                min = isNullOrUndefined(min) ? lastPosition : Math.min(min, lastPosition);
            }
        }
    }
    return min;
}
