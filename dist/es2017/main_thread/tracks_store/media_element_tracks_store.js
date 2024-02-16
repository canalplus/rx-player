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
import enableAudioTrack from "../../compat/enable_audio_track";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import normalizeLanguage from "../../utils/languages";
/**
 * Check if track array is different from an other one
 * @param {Array.<Object>} oldTrackArray
 * @param {Array.<Object>} newTrackArray
 * @returns {boolean}
 */
function areTrackArraysDifferent(oldTrackArray, newTrackArray) {
    var _a;
    if (newTrackArray.length !== oldTrackArray.length) {
        return true;
    }
    for (let i = 0; i < newTrackArray.length; i++) {
        if (newTrackArray[i].nativeTrack !== ((_a = oldTrackArray[i]) === null || _a === void 0 ? void 0 : _a.nativeTrack)) {
            return true;
        }
    }
    return false;
}
/**
 * Create audio tracks from native audio tracks.
 * @param {AudioTrackList} audioTracks
 * @returns {Array.<Object>}
 */
function createAudioTracks(audioTracks) {
    var _a;
    const newAudioTracks = [];
    const languagesOccurences = {};
    for (let i = 0; i < audioTracks.length; i++) {
        const audioTrack = audioTracks[i];
        const language = audioTrack.language === "" ? "nolang" : audioTrack.language;
        const occurences = (_a = languagesOccurences[language]) !== null && _a !== void 0 ? _a : 1;
        const id = "gen_audio_" + language + "_" + occurences.toString();
        languagesOccurences[language] = occurences + 1;
        const track = {
            language: audioTrack.language,
            id,
            normalized: normalizeLanguage(audioTrack.language),
            audioDescription: audioTrack.kind === "descriptions" ||
                // Safari seem to prefer the non-standard singular
                // version, funnily enough
                audioTrack.kind === "description",
            representations: [],
        };
        newAudioTracks.push({ track, nativeTrack: audioTrack });
    }
    return newAudioTracks;
}
/**
 * Create text tracks from native text tracks.
 * @param {TextTrackList} textTracks
 * @returns {Array.<Object>}
 */
function createTextTracks(textTracks) {
    var _a;
    const newTextTracks = [];
    const languagesOccurences = {};
    for (let i = 0; i < textTracks.length; i++) {
        const textTrack = textTracks[i];
        const language = textTrack.language === "" ? "nolang" : textTrack.language;
        const occurences = (_a = languagesOccurences[language]) !== null && _a !== void 0 ? _a : 1;
        const id = "gen_text_" + language + "_" + occurences.toString();
        languagesOccurences[language] = occurences + 1;
        // Safari seems to be indicating that the subtitles track is a forced
        // subtitles track by setting the `kind` attribute to `"forced"`.
        // As of now (2023-04-04), this is not standard.
        // @see https://github.com/whatwg/html/issues/4472
        const forced = textTrack.kind === "forced" ? true : undefined;
        const track = {
            language: textTrack.language,
            forced,
            label: textTrack.label,
            id,
            normalized: normalizeLanguage(textTrack.language),
            closedCaption: textTrack.kind === "captions",
        };
        newTextTracks.push({ track, nativeTrack: textTrack });
    }
    return newTextTracks;
}
/**
 * Create video tracks from native video tracks.
 * @param {VideoTrackList} videoTracks
 * @returns {Array.<Object>}
 */
function createVideoTracks(videoTracks) {
    var _a;
    const newVideoTracks = [];
    const languagesOccurences = {};
    for (let i = 0; i < videoTracks.length; i++) {
        const videoTrack = videoTracks[i];
        const language = videoTrack.language === "" ? "nolang" : videoTrack.language;
        const occurences = (_a = languagesOccurences[language]) !== null && _a !== void 0 ? _a : 1;
        const id = "gen_video_" + language + "_" + occurences.toString();
        languagesOccurences[language] = occurences + 1;
        newVideoTracks.push({
            track: { id, representations: [] },
            nativeTrack: videoTrack,
        });
    }
    return newVideoTracks;
}
/**
 * Manage video, audio and text tracks for current direct file content.
 * @class MediaElementTracksStore
 */
