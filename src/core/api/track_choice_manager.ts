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

import { Subject } from "rxjs";
import log from "../../log";
import {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import { IHDRInformation } from "../../manifest/types";
import arrayFind from "../../utils/array_find";
import arrayIncludes from "../../utils/array_includes";
import normalizeLanguage from "../../utils/languages";
import SortedList from "../../utils/sorted_list";
import takeFirstSet from "../../utils/take_first_set";

/** Single preference for an audio track Adaptation. */
export type IAudioTrackPreference = null |
                                    { language? : string;
                                      audioDescription? : boolean;
                                      codec? : { all: boolean;
                                                 test: RegExp; }; };

/** Single preference for a text track Adaptation. */
export type ITextTrackPreference = null |
                                   { language : string;
                                     closedCaption : boolean; };

/** Single preference for a video track Adaptation. */
export type IVideoTrackPreference = null |
                                    IVideoTrackPreferenceObject;

/** Preference for a video track Adaptation for when it is not set to `null`. */
interface IVideoTrackPreferenceObject {
  codec? : { all: boolean;
             test: RegExp; };
  signInterpreted? : boolean;
}

/**
 * Definition of a single audio Representation as represented by the
 * TrackChoiceManager.
 */
interface ITMAudioRepresentation { id : string|number;
                                   bitrate : number;
                                   codec? : string; }

/** Audio track returned by the TrackChoiceManager. */
export interface ITMAudioTrack { language : string;
                                 normalized : string;
                                 audioDescription : boolean;
                                 dub? : boolean;
                                 id : number|string;
                                 representations: ITMAudioRepresentation[]; }

/** Text track returned by the TrackChoiceManager. */
export interface ITMTextTrack { language : string;
                                normalized : string;
                                closedCaption : boolean;
                                id : number|string; }

/**
 * Definition of a single video Representation as represented by the
 * TrackChoiceManager.
 */
interface ITMVideoRepresentation { id : string|number;
                                   bitrate : number;
                                   width? : number;
                                   height? : number;
                                   codec? : string;
                                   frameRate? : string;
                                   hdrInfo?: IHDRInformation; }

/** Video track returned by the TrackChoiceManager. */
export interface ITMVideoTrack { id : number|string;
                                 signInterpreted?: boolean;
                                 isTrickModeTrack?: boolean;
                                 trickModeTracks?: ITMVideoTrack[];
                                 representations: ITMVideoRepresentation[]; }

/** Audio track from a list of audio tracks returned by the TrackChoiceManager. */
export interface ITMAudioTrackListItem
  extends ITMAudioTrack { active : boolean }

/** Text track from a list of text tracks returned by the TrackChoiceManager. */
export interface ITMTextTrackListItem
  extends ITMTextTrack { active : boolean }

/** Video track from a list of video tracks returned by the TrackChoiceManager. */
export interface ITMVideoTrackListItem
  extends ITMVideoTrack { active : boolean }

/** Audio information stored for a single Period. */
interface ITMPeriodAudioInfos { adaptations : Adaptation[];
                                adaptation$ : Subject<Adaptation|null>; }

/** Text information stored for a single Period. */
interface ITMPeriodTextInfos { adaptations : Adaptation[];
                               adaptation$ : Subject<Adaptation|null>; }

/** Video information stored for a single Period. */
interface ITMPeriodVideoInfos { adaptations : Adaptation[];
                                adaptation$ : Subject<Adaptation|null>; }

/** Every information stored for a single Period. */
interface ITMPeriodInfos { period : Period;
                           audio? : ITMPeriodAudioInfos;
                           text? : ITMPeriodTextInfos;
                           video? : ITMPeriodVideoInfos; }

/** Audio track preference once normalized by the TrackChoiceManager. */
type INormalizedPreferredAudioTrack = null |
                                      INormalizedPreferredAudioTrackObject;

/** Audio track preference when it is not set to `null`. */
interface INormalizedPreferredAudioTrackObject {
  normalized? : string;
  audioDescription? : boolean;
  codec? : { all: boolean;
             test: RegExp; };
}

/** Text track preference once normalized by the TrackChoiceManager. */
type INormalizedPreferredTextTrack = null |
                                     INormalizedPreferredTextTrackObject;

/** Text track preference when it is not set to `null`. */
interface INormalizedPreferredTextTrackObject {
  normalized : string;
  closedCaption : boolean;
}

/**
 * Transform an array of IAudioTrackPreference into an array of
 * INormalizedPreferredAudioTrack to be exploited by the TrackChoiceManager.
 * @param {Array.<Object|null>}
 * @returns {Array.<Object|null>}
 */
function normalizeAudioTracks(
  tracks : IAudioTrackPreference[]
) : INormalizedPreferredAudioTrack[] {
  return tracks.map(t => t == null ?
    t :
    { normalized: t.language === undefined ? undefined :
                                             normalizeLanguage(t.language),
      audioDescription: t.audioDescription,
      codec: t.codec });
}

/**
 * Transform an array of ITextTrackPreference into an array of
 * INormalizedPreferredTextTrack to be exploited by the TrackChoiceManager.
 * @param {Array.<Object|null>} tracks
 * @returns {Array.<Object|null>}
 */
function normalizeTextTracks(
  tracks : ITextTrackPreference[]
) : INormalizedPreferredTextTrack[] {
  return tracks.map(t => t == null ?
    t :
    { normalized: normalizeLanguage(t.language),
      closedCaption: t.closedCaption });
}

/**
 * Manage audio and text tracks for all active periods.
 * Choose the audio and text tracks for each period and record this choice.
 * @class TrackChoiceManager
 */
export default class TrackChoiceManager {
  /**
   * Current Periods considered by the TrackChoiceManager.
   * Sorted by start time ascending
   */
  private _periods : SortedList<ITMPeriodInfos>;

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

  /** Memorization of the previously-chosen audio Adaptation for each Period. */
  private _audioChoiceMemory : WeakMap<Period, Adaptation|null>;

  /** Memorization of the previously-chosen text Adaptation for each Period. */
  private _textChoiceMemory : WeakMap<Period, Adaptation|null>;

  /** Memorization of the previously-chosen video Adaptation for each Period. */
  private _videoChoiceMemory : WeakMap<
    Period,
    {
      /**
       * The "root" Adaptation (if a trickmode track was chosen, this is the
       * Adaptation the trickmode track is linked to, and not the trickmode
       * track itself).
       */
      rootAdaptation : Adaptation;
      /**
       * The chosen Adaptation itself (may be different from `rootAdaptation`
       * when a trickmode track is chosen, in which case `rootAdaptation` is
       * the Adaptation the trickmode track is linked to and `adaptation` is the
       * trickmode track).
       */
      adaptation : Adaptation;
    } |
    /** Set to `null` when no video track was chosen. */
    null
  >;

  /** Tells if trick mode has been enabled by the RxPlayer user */
  public trickModeTrackEnabled: boolean;

  constructor(
    args : { preferTrickModeTracks: boolean }
  ) {
    this._periods = new SortedList((a, b) => a.period.start - b.period.start);

    this._audioChoiceMemory = new WeakMap();
    this._textChoiceMemory = new WeakMap();
    this._videoChoiceMemory = new WeakMap();

    this._preferredAudioTracks = [];
    this._preferredTextTracks = [];
    this._preferredVideoTracks = [];
    this.trickModeTrackEnabled = args.preferTrickModeTracks;
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
   * applied on the currently loaded Periods. `false` if it should only
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
   * Set the list of preferred text tracks, in preference order.
   * @param {Array.<Object>} tracks
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
   * Add Subject to choose Adaptation for new "audio" or "text" Period.
   * @param {string} bufferType - The concerned buffer type
   * @param {Period} period - The concerned Period.
   * @param {Subject.<Object|null>} adaptation$ - A subject through which the
   * choice will be given
   */
  public addPeriod(
    bufferType : "audio" | "text"| "video",
    period : Period,
    adaptation$ : Subject<Adaptation|null>
  ) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const adaptations = period.getSupportedAdaptations(bufferType);
    if (periodItem != null) {
      if (periodItem[bufferType] != null) {
        log.warn(`TrackChoiceManager: ${bufferType} already added for period`, period);
        return;
      } else {
        periodItem[bufferType] = { adaptations, adaptation$ };
      }
    } else {
      this._periods.add({ period,
                          [bufferType]: { adaptations, adaptation$ } });
    }
  }

  /**
   * Remove Subject to choose an "audio", "video" or "text" Adaptation for a
   * Period.
   * @param {string} bufferType - The concerned buffer type
   * @param {Period} period - The concerned Period.
   */
  public removePeriod(
    bufferType : "audio" | "text" | "video",
    period : Period
  ) : void {
    const periodIndex = findPeriodIndex(this._periods, period);
    if (periodIndex == null) {
      log.warn(`TrackChoiceManager: ${bufferType} not found for period`, period);
      return;
    }

    const periodItem = this._periods.get(periodIndex);
    if (periodItem[bufferType] == null) {
      log.warn(`TrackChoiceManager: ${bufferType} already removed for period`, period);
      return;
    }
    delete periodItem[bufferType];
    if (periodItem.audio == null &&
        periodItem.text == null &&
        periodItem.video == null)
    {
      this._periods.removeElement(periodItem);
    }
  }

  public resetPeriods() : void {
    while (this._periods.length() > 0) {
      this._periods.pop();
    }
  }

  /**
   * Update the choice of all added Periods based on:
   *   1. What was the last chosen adaptation
   *   2. If not found, the preferences
   */
  public update() : void {
    this._resetChosenAudioTracks();
    this._resetChosenTextTracks();
    this._resetChosenVideoTracks();
  }

  /**
   * Emit initial audio Adaptation through the given Subject based on:
   *   - the preferred audio tracks
   *   - the last choice for this period, if one
   * @param {Period} period - The concerned Period.
   */
  public setInitialAudioTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem != null ? periodItem.audio :
                                            null;
    if (audioInfos == null || periodItem == null) {
      throw new Error("TrackChoiceManager: Given Period not found.");
    }

    const audioAdaptations = period.getSupportedAdaptations("audio");
    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);

    if (chosenAudioAdaptation === null) {
      // If the Period was previously without audio, keep it that way
      audioInfos.adaptation$.next(null);
    } else if (chosenAudioAdaptation === undefined ||
               !arrayIncludes(audioAdaptations, chosenAudioAdaptation)
    ) {
      // Find the optimal audio Adaptation
      const preferredAudioTracks = this._preferredAudioTracks;
      const normalizedPref = normalizeAudioTracks(preferredAudioTracks);
      const optimalAdaptation = findFirstOptimalAudioAdaptation(audioAdaptations,
                                                                normalizedPref);

      this._audioChoiceMemory.set(period, optimalAdaptation);
      audioInfos.adaptation$.next(optimalAdaptation);
    } else {
      audioInfos.adaptation$.next(chosenAudioAdaptation); // set last one
    }
  }

  /**
   * Emit initial text Adaptation through the given Subject based on:
   *   - the preferred text tracks
   *   - the last choice for this period, if one
   * @param {Period} period - The concerned Period.
   */
  public setInitialTextTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem != null ? periodItem.text :
                                           null;
    if (textInfos == null || periodItem == null) {
      throw new Error("TrackChoiceManager: Given Period not found.");
    }

    const textAdaptations = period.getSupportedAdaptations("text");
    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (chosenTextAdaptation === null) {
      // If the Period was previously without text, keep it that way
      textInfos.adaptation$.next(null);
    } else if (chosenTextAdaptation === undefined ||
               !arrayIncludes(textAdaptations, chosenTextAdaptation)
    ) {
      // Find the optimal text Adaptation
      const preferredTextTracks = this._preferredTextTracks;
      const normalizedPref = normalizeTextTracks(preferredTextTracks);
      const optimalAdaptation = findFirstOptimalTextAdaptation(textAdaptations,
                                                               normalizedPref);
      this._textChoiceMemory.set(period, optimalAdaptation);
      textInfos.adaptation$.next(optimalAdaptation);
    } else {
      textInfos.adaptation$.next(chosenTextAdaptation); // set last one
    }
  }

  /**
   * Emit initial video Adaptation through the given Subject based on:
   *   - the preferred video tracks
   *   - the last choice for this period, if one
   * @param {Period} period - The concerned Period.
   */
  public setInitialVideoTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem != null ? periodItem.video :
                                            null;
    if (videoInfos == null || periodItem == null) {
      throw new Error("TrackChoiceManager: Given Period not found.");
    }

    const videoAdaptations = period.getSupportedAdaptations("video");

    const prevVideoAdaptation = this._videoChoiceMemory.get(period);
    let newRootAdaptation : Adaptation | null;

    if (prevVideoAdaptation === null) {
      newRootAdaptation = null;
    } else if (prevVideoAdaptation !== undefined &&
               arrayIncludes(videoAdaptations, prevVideoAdaptation.rootAdaptation))
    {
      // still exists, re-select it
      newRootAdaptation = prevVideoAdaptation.rootAdaptation;
    } else {
      // If that Adaptation does not exist (e.g. no choice has been made or it
      // is not in the Manifest anymore), look at preferences
      const preferredVideoTracks = this._preferredVideoTracks;
      newRootAdaptation = findFirstOptimalVideoAdaptation(videoAdaptations,
                                                          preferredVideoTracks);
    }

    if (newRootAdaptation === null) {
      this._videoChoiceMemory.set(period, null);
      videoInfos.adaptation$.next(null);
      return;
    }

    const newVideoAdaptation = getRightVideoTrack(newRootAdaptation,
                                                  this.trickModeTrackEnabled);
    this._videoChoiceMemory.set(period, { rootAdaptation: newRootAdaptation,
                                          adaptation: newVideoAdaptation });
    videoInfos.adaptation$.next(newVideoAdaptation);
  }

  /**
   * Set audio track based on the ID of its adaptation for a given added Period.
   * @param {Period} period - The concerned Period.
   * @param {string} wantedId - adaptation id of the wanted track
   */
  public setAudioTrackByID(period : Period, wantedId : string) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem != null ? periodItem.audio :
                                            null;
    if (audioInfos == null) {
      throw new Error("TrackChoiceManager: Given Period not found.");
    }

    const wantedAdaptation = arrayFind(audioInfos.adaptations,
                                       ({ id }) => id === wantedId);

    if (wantedAdaptation === undefined) {
      throw new Error("Audio Track not found.");
    }
    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
    if (chosenAudioAdaptation === wantedAdaptation) {
      return;
    }

    this._audioChoiceMemory.set(period, wantedAdaptation);
    audioInfos.adaptation$.next(wantedAdaptation);
  }

  /**
   * Set text track based on the ID of its adaptation for a given added Period.
   * @param {Period} period - The concerned Period.
   * @param {string} wantedId - adaptation id of the wanted track
   */
  public setTextTrackByID(period : Period, wantedId : string) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem != null ? periodItem.text :
                                           null;
    if (textInfos == null) {
      throw new Error("TrackChoiceManager: Given Period not found.");
    }
    const wantedAdaptation = arrayFind(textInfos.adaptations,
                                       ({ id }) => id === wantedId);

    if (wantedAdaptation === undefined) {
      throw new Error("Text Track not found.");
    }
    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (chosenTextAdaptation === wantedAdaptation) {
      return;
    }

    this._textChoiceMemory.set(period, wantedAdaptation);
    textInfos.adaptation$.next(wantedAdaptation);
  }

  /**
   * Set video track based on the ID of its adaptation for a given added Period.
   * @param {Period} period - The concerned Period.
   * @param {string} wantedId - adaptation id of the wanted track
   *
   * @throws Error - Throws if the period given has not been added
   * @throws Error - Throws if the given id is not found in any video adaptation
   * of the given Period.
   */
  public setVideoTrackByID(period : Period, wantedId : string) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem != null ? periodItem.video :
                                            null;
    if (videoInfos == null) {
      throw new Error("LanguageManager: Given Period not found.");
    }

    const wantedRootAdaptation = arrayFind(videoInfos.adaptations,
                                           ({ id }) => id === wantedId);

    if (wantedRootAdaptation === undefined) {
      throw new Error("Video Track not found.");
    }

    const newVideoAdaptation = getRightVideoTrack(wantedRootAdaptation,
                                                  this.trickModeTrackEnabled);
    this._videoChoiceMemory.set(period, { rootAdaptation: wantedRootAdaptation,
                                          adaptation: newVideoAdaptation });
    videoInfos.adaptation$.next(newVideoAdaptation);
  }

  /**
   * Disable the current text track for a given period.
   *
   * @param {Period} period - The concerned Period.
   *
   * @throws Error - Throws if the period given has not been added
   */
  public disableTextTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem != null ? periodItem.text :
                                           null;
    if (textInfos == null) {
      throw new Error("TrackChoiceManager: Given Period not found.");
    }
    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (chosenTextAdaptation === null) {
      return;
    }

    this._textChoiceMemory.set(period, null);
    textInfos.adaptation$.next(null);
  }

  /**
   * Disable the current video track for a given period.
   * @param {Object} period
   * @throws Error - Throws if the period given has not been added
   */
  public disableVideoTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem?.video;
    if (videoInfos === undefined) {
      throw new Error("TrackManager: Given Period not found.");
    }
    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    if (chosenVideoAdaptation === null) {
      return;
    }
    this._videoChoiceMemory.set(period, null);
    videoInfos.adaptation$.next(null);
  }

  /**
   * @param {Object} period
   */
  public disableVideoTrickModeTracks(): void {
    this.trickModeTrackEnabled = false;
    this._resetChosenVideoTracks();
  }

  /**
   * @param {Object} period
   */
  public enableVideoTrickModeTracks() : void {
    this.trickModeTrackEnabled = true;
    this._resetChosenVideoTracks();
  }

  /**
   * @returns {boolean}
   */
  public isTrickModeEnabled() : boolean {
    return this.trickModeTrackEnabled;
  }

  /**
   * Returns an object describing the chosen audio track for the given audio
   * Period.
   *
   * Returns null is the the current audio track is disabled or not
   * set yet.
   *
   * @param {Period} period - The concerned Period.
   * @returns {Object|null} - The audio track chosen for this Period
   */
  public getChosenAudioTrack(period : Period) : ITMAudioTrack|null {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem != null ? periodItem.audio :
                                            null;
    if (audioInfos == null) {
      return null;
    }

    const chosenTrack = this._audioChoiceMemory.get(period);
    if (chosenTrack == null) {
      return null;
    }

    const audioTrack : ITMAudioTrack = {
      language: takeFirstSet<string>(chosenTrack.language, ""),
      normalized: takeFirstSet<string>(chosenTrack.normalizedLanguage, ""),
      audioDescription: chosenTrack.isAudioDescription === true,
      id: chosenTrack.id,
      representations: chosenTrack.representations.map(parseAudioRepresentation),
    };
    if (chosenTrack.isDub === true) {
      audioTrack.dub = true;
    }
    return audioTrack;
  }

  /**
   * Returns an object describing the chosen text track for the given text
   * Period.
   *
   * Returns null is the the current text track is disabled or not
   * set yet.
   *
   * @param {Period} period - The concerned Period.
   * @returns {Object|null} - The text track chosen for this Period
   */
  public getChosenTextTrack(period : Period) : ITMTextTrack|null {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem != null ? periodItem.text :
                                           null;
    if (textInfos == null) {
      return null;
    }

    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (chosenTextAdaptation == null) {
      return null;
    }

    return {
      language: takeFirstSet<string>(chosenTextAdaptation.language, ""),
      normalized: takeFirstSet<string>(chosenTextAdaptation.normalizedLanguage, ""),
      closedCaption: chosenTextAdaptation.isClosedCaption === true,
      id: chosenTextAdaptation.id,
    };
  }

  /**
   * Returns an object describing the chosen video track for the given video
   * Period.
   *
   * Returns null is the the current video track is disabled or not
   * set yet.
   *
   * @param {Period} period - The concerned Period.
   * @returns {Object|null} - The video track chosen for this Period
   */
  public getChosenVideoTrack(period : Period) : ITMVideoTrack|null {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem != null ? periodItem.video :
                                            null;
    if (videoInfos == null) {
      return null;
    }

    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    if (chosenVideoAdaptation === undefined) {
      return null; // not set yet
    }

    if (chosenVideoAdaptation === null) {
      return null;
    }
    const currAdaptation = chosenVideoAdaptation.adaptation;

    const trickModeTracks = currAdaptation.trickModeTracks !== undefined ?
      currAdaptation.trickModeTracks.map((trickModeAdaptation) => {
        return {
          id: trickModeAdaptation.id,
          representations: trickModeAdaptation.representations
            .map(parseVideoRepresentation),
        };
      }) :
      undefined;

    const videoTrack: ITMVideoTrack = {
      id: currAdaptation.id,
      representations: currAdaptation.representations.map(parseVideoRepresentation),
    };
    if (currAdaptation.isSignInterpreted === true) {
      videoTrack.signInterpreted = true;
    }
    if (currAdaptation.isTrickModeTrack === true) {
      videoTrack.isTrickModeTrack = true;
    }
    if (trickModeTracks !== undefined) {
      videoTrack.trickModeTracks = trickModeTracks;
    }
    return videoTrack;
  }

  /**
   * Returns all available audio tracks for a given Period, as an array of
   * objects.
   *
   * @returns {Array.<Object>}
   */
  public getAvailableAudioTracks(period : Period) : ITMAudioTrackListItem[] {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem != null ? periodItem.audio :
                                           null;
    if (audioInfos == null) {
      return [];
    }

    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
    const currentId = chosenAudioAdaptation != null ? chosenAudioAdaptation.id :
                                                      null;

    return audioInfos.adaptations
      .map((adaptation) => {
        const formatted : ITMAudioTrackListItem = {
          language: takeFirstSet<string>(adaptation.language, ""),
          normalized: takeFirstSet<string>(adaptation.normalizedLanguage, ""),
          audioDescription: adaptation.isAudioDescription === true,
          id: adaptation.id,
          active: currentId == null ? false : currentId === adaptation.id,
          representations: adaptation.representations.map(parseAudioRepresentation),
        };
        if (adaptation.isDub === true) {
          formatted.dub = true;
        }
        return formatted;
      });
  }

  /**
   * Returns all available text tracks for a given Period, as an array of
   * objects.
   *
   * @param {Period} period
   * @returns {Array.<Object>}
   */
  public getAvailableTextTracks(period : Period) : ITMTextTrackListItem[] {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem != null ? periodItem.text :
                                           null;
    if (textInfos == null) {
      return [];
    }

    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    const currentId = chosenTextAdaptation != null ? chosenTextAdaptation.id :
                                                    null;

    return textInfos.adaptations
      .map((adaptation) => ({
        language: takeFirstSet<string>(adaptation.language, ""),
        normalized: takeFirstSet<string>(adaptation.normalizedLanguage, ""),
        closedCaption: adaptation.isClosedCaption === true,
        id: adaptation.id,
        active: currentId == null ? false :
                                    currentId === adaptation.id,
      }));
  }

  /**
   * Returns all available video tracks for a given Period, as an array of
   * objects.
   *
   * @returns {Array.<Object>}
   */
  public getAvailableVideoTracks(period : Period) : ITMVideoTrackListItem[] {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem != null ? periodItem.video :
                                            null;
    if (videoInfos == null) {
      return [];
    }

    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    const currentId = chosenVideoAdaptation === undefined ?
      undefined :
      chosenVideoAdaptation?.adaptation.id ?? undefined;

    return videoInfos.adaptations
      .map((adaptation) => {
        const trickModeTracks = adaptation.trickModeTracks !== undefined ?
          adaptation.trickModeTracks.map((trickModeAdaptation) => {
            return {
              id: trickModeAdaptation.id,
              representations: trickModeAdaptation.representations
                .map(parseVideoRepresentation),
              active: currentId === null ? false :
                                           currentId === trickModeAdaptation.id,
            };
          }) :
          undefined;

        const formatted: ITMVideoTrackListItem = {
          id: adaptation.id,
          active: currentId === null ? false :
                                       currentId === adaptation.id,
          representations: adaptation.representations.map(parseVideoRepresentation),
        };
        if (adaptation.isSignInterpreted === true) {
          formatted.signInterpreted = true;
        }
        if (trickModeTracks !== undefined) {
          formatted.trickModeTracks = trickModeTracks;
        }
        return formatted;
      });
  }

  /**
   * Reset all audio tracks choices to corresponds to the current preferences.
   */
  private _applyAudioPreferences() : void {
    // Remove all memorized choices and start over
    this._audioChoiceMemory = new WeakMap();
    this._resetChosenAudioTracks();
  }

  /**
   * Reset all text tracks choices to corresponds to the current preferences.
   */
  private _applyTextPreferences() : void {
    // Remove all memorized choices and start over
    this._textChoiceMemory = new WeakMap();
    this._resetChosenTextTracks();
  }

  /**
   * Reset all video tracks choices to corresponds to the current preferences.
   */
  private _applyVideoPreferences() : void {
    // Remove all memorized choices and start over
    this._videoChoiceMemory = new WeakMap();
    this._resetChosenVideoTracks();
  }

  /**
   * Choose again the best audio tracks for all current Periods.
   * This is based on two things:
   *   1. what was the track previously chosen for that Period (by checking
   *      `this._audioChoiceMemory`).
   *   2. If no track were previously chosen or if it is not available anymore
   *      we check the audio preferences.
   */
  private _resetChosenAudioTracks() {
    const preferredAudioTracks = this._preferredAudioTracks;
    const normalizedPref = normalizeAudioTracks(preferredAudioTracks);

    const recursiveUpdateAudioTrack = (index : number) : void => {
      if (index >= this._periods.length()) {
        // we did all audio Periods, exit
        return;
      }

      const periodItem = this._periods.get(index);
      if (periodItem.audio == null) {
        // No audio choice for this period, check next one
        recursiveUpdateAudioTrack(index + 1);
        return;
      }

      const { period,
              audio: audioItem } = periodItem;
      const audioAdaptations = period.getSupportedAdaptations("audio");
      const chosenAudioAdaptation = this._audioChoiceMemory.get(period);

      if (chosenAudioAdaptation === null ||
          (
            chosenAudioAdaptation !== undefined &&
            arrayIncludes(audioAdaptations, chosenAudioAdaptation)
          )
      ) {
        // Already best audio for this Period, check next one
        recursiveUpdateAudioTrack(index + 1);
        return;
      }

      const optimalAdaptation = findFirstOptimalAudioAdaptation(audioAdaptations,
                                                                normalizedPref);

      this._audioChoiceMemory.set(period, optimalAdaptation);
      audioItem.adaptation$.next(optimalAdaptation);

      // previous "next" call could have changed everything, start over
      recursiveUpdateAudioTrack(0);
    };

    recursiveUpdateAudioTrack(0);
  }

  /**
   * Choose again the best text tracks for all current Periods.
   * This is based on two things:
   *   1. what was the track previously chosen for that Period (by checking
   *      `this._textChoiceMemory`).
   *   2. If no track were previously chosen or if it is not available anymore
   *      we check the text preferences.
   */
  private _resetChosenTextTracks() {
    const preferredTextTracks = this._preferredTextTracks;
    const normalizedPref = normalizeTextTracks(preferredTextTracks);

    const recursiveUpdateTextTrack = (index : number) : void => {
      if (index >= this._periods.length()) {
        // we did all text Periods, exit
        return;
      }

      const periodItem = this._periods.get(index);
      if (periodItem.text == null) {
        // No text choice for this period, check next one
        recursiveUpdateTextTrack(index + 1);
        return;
      }

      const { period,
              text: textItem } = periodItem;
      const textAdaptations = period.getSupportedAdaptations("text");
      const chosenTextAdaptation = this._textChoiceMemory.get(period);

      if (chosenTextAdaptation === null ||
          (
            chosenTextAdaptation !== undefined &&
            arrayIncludes(textAdaptations, chosenTextAdaptation)
          )
      ) {
        // Already best text for this Period, check next one
        recursiveUpdateTextTrack(index + 1);
        return;
      }

      const optimalAdaptation = findFirstOptimalTextAdaptation(textAdaptations,
                                                               normalizedPref);

      this._textChoiceMemory.set(period, optimalAdaptation);
      textItem.adaptation$.next(optimalAdaptation);

      // previous "next" call could have changed everything, start over
      recursiveUpdateTextTrack(0);
    };

    recursiveUpdateTextTrack(0);
  }

  /**
   * Choose again the best video tracks for all current Periods.
   * This is based on two things:
   *   1. what was the track previously chosen for that Period (by checking
   *      `this._videoChoiceMemory`).
   *   2. If no track were previously chosen or if it is not available anymore
   *      we check the video preferences.
   */
  private _resetChosenVideoTracks() {
    const preferredVideoTracks = this._preferredVideoTracks;
    const recursiveUpdateVideoTrack = (index : number) : void => {
      if (index >= this._periods.length()) {
        // we did all video Periods, exit
        return;
      }

      const periodItem = this._periods.get(index);
      if (periodItem.video == null) {
        // No video choice for this period, check next one
        recursiveUpdateVideoTrack(index + 1);
        return;
      }

      const { period, video: videoItem } = periodItem;
      const videoAdaptations = period.getSupportedAdaptations("video");
      const chosenVideoAdaptation = this._videoChoiceMemory.get(period);

      if (chosenVideoAdaptation === null) {
        // No video track for that one, so nothing to change.
        recursiveUpdateVideoTrack(index + 1);
        return;
      } else if (chosenVideoAdaptation !== undefined &&
                 arrayIncludes(videoAdaptations,
                               chosenVideoAdaptation.rootAdaptation))
      {
        // The right root Adaptation is selected and is still available.
        // Check if the selected Adaptation is still right
        const wantedVideoAdaptation = getRightVideoTrack(
          chosenVideoAdaptation.rootAdaptation,
          this.trickModeTrackEnabled
        );
        if (wantedVideoAdaptation.id === chosenVideoAdaptation.adaptation.id) {
          // We're good, continue.
          recursiveUpdateVideoTrack(index + 1);
          return;
        } else {
          // select the right track
          this._videoChoiceMemory.set(period, {
            rootAdaptation: chosenVideoAdaptation.rootAdaptation,
            adaptation: wantedVideoAdaptation,
          });
          videoItem.adaptation$.next(wantedVideoAdaptation);

          // previous "next" call could have changed everything, start over
          return recursiveUpdateVideoTrack(0);
        }
      }

      const optimalAdaptation = findFirstOptimalVideoAdaptation(videoAdaptations,
                                                                preferredVideoTracks);
      if (optimalAdaptation === null) {
        this._videoChoiceMemory.set(period, null);
        videoItem.adaptation$.next(null);
        // previous "next" call could have changed everything, start over
        return recursiveUpdateVideoTrack(0);
      }

      const newVideoAdaptation = getRightVideoTrack(optimalAdaptation,
                                                    this.trickModeTrackEnabled);
      this._videoChoiceMemory.set(period, { rootAdaptation: optimalAdaptation,
                                            adaptation: newVideoAdaptation });
      videoItem.adaptation$.next(newVideoAdaptation);

      // previous "next" call could have changed everything, start over
      return recursiveUpdateVideoTrack(0);
    };

    recursiveUpdateVideoTrack(0);
  }
}

