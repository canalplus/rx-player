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

import { MediaError } from "../../../errors";
import Manifest, {
  Adaptation,
  IRepresentationIndex,
  Period,
} from "../../../manifest";
import { IPlayerError } from "../../../public_types";
import EventEmitter from "../../../utils/event_emitter";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import SortedList from "../../../utils/sorted_list";
import TaskCanceller from "../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../api";
import { IBufferType } from "../../segment_buffers";
import { IStreamOrchestratorPlaybackObservation } from "../../stream";

/**
 * Observes what's being played and take care of media events relating to time
 * boundaries:
 *   - Emits a `durationUpdate` when the duration of the current content is
 *     known and every time it changes.
 *   - Emits `endOfStream` API once segments have been pushed until the end and
 *     `resumeStream` if downloads starts back.
 *   - Emits a `periodChange` event when the currently-playing Period seemed to
 *     have changed.
 *   - emit "warning" events when what is being played is outside of the
 *     Manifest range.
 * @class ContentTimeBoundariesObserver
 */
export default class ContentTimeBoundariesObserver
  extends EventEmitter<IContentTimeBoundariesObserverEvent> {

  /** Allows to interrupt everything the `ContentTimeBoundariesObserver` is doing. */
  private _canceller : TaskCanceller;

  /** Store information on every created "Streams". */
  private _activeStreams : Map<IBufferType, IActiveStreamsInfo>;

  /** The `Manifest` object linked to the current content. */
  private _manifest : Manifest;

  /** Allows to calculate at any time maximum positions of the content */
  private _maximumPositionCalculator : MaximumPositionCalculator;

  /** Enumerate all possible buffer types in the current content. */
  private _allBufferTypes : IBufferType[];

  /**
   * Stores the `id` property of the last Period for which a `periodChange`
   * event has been sent.
   * Allows to avoid multiple times in a row `periodChange` for the same
   * Period.
   */
  private _lastCurrentPeriodId : string | null;

  /**
   * @param {Object} manifest
   * @param {Object} playbackObserver
   */
  constructor(
    manifest : Manifest,
    playbackObserver : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
    bufferTypes : IBufferType[]
  ) {
    super();

    this._canceller = new TaskCanceller();
    this._manifest = manifest;
    this._activeStreams = new Map();
    this._allBufferTypes = bufferTypes;
    this._lastCurrentPeriodId = null;

    /**
     * Allows to calculate the minimum and maximum playable position on the
     * whole content.
     */
    const maximumPositionCalculator = new MaximumPositionCalculator(manifest);
    this._maximumPositionCalculator = maximumPositionCalculator;

    const cancelSignal = this._canceller.signal;
    playbackObserver.listen(({ position }) => {
      const wantedPosition = position.pending ?? position.last;
      if (wantedPosition < manifest.getMinimumSafePosition()) {
        const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST",
                                       "The current position is behind the " +
                                       "earliest time announced in the Manifest.");
        this.trigger("warning", warning);
      } else if (
        wantedPosition > maximumPositionCalculator.getMaximumAvailablePosition()
      ) {
        const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST",
                                       "The current position is after the latest " +
                                       "time announced in the Manifest.");
        this.trigger("warning", warning);
      }
    }, { includeLastObservation: true, clearSignal: cancelSignal });

    manifest.addEventListener("manifestUpdate", () => {
      this.trigger("durationUpdate", getManifestDuration());
      if (cancelSignal.isCancelled()) {
        return;
      }
      this._checkEndOfStream();
    }, cancelSignal);

    function getManifestDuration() : number | undefined {
      return manifest.isDynamic ?
        maximumPositionCalculator.getMaximumAvailablePosition() :
        maximumPositionCalculator.getEndingPosition();
    }
  }

  /**
   * Method to call any time an Adaptation has been selected.
   *
   * That Adaptation switch will be considered as active until the
   * `onPeriodCleared` method has been called for the same `bufferType` and
   * `Period`, or until `dispose` is called.
   * @param {string} bufferType - The type of buffer concerned by the Adaptation
   * switch
   * @param {Object} period - The Period concerned by the Adaptation switch
   * @param {Object|null} adaptation - The Adaptation selected. `null` if the
   * absence of `Adaptation` has been explicitely selected for this Period and
   * buffer type (e.g. no video).
   */
  public onAdaptationChange(
    bufferType : IBufferType,
    period : Period,
    adaptation : Adaptation | null
  ) : void {
    if (this._manifest.isLastPeriodKnown) {
      const lastPeriod = this._manifest.periods[this._manifest.periods.length - 1];
      if (period.id === lastPeriod?.id) {
        if (bufferType === "audio" || bufferType === "video") {
          if (bufferType === "audio") {
            this._maximumPositionCalculator
              .updateLastAudioAdaptation(adaptation);
          } else {
            this._maximumPositionCalculator
              .updateLastVideoAdaptation(adaptation);
          }
          const newDuration = this._manifest.isDynamic ?
            this._maximumPositionCalculator.getMaximumAvailablePosition() :
            this._maximumPositionCalculator.getEndingPosition();
          this.trigger("durationUpdate", newDuration);
        }
      }
    }
    if (this._canceller.isUsed()) {
      return;
    }
    if (adaptation === null) {
      this._addActivelyLoadedPeriod(period, bufferType);
    }
  }

  /**
   * Method to call any time a Representation has been selected.
   *
   * That Representation switch will be considered as active until the
   * `onPeriodCleared` method has been called for the same `bufferType` and
   * `Period`, or until `dispose` is called.
   * @param {string} bufferType - The type of buffer concerned by the
   * Representation switch
   * @param {Object} period - The Period concerned by the Representation switch
   */
  public onRepresentationChange(
    bufferType : IBufferType,
    period : Period
  ) : void {
    this._addActivelyLoadedPeriod(period, bufferType);
  }

  /**
   * Method to call any time a Period and type combination is not considered
   * anymore.
   *
   * Calling this method allows to signal that a previous Adaptation and/or
   * Representation change respectively indicated by an `onAdaptationChange` and
   * an `onRepresentationChange` call, are not active anymore.
   * @param {string} bufferType - The type of buffer concerned
   * @param {Object} period - The Period concerned
   */
  public onPeriodCleared(
    bufferType : IBufferType,
    period : Period
  ) : void {
    this._removeActivelyLoadedPeriod(period, bufferType);
  }

  /**
   * Method to call when the last chronological segment for a given buffer type
   * is known to have been loaded and is either pushed or in the process of
   * being pushed to the corresponding MSE `SourceBuffer` or equivalent.
   *
   * This method can even be called multiple times in a row as long as the
   * aforementioned condition is true, if it simplify your code's management.
   * @param {string} bufferType
   */
  public onLastSegmentFinishedLoading(
    bufferType : IBufferType
  ) : void {
    const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
    if (!streamInfo.hasFinishedLoadingLastPeriod) {
      streamInfo.hasFinishedLoadingLastPeriod = true;
      this._checkEndOfStream();
    }
  }

  /**
   * Method to call to "cancel" a previous call to
   * `onLastSegmentFinishedLoading`.
   *
   * That is, calling this method indicates that the last chronological segment
   * of a given buffer type is now either not loaded or it is not known.
   *
   * This method can even be called multiple times in a row as long as the
   * aforementioned condition is true, if it simplify your code's management.
   * @param {string} bufferType
   */
  public onLastSegmentLoadingResume(bufferType : IBufferType) : void {
    const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
    if (streamInfo.hasFinishedLoadingLastPeriod) {
      streamInfo.hasFinishedLoadingLastPeriod = false;
      this._checkEndOfStream();
    }
  }

  /**
   * Free all resources used by the `ContentTimeBoundariesObserver` and cancels
   * all recurring processes it performs.
   */
  public dispose() {
    this.removeEventListener();
    this._canceller.cancel();
  }

  private _addActivelyLoadedPeriod(period : Period, bufferType : IBufferType) : void {
    const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
    if (!streamInfo.activePeriods.has(period)) {
      streamInfo.activePeriods.add(period);
      this._checkCurrentPeriod();
    }
  }

  private _removeActivelyLoadedPeriod(
    period : Period,
    bufferType : IBufferType
  ) : void {
    const streamInfo = this._activeStreams.get(bufferType);
    if (streamInfo === undefined) {
      return;
    }
    if (streamInfo.activePeriods.has(period)) {
      streamInfo.activePeriods.removeElement(period);
      this._checkCurrentPeriod();
    }
  }

  private _checkCurrentPeriod() : void {
    if (this._allBufferTypes.length === 0) {
      return;
    }

    const streamInfo = this._activeStreams.get(this._allBufferTypes[0]);
    if (streamInfo === undefined) {
      return;
    }
    for (const period of streamInfo.activePeriods.toArray()) {
      let wasFoundInAllTypes = true;
      for (let i = 1; i < this._allBufferTypes.length; i++) {
        const streamInfo2 = this._activeStreams.get(this._allBufferTypes[i]);
        if (streamInfo2 === undefined) {
          return;
        }

        const activePeriods = streamInfo2.activePeriods.toArray();
        const hasPeriod = activePeriods.some((p) => p.id === period.id);
        if (!hasPeriod) {
          wasFoundInAllTypes = false;
          break;
        }
      }
      if (wasFoundInAllTypes) {
        if (this._lastCurrentPeriodId !== period.id) {
          this._lastCurrentPeriodId = period.id;
          this.trigger("periodChange", period);
        }
        return;
      }
    }
  }

  private _lazilyCreateActiveStreamInfo(bufferType : IBufferType) : IActiveStreamsInfo {
    let streamInfo = this._activeStreams.get(bufferType);
    if (streamInfo === undefined) {
      streamInfo = {
        activePeriods: new SortedList((a, b) => a.start - b.start),
        hasFinishedLoadingLastPeriod: false,
      };
      this._activeStreams.set(bufferType, streamInfo);
    }
    return streamInfo;
  }

  private _checkEndOfStream() : void {
    if (!this._manifest.isLastPeriodKnown) {
      return;
    }
    const everyBufferTypeLoaded = this._allBufferTypes.every((bt) => {
      const streamInfo = this._activeStreams.get(bt);
      return streamInfo !== undefined && streamInfo.hasFinishedLoadingLastPeriod;
    });
    if (everyBufferTypeLoaded) {
      this.trigger("endOfStream", null);
    } else {
      this.trigger("resumeStream", null);
    }
  }
}

