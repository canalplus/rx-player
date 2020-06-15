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

import {
  ICompatAudioTrack,
  ICompatAudioTrackList,
  ICompatHTMLMediaElement,
  ICompatTextTrackList,
  ICompatVideoTrack,
  ICompatVideoTrackList,
} from "../../compat/browser_compatibility_types";
import { Representation } from "../../manifest";
import EventEmitter from "../../utils/event_emitter";
import normalizeLanguage from "../../utils/languages";
import {
  IAudioTrackPreference,
  ITextTrackPreference,
  ITMAudioTrack,
  ITMAudioTrackListItem,
  ITMTextTrack,
  ITMTextTrackListItem,
  ITMVideoTrack,
  ITMVideoTrackListItem,
  IVideoTrackPreference,
} from "./track_choice_manager";

/** Events emitted by the MediaElementTrackChoiceManager. */
interface IMediaElementTrackChoiceManagerEvents {
  availableVideoTracksChange: ITMVideoTrackListItem[];
  availableAudioTracksChange: ITMAudioTrackListItem[];
  availableTextTracksChange: ITMTextTrackListItem[];
  videoTrackChange: ITMVideoTrack|null;
  audioTrackChange: ITMAudioTrack|null;
  textTrackChange: ITMTextTrack|null;
}

/**
 * Check if track array is different from an other one
 * @param {Array.<Object>} oldTrackArray
 * @param {Array.<Object>} newTrackArray
 * @returns {boolean}
 */
