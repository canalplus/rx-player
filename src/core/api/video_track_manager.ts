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
 * This file is used to abstract the notion of video track-switching
 * for an easier API management.
 */

import arrayFind from "array-find";
import { Subject } from "rxjs";
import log from "../../log";
import { Adaptation, Period } from "../../manifest";
import arrayIncludes from "../../utils/array-includes";
import SortedList from "../../utils/sorted_list";

// video track returned by the VideoTrackManager
export interface ILMVideoTrack {
  id : number|string;
}

// video track from a list of video tracks returned by the VideoTrackManager
export interface ILMVideoTrackListItem extends ILMVideoTrack {
  active : boolean;
}

// stored video informations for a single period
interface ILMPeriodVideoInfos {
  adaptations : Adaptation[];
  adaptation$ : Subject<Adaptation|null> ;
}

// stored informations for a single period
interface ILMPeriodInfos {
  period : Period;
  video? : ILMPeriodVideoInfos;
}

/**
 * Manage video tracks for all active periods.
 *
 * Most methods here allow to interact with the first chronologically added
 * Period.
 *
 * Roles for subsequent periods are also chosen accordingly.
 * @class VideoTrackManager
 */
export default class VideoTrackManager {
  /**
   * Current Periods considered by the VideoTrackManager.
   * Sorted by start time ascending
   * @type {SortedList}
   * @private
   */
  private _periods : SortedList<ILMPeriodInfos>;

  /**
   * Memoization of the previously-chosen video Adaptation for each Period.
   * @type {WeakMap}
   */
  private _videoChoiceMemory : WeakMap<Period, Adaptation|null>;

  /**
   * @param {Object} defaults
   */
  constructor() {
    this._periods = new SortedList((a, b) => a.period.start - b.period.start);
    this._videoChoiceMemory = new WeakMap();
  }

  /**
   * Add Subject to choose Adaptation for new "video" Period.
   * @param {string} bufferType
   * @param {Period} period
   * @param {Subject} adaptations
   */
  public addPeriod(
    bufferType : "video",
    period : Period,
    adaptation$ : Subject<Adaptation|null>
  ) : void {
    const periodItem = getPeriodItem(this._periods, period);
    if (periodItem != null) {
      if (periodItem[bufferType] != null) {
        log.warn(`VideoTrackManager: ${bufferType} already added for period`, period);
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
   * Remove Subject to choose an "video" Adaptation for a Period.
   * @param {string} bufferType
   * @param {Period} period
   */
  public removePeriod(
    bufferType : "video",
    period : Period
  ) : void {
    const periodIndex = findPeriodIndex(this._periods, period);
    if (periodIndex == null) {
      log.warn(`VideoTrackManager: ${bufferType} not found for period`, period);
      return;
    }

    const periodItem = this._periods.get(periodIndex);
    if (periodItem[bufferType] == null) {
      log.warn(`VideoTrackManager: ${bufferType} already removed for period`, period);
      return;
    }
    delete periodItem[bufferType];
    if (periodItem.video == null) {
      this._periods.removeFirst(periodItem);
    }
  }

  /**
   * Update the choice of all added Periods based on:
   *   1. What was the last chosen adaptation
   *   2. If not found, the preferences
   */
  public update(): void {
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
      throw new Error("VideoTrackManager: Given Period not found.");
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
   * Disable the given video track for a given Period.
   *
   * @param {Period} period - The concerned Period.
   *
   * @throws Error - Throws if the period given has not been added
   */
  public disableVideoTrack(period : Period) : void {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem && periodItem.video;
    if (!videoInfos) {
      throw new Error("LanguageManager: Given Period not found.");
    }
    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    if (chosenVideoAdaptation === null) {
      return;
    }

    this._videoChoiceMemory.set(period, null);
    videoInfos.adaptation$.next(null);
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
  public getChosenVideoTrack(period : Period) : ILMVideoTrack|null {
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
    };
  }

  /**
   * Returns all available video tracks for a given Period, as an array of
   * objects.
   *
   * @returns {Array.<Object>}
   */
  public getAvailableVideoTracks(period : Period) : ILMVideoTrackListItem[] {
    const periodItem = getPeriodItem(this._periods, period);
    const videoInfos = periodItem && periodItem.video;
    if (videoInfos == null) {
      return [];
    }

    const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
    const currentId = chosenVideoAdaptation && chosenVideoAdaptation.id;

    return videoInfos.adaptations
      .map((adaptation) => ({
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
  }
}

function findPeriodIndex(
  periods : SortedList<ILMPeriodInfos>,
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
  periods : SortedList<ILMPeriodInfos>,
  period : Period
) : ILMPeriodInfos|undefined {
  for (let i = 0; i < periods.length(); i++) {
    const periodI = periods.get(i);
    if (periodI.period.id === period.id) {
      return periodI;
    }
  }
}