/**
 * Events triggered by a `ContentTimeBoundariesObserver` where the keys are the
 * event names and the value is the payload of those events.
 */
export interface IContentTimeBoundariesObserverEvent {
  /** Triggered when a minor error is encountered. */
  warning : IPlayerError;
  /** Triggered when a new `Period` is currently playing. */
  periodChange : Period;
  /**
   * Triggered when the duration of the currently-playing content became known
   * or changed.
   */
  durationUpdate : number | undefined;
  /**
   * Triggered when the last possible chronological segment for all types of
   * buffers has either been pushed or is being pushed to the corresponding
   * MSE `SourceBuffer` or equivalent.
   * As such, the `endOfStream` MSE API might from now be able to be called.
   *
   * Note that it is possible to receive this event even if `endOfStream` has
   * already been called and even if an "endOfStream" event has already been
   * triggered.
   */
  endOfStream : null;
  /**
   * Triggered when the last possible chronological segment for all types of
   * buffers have NOT been pushed, or if it is not known whether is has been
   * pushed, and as such any potential pending `endOfStream` MSE API call
   * need to be cancelled.
   *
   * Note that it is possible to receive this event even if `endOfStream` has
   * not been called and even if an "resumeStream" event has already been
   * triggered.
   */
  resumeStream : null;
}