/**
 * Create a function allowing to compare audio Adaptations with a given
 * `preferredAudioTrack` preference to see if they match.
 *
 * This function is curried to be easily and optimally used in a loop context.
 *
 * @param {Object} preferredAudioTrack - The audio track preference you want to
 * compare audio Adaptations to.
 * @returns {Function} - Function taking in argument an audio Adaptation and
 * returning `true` if it matches the `preferredAudioTrack` preference (and
 * `false` otherwise.
 */
function createAudioPreferenceMatcher(
  preferredAudioTrack : INormalizedPreferredAudioTrackObject
) : (audioAdaptation : Adaptation) => boolean {
  /**
   * Compares an audio Adaptation to the given `preferredAudioTrack` preference.
   * Returns `true` if it matches, false otherwise.
   * @param {Object} audioAdaptation
   * @returns {boolean}
   */
  return function matchAudioPreference(audioAdaptation : Adaptation) : boolean {
    if (preferredAudioTrack.normalized !== undefined) {
      const language = audioAdaptation.normalizedLanguage ?? "";
      if (language !== preferredAudioTrack.normalized) {
        return false;
      }
    }
    if (preferredAudioTrack.audioDescription !== undefined) {
      if (preferredAudioTrack.audioDescription) {
        if (audioAdaptation.isAudioDescription !== true) {
          return false;
        }
      } else if (audioAdaptation.isAudioDescription === true) {
        return false;
      }
    }
    if (preferredAudioTrack.codec === undefined) {
      return true;
    }
    const regxp = preferredAudioTrack.codec.test;
    const codecTestingFn = (rep : Representation) =>
      rep.codec !== undefined && regxp.test(rep.codec);

    if (preferredAudioTrack.codec.all) {
      return audioAdaptation.representations.every(codecTestingFn);
    }
    return audioAdaptation.representations.some(codecTestingFn);
  };
}

