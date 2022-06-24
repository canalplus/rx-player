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
import config from "../../../config";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import {
  IAudioRepresentation,
  IAudioRepresentationsSwitchingMode,
  IAudioTrack,
  IAudioTrackSwitchingMode,
  IAutoTrackSwitchEventPayload,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IBrokenRepresentationsLockContext,
  IPeriod,
  ITextTrack,
  IVideoRepresentation,
  IVideoRepresentationsSwitchingMode,
  IVideoTrack,
  IVideoTrackSwitchingMode,
} from "../../../public_types";
import arrayFind from "../../../utils/array_find";
import assert from "../../../utils/assert";
import EventEmitter from "../../../utils/event_emitter";
import createSharedReference, {
  ISharedReference,
} from "../../../utils/reference";
import takeFirstSet from "../../../utils/take_first_set";
import {
  IAdaptationChoice,
  IRepresentationsChoice,
} from "../../stream";
import TrackDispatcher from "./track_dispatcher";

/**
 * Class helping with the management of the audio, video and text tracks and
 * qualities.
 *
 * The `TracksStore` allows to choose a track and qualities for different types
 * of media through a simpler API.
 *
 * @class TracksStore
 */
export default class TracksStore extends EventEmitter<ITracksStoreEvents> {
  /**
   * Store track selection information, per Period.
   * Sorted by Period's start time ascending
   */
  private _storedPeriodInfo : ITMPeriodObject[];

  private _isDisposed : boolean;

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

  constructor(args : { preferTrickModeTracks: boolean }) {
    super();
    this._storedPeriodInfo = [];
    this._isDisposed = false;
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
    return this._storedPeriodInfo.map(p => toExposedPeriod(p.period));
  }

  /**
   * Update the list of Periods handled by the TracksStore and make a
   * track choice decision for each of them.
   * @param {Object} manifest - The new Manifest object
   */
  public updatePeriodList(manifest : Manifest) : void {
    const { periods } = manifest;

    // We assume that they are always sorted chronologically
    // In dev mode, perform a runtime check that this is the case
    if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
      for (let i = 1; i < periods.length; i++) {
        assert(periods[i - 1].start <= periods[i].start);
      }
    }

    /** Periods which have just been added. */
    const addedPeriods : ITMPeriodObject[] = [];

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

