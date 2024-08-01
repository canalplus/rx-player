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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import type { IMediaElement } from "../../compat/browser_compatibility_types";
import type { IAudioTrack, ITextTrack, IVideoTrack, IAvailableVideoTrack, IAvailableAudioTrack, IAvailableTextTrack } from "../../public_types";
import EventEmitter from "../../utils/event_emitter";
/** Events emitted by the MediaElementTracksStore. */
interface IMediaElementTracksStoreEvents {
    availableVideoTracksChange: IAvailableVideoTrack[];
    availableAudioTracksChange: IAvailableAudioTrack[];
    availableTextTracksChange: IAvailableTextTrack[];
    videoTrackChange: IVideoTrack | null;
    audioTrackChange: IAudioTrack | null;
    textTrackChange: ITextTrack | null;
}
/**
 * Manage video, audio and text tracks for current direct file content.
 * @class MediaElementTracksStore
 */
export default class MediaElementTracksStore extends EventEmitter<IMediaElementTracksStoreEvents> {
    /** List every available audio tracks available on the media element. */
    private _audioTracks;
    /** List every available text tracks available on the media element. */
    private _textTracks;
    /** List every available video tracks available on the media element. */
    private _videoTracks;
    /** Last audio track emitted as active. */
    private _lastEmittedNativeAudioTrack;
    /** Last video track emitted as active. */
    private _lastEmittedNativeVideoTrack;
    /** Last text track emitted as active. */
    private _lastEmittedNativeTextTrack;
    /** Native `AudioTrackList` implemented on the media element. */
    private _nativeAudioTracks;
    /** Native `VideoTrackList` implemented on the media element. */
    private _nativeVideoTracks;
    /** Native `TextTrackList` implemented on the media element. */
    private _nativeTextTracks;
    /**
     * Last audio track manually set active through the corresponding
     * MediaElementTracksStore's API(s).
     * Allows to "lock on" a track, to be sure that choice will be kept even
     * through audio track list updates, as long as it is still available.
     * `undefined` if the audio track was not manually set.
     */
    private _audioTrackLockedOn;
    /**
     * Last text track manually set active through the corresponding
     * MediaElementTracksStore's API(s).
     * Allows to "lock on" a track, to be sure that choice will be kept even
     * through text track list updates, as long as it is still available.
     * `null` if the text track was disabled.
     * `undefined` if the text track was not manually set.
     */
    private _textTrackLockedOn;
    /**
     * Last video track manually set active through the corresponding
     * MediaElementTracksStore's API(s).
     * Allows to "lock on" a track, to be sure that choice will be kept even
     * through video track list updates, as long as it is still available.
     * `null` if the video track was disabled.
     * `undefined` if the video track was not manually set.
     */
    private _videoTrackLockedOn;
    constructor(mediaElement: IMediaElement);
    /**
     * Update the currently active audio track by setting the wanted audio track's
     * ID property.
     * Throws if the wanted audio track is not found.
     * @param {string|number|undefined} id
     */
    setAudioTrackById(id?: string | number): void;
    /**
     * Disable the currently-active text track, if one.
     */
    disableTextTrack(): void;
    /**
     * Update the currently active text track by setting the wanted text track's
     * ID property.
     * Throws if the wanted text track is not found.
     * @param {string|number|undefined} id
     */
    setTextTrackById(id?: string | number): void;
    /**
     * Disable the currently-active video track, if one.
     */
    disableVideoTrack(): void;
    /**
     * Update the currently active video track by setting the wanted video track's
     * ID property.
     * Throws if the wanted video track is not found.
     * @param {string|number|undefined} id
     */
    setVideoTrackById(id?: string | number): void;
    /**
     * Returns the currently active audio track.
     * Returns `null` if no audio track is active.
     * Returns `undefined` if we cannot know which audio track is active.
     * @returns {Object|null|undefined}
     */
    getChosenAudioTrack(): IAudioTrack | null | undefined;
    /**
     * Returns the currently active text track.
     * Returns `null` if no text track is active.
     * Returns `undefined` if we cannot know which text track is active.
     * @returns {Object|null|undefined}
     */
    getChosenTextTrack(): ITextTrack | null | undefined;
    /**
     * Returns the currently active video track.
     * Returns `null` if no video track is active.
     * Returns `undefined` if we cannot know which video track is active.
     * @returns {Object|null|undefined}
     */
    getChosenVideoTrack(): IVideoTrack | null | undefined;
    /**
     * Returns a description of every available audio tracks.
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(): IAvailableAudioTrack[];
    /**
     * Returns a description of every available text tracks.
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(): IAvailableTextTrack[];
    /**
     * Returns a description of every available video tracks.
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(): IAvailableVideoTrack[];
    /**
     * Free the resources used by the MediaElementTracksStore.
     */
    dispose(): void;
    /**
     * Get information about the currently chosen audio track.
     * `undefined` if we cannot know it.
     * `null` if no audio track is chosen.
     * @returns {Object|undefined|null}
     */
    private _getCurrentAudioTrack;
    /**
     * Get information about the currently chosen video track.
     * `undefined` if we cannot know it.
     * `null` if no video track is chosen.
     * @returns {Object|undefined|null}
     */
    private _getCurrentVideoTrack;
    /**
     * Get information about the currently chosen text track.
     * `undefined` if we cannot know it.
     * `null` if no text track is chosen.
     * @returns {Object|undefined|null}
     */
    private _getCurrentTextTrack;
    /**
     * Iterate over every available audio tracks on the media element and either:
     *   - if the last manually set audio track is found, set that one.
     *   - if we still do not find an optimal track, let the one chosen by default
     */
    private _setPreviouslyLockedAudioTrack;
    /**
     * Iterate over every available text tracks on the media element and either:
     *   - if the last manually set text track is found, set that one.
     *   - if we still do not find an optimal track, just disable it.
     */
    private _setPreviouslyLockedTextTrack;
    /**
     * Iterate over every available video tracks on the media element and either:
     *   - if the last manually set video track is found, set that one.
     *   - if we still do not find an optimal track, let the one chosen by default
     */
    private _setPreviouslyLockedVideoTrack;
    /**
     * Monitor native tracks add, remove and change callback and trigger the
     * change events.
     */
    private _handleNativeTracksCallbacks;
    /**
     * Enable an audio track (and disable all others), based on its index in the
     * `this._audioTracks` array.
     * @param {number} index}
     */
    private _enableAudioTrackFromIndex;
}
export {};
//# sourceMappingURL=media_element_tracks_store.d.ts.map