/**
 * Find an optimal audio adaptation given their list and the array of preferred
 * audio tracks sorted from the most preferred to the least preferred.
 *
 * `null` if the most optimal audio adaptation is no audio adaptation.
 * @param {Array.<Adaptation>} audioAdaptations
 * @param {Array.<Object|null>} preferredAudioTracks
 * @returns {Adaptation|null}
 */
function findFirstOptimalAudioAdaptation(
  audioAdaptations : Adaptation[],
  preferredAudioTracks : INormalizedPreferredAudioTrack[]
) : Adaptation|null {
  if (audioAdaptations.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredAudioTracks.length; i++) {
    const preferredAudioTrack = preferredAudioTracks[i];

    if (preferredAudioTrack === null) {
      return null;
    }

    const matchPreferredAudio = createAudioPreferenceMatcher(preferredAudioTrack);
    const foundAdaptation = arrayFind(audioAdaptations, matchPreferredAudio);

    if (foundAdaptation !== undefined) {
      return foundAdaptation;
    }
  }

  // no optimal adaptation, just return the first one
  return audioAdaptations[0];
}

/**
 * Create a function allowing to compare text Adaptations with a given
 * `preferredTextTrack` preference to see if they match.
 *
 * This function is curried to be easily and optimally used in a loop context.
 *
 * @param {Object} preferredTextTrack - The text track preference you want to
 * compare text Adaptations to.
 * @returns {Function} - Function taking in argument a text Adaptation and
 * returning `true` if it matches the `preferredTextTrack` preference (and
 * `false` otherwise.
 */
