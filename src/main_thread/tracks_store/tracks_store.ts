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

import config from "../../config";
import type { ITrackChoice, IRepresentationsChoice } from "../../core/types";
import { MediaError } from "../../errors";
import log from "../../log";
import type { ITrackMetadata, IManifestMetadata, IPeriodMetadata } from "../../manifest";
import { toAudioTrack, toTextTrack, toVideoTrack } from "../../manifest";
import type {
  IAudioRepresentationsSwitchingMode,
  IAudioTrack,
  IAudioTrackSwitchingMode,
  ITrackUpdateEventPayload,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IBrokenRepresentationsLockContext,
  IPeriod,
  ITextTrack,
  IVideoRepresentationsSwitchingMode,
  IVideoTrack,
  IVideoTrackSwitchingMode,
  IPlayerError,
  ITrackType,
} from "../../public_types";
import arrayFind from "../../utils/array_find";
import assert from "../../utils/assert";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import { objectValues } from "../../utils/object_values";
import SharedReference from "../../utils/reference";
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
  private _storedPeriodInfo: ITSPeriodObject[];

  /**
   * If `true`, the current `TracksStore` instance has been disposed. It
   * shouldn't perform side-effects anymore.
   */
  private _isDisposed: boolean;

  /**
   * Period information that was before in `_storedPeriodInfo` but has since
   * been removed is added to the `_cachedPeriodInfo` cache as a weak reference.
   *
   * This allows to still retrieve old track information for Periods which are
   * for example not in the Manifest anymore as long as the same Period's
   * reference is still kept.
   */
  private _cachedPeriodInfo: WeakMap<IPeriodMetadata, ITSPeriodObject>;

  /** Tells if trick mode has been enabled by the RxPlayer user */
  private _isTrickModeTrackEnabled: boolean;

  /**
   * In absence of another setting, this is the default "switching mode" for the
   * audio track.
   * See type documentation.
   */
  private _defaultAudioTrackSwitchingMode: IAudioTrackSwitchingMode;

  constructor(args: {
    preferTrickModeTracks: boolean;
    defaultAudioTrackSwitchingMode: IAudioTrackSwitchingMode | undefined;
  }) {
    super();
    this._storedPeriodInfo = [];
    this._isDisposed = false;
    this._cachedPeriodInfo = new WeakMap();
    this._isTrickModeTrackEnabled = args.preferTrickModeTracks;
    this._defaultAudioTrackSwitchingMode =
      args.defaultAudioTrackSwitchingMode ??
      config.getCurrent().DEFAULT_AUDIO_TRACK_SWITCHING_MODE;
  }

  /**
   * Return Array of Period information, to allow an outside application to
   * modify the track of any Period.
   * @returns {Array.<Object>}
   */
  public getAvailablePeriods(): IPeriod[] {
    return this._storedPeriodInfo.reduce((acc: IPeriod[], p) => {
      if (p.isPeriodAdvertised) {
        acc.push(toExposedPeriod(p.period));
      }
      return acc;
    }, []);
  }

  /**
   * Update the list of Periods handled by the TracksStore and make a
   * track choice decision for each of them.
   * @param {Object} manifest - The new Manifest object
   */
  public onManifestUpdate(manifest: IManifestMetadata) {
    const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
    const { periods } = manifest;

    // We assume that they are always sorted chronologically
    // In dev mode, perform a runtime check that this is the case
    if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
      for (let i = 1; i < periods.length; i++) {
        assert(periods[i - 1].start <= periods[i].start);
      }
    }

    /** Periods which have just been added. */
    const addedPeriods: ITSPeriodObject[] = [];

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
          const textTracks = getSupportedTracks(newPeriod, "text");
          const stillHere = textTracks.some((a) => a.id === curWantedTextTrack.track.id);
          if (!stillHere) {
            log.warn("TS: Chosen text track not available anymore");
            const periodInfo = this._storedPeriodInfo[i];
            periodInfo.text.storedSettings = null;
            this.trigger("trackUpdate", {
              period: toExposedPeriod(newPeriod),
              trackType: "text",
              reason: "missing",
            });

            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
              return; // The current TracksStore is disposed, we can abort
            }
            const periodItem = getPeriodItem(
              this._storedPeriodInfo,
              periodInfo.period.id,
            );
            if (periodItem !== undefined && periodItem.text.storedSettings === null) {
              periodItem.text.dispatcher?.updateTrack(null);
            }
          }
        }

        const curWantedVideoTrack = this._storedPeriodInfo[i].video.storedSettings;
        if (curWantedVideoTrack !== null) {
          const videoTracks = getSupportedTracks(newPeriod, "video");
          const stillHere = videoTracks.some(
            (a) => a.id === curWantedVideoTrack.track.id,
          );
          if (!stillHere) {
            log.warn("TS: Chosen video track not available anymore");
            const periodItem = this._storedPeriodInfo[i];
            let storedSettings: IVideoStoredSettings;
            if (videoTracks.length === 0) {
              storedSettings = null;
            } else {
              const trackBase = videoTracks[0];
              const track = getRightVideoTrack(trackBase, this._isTrickModeTrackEnabled);
              const lockedRepresentations =
                new SharedReference<IRepresentationsChoice | null>(null);
              storedSettings = {
                trackBase,
                track,
                switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                lockedRepresentations,
              };
            }
            periodItem.video.storedSettings = storedSettings;
            this.trigger("trackUpdate", {
              period: toExposedPeriod(newPeriod),
              trackType: "video",
              reason: "missing",
            });

            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
              return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            const newPeriodItem = getPeriodItem(
              this._storedPeriodInfo,
              periodItem.period.id,
            );
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
          const audioTracks = getSupportedTracks(newPeriod, "audio");
          const stillHere = audioTracks.some(
            (a) => a.id === curWantedAudioTrack.track.id,
          );
          if (!stillHere) {
            log.warn("TS: Chosen audio track not available anymore");
            const periodItem = this._storedPeriodInfo[i];
            const storedSettings =
              audioTracks.length === 0
                ? null
                : {
                    track: audioTracks[0],
                    switchingMode: this._defaultAudioTrackSwitchingMode,
                    lockedRepresentations:
                      new SharedReference<IRepresentationsChoice | null>(null),
                  };
            periodItem.audio.storedSettings = storedSettings;
            this.trigger("trackUpdate", {
              period: toExposedPeriod(newPeriod),
              trackType: "audio",
              reason: "missing",
            });

            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
              return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            const newPeriodItem = getPeriodItem(
              this._storedPeriodInfo,
              periodItem.period.id,
            );
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
        const newPeriodInfo = generatePeriodInfo(
          newPeriod,
          true,
          this._isTrickModeTrackEnabled,
          this._defaultAudioTrackSwitchingMode,
        );
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
      const periodsToAdd = periods
        .slice(newPListIdx)
        .map((p) =>
          generatePeriodInfo(
            p,
            true,
            this._isTrickModeTrackEnabled,
            this._defaultAudioTrackSwitchingMode,
          ),
        );
      this._storedPeriodInfo.push(...periodsToAdd);
      addedPeriods.push(...periodsToAdd);
    }

    for (const storedPeriodInfo of this._storedPeriodInfo) {
      storedPeriodInfo.audio.dispatcher?.refresh();
      storedPeriodInfo.video.dispatcher?.refresh();
      storedPeriodInfo.text.dispatcher?.refresh();
    }
  }

  public onDecipherabilityUpdates() {
    for (const storedPeriodInfo of this._storedPeriodInfo) {
      storedPeriodInfo.audio.dispatcher?.refresh();
      storedPeriodInfo.video.dispatcher?.refresh();
      storedPeriodInfo.text.dispatcher?.refresh();
    }
  }

  /**
   * Add shared reference to choose track for new "audio", "video" or
   * "text" Period.
   *
   * Note that such reference has to be removed through `removeTrackReference`
   * so ressources can be freed.
   * @param {string} bufferType - The concerned buffer type
   * @param {Period} period - The concerned Period.
   * @param {Object} trackRef - A reference through which
   * the choice will be given.
   */
  public addTrackReference(
    bufferType: "audio" | "text" | "video",
    period: IPeriodMetadata,
    trackRef: SharedReference<ITrackChoice | null | undefined>,
  ): void {
    let periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
    if (periodObj === undefined) {
      // The Period has not yet been added.
      periodObj = generatePeriodInfo(
        period,
        false,
        this._isTrickModeTrackEnabled,
        this._defaultAudioTrackSwitchingMode,
      );
      let found = false;
      for (let i = 0; i < this._storedPeriodInfo.length; i++) {
        if (this._storedPeriodInfo[i].period.start > period.start) {
          this._storedPeriodInfo.splice(i, 0, periodObj);
          found = true;
        }
      }
      if (!found) {
        this._storedPeriodInfo.push(periodObj);
      }
    }

    if (!periodObj.isPeriodAdvertised) {
      periodObj.isPeriodAdvertised = true;
      this.trigger("newAvailablePeriods", [
        { id: period.id, start: period.start, end: period.end },
      ]);
      if (this._isDisposed) {
        return;
      }
    }

    if (periodObj[bufferType].dispatcher !== null) {
      log.error(
        `TS: Subject already added for ${bufferType} ` + `and Period ${period.start}`,
      );
      return;
    }
    const trackSetting = periodObj[bufferType].storedSettings;
    const dispatcher = new TrackDispatcher(trackRef);
    periodObj[bufferType].dispatcher = dispatcher;
    dispatcher.addEventListener("noPlayableRepresentation", () => {
      const typeTracks = period.tracksMetadata[bufferType];
      const nextTrack = arrayFind(objectValues(typeTracks), (a) => {
        if (a.isSupported === false) {
          return false;
        }
        const playableRepresentations = objectValues(a.representations).filter(
          (r) => r.isSupported === true && r.decipherable !== false,
        );
        return playableRepresentations.length > 0;
      });
      if (nextTrack === undefined) {
        const noRepErr = new MediaError(
          "NO_PLAYABLE_REPRESENTATION",
          `No ${bufferType} Representation can be played`,
          { tracks: undefined },
        );
        this.trigger("error", noRepErr);
        this.dispose();
        return;
      }
      let typeInfo = getPeriodItem(this._storedPeriodInfo, period.id)?.[bufferType];
      if (isNullOrUndefined(typeInfo)) {
        return;
      }
      const switchingMode =
        bufferType === "audio" ? this._defaultAudioTrackSwitchingMode : "reload";
      const storedSettings = {
        track: nextTrack,
        switchingMode,
        lockedRepresentations: new SharedReference<IRepresentationsChoice | null>(null),
      };
      typeInfo.storedSettings = storedSettings;
      this.trigger("trackUpdate", {
        period: toExposedPeriod(period),
        trackType: bufferType,
        reason: "no-playable-representation",
      });

      // The previous event trigger could have had side-effects, so we
      // re-check if we're still mostly in the same state
      if (this._isDisposed) {
        return; // Someone disposed the `TracksStore` on the previous side-effect
      }
      typeInfo = getPeriodItem(this._storedPeriodInfo, period.id)?.[bufferType];
      if (isNullOrUndefined(typeInfo) || typeInfo.storedSettings !== storedSettings) {
        return;
      }
      typeInfo.dispatcher?.updateTrack(storedSettings);
    });
    dispatcher.addEventListener("noPlayableLockedRepresentation", () => {
      // TODO check that it doesn't already lead to segment loading or MediaSource
      // reloading
      trackSetting?.lockedRepresentations.setValue(null);
      this.trigger("brokenRepresentationsLock", {
        period: { id: period.id, start: period.start, end: period.end },
        trackType: bufferType,
      });
    });
    dispatcher.start(trackSetting);
  }

  /**
   * Remove shared reference to choose an "audio", "video" or "text" track
   * for a Period.
   * @param {string} bufferType - The concerned buffer type
   * @param {Period} period - The concerned Period.
   */
  public removeTrackReference(
    bufferType: "audio" | "text" | "video",
    period: IPeriodMetadata,
  ): void {
    const periodIndex = findPeriodIndex(this._storedPeriodInfo, period);
    if (periodIndex === undefined) {
      log.warn(`TS: ${bufferType} not found for period`, period.start);
      return;
    }

    const periodObj = this._storedPeriodInfo[periodIndex];
    const choiceItem = periodObj[bufferType];
    if (choiceItem?.dispatcher === null) {
      log.warn(
        `TS: TrackDispatcher already removed for ${bufferType} ` +
          `and Period ${period.start}`,
      );
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
  public getPeriodObjectFromPeriod(period: IPeriodMetadata): ITSPeriodObject | undefined {
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
  public getPeriodObjectFromId(periodId: string): ITSPeriodObject | undefined {
    return getPeriodItem(this._storedPeriodInfo, periodId);
  }

  public disableVideoTrickModeTracks(): void {
    if (!this._isTrickModeTrackEnabled) {
      return;
    }
    this._isTrickModeTrackEnabled = false;
    this._resetVideoTrackChoices("trickmode-disabled");
  }

  public enableVideoTrickModeTracks(): void {
    if (this._isTrickModeTrackEnabled) {
      return;
    }
    this._isTrickModeTrackEnabled = true;
    this._resetVideoTrackChoices("trickmode-enabled");
  }

  /**
   * Reset the TracksStore's Period objects:
   *   - All Period which are not in the manifest currently will be removed.
   *   - All References used to communicate the wanted track will be removed.
   *
   * You might want to call this API when restarting playback.
   */
  public resetPeriodObjects(): void {
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
  public isTrickModeEnabled(): boolean {
    return this._isTrickModeTrackEnabled;
  }

  /**
   * Set audio track based on the ID of its track for a given added Period.
   * @param {Object} params
   * @param {Object} params.periodRef - The concerned Period's object.
   * @param {string} params.trackId - track id of the wanted track.
   * @param {string} params.switchingMode - Behavior when replacing the track by
   * another.
   * @param {Object|null} params.lockedRepresentations - Audio Representations
   * that should be locked after switching to that track.
   * `null` if no Audio Representation should be locked.
   * @param {number} params.relativeResumingPosition
   */
  public setAudioTrack(payload: {
    periodRef: ITSPeriodObject;
    trackId: string;
    switchingMode: IAudioTrackSwitchingMode | undefined;
    lockedRepresentations: string[] | null;
    relativeResumingPosition: number | undefined;
  }): void {
    const {
      periodRef,
      trackId,
      switchingMode,
      lockedRepresentations,
      relativeResumingPosition,
    } = payload;
    return this._setAudioOrTextTrack({
      bufferType: "audio",
      periodRef,
      trackId,
      switchingMode: switchingMode ?? this._defaultAudioTrackSwitchingMode,
      lockedRepresentations,
      relativeResumingPosition,
    });
  }

  /**
   * Set text track based on the ID of its track for a given added Period.
   * @param {Object} periodObj - The concerned Period's object.
   * @param {string} wantedId - track id of the wanted track.
   */
  public setTextTrack(periodObj: ITSPeriodObject, wantedId: string): void {
    return this._setAudioOrTextTrack({
      bufferType: "text",
      periodRef: periodObj,
      trackId: wantedId,
      switchingMode: "direct",
      lockedRepresentations: null,
      relativeResumingPosition: undefined,
    });
  }

  /**
   * Set audio track based on the ID of its track for a given added Period.
   * @param {Object} params
   * @param {string} params.bufferType
   * @param {Object} params.periodRef - The concerned Period's object.
   * @param {string} params.trackId - track id of the wanted track.
   * @param {string} params.switchingMode - Behavior when replacing the track by
   * another.
   * @param {Array.<string>|null} params.lockedRepresentations - Audio
   * Representations that should be locked after switchingMode to that track.
   * `null` if no Audio Representation should be locked.
   * @param {number|undefined} params.relativeResumingPosition
   */
  private _setAudioOrTextTrack({
    bufferType,
    periodRef,
    trackId,
    switchingMode,
    lockedRepresentations,
    relativeResumingPosition,
  }: {
    bufferType: "audio" | "text";
    periodRef: ITSPeriodObject;
    trackId: string;
    switchingMode: IAudioTrackSwitchingMode;
    lockedRepresentations: string[] | null;
    relativeResumingPosition: number | undefined;
  }): void {
    const period = periodRef.period;
    const typeTracks = period.tracksMetadata[bufferType];
    const wantedTrack = arrayFind(
      objectValues(typeTracks),
      ({ id, isSupported }) => isSupported === true && id === trackId,
    );

    if (wantedTrack === undefined) {
      throw new Error(`Wanted ${bufferType} track not found.`);
    }

    const typeInfo = periodRef[bufferType];
    let lockedRepresentationsRef: SharedReference<IRepresentationsChoice | null>;
    if (lockedRepresentations === null) {
      lockedRepresentationsRef = new SharedReference<IRepresentationsChoice | null>(null);
    } else {
      const representationsToLock = this._getRepresentationsToLock(
        wantedTrack,
        lockedRepresentations,
      );
      const repSwitchingMode =
        bufferType === "audio"
          ? this._defaultAudioTrackSwitchingMode
          : ("direct" as const);
      lockedRepresentationsRef = new SharedReference<IRepresentationsChoice | null>({
        representationIds: representationsToLock,
        switchingMode: repSwitchingMode,
      });
    }

    const storedSettings = {
      track: wantedTrack,
      switchingMode,
      lockedRepresentations: lockedRepresentationsRef,
      relativeResumingPosition,
    };
    typeInfo.storedSettings = storedSettings;
    this.trigger("trackUpdate", {
      period: toExposedPeriod(period),
      trackType: bufferType,
      reason: "manual",
    });

    // The previous event trigger could have had side-effects, so we
    // re-check if we're still mostly in the same state
    if (this._isDisposed) {
      return; // Someone disposed the `TracksStore` on the previous side-effect
    }
    const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
    if (
      newPeriodItem !== undefined &&
      newPeriodItem[bufferType].storedSettings === storedSettings
    ) {
      newPeriodItem[bufferType].dispatcher?.updateTrack(storedSettings);
    }
  }

  /**
   * Set video track based on the ID of its track for a given added Period.
   * @param {Object} params
   * @param {Object} params.periodRef - The concerned Period's object.
   * @param {string} params.trackId - track id of the wanted track.
   * @param {string} params.switchingMode - Behavior when replacing the track by
   * another.
   * @param {Array.<string>|null} params.lockedRepresentations - Video
   * Representations that should be locked after switching to that track.
   * `null` if no Video Representation should be locked.
   * @param {number|undefined} params.relativeResumingPosition
   */
  public setVideoTrack(payload: {
    periodRef: ITSPeriodObject;
    trackId: string;
    switchingMode: IVideoTrackSwitchingMode | undefined;
    lockedRepresentations: string[] | null;
    relativeResumingPosition: number | undefined;
  }): void {
    const {
      periodRef,
      trackId,
      switchingMode,
      lockedRepresentations,
      relativeResumingPosition,
    } = payload;
    const period = periodRef.period;
    const wantedTrack = arrayFind(
      objectValues(period.tracksMetadata.video),
      ({ id, isSupported }) => isSupported === true && id === trackId,
    );

    if (wantedTrack === undefined) {
      throw new Error("Wanted video track not found.");
    }

    const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
    const typeInfo = periodRef.video;
    const newTrack = getRightVideoTrack(wantedTrack, this._isTrickModeTrackEnabled);

    let lockedRepresentationsRef;
    if (lockedRepresentations === null) {
      lockedRepresentationsRef = new SharedReference<IRepresentationsChoice | null>(null);
    } else {
      const representationsToLock = this._getRepresentationsToLock(
        wantedTrack,
        lockedRepresentations,
      );
      const repSwitchingMode = DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
      lockedRepresentationsRef = new SharedReference<IRepresentationsChoice | null>({
        representationIds: representationsToLock,
        switchingMode: repSwitchingMode,
      });
    }

    const storedSettings = {
      trackBase: wantedTrack,
      switchingMode: switchingMode ?? DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
      track: newTrack,
      relativeResumingPosition,
      lockedRepresentations: lockedRepresentationsRef,
    };
    typeInfo.storedSettings = storedSettings;
    this.trigger("trackUpdate", {
      period: toExposedPeriod(period),
      trackType: "video",
      reason: "manual",
    });

    // The previous event trigger could have had side-effects, so we
    // re-check if we're still mostly in the same state
    if (this._isDisposed) {
      return; // Someone disposed the `TracksStore` on the previous side-effect
    }
    const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
    if (
      newPeriodItem !== undefined &&
      newPeriodItem.video.storedSettings === storedSettings
    ) {
      newPeriodItem.video.dispatcher?.updateTrack(storedSettings);
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
    periodObj: ITSPeriodObject,
    bufferType: "audio" | "video" | "text",
  ): void {
    const trackInfo = periodObj[bufferType];
    if (trackInfo.storedSettings === null) {
      return;
    }

    if (bufferType !== "text") {
      // Potentially unneeded, but let's be clean
      periodObj[bufferType].storedSettings?.lockedRepresentations.finish();
    }

    trackInfo.storedSettings = null;
    this.trigger("trackUpdate", {
      period: toExposedPeriod(periodObj.period),
      trackType: bufferType,
      reason: "manual",
    });

    // The previous event trigger could have had side-effects, so we
    // re-check if we're still mostly in the same state
    if (this._isDisposed) {
      return; // Someone disposed the `TracksStore` on the previous side-effect
    }
    const newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodObj.period.id);
    if (
      newPeriodItem !== undefined &&
      newPeriodItem[bufferType].storedSettings === null
    ) {
      newPeriodItem[bufferType].dispatcher?.updateTrack(null);
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
  public getChosenAudioTrack(periodObj: ITSPeriodObject): IAudioTrack | null {
    return periodObj.audio.storedSettings === null
      ? null
      : toAudioTrack(periodObj.audio.storedSettings.track, true);
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
  public getChosenTextTrack(periodObj: ITSPeriodObject): ITextTrack | null {
    return periodObj.text.storedSettings === null
      ? null
      : toTextTrack(periodObj.text.storedSettings.track);
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
  public getChosenVideoTrack(periodObj: ITSPeriodObject): IVideoTrack | null {
    if (periodObj.video.storedSettings === null) {
      return null;
    }

    return toVideoTrack(periodObj.video.storedSettings.track, true);
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
    periodObj: ITSPeriodObject,
  ): IAvailableAudioTrack[] | undefined {
    const storedSettings = periodObj.audio.storedSettings;
    const currentId = storedSettings !== null ? storedSettings.track.id : null;
    const tracks = getSupportedTracks(periodObj.period, "audio");
    return tracks.map((track: ITrackMetadata) => {
      const active = currentId === null ? false : currentId === track.id;
      return objectAssign(toAudioTrack(track, true), { active });
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
    periodObj: ITSPeriodObject,
  ): IAvailableTextTrack[] | undefined {
    const storedSettings = periodObj.text.storedSettings;
    const currentId = storedSettings !== null ? storedSettings.track.id : null;

    const tracks = getSupportedTracks(periodObj.period, "text");
    return tracks.map((track) => {
      const active = currentId === null ? false : currentId === track.id;
      return objectAssign(toTextTrack(track), { active });
    });
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
    periodObj: ITSPeriodObject,
  ): IAvailableVideoTrack[] | undefined {
    const storedSettings = periodObj.video.storedSettings;
    const currentId = storedSettings === null ? undefined : storedSettings.track.id;

    const tracks = getSupportedTracks(periodObj.period, "video");
    return tracks.map((trk: ITrackMetadata) => {
      const active = currentId === null ? false : currentId === trk.id;
      const track = toVideoTrack(trk, true);
      const trickModeTracks =
        track.trickModeTracks !== undefined
          ? track.trickModeTracks.map((trickModeTrack) => {
              const isActive =
                currentId === null ? false : currentId === trickModeTrack.id;
              return objectAssign(trickModeTrack, { active: isActive });
            })
          : [];
      const availableTrack = objectAssign(track, { active });
      if (trickModeTracks !== undefined) {
        availableTrack.trickModeTracks = trickModeTracks;
      }
      return availableTrack;
    });
  }

  public getLockedAudioRepresentations(periodObj: ITSPeriodObject): string[] | null {
    const { storedSettings } = periodObj.audio;
    if (storedSettings === null) {
      return null;
    }
    const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
    return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
  }

  public getLockedVideoRepresentations(periodObj: ITSPeriodObject): string[] | null {
    const { storedSettings } = periodObj.video;
    if (storedSettings === null) {
      return null;
    }
    const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
    return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
  }

  public lockAudioRepresentations(
    periodObj: ITSPeriodObject,
    lockSettings: IAudioRepresentationsLockSettings,
  ): void {
    const { storedSettings } = periodObj.audio;
    if (storedSettings === null) {
      return;
    }
    const { DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
    const filtered = this._getRepresentationsToLock(
      storedSettings.track,
      lockSettings.representations,
    );

    const switchingMode =
      lockSettings.switchingMode ?? DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
    storedSettings.lockedRepresentations.setValue({
      representationIds: filtered,
      switchingMode,
    });
  }

  public lockVideoRepresentations(
    periodObj: ITSPeriodObject,
    lockSettings: IVideoRepresentationsLockSettings,
  ): void {
    const { storedSettings } = periodObj.video;
    if (storedSettings === null) {
      return;
    }

    const { DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
    const filtered = this._getRepresentationsToLock(
      storedSettings.track,
      lockSettings.representations,
    );
    const switchingMode =
      lockSettings.switchingMode ?? DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
    storedSettings.lockedRepresentations.setValue({
      representationIds: filtered,
      switchingMode,
    });
  }

  public unlockAudioRepresentations(periodObj: ITSPeriodObject): void {
    const { storedSettings } = periodObj.audio;
    if (
      storedSettings === null ||
      storedSettings.lockedRepresentations.getValue() === null
    ) {
      return;
    }
    storedSettings.lockedRepresentations.setValue(null);
  }

  public unlockVideoRepresentations(periodObj: ITSPeriodObject): void {
    const { storedSettings } = periodObj.video;
    if (
      storedSettings === null ||
      storedSettings.lockedRepresentations.getValue() === null
    ) {
      return;
    }
    storedSettings.lockedRepresentations.setValue(null);
  }

  public dispose(): void {
    this._isDisposed = true;
    while (true) {
      const lastPeriod = this._storedPeriodInfo.pop();
      if (lastPeriod === undefined) {
        return;
      }
      lastPeriod.isRemoved = true;
    }
  }

  private _resetVideoTrackChoices(reason: "trickmode-enabled" | "trickmode-disabled") {
    for (let i = 0; i < this._storedPeriodInfo.length; i++) {
      const periodObj = this._storedPeriodInfo[i];
      if (periodObj.video.storedSettings !== null) {
        const chosenBaseTrack = periodObj.video.storedSettings.trackBase;
        if (chosenBaseTrack !== null) {
          const chosenTrack = getRightVideoTrack(
            chosenBaseTrack,
            this._isTrickModeTrackEnabled,
          );
          periodObj.video.storedSettings.trackBase = chosenBaseTrack;
          periodObj.video.storedSettings.track = chosenTrack;
        }
      }
    }

    // Clone the current Period list to not be influenced if Periods are removed
    // or added while the loop is running.
    const sliced = this._storedPeriodInfo.slice();
    for (let i = 0; i < sliced.length; i++) {
      const period = sliced[i].period;
      const videoItem = sliced[i].video;
      const storedSettings = videoItem.storedSettings;
      this.trigger("trackUpdate", {
        period: toExposedPeriod(period),
        trackType: "video",
        reason,
      });

      // The previous event trigger could have had side-effects, so we
      // re-check if we're still mostly in the same state
      if (this._isDisposed) {
        return; // Someone disposed the `TracksStore` on the previous side-effect
      }
      const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
      if (
        newPeriodItem !== undefined &&
        newPeriodItem.video.storedSettings === storedSettings
      ) {
        newPeriodItem.video.dispatcher?.updateTrack(storedSettings);
      }
    }
  }

  private _removePeriodObject(index: number) {
    if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
      assert(index < this._storedPeriodInfo.length, "Invalid index for Period removal");
    }
    const oldPeriodItem = this._storedPeriodInfo[index];
    this._storedPeriodInfo[index].isRemoved = true;
    this._storedPeriodInfo.splice(index, 1);
    this._cachedPeriodInfo.set(oldPeriodItem.period, oldPeriodItem);
  }

  private _getRepresentationsToLock(
    track: ITrackMetadata,
    representationIds: string[],
  ): string[] {
    const filtered = representationIds.reduce((acc: string[], repId) => {
      const foundRep = arrayFind(objectValues(track.representations), (r) => {
        return r.id === repId;
      });
      if (foundRep === undefined) {
        log.warn("API: Wanted locked Representation not found.");
      } else {
        acc.push(foundRep.id);
      }
      return acc;
    }, []);

    if (filtered.length === 0) {
      throw new Error(
        "Cannot lock Representations: " + "None of the given Representation id are found",
      );
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
  periods: ITSPeriodObject[],
  period: IPeriodMetadata,
): number | undefined {
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
  periods: ITSPeriodObject[],
  periodId: string,
): ITSPeriodObject | undefined {
  for (let i = 0; i < periods.length; i++) {
    const periodI = periods[i];
    if (periodI.period.id === periodId) {
      return periodI;
    }
  }
}

/**
 * A `ITSPeriodObject` should only be removed once all References linked to it
 * do not exist anymore, to keep the possibility of making track choices.
 * @param {Object} periodObj
 * @returns {boolean}
 */
function isPeriodItemRemovable(periodObj: ITSPeriodObject): boolean {
  return (
    !periodObj.inManifest &&
    periodObj.text?.dispatcher === null &&
    periodObj.audio?.dispatcher === null &&
    periodObj.video?.dispatcher === null
  );
}

function getRightVideoTrack(
  track: ITrackMetadata,
  isTrickModeEnabled: boolean,
): ITrackMetadata {
  if (isTrickModeEnabled && track.trickModeTracks?.[0] !== undefined) {
    return track.trickModeTracks[0];
  }
  return track;
}

/**
 * Generate an `ITSPeriodObject` object for the given Period, selecting the
 * default track for each type.
 * @param {Object} period
 * @param {boolean} inManifest
 * @param {boolean} isTrickModeTrackEnabled
 * @returns {object}
 */
function generatePeriodInfo(
  period: IPeriodMetadata,
  inManifest: boolean,
  isTrickModeTrackEnabled: boolean,
  defaultAudioTrackSwitchingMode: IAudioTrackSwitchingMode,
): ITSPeriodObject {
  const audioTrack = getSupportedTracks(period, "audio")[0];
  const baseVideoTrack = getSupportedTracks(period, "video")[0];
  const videoTrack = getRightVideoTrack(baseVideoTrack, isTrickModeTrackEnabled);
  const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
  const audioSettings =
    audioTrack !== undefined
      ? {
          track: audioTrack,
          switchingMode: defaultAudioTrackSwitchingMode,
          lockedRepresentations: new SharedReference<IRepresentationsChoice | null>(null),
        }
      : null;
  const videoSettings =
    videoTrack !== undefined
      ? {
          track: videoTrack,
          trackBase: baseVideoTrack,
          switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
          lockedRepresentations: new SharedReference<IRepresentationsChoice | null>(null),
        }
      : null;

  let textTrack: ITrackMetadata | null = null;
  const forcedSubtitles = objectValues(period.tracksMetadata.text).filter(
    (trak) => trak.isForcedSubtitles === true,
  );
  if (forcedSubtitles.length > 0) {
    if (audioTrack !== null && audioTrack !== undefined) {
      const sameLanguage = arrayFind(
        forcedSubtitles,
        (f) => f.normalizedLanguage === audioTrack.normalizedLanguage,
      );
      if (sameLanguage !== undefined) {
        textTrack = sameLanguage;
      }
    }
    if (textTrack === null) {
      textTrack =
        arrayFind(forcedSubtitles, (f) => f.normalizedLanguage === undefined) ?? null;
    }
  }

  let textSettings = null;
  if (textTrack !== null) {
    textSettings = {
      track: textTrack,
      switchingMode: "direct" as const,
      lockedRepresentations: new SharedReference<IRepresentationsChoice | null>(null),
    };
  }
  return {
    period,
    inManifest,
    isPeriodAdvertised: false,
    isRemoved: false,
    audio: { storedSettings: audioSettings, dispatcher: null },
    video: { storedSettings: videoSettings, dispatcher: null },
    text: { storedSettings: textSettings, dispatcher: null },
  };
}

function toExposedPeriod(p: IPeriodMetadata): IPeriod {
  return { start: p.start, end: p.end, id: p.id };
}

/** Every information stored for a single Period. */
export interface ITSPeriodObject {
  /** The Period in question. */
  period: IPeriodMetadata;
  /**
   * If `true`, this Period was present at the last `updatePeriodList` call,
   * meaning it's probably still in the Manifest.
   *
   * If `false`, this Period was not. In that case it is probably just here
   * because some audio/video/text buffer still contains data of the given type.
   */
  inManifest: boolean;
  /**
   * Set to `true` once a `newAvailablePeriods` event has been sent for this
   * particular Period.
   */
  isPeriodAdvertised: boolean;
  /**
   * Information on the selected audio track and Representations for this Period.
   */
  audio: IAudioPeriodInfo;
  /**
   * Information on the selected text track and Representations for this Period.
   */
  text: ITextPeriodInfo;
  /**
   * Information on the selected video track and Representations for this Period.
   */
  video: IVideoPeriodInfo;
  /**
   * If `true`, this object was since cleaned-up.
   */
  isRemoved: boolean;
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
  storedSettings: {
    /** Contains the last `track` wanted by the user. */
    track: ITrackMetadata;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode: IAudioTrackSwitchingMode;
    /**
     * Contains the last locked `Representation`s for this `track` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
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
  dispatcher: TrackDispatcher | null;
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
  storedSettings: {
    /** Contains the last `track` wanted by the user. */
    track: ITrackMetadata;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode: "direct";
    /**
     * Contains the last locked `Representation`s for this `track` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
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
  dispatcher: TrackDispatcher | null;
}

/**
 * Internal representation of video track preferences for a given `Period` of
 * the Manifest.
 */
export interface IVideoPeriodInfo {
  /**
   * Information on the `id` of the last video track settings wanted.
   * `null` if no video track is wanted.
   */
  storedSettings: {
    /**
     * The wanted track itself (may be different from `trackBase`
     * when a trickmode track is chosen, in which case `trackBase` is
     * the track the trickmode track is linked to and `track` is
     * the trickmode track).
     */
    track: ITrackMetadata;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode: IVideoTrackSwitchingMode;
    /**
     * The "base" track for `storedSettings` (if a trickmode track was
     * chosen, this is the track the trickmode track is linked to, and not
     * the trickmode track itself).
     */
    trackBase: ITrackMetadata;
    /**
     * Contains the last locked `Representation`s for this `track` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
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
  dispatcher: TrackDispatcher | null;
}

type IVideoStoredSettings = {
  /**
   * The wanted track itself (may be different from `trackBase` when
   * a trickmode track is chosen, in which case `trackBase` is the
   * track the trickmode track is linked to and `track` is the
   * trickmode track).
   */
  track: ITrackMetadata;
  /** "Switching mode" in which the track switch should happen. */
  switchingMode: IVideoTrackSwitchingMode;
  /**
   * The "base" track for `storedSettings` (if a trickmode track was
   * chosen, this is the track the trickmode track is linked to, and not
   * the trickmode track itself).
   */
  trackBase: ITrackMetadata;
  /**
   * Contains the last locked `Representation`s for this `track` wanted
   * by the user.
   * `null` if no Representation is locked.
   */
  lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
} | null;

/** Events emitted by the TracksStore. */
interface ITracksStoreEvents {
  newAvailablePeriods: IPeriod[];
  brokenRepresentationsLock: IBrokenRepresentationsLockContext;
  trackUpdate: ITrackUpdateEventPayload;
  error: unknown;
  warning: IPlayerError;
}

export interface IAudioRepresentationsLockSettings {
  representations: string[];
  switchingMode?: IAudioRepresentationsSwitchingMode | undefined;
}

export interface IVideoRepresentationsLockSettings {
  representations: string[];
  switchingMode?: IVideoRepresentationsSwitchingMode | undefined;
}

function getSupportedTracks(
  period: IPeriodMetadata,
  trackType: ITrackType,
): ITrackMetadata[] {
  return objectValues(period.tracksMetadata[trackType]).filter((t) => {
    return t.isSupported === true;
  });
}