/**
 * Calculate the last position from the last chosen audio and video Adaptations
 * for the last Period (or a default one, if no Adaptations has been chosen).
 * @class MaximumPositionCalculator
 */
class MaximumPositionCalculator {
  private _manifest : Manifest;

  // TODO replicate for the minimum position ?
  private _lastAudioAdaptation : Adaptation | undefined | null;
  private _lastVideoAdaptation : Adaptation | undefined | null;

  /**
   * @param {Object} manifest
   */
  constructor(manifest : Manifest) {
    this._manifest = manifest;
    this._lastAudioAdaptation = undefined;
    this._lastVideoAdaptation = undefined;
  }

  /**
   * Update the last known audio Adaptation for the last Period.
   * If no Adaptation has been set, it should be set to `null`.
   *
   * Allows to calculate the maximum position more precizely in
   * `getMaximumAvailablePosition` and `getEndingPosition`.
   * @param {Object|null} adaptation
   */
  public updateLastAudioAdaptation(adaptation : Adaptation | null) : void {
    this._lastAudioAdaptation = adaptation;
  }

  /**
   * Update the last known video Adaptation for the last Period.
   * If no Adaptation has been set, it should be set to `null`.
   *
   * Allows to calculate the maximum position more precizely in
   * `getMaximumAvailablePosition` and `getEndingPosition`.
   * @param {Object|null} adaptation
   */
  public updateLastVideoAdaptation(adaptation : Adaptation | null) : void {
    this._lastVideoAdaptation = adaptation;
  }

/**
 * Returns an estimate of the maximum position currently reachable (i.e.
 * segments are available) under the current circumstances.
 * @returns {number}
 */
  public getMaximumAvailablePosition() : number {
    if (this._manifest.isDynamic) {
      return this._manifest.getLivePosition() ??
             this._manifest.getMaximumSafePosition();
    }
    if (this._lastVideoAdaptation === undefined ||
        this._lastAudioAdaptation === undefined)
    {
      return this._manifest.getMaximumSafePosition();
    } else if (this._lastAudioAdaptation === null) {
      if (this._lastVideoAdaptation === null) {
        return this._manifest.getMaximumSafePosition();
      } else {
        const lastVideoPosition =
          getLastAvailablePositionFromAdaptation(this._lastVideoAdaptation);
        if (typeof lastVideoPosition !== "number") {
          return this._manifest.getMaximumSafePosition();
        }
        return lastVideoPosition;
      }
    } else if (this._lastVideoAdaptation === null) {
      const lastAudioPosition =
        getLastAvailablePositionFromAdaptation(this._lastAudioAdaptation);
      if (typeof lastAudioPosition !== "number") {
        return this._manifest.getMaximumSafePosition();
      }
      return lastAudioPosition;
    } else {
      const lastAudioPosition = getLastAvailablePositionFromAdaptation(
        this._lastAudioAdaptation
      );
      const lastVideoPosition = getLastAvailablePositionFromAdaptation(
        this._lastVideoAdaptation
      );
      if (typeof lastAudioPosition !== "number" ||
          typeof lastVideoPosition !== "number")
      {
        return this._manifest.getMaximumSafePosition();
      } else {
        return Math.min(lastAudioPosition, lastVideoPosition);
      }
    }
  }

/**
 * Returns an estimate of the actual ending position once
 * the full content is available.
 * Returns `undefined` if that could not be determined, for various reasons.
 * @returns {number|undefined}
 */
  public getEndingPosition() : number | undefined {
    if (!this._manifest.isDynamic) {
      return this.getMaximumAvailablePosition();
    }
    if (this._lastVideoAdaptation === undefined ||
        this._lastAudioAdaptation === undefined)
    {
      return undefined;
    } else if (this._lastAudioAdaptation === null) {
      if (this._lastVideoAdaptation === null) {
        return undefined;
      } else {
        return getEndingPositionFromAdaptation(this._lastVideoAdaptation) ??
               undefined;
      }
    } else if (this._lastVideoAdaptation === null) {
      return getEndingPositionFromAdaptation(this._lastAudioAdaptation) ??
             undefined;
    } else {
      const lastAudioPosition =
        getEndingPositionFromAdaptation(this._lastAudioAdaptation);
      const lastVideoPosition =
        getEndingPositionFromAdaptation(this._lastVideoAdaptation);
      if (typeof lastAudioPosition !== "number" ||
          typeof lastVideoPosition !== "number")
      {
        return undefined;
      } else {
        return Math.min(lastAudioPosition, lastVideoPosition);
      }
    }
  }
}

