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
import {
  IAudioRepresentation,
  IAudioTrack,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IPeriod,
  ITextTrack,
  IVideoRepresentation,
  IVideoTrack,
} from "../../public_types";
import arrayFind from "../../utils/array_find";
import assert from "../../utils/assert";
import EventEmitter from "../../utils/event_emitter";
import takeFirstSet from "../../utils/take_first_set";

/** Every information stored for a single Period. */
export interface ITMPeriodObject {
  /** The Period in question. */
  period : Period;
  /**
   * If `true`, this Period was present at the last `updatePeriodList` call,
   * meaning it's probably still in the Manifest.
   *
   * If `false`, this Period was not. In that case it is probably just here
   * because some audio/video/text buffer still contains data of the given type.
   */
  inManifest : boolean;
  audio : IAudioPeriodInfo;
  text : ITextPeriodInfo;
  video : IVideoPeriodInfo;

  isRemoved : boolean;
}

export interface IAudioPeriodInfo {
  /** The audio track wanted. */
  wantedTrack : Adaptation | null;
  /**
   * Last `wantedTrack` emitted through `subject`.
   * This value is mutated just before `subject` is "nexted" whereas
   * `wantedTrack` is updated as soon as we know which track is wanted.
   *
   * Having both `wantedTrack` and `lastEmittedTrack` allows to detect if some
   * potential side-effects already led to the "nexting" of `subject` with the
   * last `wantedTrack`, preventing the the `TrackChoiceManager` from doing it
   * again.
   */
  lastEmittedTrack : Adaptation | null | undefined;
  /** Subject through which the wanted track will be emitted.*/
  subject : Subject<Adaptation | null> |
            undefined;
}

export interface ITextPeriodInfo {
  /** The text track wanted. */
  wantedTrack : Adaptation | null;
  /**
   * Last `wantedTrack` emitted through `subject`.
   * This value is mutated just before `subject` is "nexted" whereas
   * `wantedTrack` is updated as soon as we know which track is wanted.
   *
   * Having both `wantedTrack` and `lastEmittedTrack` allows to detect if some
   * potential side-effects already led to the "nexting" of `subject` with the
   * last `wantedTrack`, preventing the the `TrackChoiceManager` from doing it
   * again.
   */
  lastEmittedTrack : Adaptation | null | undefined;
  /** Subject through which the wanted track will be emitted.*/
  subject : Subject<Adaptation | null> |
            undefined;
}

export interface IVideoPeriodInfo {
  /**
   * The "base" Adaptation for `wantedTrack` (if a trickmode track was chosen,
   * this is the Adaptation the trickmode track is linked to, and not the
   * trickmode track itself).
   */
  wantedTrackBase : Adaptation | null;
  /**
   * The wanted Adaptation itself (may be different from `wantedTrackBase`
   * when a trickmode track is chosen, in which case `wantedTrackBase` is
   * the Adaptation the trickmode track is linked to and `wantedTrack` is the
   * trickmode track).
   */
  wantedTrack : Adaptation | null;
  /**
   * Last `wantedTrack` emitted through `subject`.
   * This value is mutated just before `subject` is "nexted" whereas
   * `wantedTrack` is updated as soon as we know which track is wanted.
   *
   * Having both `wantedTrack` and `lastEmittedTrack` allows to detect if some
   * potential side-effects already led to the "nexting" of `subject` with the
   * last `wantedTrack`, preventing the the `TrackChoiceManager` from doing it
   * again.
   */
  lastEmittedTrack : Adaptation | null | undefined;
  /** Subject through which the wanted track will be emitted.*/
  subject : Subject<Adaptation | null> |
            undefined;
}

/** Events emitted by the TrackChoiceManager. */
interface ITrackChoiceManagerEvents {
  newAvailablePeriods : IPeriod[];
}

export default class TrackChoiceManager extends EventEmitter<ITrackChoiceManagerEvents> {
  /**
   * Store track selection information, per Period.
   * Sorted by Period's start time ascending
   */
  private _storedPeriodInfo : ITMPeriodObject[];

  /**
   * Period information that was before in `_storedPeriodInfo` but has since
   * been removed is added to the `_cachedPeriodInfo` cache as a weak reference.
   *
   * This allows to still retrieve old track information for Periods which are
   * for example not in the Manifest anymore as long as the same Period's
   * reference is still kept.
   */
  private _cachedPeriodInfo : WeakMap<Period, ITMPeriodObject>;