function createTextPreferenceMatcher(
  preferredTextTrack : INormalizedPreferredTextTrackObject
) : (textAdaptation : Adaptation) => boolean {
  /**
   * Compares a text Adaptation to the given `preferredTextTrack` preference.
   * Returns `true` if it matches, false otherwise.
   * @param {Object} textAdaptation
   * @returns {boolean}
   */
  return function matchTextPreference(textAdaptation : Adaptation) : boolean {
    return takeFirstSet<string>(textAdaptation.normalizedLanguage,
                                "") === preferredTextTrack.normalized &&
    (preferredTextTrack.closedCaption ? textAdaptation.isClosedCaption === true :
                                        textAdaptation.isClosedCaption !== true);
  };
}

/**
 * Find an optimal text adaptation given their list and the array of preferred
 * text tracks sorted from the most preferred to the least preferred.
 *
 * `null` if the most optimal text adaptation is no text adaptation.
 * @param {Array.<Object>} textAdaptations
 * @param {Array.<Object|null>} preferredTextTracks
 * @returns {Adaptation|null}
 */
function findFirstOptimalTextAdaptation(
  textAdaptations : Adaptation[],
  preferredTextTracks : INormalizedPreferredTextTrack[]
) : Adaptation|null {
  if (textAdaptations.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredTextTracks.length; i++) {
    const preferredTextTrack = preferredTextTracks[i];

    if (preferredTextTrack === null) {
      return null;
    }

    const matchPreferredText = createTextPreferenceMatcher(preferredTextTrack);
    const foundAdaptation = arrayFind(textAdaptations, matchPreferredText);

    if (foundAdaptation !== undefined) {
      return foundAdaptation;
    }
  }

  // no optimal adaptation
  return null;
}

