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

import { BehaviorSubject } from "rxjs";
import { ICompatTextTrackList } from "../../compat/browser_compatibility_types";
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
  oldTrackArray: Array<{ nativeTrack: VideoTrack|AudioTrack|TextTrack }>,
  newTrackArray: Array<{ nativeTrack: VideoTrack|AudioTrack|TextTrack }>
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
  audioTracks: AudioTrackList
): Array<{ track: { id: string;
                    normalized: string;
                    language: string;
                    audioDescription: boolean; };
           nativeTrack: AudioTrack; }> {
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
                    audioDescription: false };
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
  videoTracks: VideoTrackList
): Array<{ track: { id: string;
                    representations: []; };
           nativeTrack: VideoTrack; }> {
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
                                   representations: [] as [] },
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
   * Array of preferred languages for audio tracks.
   * Sorted by order of preference descending.
   */
  private _preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;

  /**
   * Array of preferred languages for text tracks.
   * Sorted by order of preference descending.
   */
  private _preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>;

  /** List every available audio tracks available on the media element. */
  private _audioTracks : Array<{ track: ITMAudioTrack; nativeTrack: AudioTrack }>;
  /** List every available text tracks available on the media element. */
  private _textTracks : Array<{ track: ITMTextTrack; nativeTrack: TextTrack }>;
  /** List every available video tracks available on the media element. */
  private _videoTracks : Array<{ track: ITMVideoTrack; nativeTrack: VideoTrack }>;

  /** Last audio track emitted as active. */
  private _lastEmittedNativeAudioTrack : AudioTrack | null | undefined;
  /** Last video track emitted as active. */
  private _lastEmittedNativeVideoTrack : VideoTrack | null | undefined;
  /** Last text track emitted as active. */
  private _lastEmittedNativeTextTrack : TextTrack | null | undefined;

  /** Native `AudioTrackList` implemented on the media element. */
  private _nativeAudioTracks : AudioTrackList|undefined;
  /** Native `VideoTrackList` implemented on the media element. */
  private _nativeVideoTracks : VideoTrackList|undefined;
  /** Native `TextTrackList` implemented on the media element. */
  private _nativeTextTracks : ICompatTextTrackList|undefined;

  constructor(
    defaults : { preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;
                 preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>; },
    mediaElement: HTMLMediaElement
  ) {
    super();
    const { preferredAudioTracks, preferredTextTracks } = defaults;

    this._preferredAudioTracks = preferredAudioTracks;
    this._preferredTextTracks = preferredTextTracks;

    // TODO In practice, the audio/video/text tracks API are not always implemented on
    // the media element, although Typescript HTMLMediaElement types tend to mean
    // that can't be undefined.
    this._nativeAudioTracks = mediaElement.audioTracks as AudioTrackList|undefined;
    this._nativeVideoTracks = mediaElement.videoTracks as VideoTrackList|undefined;
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
        return;
      }
    }
    throw new Error("Audio track not found.");
  }

  /**
   * Disable the currently-active text track, if one.
   */
  public disableTextTrack(): void {
    for (let i = 0; i < this._textTracks.length; i++) {
      const { nativeTrack } = this._textTracks[i];
      nativeTrack.mode = "disabled";
    }
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
      } else if (nativeTrack.mode === "showing" || nativeTrack.mode === "hidden") {
        nativeTrack.mode = "disabled";
      }
    }
    if (!hasSetTrack) {
      throw new Error("Text track not found.");
    }
  }

  /**
   * Update the currently active video track by setting the wanted video track's
   * ID property.
   * Throws if the wanted video track is not found.
   * @param {string|number|undefined} id
   */
  public setVideoTrackById(id?: string): void {
    for (let i = 0; i < this._videoTracks.length; i++) {
      const { track, nativeTrack } = this._videoTracks[i];
      if (track.id === id) {
        nativeTrack.selected = true;
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
               active: nativeTrack.enabled };
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
                                           nativeTrack: AudioTrack; } |
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
                                           nativeTrack: VideoTrack; } |
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
   * Iterate over every available audio tracks on the media element and over
   * every set audio track preferences to activate the preferred audio track
   * on the media element.
   */
  private _setPreferredAudioTrack() : void {
    const preferredAudioTracks = this._preferredAudioTracks.getValue();
    for (let i = 0; i < preferredAudioTracks.length; i++) {
      const track = preferredAudioTracks[i];
      if (track !== null) {
        const normalized = normalizeLanguage(track.language);
        for (let j = 0; j < this._audioTracks.length; j++) {
          const audioTrack = this._audioTracks[j];
          if (audioTrack.track.normalized === normalized &&
              audioTrack.track.audioDescription === track.audioDescription
          ) {
            return this.setAudioTrackById(audioTrack.track.id);
          }
        }
      }
    }
  }

  /**
   * Iterate over every available text tracks on the media element and over
   * every set text track preferences to activate the preferred text track
   * on the media element.
   */
  private _setPreferredTextTrack() : void {
    const preferredTextTracks = this._preferredTextTracks.getValue();
    for (let i = 0; i < preferredTextTracks.length; i++) {
      const track = preferredTextTracks[i];
      if (track === null) {
        return this.disableTextTrack();
      }
      const normalized = normalizeLanguage(track.language);
      for (let j = 0; j < this._textTracks.length; j++) {
        const textTrack = this._textTracks[j];
        if (textTrack.track.normalized === normalized &&
            textTrack.track.closedCaption === track.closedCaption
        ) {
          return this.setTextTrackById(textTrack.track.id);
        }
      }
    }
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
            this._setPreferredAudioTrack();
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
            this._setPreferredAudioTrack();
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
            this._setPreferredTextTrack();
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
            this._setPreferredTextTrack();
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