  /** Tells if trick mode has been enabled by the RxPlayer user */
  private _isTrickModeTrackEnabled: boolean;

  constructor(
    args : { preferTrickModeTracks: boolean }
  ) {
    super();
    this._storedPeriodInfo = [];
    this._cachedPeriodInfo = new WeakMap();
    this._isTrickModeTrackEnabled = args.preferTrickModeTracks;
  }

  /**
   * Return Array of Period information, to allow an outside application to
   * modify the track of any Period.
   * @returns {Array.<Object>}
   */
  public getAvailablePeriods() : IPeriod[] {
    // Note: We voluntarly do not include any Period from `_cachedPeriodInfo` here;
    // because we do not want to allow the user switching tracks for older
    // Periods.
    return this._storedPeriodInfo.map(p => {
      return { start: p.period.start,
               end: p.period.end,
               id: p.period.id };
    });
  }

  /**
   * Update the list of Periods handled by the TrackChoiceManager and make a
   * track choice decision for each of them.
   * @param {Array.<Object>} periods - The list of available periods,
   * chronologically.
   */
  public updatePeriodList(periods : Period[]) : void {
    // We assume that they are always sorted chronologically
    // In dev mode, perform a runtime check that this is the case
    if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
      for (let i = 1; i < periods.length; i++) {
        assert(periods[i - 1].start <= periods[i].start);
      }
    }

    /** Periods which have just been added. */
    const addedPeriods : ITMPeriodObject[] = [];

    /** Tracks we have to update due to the previous one not being available anymore */
    const updatedTracks : Array<IAudioPeriodInfo |
                                ITextPeriodInfo |
                                IVideoPeriodInfo> = [];
    let newPListIdx = 0;
    for (let i = 0; i < this._storedPeriodInfo.length; i++) {
      const oldPeriod = this._storedPeriodInfo[i].period;
      const newPeriod = periods[newPListIdx];
      if (newPeriod === undefined) {
        // We reached the end of the new Periods, remove remaining old Periods
        for (let j = this._storedPeriodInfo.length - 1; j >= i; j--) {
          this._storedPeriodInfo[j].inManifest = false;
          if (isPeriodItemRemovable(this._storedPeriodInfo[j])) {
            this._removePeriodObject(j);
          }
        }
      } else if (oldPeriod === newPeriod) {
        newPListIdx++;

        const oldTextAdaptation = this._storedPeriodInfo[i].text.wantedTrack;
        if (oldTextAdaptation !== null) {
          const textAdaptations = newPeriod.getSupportedAdaptations("text");
          const stillHere = textAdaptations.some(a => a.id === oldTextAdaptation.id);
          if (!stillHere) {
            log.warn("TrackChoiceManager: Chosen text Adaptation not available anymore");
            const periodObj = this._storedPeriodInfo[i].text;
            periodObj.wantedTrack = textAdaptations[0] ?? null;
            updatedTracks.push(periodObj);
          }
        }
        const oldVideoAdaptation = this._storedPeriodInfo[i].video.wantedTrack;
        if (oldVideoAdaptation !== null) {
          const videoAdaptations = newPeriod.getSupportedAdaptations("video");
          const stillHere = videoAdaptations.some(a => a.id === oldVideoAdaptation.id);
          if (!stillHere) {
            log.warn("TrackChoiceManager: Chosen video Adaptation not available anymore");
            const periodObj = this._storedPeriodInfo[i].video;
            const chosenBaseTrack = videoAdaptations[0] ?? null;
            periodObj.wantedTrackBase = chosenBaseTrack;
            if (chosenBaseTrack === null) {
              periodObj.wantedTrack = null;
            } else {
              periodObj.wantedTrack = getRightVideoTrack(chosenBaseTrack,
                                                         this._isTrickModeTrackEnabled);

            }
            updatedTracks.push(periodObj);
          }
        }
        const oldAudioAdaptation = this._storedPeriodInfo[i].audio.wantedTrack;
        if (oldAudioAdaptation !== null) {
          const audioAdaptations = newPeriod.getSupportedAdaptations("audio");
          const stillHere = audioAdaptations.some(a => a.id === oldAudioAdaptation.id);
          if (!stillHere) {
            log.warn("TrackChoiceManager: Chosen audio Adaptation not available anymore");
            const periodObj = this._storedPeriodInfo[i].audio;
            periodObj.wantedTrack = audioAdaptations[0] ?? null;
            updatedTracks.push(periodObj);
          }
        }
        // (If not, what do?)
      } else if (oldPeriod.start <= newPeriod.start) {
        // This old Period does not exist anymore.
        this._storedPeriodInfo[i].inManifest = false;
        if (isPeriodItemRemovable(this._storedPeriodInfo[i])) {
          this._removePeriodObject(i);
          i--;
        }
      } else {
        const newPeriodInfo = generatePeriodInfo(newPeriod,
                                                 true,
                                                 this._isTrickModeTrackEnabled);
        // oldPeriod.start > newPeriod.start: insert newPeriod before
        this._storedPeriodInfo.splice(i, 0, newPeriodInfo);
        addedPeriods.push(newPeriodInfo);
        newPListIdx++;
        // Note: we don't increment `i` on purpose here, as we want to check the
        // same oldPeriod at the next loop iteration
      }
    }