/**
 * Create a function allowing to compare video Adaptations with a given
 * `preferredVideoTrack` preference to see if they match.
 *
 * This function is curried to be easily and optimally used in a loop context.
 *
 * @param {Object} preferredVideoTrack - The video track preference you want to
 * compare video Adaptations to.
 * @returns {Function} - Function taking in argument a video Adaptation and
 * returning `true` if it matches the `preferredVideoTrack` preference (and
 * `false` otherwise.
 */
function createVideoPreferenceMatcher(
  preferredVideoTrack : IVideoTrackPreferenceObject
) : (videoAdaptation : Adaptation) => boolean {
  /**
   * Compares a video Adaptation to the given `preferredVideoTrack` preference.
   * Returns `true` if it matches, false otherwise.
   * @param {Object} videoAdaptation
   * @returns {boolean}
   */
  return function matchVideoPreference(videoAdaptation : Adaptation) : boolean {
    if (preferredVideoTrack.signInterpreted !== undefined &&
        preferredVideoTrack.signInterpreted !== videoAdaptation.isSignInterpreted)
    {
      return false;
    }
    if (preferredVideoTrack.codec === undefined) {
      return true;
    }
    const regxp = preferredVideoTrack.codec.test;
    const codecTestingFn = (rep : Representation) =>
      rep.codec !== undefined && regxp.test(rep.codec);

    if (preferredVideoTrack.codec.all) {
      return videoAdaptation.representations.every(codecTestingFn);
    }
    return videoAdaptation.representations.some(codecTestingFn);
  };
}