export default class MediaElementTracksStore extends EventEmitter {
    constructor(mediaElement) {
        var _a, _b, _c;
        super();
        // TODO In practice, the audio/video/text tracks API are not always implemented on
        // the media element, although Typescript HTMLMediaElement types tend to mean
        // that can't be undefined.
        this._nativeAudioTracks = mediaElement.audioTracks;
        this._nativeVideoTracks = mediaElement.videoTracks;
        this._nativeTextTracks = mediaElement.textTracks;
        this._audioTracks =
            this._nativeAudioTracks !== undefined
                ? createAudioTracks(this._nativeAudioTracks)
                : [];
        this._videoTracks =
            this._nativeVideoTracks !== undefined
                ? createVideoTracks(this._nativeVideoTracks)
                : [];
        this._textTracks =
            this._nativeTextTracks !== undefined
                ? createTextTracks(this._nativeTextTracks)
                : [];
        this._lastEmittedNativeAudioTrack = (_a = this._getCurrentAudioTrack()) === null || _a === void 0 ? void 0 : _a.nativeTrack;
        this._lastEmittedNativeVideoTrack = (_b = this._getCurrentVideoTrack()) === null || _b === void 0 ? void 0 : _b.nativeTrack;
        this._lastEmittedNativeTextTrack = (_c = this._getCurrentTextTrack()) === null || _c === void 0 ? void 0 : _c.nativeTrack;
        this._handleNativeTracksCallbacks();
    }
    /**
     * Update the currently active audio track by setting the wanted audio track's
     * ID property.
     * Throws if the wanted audio track is not found.
     * @param {string|number|undefined} id
     */
    setAudioTrackById(id) {
        for (let i = 0; i < this._audioTracks.length; i++) {
            const { track, nativeTrack } = this._audioTracks[i];
            if (track.id === id) {
                this._enableAudioTrackFromIndex(i);
                this._audioTrackLockedOn = nativeTrack;
                return;
            }
        }
        throw new Error("Audio track not found.");
    }
    /**
     * Disable the currently-active text track, if one.
     */
    disableTextTrack() {
        disableTextTracks(this._textTracks);
        this._textTrackLockedOn = null;
    }
    /**
     * Update the currently active text track by setting the wanted text track's
     * ID property.
     * Throws if the wanted text track is not found.
     * @param {string|number|undefined} id
     */
    setTextTrackById(id) {
        let hasSetTrack = false;
        for (let i = 0; i < this._textTracks.length; i++) {
            const { track, nativeTrack } = this._textTracks[i];
            if (track.id === id) {
                nativeTrack.mode = "showing";
                hasSetTrack = true;
                this._textTrackLockedOn = nativeTrack;
            }
            else if (nativeTrack.mode === "showing" || nativeTrack.mode === "hidden") {
                nativeTrack.mode = "disabled";
            }
        }
        if (!hasSetTrack) {
            throw new Error("Text track not found.");
        }
    }
    /**
     * Disable the currently-active video track, if one.
     */
    disableVideoTrack() {
        disableVideoTracks(this._videoTracks);
        this._videoTrackLockedOn = null;
    }
    /**
     * Update the currently active video track by setting the wanted video track's
     * ID property.
     * Throws if the wanted video track is not found.
     * @param {string|number|undefined} id
     */
    setVideoTrackById(id) {
        for (let i = 0; i < this._videoTracks.length; i++) {
            const { track, nativeTrack } = this._videoTracks[i];
            if (track.id === id) {
                nativeTrack.selected = true;
                this._videoTrackLockedOn = nativeTrack;
                return;
            }
        }
        throw new Error("Video track not found.");
    }
    /**
     * Returns the currently active audio track.
     * Returns `null` if no audio track is active.
     * Returns `undefined` if we cannot know which audio track is active.
     * @returns {Object|null|undefined}
     */
    getChosenAudioTrack() {
        const currentAudioTrack = this._getCurrentAudioTrack();
        return isNullOrUndefined(currentAudioTrack)
            ? currentAudioTrack
            : currentAudioTrack.track;
    }
    /**
     * Returns the currently active text track.
     * Returns `null` if no text track is active.
     * Returns `undefined` if we cannot know which text track is active.
     * @returns {Object|null|undefined}
     */
    getChosenTextTrack() {
        const currentTextTrack = this._getCurrentTextTrack();
        return isNullOrUndefined(currentTextTrack)
            ? currentTextTrack
            : currentTextTrack.track;
    }
    /**
     * Returns the currently active video track.
     * Returns `null` if no video track is active.
     * Returns `undefined` if we cannot know which video track is active.
     * @returns {Object|null|undefined}
     */
    getChosenVideoTrack() {
        const currentVideoTrack = this._getCurrentVideoTrack();
        return isNullOrUndefined(currentVideoTrack)
            ? currentVideoTrack
            : currentVideoTrack.track;
    }
    /**
     * Returns a description of every available audio tracks.
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks() {
        return this._audioTracks.map(({ track, nativeTrack }) => {
            return {
                id: track.id,
                language: track.language,
                normalized: track.normalized,
                audioDescription: track.audioDescription,
                active: nativeTrack.enabled,
                representations: track.representations,
            };
        });
    }
    /**
     * Returns a description of every available text tracks.
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks() {
        return this._textTracks.map(({ track, nativeTrack }) => {
            return {
                id: track.id,
                label: track.label,
                forced: track.forced,
                language: track.language,
                normalized: track.normalized,
                closedCaption: track.closedCaption,
                active: nativeTrack.mode === "showing",
            };
        });
    }
    /**
     * Returns a description of every available video tracks.
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks() {
        return this._videoTracks.map(({ track, nativeTrack }) => {
            return {
                id: track.id,
                representations: track.representations,
                active: nativeTrack.selected,
            };
        });
    }
    /**
     * Free the resources used by the MediaElementTracksStore.
     */
    dispose() {
        if (this._nativeVideoTracks !== undefined) {
            this._nativeVideoTracks.onchange = null;
            this._nativeVideoTracks.onaddtrack = null;
            this._nativeVideoTracks.onremovetrack = null;
        }
        if (this._nativeAudioTracks !== undefined) {
            this._nativeAudioTracks.onchange = null;
            this._nativeAudioTracks.onaddtrack = null;
            this._nativeAudioTracks.onremovetrack = null;
        }
        if (this._nativeTextTracks !== undefined) {
            this._nativeTextTracks.onchange = null;
            this._nativeTextTracks.onaddtrack = null;
            this._nativeTextTracks.onremovetrack = null;
        }
        this.removeEventListener();
    }
    /**
     * Get information about the currently chosen audio track.
     * `undefined` if we cannot know it.
     * `null` if no audio track is chosen.
     * @returns {Object|undefined|null}
     */
    _getCurrentAudioTrack() {
        if (this._nativeAudioTracks === undefined) {
            return undefined;
        }
        for (let i = 0; i < this._audioTracks.length; i++) {
            const audioTrack = this._audioTracks[i];
            if (audioTrack.nativeTrack.enabled) {
                return audioTrack;
            }
        }
        return null;
    }
    /**
     * Get information about the currently chosen video track.
     * `undefined` if we cannot know it.
     * `null` if no video track is chosen.
     * @returns {Object|undefined|null}
     */
    _getCurrentVideoTrack() {
        if (this._nativeVideoTracks === undefined) {
            return undefined;
        }
        for (let i = 0; i < this._videoTracks.length; i++) {
            const videoTrack = this._videoTracks[i];
            if (videoTrack.nativeTrack.selected) {
                return videoTrack;
            }
        }
        return null;
    }
    /**
     * Get information about the currently chosen text track.
     * `undefined` if we cannot know it.
     * `null` if no text track is chosen.
     * @returns {Object|undefined|null}
     */
    _getCurrentTextTrack() {
        if (this._nativeTextTracks === undefined) {
            return undefined;
        }
        for (let i = 0; i < this._textTracks.length; i++) {
            const textTrack = this._textTracks[i];
            if (textTrack.nativeTrack.mode === "showing") {
                return textTrack;
            }
        }
        return null;
    }
    /**
     * Iterate over every available audio tracks on the media element and either:
     *   - if the last manually set audio track is found, set that one.
     *   - if we still do not find an optimal track, let the one chosen by default
     */
    _setPreviouslyLockedAudioTrack() {
        if (this._audioTrackLockedOn === undefined) {
            return;
        }
        else if (this._audioTrackLockedOn === null) {
            for (let i = 0; i < this._audioTracks.length; i++) {
                const { nativeTrack } = this._audioTracks[i];
                nativeTrack.enabled = false;
            }
        }
        else {
            for (let i = 0; i < this._audioTracks.length; i++) {
                const { nativeTrack } = this._audioTracks[i];
                if (nativeTrack === this._audioTrackLockedOn) {
                    this._enableAudioTrackFromIndex(i);
                    return;
                }
            }
        }
    }
    /**
     * Iterate over every available text tracks on the media element and either:
     *   - if the last manually set text track is found, set that one.
     *   - if we still do not find an optimal track, just disable it.
     */
    _setPreviouslyLockedTextTrack() {
        if (this._textTrackLockedOn === undefined) {
            return;
        }
        else if (this._textTrackLockedOn === null) {
            disableTextTracks(this._textTracks);
            return;
        }
        else {
            for (let i = 0; i < this._textTracks.length; i++) {
                const { nativeTrack } = this._textTracks[i];
                if (nativeTrack === this._textTrackLockedOn) {
                    // disable the rest
                    disableAllTextTracksBut(this._textTracks, nativeTrack);
                    if (nativeTrack.mode !== "showing") {
                        nativeTrack.mode = "showing";
                    }
                    return;
                }
            }
        }
    }
    /**
     * Iterate over every available video tracks on the media element and either:
     *   - if the last manually set video track is found, set that one.
     *   - if we still do not find an optimal track, let the one chosen by default
     */
    _setPreviouslyLockedVideoTrack() {
        if (this._videoTrackLockedOn === undefined) {
            return;
        }
        else if (this._videoTrackLockedOn === null) {
            disableVideoTracks(this._videoTracks);
            return;
        }
        else {
            for (let i = 0; i < this._videoTracks.length; i++) {
                const { nativeTrack } = this._videoTracks[i];
                if (nativeTrack === this._videoTrackLockedOn) {
                    nativeTrack.selected = true;
                    return;
                }
            }
        }
    }
    /**
     * Monitor native tracks add, remove and change callback and trigger the
     * change events.
     */
    _handleNativeTracksCallbacks() {
        if (this._nativeAudioTracks !== undefined) {
            this._nativeAudioTracks.onaddtrack = () => {
                var _a, _b;
                if (this._nativeAudioTracks !== undefined) {
                    const newAudioTracks = createAudioTracks(this._nativeAudioTracks);
                    if (areTrackArraysDifferent(this._audioTracks, newAudioTracks)) {
                        this._audioTracks = newAudioTracks;
                        this._setPreviouslyLockedAudioTrack();
                        this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
                        const chosenAudioTrack = this._getCurrentAudioTrack();
                        if ((chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== this._lastEmittedNativeAudioTrack) {
                            this.trigger("audioTrackChange", (_a = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.track) !== null && _a !== void 0 ? _a : null);
                            this._lastEmittedNativeAudioTrack = (_b = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeAudioTracks.onremovetrack = () => {
                var _a, _b;
                if (this._nativeAudioTracks !== undefined) {
                    const newAudioTracks = createAudioTracks(this._nativeAudioTracks);
                    if (areTrackArraysDifferent(this._audioTracks, newAudioTracks)) {
                        this._audioTracks = newAudioTracks;
                        this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
                        const chosenAudioTrack = this._getCurrentAudioTrack();
                        if ((chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== this._lastEmittedNativeAudioTrack) {
                            this.trigger("audioTrackChange", (_a = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.track) !== null && _a !== void 0 ? _a : null);
                            this._lastEmittedNativeAudioTrack = (_b = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeAudioTracks.onchange = () => {
                if (this._audioTracks !== undefined) {
                    for (let i = 0; i < this._audioTracks.length; i++) {
                        const { track, nativeTrack } = this._audioTracks[i];
                        if (nativeTrack.enabled) {
                            if (nativeTrack !== this._lastEmittedNativeAudioTrack) {
                                this.trigger("audioTrackChange", track);
                                this._lastEmittedNativeAudioTrack = nativeTrack;
                            }
                            return;
                        }
                    }
                }
                if (this._lastEmittedNativeAudioTrack !== null) {
                    this.trigger("audioTrackChange", null);
                    this._lastEmittedNativeAudioTrack = null;
                }
                return;
            };
        }
        if (this._nativeTextTracks !== undefined) {
            this._nativeTextTracks.onaddtrack = () => {
                var _a, _b;
                if (this._nativeTextTracks !== undefined) {
                    const newTextTracks = createTextTracks(this._nativeTextTracks);
                    if (areTrackArraysDifferent(this._textTracks, newTextTracks)) {
                        this._textTracks = newTextTracks;
                        this._setPreviouslyLockedTextTrack();
                        this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
                        const chosenTextTrack = this._getCurrentTextTrack();
                        if ((chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== this._lastEmittedNativeTextTrack) {
                            this.trigger("textTrackChange", (_a = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.track) !== null && _a !== void 0 ? _a : null);
                            this._lastEmittedNativeTextTrack = (_b = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeTextTracks.onremovetrack = () => {
                var _a, _b;
                if (this._nativeTextTracks !== undefined) {
                    const newTextTracks = createTextTracks(this._nativeTextTracks);
                    if (areTrackArraysDifferent(this._textTracks, newTextTracks)) {
                        this._textTracks = newTextTracks;
                        this._setPreviouslyLockedTextTrack();
                        this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
                        const chosenTextTrack = this._getCurrentTextTrack();
                        if ((chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== this._lastEmittedNativeTextTrack) {
                            this.trigger("textTrackChange", (_a = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.track) !== null && _a !== void 0 ? _a : null);
                            this._lastEmittedNativeTextTrack = (_b = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeTextTracks.onchange = () => {
                if (this._textTracks !== undefined) {
                    for (let i = 0; i < this._textTracks.length; i++) {
                        const { track, nativeTrack } = this._textTracks[i];
                        if (nativeTrack.mode === "showing") {
                            if (nativeTrack !== this._lastEmittedNativeTextTrack) {
                                this.trigger("textTrackChange", track);
                                this._lastEmittedNativeTextTrack = nativeTrack;
                            }
                            return;
                        }
                    }
                }
                if (this._lastEmittedNativeTextTrack !== null) {
                    this.trigger("textTrackChange", null);
                    this._lastEmittedNativeTextTrack = null;
                }
                return;
            };
        }
        if (this._nativeVideoTracks !== undefined) {
            this._nativeVideoTracks.onaddtrack = () => {
                var _a, _b;
                if (this._nativeVideoTracks !== undefined) {
                    const newVideoTracks = createVideoTracks(this._nativeVideoTracks);
                    if (areTrackArraysDifferent(this._videoTracks, newVideoTracks)) {
                        this._videoTracks = newVideoTracks;
                        this._setPreviouslyLockedVideoTrack();
                        this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
                        const chosenVideoTrack = this._getCurrentVideoTrack();
                        if ((chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== this._lastEmittedNativeVideoTrack) {
                            this.trigger("videoTrackChange", (_a = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.track) !== null && _a !== void 0 ? _a : null);
                            this._lastEmittedNativeVideoTrack = (_b = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeVideoTracks.onremovetrack = () => {
                var _a, _b;
                if (this._nativeVideoTracks !== undefined) {
                    const newVideoTracks = createVideoTracks(this._nativeVideoTracks);
                    if (areTrackArraysDifferent(this._videoTracks, newVideoTracks)) {
                        this._videoTracks = newVideoTracks;
                        this._setPreviouslyLockedVideoTrack();
                        this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
                        const chosenVideoTrack = this._getCurrentVideoTrack();
                        if ((chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== this._lastEmittedNativeVideoTrack) {
                            this.trigger("videoTrackChange", (_a = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.track) !== null && _a !== void 0 ? _a : null);
                            this._lastEmittedNativeVideoTrack = (_b = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeVideoTracks.onchange = () => {
                if (this._videoTracks !== undefined) {
                    for (let i = 0; i < this._videoTracks.length; i++) {
                        const { track, nativeTrack } = this._videoTracks[i];
                        if (nativeTrack.selected) {
                            if (nativeTrack !== this._lastEmittedNativeVideoTrack) {
                                this.trigger("videoTrackChange", track);
                                this._lastEmittedNativeVideoTrack = nativeTrack;
                            }
                            return;
                        }
                    }
                }
                if (this._lastEmittedNativeVideoTrack !== null) {
                    this.trigger("videoTrackChange", null);
                    this._lastEmittedNativeVideoTrack = null;
                }
                return;
            };
        }
    }
    /**
     * Enable an audio track (and disable all others), based on its index in the
     * `this._audioTracks` array.
     * @param {number} index}
     */
    _enableAudioTrackFromIndex(index) {
        enableAudioTrack(this._audioTracks.map(({ nativeTrack }) => nativeTrack), index);
    }
}
/**
 * Disable all text track elements in the given array from showing.
 * @param {Array.<Object>} textTracks
 */
function disableTextTracks(textTracks) {
    for (let i = 0; i < textTracks.length; i++) {
        const { nativeTrack } = textTracks[i];
        nativeTrack.mode = "disabled";
    }
}
/**
 * Disable all text track elements in the given array from showing but one which
 * should stay in the same state it was before.
 * @param {Array.<Object>} textTracks
 * @param {TextTrack} track
 */
function disableAllTextTracksBut(textTracks, track) {
    for (let i = 0; i < textTracks.length; i++) {
        const { nativeTrack } = textTracks[i];
        if (nativeTrack !== track &&
            (nativeTrack.mode === "showing" || nativeTrack.mode === "hidden")) {
            nativeTrack.mode = "disabled";
        }
    }
}
/**
 * Disable all video track elements in the given array from showing.
 * Note that browser need to support that use case, which they often do not.
 * @param {Array.<Object>} videoTracks
 */
function disableVideoTracks(videoTracks) {
    for (let i = 0; i < videoTracks.length; i++) {
        const { nativeTrack } = videoTracks[i];
        nativeTrack.selected = false;
    }
}