    if (newPListIdx < periods.length) {
      // Add further new Period
      const periodsToAdd = periods.slice(newPListIdx)
        .map(p => generatePeriodInfo(p, true, this._isTrickModeTrackEnabled));
      this._storedPeriodInfo.push(...periodsToAdd);
      addedPeriods.push(...periodsToAdd);
    }

    if (updatedTracks.length > 0) {
      for (const track of  updatedTracks) {
        if (track.subject !== undefined && track.lastEmittedTrack !== track.wantedTrack) {
          track.lastEmittedTrack = track.wantedTrack;
          track.subject.next(track.wantedTrack);
        }
      }
    }

    const periodsAdded = addedPeriods.reduce((acc : IPeriod[], p) => {
      if (!p.isRemoved) {
        acc.push({ id: p.period.id, start: p.period.start, end: p.period.end });
      }
      return acc;
    }, []);
    this.trigger("newAvailablePeriods", periodsAdded);
  }

  /**
   * Add Subject to choose Adaptation for new "audio" or "text" Period.
   *
   * Note that such subject has to be removed through `removeTrackSubject` so
   * ressources can be freed.
   * @param {string} bufferType - The concerned buffer type
   * @param {Period} period - The concerned Period.
   * @param {Subject.<Object|null>} subject - A subject through which the
   * choice will be given
   */
  public addTrackSubject(
    bufferType : "audio" | "text"| "video",
    period : Period,
    subject : Subject<Adaptation|null>
  ) : void {
    let periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
    if (periodObj === undefined) { // The Period has not yet been added.
      periodObj = this._manuallyAddPeriod(period);
      this.trigger("newAvailablePeriods",
                   [{ id: period.id,
                      start: period.start,
                      end: period.end }]);
    } else if (periodObj[bufferType].subject !== undefined) {
      log.error(`TrackChoiceManager: Subject already added for ${bufferType} ` +
                `and Period ${period.start}`);
      return;
    } else {
      periodObj[bufferType].subject = subject;
    }

    const choice = periodObj[bufferType].wantedTrack;
    if (periodObj[bufferType].lastEmittedTrack !== choice) {
      periodObj[bufferType].lastEmittedTrack = choice;
      subject.next(choice);
    }
  }

  /**
   * Remove Subject to choose an "audio", "video" or "text" Adaptation for a
   * Period.
   * @param {string} bufferType - The concerned buffer type
   * @param {Period} period - The concerned Period.
   */
  public removeTrackSubject(
    bufferType : "audio" | "text" | "video",
    period : Period
  ) : void {
    const periodIndex = findPeriodIndex(this._storedPeriodInfo, period);
    if (periodIndex === undefined) {
      log.warn(`TrackChoiceManager: ${bufferType} not found for period`,
               period.start);
      return;
    }

    const periodObj = this._storedPeriodInfo[periodIndex];
    const choiceItem = periodObj[bufferType];
    if (choiceItem?.subject === undefined) {
      log.warn(`TrackChoiceManager: Subject already removed for ${bufferType} ` +
               `and Period ${period.start}`);
      return;
    }

    choiceItem.subject = undefined;
    choiceItem.lastEmittedTrack = undefined;

    if (isPeriodItemRemovable(periodObj)) {
      this._removePeriodObject(periodIndex);
    }
  }

  /**
   * Allows to recuperate a "Period Object" - used in get/set methods of the
   * `TrackChoiceManager` - by giving the Period itself.
   *
   * This method should be preferred when possible over `getPeriodObjectFromId`
   * because it is able to fallback on an internal cache in case the
   * corresponding Period is not stored anymore.
   * This for example could happen when a Period has been removed from the
   * Manifest yet may still be needed (e.g. because its linked segments might
   * still live in the buffers).
   *
   * Note however that this cache-retrieval logic is based on a Map whose key
   * is the Period's JavaScript reference. As such, the cache won't be used if
   * `Period` corresponds to a copy of the original `Period` object.
   *
   * @param {Object} period
   * @returns {Object}
   */
  public getPeriodObjectFromPeriod(
    period : Period
  ) : ITMPeriodObject | undefined {
    const periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
    if (periodObj === undefined && period !== undefined) {
      return this._cachedPeriodInfo.get(period);
    }
    return periodObj;
  }

  /**
   * Allows to recuperate a "Period Object" - used in get/set methods of the
   * `TrackChoiceManager` - by giving the Period's id.
   *
   * Note that unlike `getPeriodObjectFromPeriod` this method is only going to look
   * into currently stored Period and as such old Periods not in the Manifest
   * anymore might not be retrievable.
   * If you want to retrieve Period objects linked to such Period, you might
   * prefer to use `getPeriodObjectFromPeriod` (which necessitates the original
   * Period object).
   *
   * @param {string} periodId - The concerned Period's id
   * @returns {Object}
   */
  public getPeriodObjectFromId(
    periodId : string
  ) : ITMPeriodObject | undefined {
    return getPeriodItem(this._storedPeriodInfo, periodId);
  }

  public disableVideoTrickModeTracks(): void {
    if (!this._isTrickModeTrackEnabled) {
      return;
    }
    this._isTrickModeTrackEnabled = false;
    this._resetVideoTrackChoices();
  }

  public enableVideoTrickModeTracks() : void {
    if (this._isTrickModeTrackEnabled) {
      return;
    }
    this._isTrickModeTrackEnabled = true;
    this._resetVideoTrackChoices();
  }

  /**
   * Reset the TrackChoiceManager's Period objects:
   *   - All Period which are not in the manifest currently will be removed.
   *   - All subjects used to communicate the wanted track will be removed.
   *
   * You might want to call this API when restarting playback.
   */
  public resetPeriodObjects() : void {
    for (let i = this._storedPeriodInfo.length - 1; i >= 0; i--) {
      const storedObj = this._storedPeriodInfo[i];
      storedObj.audio.lastEmittedTrack = undefined;
      storedObj.audio.subject = undefined;
      storedObj.video.lastEmittedTrack = undefined;
      storedObj.video.subject = undefined;
      storedObj.text.lastEmittedTrack = undefined;
      storedObj.text.subject = undefined;
      if (!storedObj.inManifest) {
        this._removePeriodObject(i);
      }
    }
  }

  /**
   * @returns {boolean}
   */
  public isTrickModeEnabled() : boolean {
    return this._isTrickModeTrackEnabled;
  }

  /**
   * Set track based on its type and the ID of its Adaptation for a given added
   * Period.
   * @param {Object} periodObj - The concerned Period's object
   * @param {string} bufferType - The type of track to set.
   * @param {string} wantedId - adaptation id of the wanted track.
   */
  public setTrack(
    periodObj : ITMPeriodObject,
    bufferType : "audio" | "video" | "text",
    wantedId : string
  ) : void {
    const period = periodObj.period;
    const wantedAdaptation = arrayFind(period.getSupportedAdaptations(bufferType),
                                       ({ id }) => id === wantedId);

    if (wantedAdaptation === undefined) {
      throw new Error(`Wanted ${bufferType} track not found.`);
    }

    const typeInfo = periodObj[bufferType];
    let newAdaptation;
    if (bufferType === "video") {
      if (periodObj.video.wantedTrackBase !== wantedAdaptation) {
        periodObj.video.wantedTrackBase = wantedAdaptation;
      }
      newAdaptation = getRightVideoTrack(wantedAdaptation,
                                         this._isTrickModeTrackEnabled);
    } else {
      newAdaptation = wantedAdaptation;
    }
    if (typeInfo.wantedTrack === newAdaptation) {
      return;
    }
    typeInfo.wantedTrack = newAdaptation;
    if (typeInfo.subject !== undefined) {
      typeInfo.lastEmittedTrack = newAdaptation;
      typeInfo.subject.next(newAdaptation);
    }
  }

  /**
   * Disable the current text track for a given period.
   *
   * @param {Object} periodObj - The concerned Period's object
   * @param {string} bufferType - The type of track to disable.
   * @throws Error - Throws if the period given has not been added
   */
  public disableTrack(
    periodObj : ITMPeriodObject,
    bufferType : "audio" | "video" | "text"
  ) : void {
    const trackInfo = periodObj[bufferType];
    if (trackInfo.wantedTrack === null) {
      return;
    }

    if (bufferType === "video") {
      periodObj.video.wantedTrack = null;
      periodObj.video.wantedTrackBase = null;
    }
    trackInfo.wantedTrack = null;
    if (trackInfo.subject !== undefined) {
      trackInfo.lastEmittedTrack = null;
      trackInfo.subject.next(null);
    }
  }

  /**
   * Returns an object describing the chosen audio track for the given audio
   * Period.
   *
   * Returns `null` is the the current audio track is disabled or not
   * set yet.
   *
   * Returns `undefined` if the given Period's id is not currently found in the
   * `TrackChoiceManager`. The cause being most probably that the corresponding
   * Period is not available anymore.
   * If you're in that case and if still have the corresponding JavaScript
   * reference to the wanted Period, you can call `getOldAudioTrack` with it. It
   * will try retrieving the choice it made from its cache.
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Object|null|undefined} - The audio track chosen for this Period.
   * `null` if audio tracks were disabled and `undefined` if the Period is not
   * known.
   */
  public getChosenAudioTrack(
    periodObj : ITMPeriodObject
  ) : IAudioTrack | null {
    return toAudioTrack(periodObj.audio.wantedTrack);
  }


  /**
   * Returns an object describing the chosen text track for the given text
   * Period.
   *
   * Returns null is the the current text track is disabled or not
   * set yet.
   *
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Object|null} - The text track chosen for this Period
   */
  public getChosenTextTrack(
    periodObj : ITMPeriodObject
  ) : ITextTrack | null {
    const chosenTrack = periodObj.text.wantedTrack;
    if (chosenTrack === null) {
      return null;
    }

    return {
      language: takeFirstSet<string>(chosenTrack.language, ""),
      normalized: takeFirstSet<string>(chosenTrack.normalizedLanguage, ""),
      closedCaption: chosenTrack.isClosedCaption === true,
      id: chosenTrack.id,
      label: chosenTrack.label,
    };
  }

  /**
   * Returns an object describing the chosen video track for the given video
   * Period.
   *
   * Returns null is the the current video track is disabled or not
   * set yet.
   *
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Object|null} - The video track chosen for this Period
   */
  public getChosenVideoTrack(
    periodObj : ITMPeriodObject
  ) : IVideoTrack | null {
    const chosenTrack = periodObj.video.wantedTrack;
    if (chosenTrack === null) {
      return null;
    }

    const trickModeTracks = chosenTrack.trickModeTracks !== undefined ?
      chosenTrack.trickModeTracks.map((trickModeAdaptation) => {
        const representations = trickModeAdaptation.representations
          .map(parseVideoRepresentation);
        const trickMode : IVideoTrack = { id: trickModeAdaptation.id,
                                          representations,
                                          isTrickModeTrack: true };
        if (trickModeAdaptation.isSignInterpreted === true) {
          trickMode.signInterpreted = true;
        }
        return trickMode;
      }) :
      undefined;

    const videoTrack: IVideoTrack = {
      id: chosenTrack.id,
      representations: chosenTrack.representations.map(parseVideoRepresentation),
      label: chosenTrack.label,
    };
    if (chosenTrack.isSignInterpreted === true) {
      videoTrack.signInterpreted = true;
    }
    if (chosenTrack.isTrickModeTrack === true) {
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
   * Returns `undefined` if the given Period's id is not known.
   *
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Array.<Object>}
   */
  public getAvailableAudioTracks(
    periodObj : ITMPeriodObject
  ) : IAvailableAudioTrack[]|undefined {
    const chosenAudioAdaptation = periodObj.audio.wantedTrack;
    const currentId = chosenAudioAdaptation !== null ?
      chosenAudioAdaptation.id :
      null;
    return periodObj.period.getSupportedAdaptations("audio")
      .map((adaptation) => {
        const formatted : IAvailableAudioTrack = {
          language: takeFirstSet<string>(adaptation.language, ""),
          normalized: takeFirstSet<string>(adaptation.normalizedLanguage, ""),
          audioDescription: adaptation.isAudioDescription === true,
          id: adaptation.id,
          active: currentId === null ? false :
                                       currentId === adaptation.id,
          representations: adaptation.representations.map(parseAudioRepresentation),
          label: adaptation.label,
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
   * Returns `undefined` if the given Period's id is not known.
   *
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Array.<Object>}
   */
  public getAvailableTextTracks(
    periodObj : ITMPeriodObject
  ) : IAvailableTextTrack[]|undefined {
    const chosenTextAdaptation = periodObj.text.wantedTrack;
    const currentId = chosenTextAdaptation !== null ?
      chosenTextAdaptation.id :
      null;

    return periodObj.period.getSupportedAdaptations("text")
      .map((adaptation) => ({
        language: takeFirstSet<string>(adaptation.language, ""),
        normalized: takeFirstSet<string>(adaptation.normalizedLanguage, ""),
        closedCaption: adaptation.isClosedCaption === true,
        id: adaptation.id,
        active: currentId === null ? false :
                                     currentId === adaptation.id,
        label: adaptation.label,
      }));
  }

  /**
   * Returns all available video tracks for a given Period, as an array of
   * objects.
   *
   * Returns `undefined` if the given Period's id is not known.
   *
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Array.<Object>}
   */
  public getAvailableVideoTracks(
    periodObj : ITMPeriodObject
  ) : IAvailableVideoTrack[]|undefined {
    const chosenVideoAdaptation = periodObj.video.wantedTrack;
    const currentId = chosenVideoAdaptation === null ?
      undefined :
      chosenVideoAdaptation.id;

    return periodObj.period.getSupportedAdaptations("video")
      .map((adaptation) => {
        const trickModeTracks = adaptation.trickModeTracks !== undefined ?
          adaptation.trickModeTracks.map((trickModeAdaptation) => {
            const isActive = currentId === null ? false :
                                                  currentId === trickModeAdaptation.id;
            const representations = trickModeAdaptation.representations
              .map(parseVideoRepresentation);
            const trickMode : IAvailableVideoTrack = { id: trickModeAdaptation.id,
                                                       representations,
                                                       isTrickModeTrack: true,
                                                       active: isActive };
            if (trickModeAdaptation.isSignInterpreted === true) {
              trickMode.signInterpreted = true;
            }
            return trickMode;
          }) :
          undefined;

        const formatted: IAvailableVideoTrack = {
          id: adaptation.id,
          active: currentId === null ? false :
                                       currentId === adaptation.id,
          representations: adaptation.representations.map(parseVideoRepresentation),
          label: adaptation.label,
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
   * @param {Period} period
   * @returns {Object}
   */
  private _manuallyAddPeriod(period : Period) : ITMPeriodObject {
    const periodObj = generatePeriodInfo(period, false, this._isTrickModeTrackEnabled);
    for (let i = 0; i < this._storedPeriodInfo.length; i++) {
      if (this._storedPeriodInfo[i].period.start > period.start) {
        this._storedPeriodInfo.splice(i, 0, periodObj);
        return periodObj;
      }
    }
    this._storedPeriodInfo.push(periodObj);
    return periodObj;
  }

  private _resetVideoTrackChoices() {
    for (let i = 0; i < this._storedPeriodInfo.length; i++) {
      const periodObj = this._storedPeriodInfo[i];
      const chosenBaseTrack = periodObj.video.wantedTrackBase;
      if (chosenBaseTrack !== null) {
        const chosenTrack = getRightVideoTrack(chosenBaseTrack,
                                               this._isTrickModeTrackEnabled);
        periodObj.video.wantedTrackBase = chosenBaseTrack;
        periodObj.video.wantedTrack = chosenTrack;
      } else {
        periodObj.video.wantedTrackBase = null;
        periodObj.video.wantedTrack = null;
      }
    }

    // Clone the current Period list to not be influenced if Periods are removed
    // or added while the loop is running.
    const sliced = this._storedPeriodInfo.slice();
    for (let i = 0; i < sliced.length; i++) {
      const videoItem = sliced[i].video;
      if (videoItem.lastEmittedTrack !== videoItem.wantedTrack &&
          videoItem.subject !== undefined)
      {
        videoItem.lastEmittedTrack = videoItem.wantedTrack;
        videoItem.subject.next(videoItem.wantedTrack);
      }
    }
  }

  private _removePeriodObject(
    index : number
  ) {
    if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
      assert(index < this._storedPeriodInfo.length, "Invalid index for Period removal");
    }
    const oldPeriodItem = this._storedPeriodInfo[index];
    this._storedPeriodInfo[index].isRemoved = true;
    this._storedPeriodInfo.splice(index, 1);
    this._cachedPeriodInfo.set(oldPeriodItem.period, oldPeriodItem);
  }
}

/**
 * Returns the index of the given `period` in the given `periods`
 * Array.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {Object} period
 * @returns {number|undefined}
 */
function findPeriodIndex(
  periods : ITMPeriodObject[],
  period : Period
) : number|undefined {
  for (let i = 0; i < periods.length; i++) {
    const periodI = periods[i];
    if (periodI.period.id === period.id) {
      return i;
    }
  }
}

/**
 * Returns element in the given `periods` Array that corresponds to the
 * `period` given.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {string} periodId
 * @returns {Object|undefined}
 */
function getPeriodItem(
  periods : ITMPeriodObject[],
  periodId : string
) : ITMPeriodObject|undefined {
  for (let i = 0; i < periods.length; i++) {
    const periodI = periods[i];
    if (periodI.period.id === periodId) {
      return periodI;
    }
  }
}

/**
 * Parse video Representation into a IVideoRepresentation.
 * @param {Object} representation
 * @returns {Object}
 */
function parseVideoRepresentation(
  { id, bitrate, frameRate, width, height, codec, hdrInfo } : Representation
) : IVideoRepresentation {
  return { id, bitrate, frameRate, width, height, codec, hdrInfo };
}

/**
 * A `ITMPeriodObject` should only be removed once all subjects linked to it do
 * not exist anymore, to keep the possibility of making track choices.
 * @param {Object} periodObj
 * @returns {boolean}
 */
function isPeriodItemRemovable(
  periodObj : ITMPeriodObject
) : boolean {
  return !periodObj.inManifest &&
         periodObj.text?.subject === undefined &&
         periodObj.audio?.subject === undefined &&
         periodObj.video?.subject === undefined;
}

/**
 * Parse audio Representation into a ITMAudioRepresentation.
 * @param {Object} representation
 * @returns {Object}
 */
function parseAudioRepresentation(
  { id, bitrate, codec } : Representation
)  : IAudioRepresentation {
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

/**
 * Generate an `ITMPeriodObject` object for the given Period, selecting the
 * default track for each type.
 * @param {Object} period
 * @param {boolean} inManifest
 * @param {boolean} _isTrickModeTrackEnabled
 * @returns {object}
 */
function generatePeriodInfo(
  period : Period,
  inManifest : boolean,
  _isTrickModeTrackEnabled: boolean
) : ITMPeriodObject {
  const audioAdaptation = period.getSupportedAdaptations("audio")[0] ?? null;
  const textAdaptation = null;
  const baseVideoAdaptation = period.getSupportedAdaptations("video")[0] ?? null;
  const videoAdaptation = getRightVideoTrack(baseVideoAdaptation,
                                             _isTrickModeTrackEnabled);
  return { period,
           inManifest,
           isRemoved: false,
           audio: { wantedTrack: audioAdaptation,
                    lastEmittedTrack: undefined,
                    subject: undefined },
           video: { wantedTrack: videoAdaptation,
                    wantedTrackBase: baseVideoAdaptation,
                    lastEmittedTrack: undefined,
                    subject: undefined },
           text: { wantedTrack: textAdaptation,
                   lastEmittedTrack: undefined,
                   subject: undefined } };
}

/**
 * Convert an audio Adaptation into an audio track.
 * @param {object|null} adaptation - Audio adaptation
 * @returns {object|null} - corresponding audio track object.
 */
function toAudioTrack(
  adaptation : Adaptation | null
) : IAudioTrack | null {
  if (adaptation === null) {
    return null;
  }

  const audioTrack : IAudioTrack = {
    language: takeFirstSet<string>(adaptation.language, ""),
    normalized: takeFirstSet<string>(adaptation.normalizedLanguage, ""),
    audioDescription: adaptation.isAudioDescription === true,
    id: adaptation.id,
    representations: adaptation.representations.map(parseAudioRepresentation),
    label: adaptation.label,
  };
  if (adaptation.isDub === true) {
    audioTrack.dub = true;
  }
  return audioTrack;
}