/**
 * Find an optimal video adaptation given their list and the array of preferred
 * video tracks sorted from the most preferred to the least preferred.
 *
 * `null` if the most optimal video adaptation is no video adaptation.
 * @param {Array.<Adaptation>} videoAdaptations
 * @param {Array.<Object|null>} preferredvideoTracks
 * @returns {Adaptation|null}
 */
function findFirstOptimalVideoAdaptation(
  videoAdaptations : Adaptation[],
  preferredVideoTracks : IVideoTrackPreference[]
) : Adaptation|null {
  if (videoAdaptations.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredVideoTracks.length; i++) {
    const preferredVideoTrack = preferredVideoTracks[i];

    if (preferredVideoTrack === null) {
      return null;
    }

    const matchPreferredVideo = createVideoPreferenceMatcher(preferredVideoTrack);
    const foundAdaptation = arrayFind(videoAdaptations, matchPreferredVideo);

    if (foundAdaptation !== undefined) {
      return foundAdaptation;
    }
  }

  // no optimal adaptation, just return the first one
  return videoAdaptations[0];
}

/**
 * Returns the index of the given `period` in the given `periods`
 * SortedList.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {Object} period
 * @returns {number|undefined}
 */
function findPeriodIndex(
  periods : SortedList<ITMPeriodInfos>,
  period : Period
) : number|undefined {
  for (let i = 0; i < periods.length(); i++) {
    const periodI = periods.get(i);
    if (periodI.period.id === period.id) {
      return i;
    }
  }
}

