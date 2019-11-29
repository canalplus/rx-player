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

import {
  BehaviorSubject,
  Subject,
} from "rxjs";
import log from "../../log";
import {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import arrayFind from "../../utils/array_find";
import arrayIncludes from "../../utils/array_includes";
import normalizeLanguage from "../../utils/languages";
import SortedList from "../../utils/sorted_list";
import takeFirstSet from "../../utils/take_first_set";

// single preference for an audio track Adaptation
export type IAudioTrackPreference = null |
                                    { language : string;
                                      audioDescription : boolean; };

// single preference for a text track Adaptation
export type ITextTrackPreference = null |
                                   { language : string;
                                     closedCaption : boolean; };

// audio track returned by the TrackManager
export interface ITMAudioTrack { language : string;
                                 normalized : string;
                                 audioDescription : boolean;
                                 dub? : boolean;
                                 id : number|string; }

// text track returned by the TrackManager
export interface ITMTextTrack { language : string;
                                normalized : string;
                                closedCaption : boolean;
                                id : number|string; }

interface ITMVideoRepresentation { id : string|number;
                                   bitrate : number;
                                   width? : number;
                                   height? : number;
                                   codec? : string;
                                   frameRate? : string; }

// video track returned by the TrackManager
export interface ITMVideoTrack { id : number|string;
                                 representations: ITMVideoRepresentation[]; }

// audio track from a list of audio tracks returned by the TrackManager
export interface ITMAudioTrackListItem
  extends ITMAudioTrack { active : boolean; }

// text track from a list of text tracks returned by the TrackManager
export interface ITMTextTrackListItem
  extends ITMTextTrack { active : boolean; }

// video track from a list of video tracks returned by the TrackManager
export interface ITMVideoTrackListItem
  extends ITMVideoTrack { active : boolean; }

// stored audio information for a single period
interface ITMPeriodAudioInfos { adaptations : Adaptation[];
                                adaptation$ : Subject<Adaptation|null>; }

// stored text information for a single period
interface ITMPeriodTextInfos { adaptations : Adaptation[];
                               adaptation$ : Subject<Adaptation|null>; }

// stored video information for a single period
interface ITMPeriodVideoInfos { adaptations : Adaptation[];
                                adaptation$ : Subject<Adaptation|null>; }

// stored information for a single period
interface ITMPeriodInfos { period : Period;
                           audio? : ITMPeriodAudioInfos;
                           text? : ITMPeriodTextInfos;
                           video? : ITMPeriodVideoInfos; }

type INormalizedPreferredAudioTrack = null |
                                      { normalized : string;
                                        audioDescription : boolean; };

type INormalizedTextTrack = null |
                            { normalized : string;
                              closedCaption : boolean; };

function normalizeAudioTracks(
  tracks : IAudioTrackPreference[]
) : INormalizedPreferredAudioTrack[] {
  return tracks.map(t => t == null ?
    t :
    { normalized: normalizeLanguage(t.language),
      audioDescription: t.audioDescription });
}

function normalizeTextTracks(
  tracks : ITextTrackPreference[]
) : INormalizedTextTrack[] {
  return tracks.map(t => t == null ?
    t :
    { normalized: normalizeLanguage(t.language),
      closedCaption: t.closedCaption });
}

/**
 * Manage audio and text tracks for all active periods.
 * Chose the audio and text tracks for each period and record this choice.
 * @class TrackManager
 */
export default class TrackManager {
  // Current Periods considered by the TrackManager.
  // Sorted by start time ascending
  private _periods : SortedList<ITMPeriodInfos>;

  // Array of preferred languages for audio tracks.
  // Sorted by order of preference descending.
  private _preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;

  // Array of preferred languages for text tracks.
  // Sorted by order of preference descending.
  private _preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>;

  // Memoization of the previously-chosen audio Adaptation for each Period.
  private _audioChoiceMemory : WeakMap<Period, Adaptation|null>;

  // Memoization of the previously-chosen text Adaptation for each Period.
  private _textChoiceMemory : WeakMap<Period, Adaptation|null>;

  // Memoization of the previously-chosen video Adaptation for each Period.
  private _videoChoiceMemory : WeakMap<Period, Adaptation|null>;

  /**
   * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
   * of audio track preferences
   * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
   * of text track preferences
   */
  constructor(defaults : {
    preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;
    preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>;
  }) {
    const { preferredAudioTracks, preferredTextTracks } = defaults;
    this._periods = new SortedList((a, b) => a.period.start - b.period.start);

    this._audioChoiceMemory = new WeakMap();
    this._textChoiceMemory = new WeakMap();
    this._videoChoiceMemory = new WeakMap();

    this._preferredAudioTracks = preferredAudioTracks;
    this._preferredTextTracks = preferredTextTracks;
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
    let adaptations = period.adaptations[bufferType];
    if (adaptations == null) {
      adaptations = [];
    }
    if (periodItem != null) {
      if (periodItem[bufferType] != null) {
        log.warn(`TrackManager: ${bufferType} already added for period`, period);
        return;
      } else {
        periodItem[bufferType] = { adaptations, adaptation$ };
      }
    } else {
      this._periods.add({ period,
                          [bufferType]: { adaptations, adaptation$, } });
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
      log.warn(`TrackManager: ${bufferType} not found for period`, period);
      return;
    }

    const periodItem = this._periods.get(periodIndex);
    if (periodItem[bufferType] == null) {
      log.warn(`TrackManager: ${bufferType} already removed for period`, period);
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
    this._updateAudioTrackChoices();
    this._updateTextTrackChoices();
    this._updateVideoTrackChoices();
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
      throw new Error("TrackManager: Given Period not found.");
    }

    const preferredAudioTracks = this._preferredAudioTracks.getValue();
    const audioAdaptations = period.adaptations.audio === undefined ?
      [] :
      period.adaptations.audio;
    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);

    if (chosenAudioAdaptation === null) {
      // If the Period was previously without audio, keep it that way
      audioInfos.adaptation$.next(null);
    } else if (chosenAudioAdaptation === undefined ||
               !arrayIncludes(audioAdaptations, chosenAudioAdaptation)
    ) {
      // Find the optimal audio Adaptation
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
      throw new Error("TrackManager: Given Period not found.");
    }

    const preferredTextTracks = this._preferredTextTracks.getValue();
    const textAdaptations = period.adaptations.text === undefined ?
      [] :
      period.adaptations.text;
    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (chosenTextAdaptation === null) {
      // If the Period was previously without text, keep it that way
      textInfos.adaptation$.next(null);
    } else if (chosenTextAdaptation === undefined ||
               !arrayIncludes(textAdaptations, chosenTextAdaptation)
    ) {
      // Find the optimal text Adaptation
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
      throw new Error("TrackManager: Given Period not found.");
    }

    const videoAdaptations = period.adaptations.video === undefined ?
      [] :
      period.adaptations.video;
    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);

    if (chosenVideoAdaptation === null) {
      // If the Period was previously without video, keep it that way
      videoInfos.adaptation$.next(null);
    } else if (chosenVideoAdaptation === undefined ||
        !arrayIncludes(videoAdaptations, chosenVideoAdaptation)
    ) {
      const optimalAdaptation = videoAdaptations[0];
      this._videoChoiceMemory.set(period, optimalAdaptation);
      videoInfos.adaptation$.next(optimalAdaptation);
    } else {
      videoInfos.adaptation$.next(chosenVideoAdaptation); // set last one
    }
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
      throw new Error("TrackManager: Given Period not found.");
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
      throw new Error("TrackManager: Given Period not found.");
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

    const wantedAdaptation = arrayFind(videoInfos.adaptations,
                                       ({ id }) => id === wantedId);

    if (wantedAdaptation === undefined) {
      throw new Error("Video Track not found.");
    }
    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    if (chosenVideoAdaptation === wantedAdaptation) {
      return;
    }

    this._videoChoiceMemory.set(period, wantedAdaptation);
    videoInfos.adaptation$.next(wantedAdaptation);
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
      throw new Error("TrackManager: Given Period not found.");
    }
    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (chosenTextAdaptation === null) {
      return;
    }

    this._textChoiceMemory.set(period, null);
    textInfos.adaptation$.next(null);
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

    const adaptationChosen = this._audioChoiceMemory.get(period);
    if (adaptationChosen == null) {
      return null;
    }

    const audioTrack : ITMAudioTrack = {
      language: takeFirstSet<string>(adaptationChosen.language, ""),
      normalized: takeFirstSet<string>(adaptationChosen.normalizedLanguage, ""),
      audioDescription: adaptationChosen.isAudioDescription === true,
      id: adaptationChosen.id,
    };
    if (adaptationChosen.isDub === true) {
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
    if (chosenVideoAdaptation == null) {
      return null;
    }
    return { id: chosenVideoAdaptation.id,
             representations: chosenVideoAdaptation.representations
                                .map(parseVideoRepresentation) };
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
    const currentId = chosenVideoAdaptation != null ? chosenVideoAdaptation.id :
                                                      null;

    return videoInfos.adaptations
      .map((adaptation) => {
        return {
          id: adaptation.id,
          active: currentId === null ? false :
                                       currentId === adaptation.id,
          representations: adaptation.representations.map(parseVideoRepresentation),
        };
    });
  }

  private _updateAudioTrackChoices() {
    const preferredAudioTracks = this._preferredAudioTracks.getValue();
    const normalizedPref = normalizeAudioTracks(preferredAudioTracks);

    const recursiveUpdateAudioTrack = (index : number) : void => {
      if (index >= this._periods.length()) {
        // we did all audio Buffers, exit
        return;
      }

      const periodItem = this._periods.get(index);
      if (periodItem.audio == null) {
        // No audio Buffer for this period, check next one
        recursiveUpdateAudioTrack(index + 1);
        return;
      }

      const { period,
              audio: audioItem } = periodItem;
      const audioAdaptations = period.adaptations.audio === undefined ?
        [] :
        period.adaptations.audio;
      const chosenAudioAdaptation = this._audioChoiceMemory.get(period);

      if (chosenAudioAdaptation === null ||
          (
            chosenAudioAdaptation !== undefined &&
            arrayIncludes(audioAdaptations, chosenAudioAdaptation)
          )
      ) {
        // Already best audio for this Buffer, check next one
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

  private _updateTextTrackChoices() {
    const preferredTextTracks = this._preferredTextTracks.getValue();
    const normalizedPref = normalizeTextTracks(preferredTextTracks);

    const recursiveUpdateTextTrack = (index : number) : void => {
      if (index >= this._periods.length()) {
        // we did all text Buffers, exit
        return;
      }

      const periodItem = this._periods.get(index);
      if (periodItem.text == null) {
        // No text Buffer for this period, check next one
        recursiveUpdateTextTrack(index + 1);
        return;
      }

      const { period,
              text: textItem } = periodItem;
      const textAdaptations = period.adaptations.text === undefined ?
        [] :
        period.adaptations.text;
      const chosenTextAdaptation = this._textChoiceMemory.get(period);

      if (chosenTextAdaptation === null ||
          (
            chosenTextAdaptation !== undefined &&
            arrayIncludes(textAdaptations, chosenTextAdaptation)
          )
      ) {
        // Already best text for this Buffer, check next one
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

  private _updateVideoTrackChoices() {
    const recursiveUpdateVideoTrack = (index : number) : void => {
      if (index >= this._periods.length()) {
        // we did all video Buffers, exit
        return;
      }

      const periodItem = this._periods.get(index);
      if (periodItem.video == null) {
        // No video Buffer for this period, check next one
        recursiveUpdateVideoTrack(index + 1);
        return;
      }

      const { period, video: videoItem, } = periodItem;
      const videoAdaptations = period.adaptations.video === undefined ?
        [] :
        period.adaptations.video;
      const chosenVideoAdaptation = this._videoChoiceMemory.get(period);

      if (chosenVideoAdaptation === null ||
          (
            chosenVideoAdaptation !== undefined &&
            arrayIncludes(videoAdaptations, chosenVideoAdaptation)
          )
      ) {
        // Already best video for this Buffer, check next one
        recursiveUpdateVideoTrack(index + 1);
        return;
      }

      const optimalAdaptation = videoAdaptations[0];

      this._videoChoiceMemory.set(period, optimalAdaptation);
      videoItem.adaptation$.next(optimalAdaptation);

      // previous "next" call could have changed everything, start over
      recursiveUpdateVideoTrack(0);
    };

    recursiveUpdateVideoTrack(0);
  }
}

/**
 * Find an optimal audio adaptation given their list and the array of preferred
 * audio tracks sorted from the most preferred to the least preferred.
 *
 * null if the most optimal audio adaptation is no audio adaptation.
 * @param {Array.<Adaptation>} audioAdaptations
 * @returns {Adaptation|null}
 */
function findFirstOptimalAudioAdaptation(
  audioAdaptations : Adaptation[],
  preferredAudioTracks : Array<{ normalized: string; audioDescription: boolean }|null>
) : Adaptation|null {
  if (audioAdaptations.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredAudioTracks.length; i++) {
    const preferredAudioTrack = preferredAudioTracks[i];

    if (preferredAudioTrack === null) {
      return null;
    }

    const foundAdaptation = arrayFind(audioAdaptations, (audioAdaptation) =>
      takeFirstSet<string>(audioAdaptation.normalizedLanguage,
                           "") === preferredAudioTrack.normalized &&
      (preferredAudioTrack.audioDescription ?
        audioAdaptation.isAudioDescription === true :
        audioAdaptation.isAudioDescription !== true)
    );

    if (foundAdaptation !== undefined) {
      return foundAdaptation;
    }

  }

  // no optimal adaptation, just return the first one
  return audioAdaptations[0];
}

/**
 * Find an optimal text adaptation given their list and the array of preferred
 * text tracks sorted from the most preferred to the least preferred.
 *
 * null if the most optimal text adaptation is no text adaptation.
 * @param {Array.<Adaptation>} audioAdaptations
 * @returns {Adaptation|null}
 */
function findFirstOptimalTextAdaptation(
  textAdaptations : Adaptation[],
  preferredTextTracks : Array<{ normalized: string; closedCaption: boolean }|null>
) : Adaptation|null {
  if (textAdaptations.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredTextTracks.length; i++) {
    const preferredTextTrack = preferredTextTracks[i];

    if (preferredTextTrack === null) {
      return null;
    }

    const foundAdaptation = arrayFind(textAdaptations, (textAdaptation) =>
      takeFirstSet<string>(textAdaptation.normalizedLanguage,
                           "") === preferredTextTrack.normalized &&
      (preferredTextTrack.closedCaption ? textAdaptation.isClosedCaption === true :
                                          textAdaptation.isClosedCaption !== true)
    );

    if (foundAdaptation !== undefined) {
      return foundAdaptation;
    }

  }

  // no optimal adaptation
  return null;
}

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
  { id, bitrate, frameRate, width, height, codec } : Representation
) : ITMVideoRepresentation {
  return { id,
           bitrate,
           frameRate,
           width,
           height,
           codec };
}