function areTrackArraysDifferent(
  oldTrackArray: Array<{ nativeTrack: ICompatVideoTrack|ICompatAudioTrack|TextTrack }>,
  newTrackArray: Array<{ nativeTrack: ICompatVideoTrack|ICompatAudioTrack|TextTrack }>
): boolean {
  if (newTrackArray.length !== oldTrackArray.length) {
    return true;
  }
  for (let i = 0; i < newTrackArray.length; i++) {
    if (newTrackArray[i].nativeTrack !== oldTrackArray[i]?.nativeTrack) {
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
function createAudioTracks(
  audioTracks: ICompatAudioTrackList
): Array<{ track: { id: string;
                    normalized: string;
                    language: string;
                    audioDescription: boolean;
                    representations: Representation[]; };
           nativeTrack: ICompatAudioTrack; }> {
  const newAudioTracks = [];
  const languagesOccurences: Partial<Record<string, number>> = {};
  for (let i = 0; i < audioTracks.length; i++) {
    const audioTrack = audioTracks[i];
    const language = audioTrack.language === "" ? "nolang" :
                                                  audioTrack.language;
    const occurences = languagesOccurences[language] ?? 1;
    const id = "gen_audio_" +
               language +
               "_" +
               occurences.toString();
    languagesOccurences[language] = occurences + 1;
    const track = { language: audioTrack.language,
                    id,
                    normalized: normalizeLanguage(audioTrack.language),
                    audioDescription: false,
                    representations: [] as Representation[] };
    newAudioTracks.push({ track,
                          nativeTrack: audioTrack });
  }
  return newAudioTracks;
}

/**
 * Create text tracks from native text tracks.
 * @param {TextTrackList} textTracks
 * @returns {Array.<Object>}
 */
function createTextTracks(
  textTracks: ICompatTextTrackList
): Array<{ track: { id: string;
                    normalized: string;
                    language: string;
                    closedCaption: boolean; };
           nativeTrack: TextTrack; }> {
  const newTextTracks = [];
  const languagesOccurences: Partial<Record<string, number>> = {};
  for (let i = 0; i < textTracks.length; i++) {
    const textTrack = textTracks[i];
    const language = textTrack.language === "" ? "nolang" :
                                                 textTrack.language;
    const occurences = languagesOccurences[language] ?? 1;
    const id = "gen_text_" +
               language +
               "_" +
               occurences.toString();
    languagesOccurences[language] = occurences + 1;
    const track =  { language: textTrack.language,
                     id,
                     normalized: normalizeLanguage(textTrack.language),
                     closedCaption: textTrack.kind === "captions" };
    newTextTracks.push({ track,
                         nativeTrack: textTrack });
  }
  return newTextTracks;
}

/**
 * Create video tracks from native video tracks.
 * @param {VideoTrackList} videoTracks
 * @returns {Array.<Object>}
 */
function createVideoTracks(
  videoTracks: ICompatVideoTrackList
): Array<{ track: { id: string;
                    representations: Representation[]; };
           nativeTrack: ICompatVideoTrack; }> {
  const newVideoTracks = [];
  const languagesOccurences: Partial<Record<string, number>> = {};
  for (let i = 0; i < videoTracks.length; i++) {
    const videoTrack = videoTracks[i];
    const language = videoTrack.language === "" ? "nolang" :
                                                  videoTrack.language;
    const occurences = languagesOccurences[language] ?? 1;
    const id = "gen_video_" +
               language +
               "_" +
               occurences.toString();
    languagesOccurences[language] = occurences + 1;
    newVideoTracks.push({ track: { id,
                                   representations: [] as Representation[] },
                          nativeTrack: videoTrack });
  }
  return newVideoTracks;
}

/**
 * Manage video, audio and text tracks for current direct file content.
 * @class MediaElementTrackChoiceManager
 */
export default class MediaElementTrackChoiceManager
  extends EventEmitter<IMediaElementTrackChoiceManagerEvents> {
  /**
   * Array of preferred settings for audio tracks.
   * Sorted by order of preference descending.
   */
  private _preferredAudioTracks : IAudioTrackPreference[];

  /**
   * Array of preferred languages for text tracks.
   * Sorted by order of preference descending.
   */
  private _preferredTextTracks : ITextTrackPreference[];

  /**
   * Array of preferred settings for video tracks.
   * Sorted by order of preference descending.
   */
  private _preferredVideoTracks : IVideoTrackPreference[];

  /** List every available audio tracks available on the media element. */
  private _audioTracks : Array<{ track: ITMAudioTrack; nativeTrack: ICompatAudioTrack }>;
  /** List every available text tracks available on the media element. */
  private _textTracks : Array<{ track: ITMTextTrack; nativeTrack: TextTrack }>;
  /** List every available video tracks available on the media element. */
  private _videoTracks : Array<{ track: ITMVideoTrack; nativeTrack: ICompatVideoTrack }>;

  /** Last audio track emitted as active. */
  private _lastEmittedNativeAudioTrack : ICompatAudioTrack | null | undefined;
  /** Last video track emitted as active. */
  private _lastEmittedNativeVideoTrack : ICompatVideoTrack | null | undefined;
  /** Last text track emitted as active. */
  private _lastEmittedNativeTextTrack : TextTrack | null | undefined;

  /** Native `AudioTrackList` implemented on the media element. */
  private _nativeAudioTracks : ICompatAudioTrackList | undefined;
  /** Native `VideoTrackList` implemented on the media element. */
  private _nativeVideoTracks : ICompatVideoTrackList | undefined;
  /** Native `TextTrackList` implemented on the media element. */
  private _nativeTextTracks : ICompatTextTrackList|undefined;

  /**
   * Last audio track manually set active through the corresponding
   * MediaElementTrackChoiceManager's API(s).
   * Allows to "lock on" a track, to be sure that choice will be kept even
   * through audio track list updates, as long as it is still available.
   * `undefined` if the audio track was not manually set.
   */
  private _audioTrackLockedOn : ICompatAudioTrack | undefined;

  /**
   * Last text track manually set active through the corresponding
   * MediaElementTrackChoiceManager's API(s).
   * Allows to "lock on" a track, to be sure that choice will be kept even
   * through text track list updates, as long as it is still available.
   * `null` if the text track was disabled.
   * `undefined` if the text track was not manually set.
   */
  private _textTrackLockedOn : TextTrack | undefined | null;

  /**
   * Last video track manually set active through the corresponding
   * MediaElementTrackChoiceManager's API(s).
   * Allows to "lock on" a track, to be sure that choice will be kept even
   * through video track list updates, as long as it is still available.
   * `null` if the video track was disabled.
   * `undefined` if the video track was not manually set.
   */
  private _videoTrackLockedOn : ICompatVideoTrack | undefined | null;

  constructor(mediaElement: HTMLMediaElement) {
    super();

    this._preferredAudioTracks = [];
    this._preferredTextTracks = [];
    this._preferredVideoTracks = [];

    // TODO In practice, the audio/video/text tracks API are not always implemented on
    // the media element, although Typescript HTMLMediaElement types tend to mean
    // that can't be undefined.
    this._nativeAudioTracks = (mediaElement as ICompatHTMLMediaElement).audioTracks;
    this._nativeVideoTracks = (mediaElement as ICompatHTMLMediaElement).videoTracks;
    this._nativeTextTracks = mediaElement.textTracks as ICompatTextTrackList|undefined;

    this._audioTracks =
      this._nativeAudioTracks !== undefined ? createAudioTracks(this._nativeAudioTracks) :
                                              [];
    this._videoTracks =
      this._nativeVideoTracks !== undefined ? createVideoTracks(this._nativeVideoTracks) :
                                              [];
    this._textTracks =
      this._nativeTextTracks !== undefined ? createTextTracks(this._nativeTextTracks) :
                                             [];

    this._lastEmittedNativeAudioTrack = this._getPrivateChosenAudioTrack()?.nativeTrack;
    this._lastEmittedNativeVideoTrack = this._getPrivateChosenVideoTrack()?.nativeTrack;
    this._lastEmittedNativeTextTrack = this._getPrivateChosenTextTrack()?.nativeTrack;

    this._handleNativeTracksCallbacks();
  }

  /**
   * Set the list of preferred audio tracks, in preference order.
   * @param {Array.<Object>} preferredAudioTracks
   * @param {boolean} shouldApply - `true` if those preferences should be
   * applied on the currently loaded Period. `false` if it should only
   * be applied to new content.
   */
  public setPreferredAudioTracks(
    preferredAudioTracks : IAudioTrackPreference[],
    shouldApply : boolean
  ) : void {
    this._preferredAudioTracks = preferredAudioTracks;
    if (shouldApply) {
      this._applyAudioPreferences();
    }
  }

  /**
   * Set the list of preferred text tracks, in preference order.
   * @param {Array.<Object>} preferredTextTracks
   * @param {boolean} shouldApply - `true` if those preferences should be
   * applied on the currently loaded Period. `false` if it should only
   * be applied to new content.
   */
  public setPreferredTextTracks(
    preferredTextTracks : ITextTrackPreference[],
    shouldApply : boolean
  ) : void {
    this._preferredTextTracks = preferredTextTracks;
    if (shouldApply) {
      this._applyTextPreferences();
    }
  }

  /**
   * Set the list of preferred video tracks, in preference order.
   * @param {Array.<Object>} preferredVideoTracks
   * @param {boolean} shouldApply - `true` if those preferences should be
   * applied on the currently loaded Period. `false` if it should only
   * be applied to new content.
   */
  public setPreferredVideoTracks(
    preferredVideoTracks : IVideoTrackPreference[],
    shouldApply : boolean
  ) : void {
    this._preferredVideoTracks = preferredVideoTracks;
    if (shouldApply) {
      this._applyVideoPreferences();
    }
  }

  /**
   * Update the currently active audio track by setting the wanted audio track's
   * ID property.
   * Throws if the wanted audio track is not found.
   * @param {string|number|undefined} id
   */
  public setAudioTrackById(id?: string|number): void {
    for (let i = 0; i < this._audioTracks.length; i++) {
      const { track, nativeTrack } = this._audioTracks[i];
      if (track.id === id) {
        nativeTrack.enabled = true;
        this._audioTrackLockedOn = nativeTrack;
        return;
      }
    }
    throw new Error("Audio track not found.");
  }

  /**
   * Disable the currently-active text track, if one.
   */
  public disableTextTrack(): void {
    disableTextTracks(this._textTracks);
    this._textTrackLockedOn = null;
  }

  /**
   * Update the currently active text track by setting the wanted text track's
   * ID property.
   * Throws if the wanted text track is not found.
   * @param {string|number|undefined} id
   */
  public setTextTrackById(id?: string|number): void {
    let hasSetTrack = false;
    for (let i = 0; i < this._textTracks.length; i++) {
      const { track, nativeTrack } = this._textTracks[i];
      if (track.id === id) {
        nativeTrack.mode = "showing";
        hasSetTrack = true;
        this._textTrackLockedOn = nativeTrack;
      } else if (nativeTrack.mode === "showing" || nativeTrack.mode === "hidden") {
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
  public disableVideoTrack(): void {
    disableVideoTracks(this._videoTracks);
    this._videoTrackLockedOn = null;
  }

  /**
   * Update the currently active video track by setting the wanted video track's
   * ID property.
   * Throws if the wanted video track is not found.
   * @param {string|number|undefined} id
   */
  public setVideoTrackById(id?: string | number): void {
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
  public getChosenAudioTrack(): ITMAudioTrack|null|undefined {
    const chosenPrivateAudioTrack = this._getPrivateChosenAudioTrack();
    if (chosenPrivateAudioTrack != null) {
      return chosenPrivateAudioTrack.track;
    }
    return chosenPrivateAudioTrack;
  }

  /**
   * Returns the currently active text track.
   * Returns `null` if no text track is active.
   * Returns `undefined` if we cannot know which text track is active.
   * @returns {Object|null|undefined}
   */
  public getChosenTextTrack(): ITMTextTrack|null|undefined {
    const chosenPrivateTextTrack = this._getPrivateChosenTextTrack();
    if (chosenPrivateTextTrack != null) {
      return chosenPrivateTextTrack.track;
    }
    return chosenPrivateTextTrack;
  }

  /**
   * Returns the currently active video track.
   * Returns `null` if no video track is active.
   * Returns `undefined` if we cannot know which video track is active.
   * @returns {Object|null|undefined}
   */
  public getChosenVideoTrack(): ITMVideoTrack|null|undefined {
    const chosenPrivateVideoTrack = this._getPrivateChosenVideoTrack();
    if (chosenPrivateVideoTrack != null) {
      return chosenPrivateVideoTrack.track;
    }
    return chosenPrivateVideoTrack;
  }

  /**
   * Returns a description of every available audio tracks.
   * @returns {Array.<Object>}
   */
  public getAvailableAudioTracks(): ITMAudioTrackListItem[] {
    return this._audioTracks.map(({ track, nativeTrack }) => {
      return { id: track.id,
               language: track.language,
               normalized: track.normalized,
               audioDescription: track.audioDescription,
               active: nativeTrack.enabled,
               representations: track.representations };
    });
  }

  /**
   * Returns a description of every available text tracks.
   * @returns {Array.<Object>}
   */
  public getAvailableTextTracks(): ITMTextTrackListItem[] {
    return this._textTracks.map(({ track, nativeTrack }) => {
      return { id: track.id,
               language: track.language,
               normalized: track.normalized,
               closedCaption: track.closedCaption,
               active: nativeTrack.mode === "showing" };
    });
  }

  /**
   * Returns a description of every available video tracks.
   * @returns {Array.<Object>}
   */
  public getAvailableVideoTracks(): ITMVideoTrackListItem[] {
    return this._videoTracks.map(({ track, nativeTrack }) => {
      return { id: track.id,
               representations: track.representations,
               active: nativeTrack.selected };
    });
  }

  /**
   * Free the resources used by the MediaElementTrackChoiceManager.
   */
  public dispose(): void {
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
  private _getPrivateChosenAudioTrack(): { track: ITMAudioTrack;
                                           nativeTrack: ICompatAudioTrack; } |
                                         undefined |
                                         null {
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
  private _getPrivateChosenVideoTrack(): { track: ITMVideoTrack;
                                           nativeTrack: ICompatVideoTrack; } |
                                         undefined |
                                         null {
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
  private _getPrivateChosenTextTrack(): { track: ITMTextTrack;
                                          nativeTrack: TextTrack; } |
                                        undefined |
                                        null {
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
   *   - if not, set the most preferred one
   *   - if we still do not find an optimal track, let the one chosen by default
   */
  private _setOptimalAudioTrack() : void {
    // First check if the last set track is available, set it if that's the case
    if (this._audioTrackLockedOn !== undefined) {
      for (let i = 0; i < this._audioTracks.length; i++) {
        const { nativeTrack } = this._audioTracks[i];
        if (nativeTrack === this._audioTrackLockedOn) {
          nativeTrack.enabled = true;
          return;
        }
      }
    }
    this._applyAudioPreferences();
  }

  /**
   * Try to find a track corresponding to the audio track preferences:
   *   - if found, set it as the active track
   *   - if not found, let the chosen audio track by default
   */
  private _applyAudioPreferences() : void {
    // Re-set the last manually set audio track
    this._audioTrackLockedOn = undefined;

    const preferredAudioTracks = this._preferredAudioTracks;
    for (let i = 0; i < preferredAudioTracks.length; i++) {
      const track = preferredAudioTracks[i];
      if (track !== null && track.language !== undefined) {
        const normalized = normalizeLanguage(track.language);
        for (let j = 0; j < this._audioTracks.length; j++) {
          const audioTrack = this._audioTracks[j];
          if (audioTrack.track.normalized === normalized &&
            audioTrack.track.audioDescription === track.audioDescription
          ) {
            audioTrack.nativeTrack.enabled = true;
            return;
          }
        }
      }
    }

    // else just let the default one instead
  }

  /**
   * Iterate over every available text tracks on the media element and either:
   *   - if the last manually set text track is found, set that one.
   *   - if not, set the most preferred one
   *   - if we still do not find an optimal track, just disable it.
   */
  private _setOptimalTextTrack() : void {
    // First check if the last set track is available, set it if that's the case
    if (this._textTrackLockedOn === null) {
      disableTextTracks(this._textTracks);
      return;
    } else if (this._textTrackLockedOn !== undefined) {
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

    // Else set the preferred one
    this._applyTextPreferences();
  }

  /**
   * Try to find a track corresponding to the text track preferences:
   *   - if found, set it as the active track
   *   - if not found, let the chosen text track by default
   */
  private _applyTextPreferences() : void {
    // Re-set the last manually set audio track
    this._textTrackLockedOn = undefined;

    const preferredTextTracks = this._preferredTextTracks;
    for (let i = 0; i < preferredTextTracks.length; i++) {
      const track = preferredTextTracks[i];
      if (track === null) {
        disableTextTracks(this._textTracks);
        return;
      }
      const normalized = normalizeLanguage(track.language);
      for (let j = 0; j < this._textTracks.length; j++) {
        const textTrack = this._textTracks[j];
        if (textTrack.track.normalized === normalized &&
            textTrack.track.closedCaption === track.closedCaption
        ) {
          // disable the rest
          disableAllTextTracksBut(this._textTracks, textTrack.nativeTrack);

          if (textTrack.nativeTrack.mode !== "showing") {
            textTrack.nativeTrack.mode = "showing";
          }
          return;
        }
      }
    }

    // Else just disable text tracks
    disableTextTracks(this._textTracks);
  }

  /**
   * Iterate over every available video tracks on the media element and either:
   *   - if the last manually set video track is found, set that one.
   *   - if not, set the most preferred one
   *   - if we still do not find an optimal track, let the one chosen by default
   */
  private _setOptimalVideoTrack() : void {
    // 1. first check if the last set track is available, set it if that's the case
    if (this._videoTrackLockedOn === null) {
      disableVideoTracks(this._videoTracks);
      return;
    } else if (this._videoTrackLockedOn !== undefined) {
      for (let i = 0; i < this._videoTracks.length; i++) {
        const { nativeTrack } = this._videoTracks[i];
        if (nativeTrack === this._videoTrackLockedOn) {
          nativeTrack.selected = true;
          return;
        }
      }
    }

    // Else set the preferred one
    this._applyVideoPreferences();
  }

  /**
   * Try to find a track corresponding to the text track preferences:
   *   - if found, set it as the active track
   *   - if not found, let the chosen text track by default
   */
  private _applyVideoPreferences() : void {
    // Re-set the last manually set video track
    this._videoTrackLockedOn = undefined;

    // NOTE: As we cannot access either codec information or sign interpretation
    // information easily about the different codecs. It is the same case than
    // if we had only tracks where those were set to undefined.
    // Based on that, we should disable the video track as long as one of the
    // set preferrence is "no video track" (i.e. `null`) as this is the only
    // constraint that we know we can respect.
    // Else, just chose the first track.
    const preferredVideoTracks = this._preferredVideoTracks;
    const hasNullPreference = preferredVideoTracks.some(p => p === null);
    if (hasNullPreference) {
      disableVideoTracks(this._videoTracks);
    }
    // else just let the default one instead
  }

  /**
   * Monitor native tracks add, remove and change callback and trigger the
   * change events.
   */
  private _handleNativeTracksCallbacks(): void {
    if (this._nativeAudioTracks !== undefined) {
      this._nativeAudioTracks.onaddtrack = () => {
        if (this._nativeAudioTracks !== undefined) {
          const newAudioTracks = createAudioTracks(this._nativeAudioTracks);
          if (areTrackArraysDifferent(this._audioTracks, newAudioTracks)) {
            this._audioTracks = newAudioTracks;
            this._setOptimalAudioTrack();
            this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
            const chosenAudioTrack = this._getPrivateChosenAudioTrack();
            if (chosenAudioTrack?.nativeTrack !== this._lastEmittedNativeAudioTrack) {
              this.trigger("audioTrackChange", chosenAudioTrack?.track ?? null);
              this._lastEmittedNativeAudioTrack = chosenAudioTrack?.nativeTrack ?? null;
            }
          }
        }
      };
      this._nativeAudioTracks.onremovetrack = () => {
        if (this._nativeAudioTracks !== undefined) {
          const newAudioTracks = createAudioTracks(this._nativeAudioTracks);
          if (areTrackArraysDifferent(this._audioTracks, newAudioTracks)) {
            this._audioTracks = newAudioTracks;
            this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
            const chosenAudioTrack = this._getPrivateChosenAudioTrack();
            if (chosenAudioTrack?.nativeTrack !== this._lastEmittedNativeAudioTrack) {
              this.trigger("audioTrackChange", chosenAudioTrack?.track ?? null);
              this._lastEmittedNativeAudioTrack = chosenAudioTrack?.nativeTrack ?? null;
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
        if (this._nativeTextTracks !== undefined) {
          const newTextTracks = createTextTracks(this._nativeTextTracks);
          if (areTrackArraysDifferent(this._textTracks, newTextTracks)) {
            this._textTracks = newTextTracks;
            this._setOptimalTextTrack();
            this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
            const chosenTextTrack = this._getPrivateChosenTextTrack();
            if (chosenTextTrack?.nativeTrack !== this._lastEmittedNativeTextTrack) {
              this.trigger("textTrackChange", chosenTextTrack?.track ?? null);
              this._lastEmittedNativeTextTrack = chosenTextTrack?.nativeTrack ?? null;
            }
          }
        }
      };
      this._nativeTextTracks.onremovetrack = () => {
        if (this._nativeTextTracks !== undefined) {
          const newTextTracks = createTextTracks(this._nativeTextTracks);
          if (areTrackArraysDifferent(this._textTracks, newTextTracks)) {
            this._textTracks = newTextTracks;
            this._setOptimalTextTrack();
            this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
            const chosenTextTrack = this._getPrivateChosenTextTrack();
            if (chosenTextTrack?.nativeTrack !== this._lastEmittedNativeTextTrack) {
              this.trigger("textTrackChange", chosenTextTrack?.track ?? null);
              this._lastEmittedNativeTextTrack = chosenTextTrack?.nativeTrack ?? null;
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
        if (this._nativeVideoTracks !== undefined) {
          const newVideoTracks = createVideoTracks(this._nativeVideoTracks);
          if (areTrackArraysDifferent(this._videoTracks, newVideoTracks)) {
            this._videoTracks = newVideoTracks;
            this._setOptimalVideoTrack();
            this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
            const chosenVideoTrack = this._getPrivateChosenVideoTrack();
            if (chosenVideoTrack?.nativeTrack !== this._lastEmittedNativeVideoTrack) {
              this.trigger("videoTrackChange", chosenVideoTrack?.track ?? null);
              this._lastEmittedNativeVideoTrack = chosenVideoTrack?.nativeTrack ?? null;
            }
          }
        }
      };
      this._nativeVideoTracks.onremovetrack = () => {
        if (this._nativeVideoTracks !== undefined) {
          const newVideoTracks = createVideoTracks(this._nativeVideoTracks);
          if (areTrackArraysDifferent(this._videoTracks, newVideoTracks)) {
            this._videoTracks = newVideoTracks;
            this._setOptimalVideoTrack();
            this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
            const chosenVideoTrack = this._getPrivateChosenVideoTrack();
            if (chosenVideoTrack?.nativeTrack !== this._lastEmittedNativeVideoTrack) {
              this.trigger("videoTrackChange", chosenVideoTrack?.track ?? null);
              this._lastEmittedNativeVideoTrack = chosenVideoTrack?.nativeTrack ?? null;
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
}

/**
 * Disable all text track elements in the given array from showing.
 * @param {Array.<Object>} textTracks
 */
function disableTextTracks(
  textTracks : Array<{ nativeTrack : TextTrack }>
) {
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
function disableAllTextTracksBut(
  textTracks : Array<{ nativeTrack : TextTrack }>,
  track : TextTrack
) {
  for (let i = 0; i < textTracks.length; i++) {
    const { nativeTrack } = textTracks[i];
    if (nativeTrack !== track && (
        nativeTrack.mode === "showing" || nativeTrack.mode === "hidden"))
    {
      nativeTrack.mode = "disabled";
    }
  }
}

/**
 * Disable all video track elements in the given array from showing.
 * Note that browser need to support that use case, which they often do not.
 * @param {Array.<Object>} videoTracks
 */
function disableVideoTracks(
  videoTracks : Array<{ nativeTrack : ICompatVideoTrack }>
) {
  for (let i = 0; i < videoTracks.length; i++) {
    const { nativeTrack } = videoTracks[i];
    nativeTrack.selected = false;
  }
}