/**
 * Returns element in the given `periods` SortedList that corresponds to the
 * `period` given.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {Object} period
 * @returns {Object|undefined}
 */
function getPeriodItem(
  periods : SortedList<ITMPeriodInfos>,
  period : Period
) : ITMPeriodInfos|undefined {
  for (let i = 0; i < periods.length(); i++) {
    const periodI = periods.get(i);
    if (periodI.period.id === period.id) {
      return periodI;
    }
  }
}

/**
 * Parse video Representation into a ITMVideoRepresentation.
 * @param {Object} representation
 * @returns {Object}
 */
function parseVideoRepresentation(
  { id, bitrate, frameRate, width, height, codec, hdrInfo } : Representation
) : ITMVideoRepresentation {
  return { id, bitrate, frameRate, width, height, codec, hdrInfo };
}

/**
 * Parse audio Representation into a ITMAudioRepresentation.
 * @param {Object} representation
 * @returns {Object}
 */
function parseAudioRepresentation(
  { id, bitrate, codec } : Representation
)  : ITMAudioRepresentation {
  return { id, bitrate, codec };
}

function getRightVideoTrack(
  adaptation : Adaptation,
  isTrickModeEnabled : boolean
) : Adaptation {
  if (isTrickModeEnabled &&
      adaptation.trickModeTracks?.[0] !== undefined)
  {
    return adaptation.trickModeTracks[0];
  }
  return adaptation;
}
