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
 * This file is used to abstract the notion of text and audio tracks switching
 * for an easier API management.
 */

import arrayFind from "array-find";
import { Subject } from "rxjs";
import log from "../../log";
import {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import arrayIncludes from "../../utils/array-includes";
import SortedList from "../../utils/sorted_list";

// single preference for an audio track Adaptation
export type IAudioTrackPreference = null | {
  language : string;
  normalized : string;
  audioDescription : boolean;
};

// single preference for a text track Adaptation
export type ITextTrackPreference = null | {
  language : string;
  normalized : string;
  closedCaption : boolean;
};

// audio track returned by the TrackManager
export interface ITMAudioTrack {
  language : string;
  normalized : string;
  audioDescription : boolean;
  id : number|string;
}

// text track returned by the TrackManager
export interface ITMTextTrack {
  language : string;
  normalized : string;
  closedCaption : boolean;
  id : number|string;
}

interface ITMVideoRepresentation {
  id : string|number;
  bitrate : number;
  width? : number;
  height? : number;
  codec? : string;
  frameRate? : string;
}

// video track returned by the TrackManager
export interface ITMVideoTrack {
  id : number|string;
  representations: ITMVideoRepresentation[];
}

// audio track from a list of audio tracks returned by the TrackManager
export interface ITMAudioTrackListItem extends ITMAudioTrack {
  active : boolean;
}

// text track from a list of text tracks returned by the TrackManager
export interface ITMTextTrackListItem extends ITMTextTrack {
  active : boolean;
}

// video track from a list of video tracks returned by the TrackManager
export interface ITMVideoTrackListItem extends ITMVideoTrack {
  active : boolean;
}

// stored audio informations for a single period
interface ITMPeriodAudioInfos {
  adaptations : Adaptation[];
  adaptation$ : Subject<Adaptation|null> ;
}

// stored text informations for a single period
interface ITMPeriodTextInfos {
  adaptations : Adaptation[];
  adaptation$ : Subject<Adaptation|null> ;
}

// stored video informations for a single period
interface ITMPeriodVideoInfos {
  adaptations : Adaptation[];
  adaptation$ : Subject<Adaptation|null> ;
}

// stored informations for a single period
interface ITMPeriodInfos {
  period : Period;
  audio? : ITMPeriodAudioInfos;
  text? : ITMPeriodTextInfos;
  video? : ITMPeriodVideoInfos;
}

/**
 * Manage audio and text tracks for all active periods.
 * Chose the audio and text tracks for each period and record this choice.
 * @class TrackManager
 */
export default class TrackManager {
  /**
   * Current Periods considered by the TrackManager.
   * Sorted by start time ascending
   * @type {SortedList}
   * @private
   */
  private _periods : SortedList<ITMPeriodInfos>;

  /**
   * Array of preferred languages for audio tracks.
   * Sorted by order of preference descending.
   * @type {Array.<Object>}
   * @private
   */
  private _preferredAudioTracks : IAudioTrackPreference[];

  /**
   * Array of preferred languages for text tracks.
   * Sorted by order of preference descending.
   * @type {Array.<Object>}
   * @private
   */
  private _preferredTextTracks : ITextTrackPreference[];

  /**
   * Memoization of the previously-chosen audio Adaptation for each Period.
   * @type {WeakMap}
   */
  private _audioChoiceMemory : WeakMap<Period, Adaptation|null>;

  /**
   * Memoization of the previously-chosen text Adaptation for each Period.
   * @type {WeakMap}
   */
  private _textChoiceMemory : WeakMap<Period, Adaptation|null>;

  /**
   * Memoization of the previously-chosen video Adaptation for each Period.
   * @type {WeakMap}
   */
  private _videoChoiceMemory : WeakMap<Period, Adaptation|null>;

  /**
   * @param {Object} defaults
   */
  constructor(defaults : {
    preferredAudioTracks? : IAudioTrackPreference[];
    preferredTextTracks? : ITextTrackPreference[];
  } = {}) {
    const {
      preferredAudioTracks,
      preferredTextTracks,
    } = defaults;
    this._periods = new SortedList((a, b) => a.period.start - b.period.start);

    this._audioChoiceMemory = new WeakMap();
    this._textChoiceMemory = new WeakMap();
    this._videoChoiceMemory = new WeakMap();

    this._preferredAudioTracks = preferredAudioTracks || [];
    this._preferredTextTracks = preferredTextTracks || [];
  }

  /**
   * Add Subject to choose Adaptation for new "audio" or "text" Period.
   * @param {string} bufferType
   * @param {Period} period
   * @param {Subject} adaptations
   */
  public addPeriod(
    bufferType : "audio" | "text"| "video",
    period : Period,
    adaptation$ : Subject<Adaptation|null>
  ) : void {
    const periodItem = getPeriodItem(this._periods, period);
    if (periodItem != null) {
      if (periodItem[bufferType] != null) {
        log.warn(`TrackManager: ${bufferType} already added for period`, period);
        return;
      } else {
        periodItem[bufferType] = {
          adaptations: period.adaptations[bufferType] || [],
          adaptation$,
        };
      }
    } else {
      this._periods.add({
        period,
        [bufferType]: {
          adaptations: period.adaptations[bufferType] || [],
          adaptation$,
        },
      });
    }
  }

  /**
   * Remove Subject to choose an "audio" or "text" Adaptation for a Period.
   * @param {string} bufferType
   * @param {Period} period
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
    if (periodItem.audio == null && periodItem.text == null) {
      this._periods.removeElement(periodItem);
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
   * @param {Period} period
   *
   * @throws Error - Throws if the period given has not been added
   */
  public setInitialAudioTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem && periodItem.audio;
    if (!audioInfos || !periodItem) {
      throw new Error("TrackManager: Given Period not found.");
    }

    const preferredAudioTracks = this._preferredAudioTracks;
    const audioAdaptations = period.adaptations.audio || [];
    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);

    if (
      chosenAudioAdaptation === undefined ||
      !arrayIncludes(audioAdaptations, chosenAudioAdaptation)
    ) {
      const optimalAdaptation = findFirstOptimalAudioAdaptation(
        audioAdaptations, preferredAudioTracks);

      this._audioChoiceMemory.set(period, optimalAdaptation);
      audioInfos.adaptation$.next(optimalAdaptation);
    } else {
      audioInfos.adaptation$.next(chosenAudioAdaptation);
    }
  }

  /**
   * Emit initial text Adaptation through the given Subject based on:
   *   - the preferred text tracks
   *   - the last choice for this period, if one
   * @param {Period} period
   *
   * @throws Error - Throws if the period given has not been added
   */
  public setInitialTextTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem && periodItem.text;
    if (!textInfos || !periodItem) {
      throw new Error("TrackManager: Given Period not found.");
    }

    const preferredTextTracks = this._preferredTextTracks;
    const textAdaptations = period.adaptations.text || [];
    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (
      chosenTextAdaptation === undefined ||
      !arrayIncludes(textAdaptations, chosenTextAdaptation)
    ) {
      const optimalAdaptation = findFirstOptimalTextAdaptation(
        textAdaptations, preferredTextTracks);

      this._textChoiceMemory.set(period, optimalAdaptation);
      textInfos.adaptation$.next(optimalAdaptation);
    } else {
      textInfos.adaptation$.next(chosenTextAdaptation);
    }
  }

  /**
   * Emit initial video Adaptation through the given Subject based on:
   *   - the preferred video tracks
   *   - the last choice for this period, if one
   * @param {Period} period
   *
   * @throws Error - Throws if the period given has not been added
   */
  public setInitialVideoTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem && periodItem.video;
    if (!videoInfos || !periodItem) {
      throw new Error("TrackManager: Given Period not found.");
    }

    const videoAdaptations = period.adaptations.video || [];
    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);

    if (
        chosenVideoAdaptation === undefined ||
      !arrayIncludes(videoAdaptations, chosenVideoAdaptation)
    ) {
      const optimalAdaptation = videoAdaptations[0];

      this._videoChoiceMemory.set(period, optimalAdaptation);
      videoInfos.adaptation$.next(optimalAdaptation);
    } else {
      videoInfos.adaptation$.next(chosenVideoAdaptation);
    }
  }

  /**
   * Set audio track based on the ID of its adaptation for a given added Period.
   *
   * @param {Period} period - The concerned Period.
   * @param {string} wantedId - adaptation id of the wanted track
   *
   * @throws Error - Throws if the period given has not been added
   * @throws Error - Throws if the given id is not found in any audio adaptation
   * of the given Period.
   */
  public setAudioTrackByID(period : Period, wantedId : string) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem && periodItem.audio;
    if (!audioInfos) {
      throw new Error("TrackManager: Given Period not found.");
    }

    const wantedAdaptation = arrayFind(audioInfos.adaptations, ({ id }) =>
      id === wantedId);

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
   *
   * @param {Period} period - The concerned Period.
   * @param {string} wantedId - adaptation id of the wanted track
   *
   * @throws Error - Throws if the period given has not been added
   * @throws Error - Throws if the given id is not found in any text adaptation
   * of the given Period.
   */
  public setTextTrackByID(period : Period, wantedId : string) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem && periodItem.text;
    if (!textInfos) {
      throw new Error("TrackManager: Given Period not found.");
    }
    const wantedAdaptation = arrayFind(textInfos.adaptations, ({ id }) =>
      id === wantedId);

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
   *
   * @param {Period} period - The concerned Period.
   * @param {string} wantedId - adaptation id of the wanted track
   *
   * @throws Error - Throws if the period given has not been added
   * @throws Error - Throws if the given id is not found in any video adaptation
   * of the given Period.
   */
  public setVideoTrackByID(period : Period, wantedId : string) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem && periodItem.video;
    if (!videoInfos) {
      throw new Error("LanguageManager: Given Period not found.");
    }

    const wantedAdaptation = arrayFind(videoInfos.adaptations, ({ id }) =>
      id === wantedId);

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
   * Disable the given audio track for a given Period.
   *
   * @param {Period} period - The concerned Period.
   *
   * @throws Error - Throws if the period given has not been added
   */
  public disableAudioTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem && periodItem.audio;
    if (!audioInfos) {
      throw new Error("TrackManager: Given Period not found.");
    }
    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
    if (chosenAudioAdaptation === null) {
      return;
    }

    this._audioChoiceMemory.set(period, null);
    audioInfos.adaptation$.next(null);
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
    const textInfos = periodItem && periodItem.text;
    if (!textInfos) {
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
   * @param {Period} period
   * @returns {Object|null}
   */
  public getChosenAudioTrack(period : Period) : ITMAudioTrack|null {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem && periodItem.audio;
    if (audioInfos == null) {
      return null;
    }

    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
    if (!chosenAudioAdaptation) {
      return null;
    }

    return {
      language: chosenAudioAdaptation.language || "",
      normalized: chosenAudioAdaptation.normalizedLanguage || "",
      audioDescription: !!chosenAudioAdaptation.isAudioDescription,
      id: chosenAudioAdaptation.id,
    };
  }

  /**
   * Returns an object describing the chosen text track for the given text
   * Period.
   *
   * Returns null is the the current text track is disabled or not
   * set yet.
   *
   * @param {Period} period
   * @returns {Object|null}
   */
  public getChosenTextTrack(period : Period) : ITMTextTrack|null {
    const periodItem = getPeriodItem(this._periods, period);
    const textInfos = periodItem && periodItem.text;
    if (textInfos == null) {
      return null;
    }

    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    if (!chosenTextAdaptation) {
      return null;
    }

    return {
      language: chosenTextAdaptation.language || "",
      normalized: chosenTextAdaptation.normalizedLanguage || "",
      closedCaption: !!chosenTextAdaptation.isClosedCaption,
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
   * @param {Period} period
   * @returns {Object|null}
   */
  public getChosenVideoTrack(period : Period) : ITMVideoTrack|null {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem && periodItem.video;
    if (videoInfos == null) {
      return null;
    }

    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    if (!chosenVideoAdaptation) {
      return null;
    }
    return {
      id: chosenVideoAdaptation.id,
      representations: chosenVideoAdaptation.representations
        .map(parseVideoRepresentation),
    };
  }

  /**
   * Returns all available audio tracks for a given Period, as an array of
   * objects.
   *
   * @returns {Array.<Object>}
   */
  public getAvailableAudioTracks(period : Period) : ITMAudioTrackListItem[] {
    const periodItem = getPeriodItem(this._periods, period);
    const audioInfos = periodItem && periodItem.audio;
    if (audioInfos == null) {
      return [];
    }

    const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
    const currentId = chosenAudioAdaptation && chosenAudioAdaptation.id;

    return audioInfos.adaptations
      .map((adaptation) => ({
        language: adaptation.language || "",
        normalized: adaptation.normalizedLanguage || "",
        audioDescription: !!adaptation.isAudioDescription,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
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
    const textInfos = periodItem && periodItem.text;
    if (textInfos == null) {
      return [];
    }

    const chosenTextAdaptation = this._textChoiceMemory.get(period);
    const currentId = chosenTextAdaptation && chosenTextAdaptation.id;

    return textInfos.adaptations
      .map((adaptation) => ({
        language: adaptation.language || "",
        normalized: adaptation.normalizedLanguage || "",
        closedCaption: !!adaptation.isClosedCaption,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
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
    const videoInfos = periodItem && periodItem.video;
    if (videoInfos == null) {
      return [];
    }

    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    const currentId = chosenVideoAdaptation && chosenVideoAdaptation.id;

    return videoInfos.adaptations
      .map((adaptation) => {
        return {
          id: adaptation.id,
          active: currentId == null ? false : currentId === adaptation.id,
          representations: adaptation.representations.map(parseVideoRepresentation),
        };
    });
  }

  private _updateAudioTrackChoices() {
    const preferredAudioTracks = this._preferredAudioTracks;

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

      const {
        period,
        audio: audioItem,
      } = periodItem;
      const audioAdaptations = period.adaptations.audio || [];
      const chosenAudioAdaptation = this._audioChoiceMemory.get(period);

      if (
        chosenAudioAdaptation === null ||
        (
          chosenAudioAdaptation !== undefined &&
          arrayIncludes(audioAdaptations, chosenAudioAdaptation)
        )
      ) {
        // Already best audio for this Buffer, check next one
        recursiveUpdateAudioTrack(index + 1);
        return;
      }

      const optimalAdaptation = findFirstOptimalAudioAdaptation(
        audioAdaptations, preferredAudioTracks);

      this._audioChoiceMemory.set(period, optimalAdaptation);
      audioItem.adaptation$.next(optimalAdaptation);

      // previous "next" call could have changed everything, start over
      recursiveUpdateAudioTrack(0);
    };

    recursiveUpdateAudioTrack(0);
  }

  private _updateTextTrackChoices() {
    const preferredTextTracks = this._preferredTextTracks;

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

      const {
        period,
        text: textItem,
      } = periodItem;
      const textAdaptations = period.adaptations.text || [];
      const chosenTextAdaptation = this._textChoiceMemory.get(period);

      if (
        chosenTextAdaptation === null ||
        (
          chosenTextAdaptation !== undefined &&
          arrayIncludes(textAdaptations, chosenTextAdaptation)
        )
      ) {
        // Already best text for this Buffer, check next one
        recursiveUpdateTextTrack(index + 1);
        return;
      }

      const optimalAdaptation = findFirstOptimalTextAdaptation(
        textAdaptations, preferredTextTracks);

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

      const {
        period,
        video: videoItem,
      } = periodItem;
      const videoAdaptations = period.adaptations.video || [];
      const chosenVideoAdaptation = this._videoChoiceMemory.get(period);

      if (
        chosenVideoAdaptation === null ||
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

// /**
//  * Returns true if the given audio adaptation is an optimal choice for a period
//  * given:
//  *
//  *   - the list of audio adaptations in the period
//  *
//  *   - an array of preferred audio configurations sorted from the most preferred
//  *     to the least preferred.
//  *
//  * @param {Adaptation|null} adaptation
//  * @param {Array.<Adaptation>} audioAdaptations
//  * @param {Array.<Object>} preferredAudioTracks
//  * @returns {Boolean}
//  */
// function isAudioAdaptationOptimal(
//   adaptation : Adaptation|null,
//   audioAdaptations : Adaptation[],
//   preferredAudioTracks : IAudioTrackPreference[]
// ) : boolean {
//   if (!audioAdaptations.length) {
//     return adaptation === null;
//   }

//   for (let i = 0; i < preferredAudioTracks.length; i++) {
//     const preferredAudioTrack = preferredAudioTracks[i];

//     if (preferredAudioTrack === null) {
//       return adaptation === null;
//     }

//     const foundAdaptation = arrayFind(audioAdaptations, (audioAdaptation) =>
//       audioAdaptation.normalizedLanguage === preferredAudioTrack.normalized &&
//       !!audioAdaptation.isAudioDescription === preferredAudioTrack.audioDescription
//     );

//     if (foundAdaptation !== undefined) {
//       if (adaptation === null) {
//         return false;
//       }

//       return (
//         (foundAdaptation.normalizedLanguage || "") ===
//         (adaptation.normalizedLanguage || "")
//       ) && !!foundAdaptation.isAudioDescription === !!adaptation.isAudioDescription;
//     }

//   }
//   return true; // no optimal adaptation, just return true
// }

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
  preferredAudioTracks : IAudioTrackPreference[]
) : Adaptation|null {
  if (!audioAdaptations.length) {
    return null;
  }

  for (let i = 0; i < preferredAudioTracks.length; i++) {
    const preferredAudioTrack = preferredAudioTracks[i];

    if (preferredAudioTrack === null) {
      return null;
    }

    const foundAdaptation = arrayFind(audioAdaptations, (audioAdaptation) =>
      (audioAdaptation.normalizedLanguage || "") === preferredAudioTrack.normalized &&
      !!audioAdaptation.isAudioDescription === preferredAudioTrack.audioDescription
    );

    if (foundAdaptation !== undefined) {
      return foundAdaptation;
    }

  }

  // no optimal adaptation, just return the first one
  return audioAdaptations[0];
}

// /**
//  * Returns true if the given text adaptation is an optimal choice for a period
//  * given:
//  *
//  *   - the list of text adaptations in the period
//  *
//  *   - an array of preferred text configurations sorted from the most preferred
//  *     to the least preferred.
//  *
//  * @param {Adaptation|null} adaptation
//  * @param {Array.<Adaptation>} audioAdaptations
//  * @param {Array.<Object>} preferredAudioTracks
//  * @returns {Boolean}
//  */
// function isTextAdaptationOptimal(
//   adaptation : Adaptation|null,
//   textAdaptations : Adaptation[],
//   preferredTextTracks : ITextTrackPreference[]
// ) : boolean {
//   if (!textAdaptations.length) {
//     return adaptation === null;
//   }

//   for (let i = 0; i < preferredTextTracks.length; i++) {
//     const preferredTextTrack = preferredTextTracks[i];

//     if (preferredTextTrack === null) {
//       return adaptation === null;
//     }

//     const foundAdaptation = arrayFind(textAdaptations, (textAdaptation) =>
//       (textAdaptation.normalizedLanguage || "") === preferredTextTrack.normalized &&
//       !!textAdaptation.isClosedCaption === preferredTextTrack.closedCaption
//     );

//     if (foundAdaptation !== undefined) {
//       if (adaptation === null) {
//         return false;
//       }

//       return (
//         (foundAdaptation.normalizedLanguage || "") ===
//         (adaptation.normalizedLanguage || "")
//       ) && !!foundAdaptation.isClosedCaption === !!adaptation.isClosedCaption;
//     }

//   }
//   return adaptation === null;
// }

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
  preferredTextTracks : ITextTrackPreference[]
) : Adaptation|null {
  if (!textAdaptations.length) {
    return null;
  }

  for (let i = 0; i < preferredTextTracks.length; i++) {
    const preferredTextTrack = preferredTextTracks[i];

    if (preferredTextTrack === null) {
      return null;
    }

    const foundAdaptation = arrayFind(textAdaptations, (textAdaptation) =>
      (textAdaptation.normalizedLanguage || "") === preferredTextTrack.normalized &&
      !!textAdaptation.isClosedCaption === preferredTextTrack.closedCaption
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
  return { id, bitrate, frameRate, width, height, codec };
}