        const curWantedTextTrack = this._storedPeriodInfo[i].text.storedSettings;
        if (curWantedTextTrack !== null) {
          const textAdaptations = newPeriod.getSupportedAdaptations("text");
          const stillHere = textAdaptations
            .some(a => a.id === curWantedTextTrack.adaptation.id);
          if (!stillHere) {
            log.warn("TracksStore: Chosen text Adaptation not available anymore");
            const periodInfo =  this._storedPeriodInfo[i];
            periodInfo.text.storedSettings = null;
            this.trigger("autoTrackSwitch", { period: toExposedPeriod(newPeriod),
                                              trackType: "text",
                                              reason: "missing" });

            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
              return; // The current TracksStore is disposed, we can abort
            }
            const periodItem = getPeriodItem(this._storedPeriodInfo,
                                             periodInfo.period.id);
            if (periodItem !== undefined && periodItem.text.storedSettings === null) {
              periodItem.text.dispatcher?.updateTrack(null);
            }
          }
        }

        const curWantedVideoTrack = this._storedPeriodInfo[i].video.storedSettings;
        if (curWantedVideoTrack !== null) {
          const videoAdaptations = newPeriod.getSupportedAdaptations("video");
          const stillHere = videoAdaptations
            .some(a => a.id === curWantedVideoTrack.adaptation.id);
          if (!stillHere) {
            log.warn("TracksStore: Chosen video Adaptation not available anymore");
            const periodItem = this._storedPeriodInfo[i];
            let storedSettings : IVideoStoredSettings;
            if (videoAdaptations.length === 0) {
              storedSettings = null;
            } else {
              const adaptationBase = videoAdaptations[0];
              const adaptation = getRightVideoTrack(adaptationBase,
                                                    this._isTrickModeTrackEnabled);
              const lockedRepresentations = createSharedReference(null);
              storedSettings = { adaptationBase,
                                 adaptation,
                                 switchingMode: "seamless",
                                 lockedRepresentations };
            }
            periodItem.video.storedSettings = storedSettings;
            this.trigger("autoTrackSwitch", { period: toExposedPeriod(newPeriod),
                                              trackType: "video",
                                              reason: "missing" });

            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
              return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            const newPeriodItem = getPeriodItem(this._storedPeriodInfo,
                                                periodItem.period.id);
            if (
              newPeriodItem !== undefined &&
              newPeriodItem.video.storedSettings === storedSettings
            ) {
              newPeriodItem.video.dispatcher?.updateTrack(storedSettings);
            }
          }
        }

        const curWantedAudioTrack = this._storedPeriodInfo[i].audio.storedSettings;
        if (curWantedAudioTrack !== null) {
          const audioAdaptations = newPeriod.getSupportedAdaptations("audio");
          const stillHere = audioAdaptations
            .some(a => a.id === curWantedAudioTrack.adaptation.id);
          if (!stillHere) {
            log.warn("TracksStore: Chosen audio Adaptation not available anymore");
            const periodItem = this._storedPeriodInfo[i];
            const storedSettings = audioAdaptations.length === 0 ?
              null :
              { adaptation: audioAdaptations[0],
                switchingMode: "seamless" as IAudioTrackSwitchingMode,
                lockedRepresentations: createSharedReference(null) };
            periodItem.audio.storedSettings = storedSettings;
            this.trigger("autoTrackSwitch", { period: toExposedPeriod(newPeriod),
                                              trackType: "audio",
                                              reason: "missing" });

            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
              return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            const newPeriodItem = getPeriodItem(this._storedPeriodInfo,
                                                periodItem.period.id);
            if (
              newPeriodItem !== undefined &&
              newPeriodItem.audio.storedSettings === storedSettings
            ) {
              newPeriodItem.audio.dispatcher?.updateTrack(storedSettings);
            }
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

    const periodsAdded = addedPeriods.reduce((acc : IPeriod[], p) => {
      if (!p.isRemoved) {
        acc.push({ id: p.period.id, start: p.period.start, end: p.period.end });
      }
      return acc;
    }, []);

    if (periodsAdded.length > 0) {
      this.trigger("newAvailablePeriods", periodsAdded);
    }
  }

  /**
   * Add Subject to choose Adaptation for new "audio", "video" or "text" Period.
   *
   * Note that such subject has to be removed through `removeTrackSubject` so
   * ressources can be freed.
   * @param {string} bufferType - The concerned buffer type
   * @param {Object} manifest
   * @param {Period} period - The concerned Period.
   * @param {Subject.<Object|null>} trackSubject - A subject through which the
   * choice will be given
   */
  public addTrackSubject(
    bufferType : "audio" | "text"| "video",
    manifest : Manifest,
    period : Period,
    trackSubject : Subject<IAdaptationChoice | null>
  ) : void {
    let periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
    if (periodObj === undefined) { // The Period has not yet been added.
      periodObj = this._manuallyAddPeriod(period);
      this.trigger("newAvailablePeriods", [{ id: period.id,
                                             start: period.start,
                                             end: period.end }]);
    }

    if (periodObj[bufferType].dispatcher !== null) {
      log.error(`TracksStore: Subject already added for ${bufferType} ` +
                `and Period ${period.start}`);
      return;
    }
    const trackSetting = periodObj[bufferType].storedSettings;
    const dispatcher = new TrackDispatcher(manifest, trackSubject, trackSetting);
    periodObj[bufferType].dispatcher = dispatcher;
    dispatcher.addEventListener("noPlayableLockedRepresentation", () => {
      trackSetting?.lockedRepresentations.setValue(null);
      this.trigger("brokenRepresentationsLock", { period: { id: period.id,
                                                            start: period.start,
                                                            end: period.end },
                                                  trackType: bufferType });
    });
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
      log.warn(`TracksStore: ${bufferType} not found for period`,
               period.start);
      return;
    }

    const periodObj = this._storedPeriodInfo[periodIndex];
    const choiceItem = periodObj[bufferType];
    if (choiceItem?.dispatcher === null) {
      log.warn(`TracksStore: Subject already removed for ${bufferType} ` +
               `and Period ${period.start}`);
      return;
    }

    choiceItem.dispatcher.dispose();
    choiceItem.dispatcher = null;
    if (isPeriodItemRemovable(periodObj)) {
      this._removePeriodObject(periodIndex);
    }
  }

  /**
   * Allows to recuperate a "Period Object" - used in get/set methods of the
   * `TracksStore` - by giving the Period itself.
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
   * `TracksStore` - by giving the Period's id.
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
   * Reset the TracksStore's Period objects:
   *   - All Period which are not in the manifest currently will be removed.
   *   - All subjects used to communicate the wanted track will be removed.
   *
   * You might want to call this API when restarting playback.
   */
  public resetPeriodObjects() : void {
    for (let i = this._storedPeriodInfo.length - 1; i >= 0; i--) {
      const storedObj = this._storedPeriodInfo[i];
      storedObj.audio.dispatcher?.dispose();
      storedObj.audio.dispatcher = null;
      storedObj.video.dispatcher?.dispose();
      storedObj.video.dispatcher = null;
      storedObj.text.dispatcher?.dispose();
      storedObj.text.dispatcher = null;
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
   * Set audio track based on the ID of its Adaptation for a given added Period.
   * @param {Object} periodObj - The concerned Period's object.
   * @param {string} wantedId - adaptation id of the wanted track.
   * @param {string} switchingMode - Behavior when replacing the track by
   * another.
   * @param {Object|null} reprsToLock - Audio Representations that should be
   * locked after switchingMode to that track.
   * `null` if no Audio Representation should be locked.
   */
  public setAudioTrack(
    periodObj : ITMPeriodObject,
    wantedId : string,
    switchingMode : IAudioTrackSwitchingMode | undefined,
    reprsToLock : string[] | null
  ) : void {
    const { DEFAULT_AUDIO_TRACK_SWITCHING_MODE } = config.getCurrent();
    return this._setAudioOrTextTrack("audio",
                                     periodObj,
                                     wantedId,
                                     switchingMode ?? DEFAULT_AUDIO_TRACK_SWITCHING_MODE,
                                     reprsToLock);
  }

  /**
   * Set text track based on the ID of its Adaptation for a given added Period.
   * @param {Object} periodObj - The concerned Period's object.
   * @param {string} wantedId - adaptation id of the wanted track.
   */
  public setTextTrack(periodObj : ITMPeriodObject, wantedId : string) : void {
    return this._setAudioOrTextTrack("text", periodObj, wantedId, "direct", null);
  }

  /**
   * Set audio track based on the ID of its Adaptation for a given added Period.
   * @param {Object} periodObj - The concerned Period's object.
   * @param {string} wantedId - adaptation id of the wanted track.
   * @param {string} switchingMode - Behavior when replacing the track by
   * another.
   * @param {Array.<string>|null} reprsToLock - Audio Representations that should be
   * locked after switchingMode to that track.
   * `null` if no Audio Representation should be locked.
   */
  private _setAudioOrTextTrack(
    bufferType : "audio" | "text",
    periodObj : ITMPeriodObject,
    wantedId : string,
    switchingMode : IAudioTrackSwitchingMode,
    reprsToLock : string[] | null
  ) : void {
    const period = periodObj.period;
    const wantedAdaptation = arrayFind(period.getSupportedAdaptations(bufferType),
                                       ({ id }) => id === wantedId);

    if (wantedAdaptation === undefined) {
      throw new Error(`Wanted ${bufferType} track not found.`);
    }

    const typeInfo = periodObj[bufferType];
    let lockedRepresentations;
    if (reprsToLock === null) {
      lockedRepresentations = createSharedReference(null);
    } else {
      const { DEFAULT_AUDIO_TRACK_SWITCHING_MODE } = config.getCurrent();
      const representationsToLock = this._getRepresentationsToLock(wantedAdaptation,
                                                                   reprsToLock);
      const repSwitchingMode = bufferType === "audio" ?
        DEFAULT_AUDIO_TRACK_SWITCHING_MODE :
        "direct" as const;
      lockedRepresentations = createSharedReference({
        representations: representationsToLock,
        switchingMode: repSwitchingMode,
      });
    }

    typeInfo.storedSettings = { adaptation: wantedAdaptation,
                                switchingMode,
                                lockedRepresentations };

    if (typeInfo.dispatcher !== null) {
      typeInfo.dispatcher.updateTrack(typeInfo.storedSettings);
    }
  }

  /**
   * Set video track based on the ID of its Adaptation for a given added Period.
   * @param {Object} periodObj - The concerned Period's object.
   * @param {string} wantedId - adaptation id of the wanted track.
   * @param {string} switchingMode - Behavior when replacing the track by
   * another.
   * @param {Array.<string>|null} reprsToLock - Video Representations that should be
   * locked after switchingMode to that track.
   * `null` if no Video Representation should be locked.
   */
  public setVideoTrack(
    periodObj : ITMPeriodObject,
    wantedId : string,
    switchingMode : IVideoTrackSwitchingMode | undefined,
    reprsToLock : string[]| null
  ) : void {
    const period = periodObj.period;
    const wantedAdaptation = arrayFind(period.getSupportedAdaptations("video"),
                                       ({ id }) => id === wantedId);

    if (wantedAdaptation === undefined) {
      throw new Error("Wanted video track not found.");
    }

    const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
    const typeInfo = periodObj.video;
    const newAdaptation = getRightVideoTrack(wantedAdaptation,
                                             this._isTrickModeTrackEnabled);

    let lockedRepresentations;
    if (reprsToLock === null) {
      lockedRepresentations = createSharedReference(null);
    } else {
      const representationsToLock = this._getRepresentationsToLock(wantedAdaptation,
                                                                   reprsToLock);
      const repSwitchingMode = DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
      lockedRepresentations = createSharedReference({
        representations: representationsToLock,
        switchingMode: repSwitchingMode,
      });
    }

    typeInfo.storedSettings = { adaptationBase: wantedAdaptation,
                                switchingMode: switchingMode ??
                                               DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                                adaptation: newAdaptation,
                                lockedRepresentations };

    if (typeInfo.dispatcher !== null) {
      typeInfo.dispatcher.updateTrack(typeInfo.storedSettings);
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
    if (trackInfo.storedSettings === null) {
      return;
    }

    if (bufferType !== "text") {
      // Potentially unneeded, but let's be clean
      periodObj[bufferType].storedSettings?.lockedRepresentations.finish();
    }

    trackInfo.storedSettings = null;
    if (trackInfo.dispatcher !== null) {
      trackInfo.dispatcher.updateTrack(null);
    }
  }

  /**
   * Returns an object describing the chosen audio track for the given audio
   * Period.
   *
   * Returns `null` is the the current audio track is disabled or not
   * set yet.a pas bcp de marge de manoeuvre j'ai l'impression
   *
   * Returns `undefined` if the given Period's id is not currently found in the
   * `TracksStore`. The cause being most probably that the corresponding
   * Period is not available anymore.
   * If you're in that case and if still have the corresponding JavaScript
   * reference to the wanted Period, you can call `getOldAudioTrack` with it. It
   * will try retrieving the choice it made from its cache.
   * @param {Object} periodObj - The concerned Period's object
   * @returns {Object|null|undefined} - The audio track chosen for this Period.
   * `null` if audio tracks were disabled and `undefined` if the Period is not
   * known.
   */
  public getChosenAudioTrack(periodObj : ITMPeriodObject) : IAudioTrack | null {
    return periodObj.audio.storedSettings === null ?
      null :
      toAudioTrack(periodObj.audio.storedSettings.adaptation);
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
    return periodObj.text.storedSettings === null ?
      null :
      toTextTrack(periodObj.text.storedSettings.adaptation);
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
    if (periodObj.video.storedSettings === null) {
      return null;
    }

    return toVideoTrack(periodObj.video.storedSettings.adaptation);
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
    const storedSettings = periodObj.audio.storedSettings;
    const currentId = storedSettings !== null ?
      storedSettings.adaptation.id :
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
          representations: adaptation.getPlayableRepresentations()
            .map(parseAudioRepresentation),
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
    const storedSettings = periodObj.text.storedSettings;
    const currentId = storedSettings !== null ?
      storedSettings.adaptation.id :
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
    const storedSettings = periodObj.video.storedSettings;
    const currentId = storedSettings === null ?
      undefined :
      storedSettings.adaptation.id;

    return periodObj.period.getSupportedAdaptations("video")
      .map((adaptation) => {
        const trickModeTracks = adaptation.trickModeTracks !== undefined ?
          adaptation.trickModeTracks.map((trickModeAdaptation) => {
            const isActive = currentId === null ? false :
                                                  currentId === trickModeAdaptation.id;
            const representations = trickModeAdaptation.getPlayableRepresentations()
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
          representations: adaptation.getPlayableRepresentations()
            .map(parseVideoRepresentation),
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

  public getLockedAudioRepresentations(
    periodObj : ITMPeriodObject
  ) : string[] | null {
    const { storedSettings } = periodObj.audio;
    if (storedSettings === null) {
      return null;
    }
    const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
    return lastLockedSettings === null ?
      null :
      lastLockedSettings.representations.map(r => r.id);
  }

  public getLockedVideoRepresentations(
    periodObj : ITMPeriodObject
  ) : string[] | null {
    const { storedSettings } = periodObj.video;
    if (storedSettings === null) {
      return null;
    }
    const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
    return lastLockedSettings === null ?
      null :
      lastLockedSettings.representations.map(r => r.id);
  }

  public lockAudioRepresentations(
    periodObj : ITMPeriodObject,
    lockSettings : IAudioRepresentationsLockSettings
  ) : void {
    const { storedSettings } = periodObj.audio;
    if (storedSettings === null) {
      return;
    }
    const { DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
    const filtered = this._getRepresentationsToLock(storedSettings.adaptation,
                                                    lockSettings.representations);

    const switchingMode = lockSettings.switchingMode ??
                          DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
    storedSettings.lockedRepresentations.setValue({ representations: filtered,
                                                    switchingMode });
  }

  public lockVideoRepresentations(
    periodObj : ITMPeriodObject,
    lockSettings : IVideoRepresentationsLockSettings
  ) : void {
    const { storedSettings } = periodObj.video;
    if (storedSettings === null) {
      return;
    }

    const { DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
    const filtered = this._getRepresentationsToLock(storedSettings.adaptation,
                                                    lockSettings.representations);
    const switchingMode = lockSettings.switchingMode ??
                          DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
    storedSettings.lockedRepresentations.setValue({ representations: filtered,
                                                    switchingMode });
  }

  public unlockAudioRepresentations(periodObj : ITMPeriodObject) : void {
    const { storedSettings } = periodObj.audio;
    if (storedSettings === null ||
        storedSettings.lockedRepresentations.getValue() === null)
    {
      return;
    }
    storedSettings.lockedRepresentations.setValue(null);
  }

  public unlockVideoRepresentations(periodObj : ITMPeriodObject) : void {
    const { storedSettings } = periodObj.video;
    if (storedSettings === null ||
        storedSettings.lockedRepresentations.getValue() === null)
    {
      return;
    }
    storedSettings.lockedRepresentations.setValue(null);
  }

  public dispose() : void {
    this._isDisposed = true;
    while (true) {
      const lastPeriod = this._storedPeriodInfo.pop();
      if (lastPeriod === undefined) {
        return;
      }
      lastPeriod.isRemoved = true;
    }
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
      if (periodObj.video.storedSettings !== null) {
        const chosenBaseTrack = periodObj.video.storedSettings.adaptationBase;
        if (chosenBaseTrack !== null) {
          const chosenTrack = getRightVideoTrack(chosenBaseTrack,
                                                 this._isTrickModeTrackEnabled);
          periodObj.video.storedSettings.adaptationBase = chosenBaseTrack;
          periodObj.video.storedSettings.adaptation = chosenTrack;
        }
      }
    }

    // Clone the current Period list to not be influenced if Periods are removed
    // or added while the loop is running.
    const sliced = this._storedPeriodInfo.slice();
    for (let i = 0; i < sliced.length; i++) {
      const videoItem = sliced[i].video;
      if (videoItem.dispatcher !== null) {
        videoItem.dispatcher.updateTrack(videoItem.storedSettings);
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

  private _getRepresentationsToLock(
    adaptation : Adaptation,
    representationIds : string[]
  ) : Representation[] {
    const filtered = representationIds.reduce((acc : Representation[], repId) => {
      const foundRep = arrayFind(adaptation.representations, (r) => {
        return r.id === repId;
      });
      if (foundRep === undefined) {
        log.warn("API: Wanted locked Representation not found.");
      } else {
        acc.push(foundRep);
      }
      return acc;
    }, []);

    if (filtered.length === 0) {
      throw new Error("Cannot lock Representations: " +
                      "None of the given Representation id are found");
    }

    return filtered;
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
         periodObj.text?.dispatcher === null &&
         periodObj.audio?.dispatcher === null &&
         periodObj.video?.dispatcher === null;
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
 * @param {boolean} isTrickModeTrackEnabled
 * @returns {object}
 */
function generatePeriodInfo(
  period : Period,
  inManifest : boolean,
  isTrickModeTrackEnabled: boolean
) : ITMPeriodObject {
  const audioAdaptation = period.getSupportedAdaptations("audio")[0];
  const baseVideoAdaptation = period.getSupportedAdaptations("video")[0];
  const videoAdaptation = getRightVideoTrack(baseVideoAdaptation,
                                             isTrickModeTrackEnabled);
  const { DEFAULT_AUDIO_TRACK_SWITCHING_MODE,
          DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
  const audioSettings = audioAdaptation !== undefined ?
    { adaptation: audioAdaptation,
      switchingMode: DEFAULT_AUDIO_TRACK_SWITCHING_MODE,
      lockedRepresentations: createSharedReference(null) } :
    null;
  const videoSettings = videoAdaptation !== undefined ?
    { adaptation: videoAdaptation,
      adaptationBase: baseVideoAdaptation,
      switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
      lockedRepresentations: createSharedReference(null) } :
    null;
  return { period,
           inManifest,
           isRemoved: false,
           audio: { storedSettings: audioSettings,
                    dispatcher: null },
           video: { storedSettings: videoSettings,
                    dispatcher: null },
           text: { storedSettings: null,
                   dispatcher: null } };
}

/**
 * Format Adaptation structure into the format awaited by the API.
 * @param {Object} a
 * @returns {Object}
 */
function toTextTrack(a : Adaptation) : ITextTrack {
  return {
    language: a.language ?? "",
    normalized: a.normalizedLanguage ?? "",
    closedCaption: a.isClosedCaption === true,
    id: a.id,
    label: a.label,
  };
}

/**
 * Format Adaptation structure into the format awaited by the API.
 * @param {Object} a
 * @returns {Object}
 */
function toVideoTrack(a : Adaptation) : IVideoTrack {
  const trickModeTracks = a.trickModeTracks !== undefined ?
    a.trickModeTracks.map((trickModeAdaptation) => {
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
    id: a.id,
    representations: a.representations.map(parseVideoRepresentation),
    label: a.label,
  };
  if (a.isSignInterpreted === true) {
    videoTrack.signInterpreted = true;
  }
  if (a.isTrickModeTrack === true) {
    videoTrack.isTrickModeTrack = true;
  }
  if (trickModeTracks !== undefined) {
    videoTrack.trickModeTracks = trickModeTracks;
  }
  return videoTrack;
}

/**
 * Convert an audio Adaptation into an audio track.
 * @param {object|null} adaptation - Audio adaptation
 * @returns {object|null} - corresponding audio track object.
 */
function toAudioTrack(adaptation : Adaptation) : IAudioTrack {
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

function toExposedPeriod(p: Period) : IPeriod {
  return { start: p.start, end: p.end, id: p.id };
}

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

/**
 * Internal representation of audio track preferences for a given `Period` of
 * the Manifest.
 */
interface IAudioPeriodInfo {
  /**
   * Information on the last audio track settings wanted by the user.
   * `null` if no audio track is wanted.
   */
  storedSettings : {
    /** Contains the last `Adaptation` wanted by the user. */
    adaptation : Adaptation;
     /** "Switching mode" in which the track switch should happen. */
    switchingMode : IAudioTrackSwitchingMode;
    /**
     * Contains the last locked `Representation`s for this `Adaptation` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations : ISharedReference<IRepresentationsChoice | null>;
  } | null;
  /**
   * Tracks are internally emitted through RxJS's `Subject`s.
   * A `TrackDispatcher` allows to facilitate and centralize the management of
   * that Subject so that the right wanted track and qualities are emitted
   * through it.
   *
   * `null` if no `Subject` has been linked for this `Period` and buffer type
   * for now.
   */
  dispatcher : TrackDispatcher | null;
}

/**
 * Internal representation of text track preferences for a given `Period` of
 * the Manifest.
 */
export interface ITextPeriodInfo {
  /**
   * Information on the last text track settings wanted.
   * `null` if no text track is wanted.
   */
  storedSettings : {
    /** Contains the last `Adaptation` wanted by the user. */
    adaptation : Adaptation;
     /** "Switching mode" in which the track switch should happen. */
    switchingMode : "direct";
    /**
     * Contains the last locked `Representation`s for this `Adaptation` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations : ISharedReference<IRepresentationsChoice | null>;
  } | null;
  /**
   * Tracks are internally emitted through RxJS's `Subject`s.
   * A `TrackDispatcher` allows to facilitate and centralize the management of
   * that Subject so that the right wanted track and qualities are emitted
   * through it.
   *
   * `null` if no `Subject` has been linked for this `Period` and buffer type
   * for now.
   */
  dispatcher : TrackDispatcher | null;
}

/**
 * Internal representation of video track preferences for a given `Period` of
 * the Manifest.
 */
export interface IVideoPeriodInfo {
  /**
   * Information on the last video track settings wanted.
   * `null` if no video track is wanted.
   */
  storedSettings : {
    /**
     * The wanted Adaptation itself (may be different from `adaptationBase`
     * when a trickmode track is chosen, in which case `adaptationBase` is
     * the Adaptation the trickmode track is linked to and `adaptation` is
     * the trickmode track).
     */
    adaptation : Adaptation;
     /** "Switching mode" in which the track switch should happen. */
    switchingMode : IVideoTrackSwitchingMode;
    /**
     * The "base" Adaptation for `storedSettings` (if a trickmode track was
     * chosen, this is the Adaptation the trickmode track is linked to, and not
     * the trickmode track itself).
     */
    adaptationBase : Adaptation;
    /**
     * Contains the last locked `Representation`s for this `Adaptation` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations : ISharedReference<IRepresentationsChoice | null>;
  } | null;
  /**
   * Tracks are internally emitted through RxJS's `Subject`s.
   * A `TrackDispatcher` allows to facilitate and centralize the management of
   * that Subject so that the right wanted track and qualities are emitted
   * through it.
   *
   * `null` if no `Subject` has been linked for this `Period` and buffer type
   * for now.
   */
  dispatcher : TrackDispatcher | null;
}

type IVideoStoredSettings = {
  /**
   * The wanted Adaptation itself (may be different from `adaptationBase`
   * when a trickmode track is chosen, in which case `adaptationBase` is
   * the Adaptation the trickmode track is linked to and `adaptation` is
   * the trickmode track).
   */
  adaptation : Adaptation;
   /** "Switching mode" in which the track switch should happen. */
  switchingMode : IVideoTrackSwitchingMode;
  /**
   * The "base" Adaptation for `storedSettings` (if a trickmode track was
   * chosen, this is the Adaptation the trickmode track is linked to, and not
   * the trickmode track itself).
   */
  adaptationBase : Adaptation;
  /**
   * Contains the last locked `Representation`s for this `Adaptation` wanted
   * by the user.
   * `null` if no Representation is locked.
   */
  lockedRepresentations : ISharedReference<IRepresentationsChoice | null>;
} | null;

/** Events emitted by the TracksStore. */
interface ITracksStoreEvents {
  newAvailablePeriods : IPeriod[];
  brokenRepresentationsLock : IBrokenRepresentationsLockContext;
  autoTrackSwitch : IAutoTrackSwitchEventPayload;
}

export interface IAudioRepresentationsLockSettings {
  representations : string[];
  switchingMode? : IAudioRepresentationsSwitchingMode | undefined;
}

export interface IVideoRepresentationsLockSettings {
  representations : string[];
  switchingMode? : IVideoRepresentationsSwitchingMode | undefined;
}