/**
 * Returns last currently available position from the Adaptation given.
 * `undefined` if a time could not be found.
 * `null` if the Adaptation has no segments (it could be that it didn't started or
 * that it already finished for example).
 *
 * We consider the earliest last available position from every Representation
 * in the given Adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined|null}
 */
function getLastAvailablePositionFromAdaptation(
  adaptation: Adaptation
) : number | undefined | null {
  const { representations } = adaptation;
  let min : null | number = null;

  /**
   * Some Manifest parsers use the exact same `IRepresentationIndex` reference
   * for each Representation of a given Adaptation, because in the actual source
   * Manifest file, indexing data is often defined at Adaptation-level.
   * This variable allows to optimize the logic here when this is the case.
   */
  let lastIndex : IRepresentationIndex | undefined;
  for (let i = 0; i < representations.length; i++) {
    if (representations[i].index !== lastIndex) {
      lastIndex = representations[i].index;
      const lastPosition = representations[i].index.getLastAvailablePosition();
      if (lastPosition === undefined) { // we cannot tell
        return undefined;
      }
      if (lastPosition !== null) {
        min = isNullOrUndefined(min) ? lastPosition :
                                       Math.min(min, lastPosition);
      }
    }
  }
  return min;
}

/**
 * Returns ending time from the Adaptation given, once all its segments are
 * available.
 * `undefined` if a time could not be found.
 * `null` if the Adaptation has no segments (it could be that it already
 * finished for example).
 *
 * We consider the earliest ending time from every Representation in the given
 * Adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined|null}
 */
