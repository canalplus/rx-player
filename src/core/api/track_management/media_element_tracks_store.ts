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
} from "../../../compat/browser_compatibility_types";
import { Representation } from "../../../manifest";
import {
  IAudioTrack,
  ITextTrack,
  IVideoTrack,
  IAvailableVideoTrack,
  IAvailableAudioTrack,
  IAvailableTextTrack,
} from "../../../public_types";
import assert from "../../../utils/assert";
import EventEmitter from "../../../utils/event_emitter";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import normalizeLanguage from "../../../utils/languages";

/** Events emitted by the MediaElementTracksStore. */
interface IMediaElementTracksStoreEvents {
  availableVideoTracksChange: IAvailableVideoTrack[];
  availableAudioTracksChange: IAvailableAudioTrack[];
  availableTextTracksChange: IAvailableTextTrack[];
  videoTrackChange: IVideoTrack|null;
  audioTrackChange: IAudioTrack|null;
  textTrackChange: ITextTrack|null;
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
                    audioDescription: audioTrack.kind === "descriptions",
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
 * @class MediaElementTracksStore
 */
export default class MediaElementTracksStore
  extends EventEmitter<IMediaElementTracksStoreEvents> {

  /** List every available audio tracks available on the media element. */
  private _audioTracks : Array<{ track: IAudioTrack; nativeTrack: ICompatAudioTrack }>;
  /** List every available text tracks available on the media element. */
  private _textTracks : Array<{ track: ITextTrack; nativeTrack: TextTrack }>;
  /** List every available video tracks available on the media element. */
  private _videoTracks : Array<{ track: IVideoTrack; nativeTrack: ICompatVideoTrack }>;

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
   * MediaElementTracksStore's API(s).
   * Allows to "lock on" a track, to be sure that choice will be kept even
   * through audio track list updates, as long as it is still available.
   * `undefined` if the audio track was not manually set.
   */
  private _audioTrackLockedOn : ICompatAudioTrack | undefined;

  /**
   * Last text track manually set active through the corresponding
   * MediaElementTracksStore's API(s).
   * Allows to "lock on" a track, to be sure that choice will be kept even
   * through text track list updates, as long as it is still available.
   * `null` if the text track was disabled.
   * `undefined` if the text track was not manually set.
   */
  private _textTrackLockedOn : TextTrack | undefined | null;

  /**
   * Last video track manually set active through the corresponding
   * MediaElementTracksStore's API(s).
   * Allows to "lock on" a track, to be sure that choice will be kept even
   * through video track list updates, as long as it is still available.
   * `null` if the video track was disabled.
   * `undefined` if the video track was not manually set.
   */
  private _videoTrackLockedOn : ICompatVideoTrack | undefined | null;

  constructor(mediaElement: HTMLMediaElement) {
    super();
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

    this._lastEmittedNativeAudioTrack = this._getCurrentAudioTrack()?.nativeTrack;
    this._lastEmittedNativeVideoTrack = this._getCurrentVideoTrack()?.nativeTrack;
    this._lastEmittedNativeTextTrack = this._getCurrentTextTrack()?.nativeTrack;

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
  public getChosenAudioTrack(): IAudioTrack|null|undefined {
    const currentAudioTrack = this._getCurrentAudioTrack();
    return isNullOrUndefined(currentAudioTrack) ?
      currentAudioTrack :
      currentAudioTrack.track;
  }

  /**
   * Returns the currently active text track.
   * Returns `null` if no text track is active.
   * Returns `undefined` if we cannot know which text track is active.
   * @returns {Object|null|undefined}
   */
  public getChosenTextTrack(): ITextTrack|null|undefined {
    const currentTextTrack = this._getCurrentTextTrack();
    return isNullOrUndefined(currentTextTrack) ?
      currentTextTrack :
      currentTextTrack.track;
  }

  /**
   * Returns the currently active video track.
   * Returns `null` if no video track is active.
   * Returns `undefined` if we cannot know which video track is active.
   * @returns {Object|null|undefined}
   */
  public getChosenVideoTrack(): IVideoTrack|null|undefined {
    const currentVideoTrack = this._getCurrentVideoTrack();
    return isNullOrUndefined(currentVideoTrack) ?
      currentVideoTrack :
      currentVideoTrack.track;
  }

  /**
   * Returns a description of every available audio tracks.
   * @returns {Array.<Object>}
   */
  public getAvailableAudioTracks(): IAvailableAudioTrack[] {
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
  public getAvailableTextTracks(): IAvailableTextTrack[] {
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
  public getAvailableVideoTracks(): IAvailableVideoTrack[] {
    return this._videoTracks.map(({ track, nativeTrack }) => {
      return { id: track.id,
               representations: track.representations,
               active: nativeTrack.selected };
    });
  }

  /**
   * Free the resources used by the MediaElementTracksStore.
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
  private _getCurrentAudioTrack(): { track: IAudioTrack;
                                     nativeTrack: ICompatAudioTrack; } |
                                   undefined |
                                   null
  {
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
  private _getCurrentVideoTrack(): { track: IVideoTrack;
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
  private _getCurrentTextTrack(): { track: ITextTrack;
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
   *   - if we still do not find an optimal track, let the one chosen by default
   */
  private _setPreviouslyLockedAudioTrack() : void {
    if (this._audioTrackLockedOn === undefined) {
      return;
    } else if (this._audioTrackLockedOn === null) {
      for (let i = 0; i < this._audioTracks.length; i++) {
        const { nativeTrack } = this._audioTracks[i];
        nativeTrack.enabled = false;
      }
    } else {
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
  private _setPreviouslyLockedTextTrack() : void {
    if (this._textTrackLockedOn === undefined) {
      return;
    } else if (this._textTrackLockedOn === null) {
      disableTextTracks(this._textTracks);
      return;
    } else {
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
  private _setPreviouslyLockedVideoTrack() : void {
    if (this._videoTrackLockedOn === undefined) {
      return;
    } else if (this._videoTrackLockedOn === null) {
      disableVideoTracks(this._videoTracks);
      return;
    } else {
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
  private _handleNativeTracksCallbacks(): void {
    if (this._nativeAudioTracks !== undefined) {
      this._nativeAudioTracks.onaddtrack = () => {
        if (this._nativeAudioTracks !== undefined) {
          const newAudioTracks = createAudioTracks(this._nativeAudioTracks);
          if (areTrackArraysDifferent(this._audioTracks, newAudioTracks)) {
            this._audioTracks = newAudioTracks;
            this._setPreviouslyLockedAudioTrack();
            this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
            const chosenAudioTrack = this._getCurrentAudioTrack();
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
            const chosenAudioTrack = this._getCurrentAudioTrack();
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
            this._setPreviouslyLockedTextTrack();
            this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
            const chosenTextTrack = this._getCurrentTextTrack();
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
            this._setPreviouslyLockedTextTrack();
            this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
            const chosenTextTrack = this._getCurrentTextTrack();
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
            this._setPreviouslyLockedVideoTrack();
            this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
            const chosenVideoTrack = this._getCurrentVideoTrack();
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
            this._setPreviouslyLockedVideoTrack();
            this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
            const chosenVideoTrack = this._getCurrentVideoTrack();
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

  /**
   * Enable an audio track (and disable all others), based on its index in the
   * `this._audioTracks` array.
   * @param {number} index}
   */
  private _enableAudioTrackFromIndex(index : number) : void {
    assert(index < this._audioTracks.length);

    // Seen on Safari MacOS only (2022-02-14), not disabling ALL audio tracks
    // first (even the wanted one), can lead to the media not playing.
    for (const audioTrack of this._audioTracks) {
      audioTrack.nativeTrack.enabled = false;
    }

    this._audioTracks[index].nativeTrack.enabled = true;
    return;
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
    if (nativeTrack !== track &&
        (nativeTrack.mode === "showing" || nativeTrack.mode === "hidden"))
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