function getEndingPositionFromAdaptation(
  adaptation: Adaptation
) : number | undefined | null {
  const { representations } = adaptation;
  let min : null | number = null;

  /**
   * Some Manifest parsers use the exact same `IRepresentationIndex` reference
   * for each Representation of a given Adaptation, because in the actual source
   * Manifest file, indexing data is often defined at Adaptation-level.
   * This variable allows to optimize the logic here when this is the case.
   */
  let lastIndex : IRepresentationIndex | undefined;
  for (let i = 0; i < representations.length; i++) {
    if (representations[i].index !== lastIndex) {
      lastIndex = representations[i].index;
      const lastPosition = representations[i].index.getEnd();
      if (lastPosition === undefined) { // we cannot tell
        return undefined;
      }
      if (lastPosition !== null) {
        min = isNullOrUndefined(min) ? lastPosition :
                                       Math.min(min, lastPosition);
      }
    }
  }
  return min;
}

interface IActiveStreamsInfo {
  /**
   * Active Periods being currently actively loaded by the "Streams".
   * That is: either this Period's corresponding `Representation` has been
   * selected or we didn't chose any `Adaptation` for that type), in
   * chronological order.
   *
   * The first chronological Period in that list is the active one for
   * the current type.
   */
  activePeriods : SortedList<Period>;
  /**
   * If `true` the last segment for the last currently known Period has been
   * pushed for the current Adaptation and Representation choice.
   */
  hasFinishedLoadingLastPeriod : boolean;
}

export type IContentTimeObserverPlaybackObservation =
  Pick<IStreamOrchestratorPlaybackObservation, "position">;
