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

import type {
  IStreamOrchestratorPlaybackObservation,
  IBufferType,
} from "../../../core/types";
import { MediaError } from "../../../errors";
import type {
  IManifest,
  IRepresentation,
  IRepresentationIndex,
  IPeriod,
} from "../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import type { IPlayerError } from "../../../public_types";
import EventEmitter from "../../../utils/event_emitter";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import SortedList from "../../../utils/sorted_list";
import TaskCanceller from "../../../utils/task_canceller";

/**
 * Observes what's being played and take care of media events relating to time
 * boundaries:
 *   - Emits a `endingPositionChange` when the known maximum playable position
 *     of the current content is known and every time it changes.
 *   - Emits `endOfStream` API once segments have been pushed until the end and
 *     `resumeStream` if downloads starts back.
 *   - Emits a `periodChange` event when the currently-playing Period seemed to
 *     have changed.
 *   - emit "warning" events when what is being played is outside of the
 *     Manifest range.
 * @class ContentTimeBoundariesObserver
 */
export default class ContentTimeBoundariesObserver extends EventEmitter<IContentTimeBoundariesObserverEvent> {
  /** Allows to interrupt everything the `ContentTimeBoundariesObserver` is doing. */
  private _canceller: TaskCanceller;

  /** Store information on every created "Streams". */
  private _activeStreams: Map<IBufferType, IActiveStreamsInfo>;

  /** The `Manifest` object linked to the current content. */
  private _manifest: IManifest;

  /** Allows to calculate at any time maximum positions of the content */
  private _maximumPositionCalculator: MaximumPositionCalculator;

  /** Enumerate all possible buffer types in the current content. */
  private _allBufferTypes: IBufferType[];

  /**
   * Stores the `id` property of the last Period for which a `periodChange`
   * event has been sent.
   * Allows to avoid multiple times in a row `periodChange` for the same
   * Period.
   */
  private _lastCurrentPeriodId: string | null;

  /**
   * @param {Object} manifest
   * @param {Object} playbackObserver
   */
  constructor(
    manifest: IManifest,
    playbackObserver: IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
    bufferTypes: IBufferType[],
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
    playbackObserver.listen(
      ({ position }) => {
        const wantedPosition = position.getWanted();
        if (wantedPosition < manifest.getMinimumSafePosition()) {
          const warning = new MediaError(
            "MEDIA_TIME_BEFORE_MANIFEST",
            "The current position is behind the " +
              "earliest time announced in the Manifest.",
          );
          this.trigger("warning", warning);
        } else if (
          wantedPosition > maximumPositionCalculator.getMaximumAvailablePosition()
        ) {
          const warning = new MediaError(
            "MEDIA_TIME_AFTER_MANIFEST",
            "The current position is after the latest " +
              "time announced in the Manifest.",
          );
          this.trigger("warning", warning);
        }
      },
      { includeLastObservation: true, clearSignal: cancelSignal },
    );

    manifest.addEventListener(
      "manifestUpdate",
      () => {
        this.trigger("endingPositionChange", this._getManifestEndTime());
        if (cancelSignal.isCancelled()) {
          return;
        }
        this._checkEndOfStream();
      },
      cancelSignal,
    );
  }

  /**
   * Returns an estimate of the current last position which may be played in
   * the content at the moment.
   * @returns {Object}
   */
  public getCurrentEndingTime(): IEndingPositionInformation {
    return this._getManifestEndTime();
  }

  /**
   * Method to call any time the played Representations change.
   *
   * That switch will be considered as active until the `onPeriodCleared` method
   * has been called for the same `bufferType` and `Period`, or until `dispose`
   * is called.
   * @param {string} bufferType - The type of buffer concerned by the
   * Representations switch
   * @param {Object} period - The Period concerned by the Representations switch
   * @param {Object|null} representations - The Representations selected. `null`
   * if the absence of `Representation` has been explicitely selected for this
   * Period and buffer type (e.g. no video).
   */
  public onRepresentationListChange(
    bufferType: IBufferType,
    period: IPeriod,
    representations: IRepresentation[] | null,
  ): void {
    if (this._manifest.isLastPeriodKnown) {
      const lastPeriod = this._manifest.periods[this._manifest.periods.length - 1];
      if (period.id === lastPeriod?.id) {
        if (bufferType === "audio" || bufferType === "video") {
          if (bufferType === "audio") {
            this._maximumPositionCalculator.updateLastAudioRepresentations(
              representations,
            );
          } else {
            this._maximumPositionCalculator.updateLastVideoRepresentations(
              representations,
            );
          }
          const endingPosition = this._maximumPositionCalculator.getEndingPosition();
          const newEndingPosition =
            endingPosition !== undefined
              ? { isEnd: true, endingPosition }
              : {
                  isEnd: false,
                  endingPosition:
                    this._maximumPositionCalculator.getMaximumAvailablePosition(),
                };
          this.trigger("endingPositionChange", newEndingPosition);
        }
      }
    }
    if (this._canceller.isUsed()) {
      return;
    }
    if (representations === null) {
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
  public onRepresentationChange(bufferType: IBufferType, period: IPeriod): void {
    this._addActivelyLoadedPeriod(period, bufferType);
  }

  /**
   * Method to call any time a Period and type combination is not considered
   * anymore.
   *
   * Calling this method allows to signal that a previous Representation list
   * and/or Representation change respectively indicated by an
   * `onRepresentationListChange` and an `onRepresentationChange` call, are not
   * active anymore.
   * @param {string} bufferType - The type of buffer concerned
   * @param {Object} period - The Period concerned
   */
  public onPeriodCleared(bufferType: IBufferType, period: IPeriod): void {
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
  public onLastSegmentFinishedLoading(bufferType: IBufferType): void {
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
  public onLastSegmentLoadingResume(bufferType: IBufferType): void {
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

  private _addActivelyLoadedPeriod(period: IPeriod, bufferType: IBufferType): void {
    const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
    if (!streamInfo.activePeriods.has(period)) {
      streamInfo.activePeriods.add(period);
      this._checkCurrentPeriod();
    }
  }

  private _removeActivelyLoadedPeriod(period: IPeriod, bufferType: IBufferType): void {
    const streamInfo = this._activeStreams.get(bufferType);
    if (streamInfo === undefined) {
      return;
    }
    if (streamInfo.activePeriods.has(period)) {
      streamInfo.activePeriods.removeElement(period);
      this._checkCurrentPeriod();
    }
  }

  private _checkCurrentPeriod(): void {
    if (this._allBufferTypes.length === 0) {
      return;
    }

    const streamInfo = this._activeStreams.get(this._allBufferTypes[0]);
    if (streamInfo === undefined) {
      return;
    }
    for (const period of streamInfo.activePeriods.toArray()) {
      let wasFoundInAllTypes = true;
      for (const bufferType of this._allBufferTypes) {
        const streamInfo2 = this._activeStreams.get(bufferType);
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

  private _getManifestEndTime(): IEndingPositionInformation {
    const endingPosition = this._maximumPositionCalculator.getEndingPosition();
    return endingPosition !== undefined
      ? { isEnd: true, endingPosition }
      : {
          isEnd: false,
          endingPosition: this._maximumPositionCalculator.getMaximumAvailablePosition(),
        };
  }

  private _lazilyCreateActiveStreamInfo(bufferType: IBufferType): IActiveStreamsInfo {
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

  private _checkEndOfStream(): void {
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

export interface IEndingPositionInformation {
  /**
   * The new maximum known position (note that this is the ending position
   * currently known of the current content, it might be superior to the last
   * position at which segments are available and it might also evolve over
   * time), in seconds.
   */
  endingPosition: number;
  /**
   * If `true`, the communicated `endingPosition` is the actual end of the content.
   * It may still be updated due to a track change or to add precision, but it
   * is still a (rough) estimate of the maximum position that content should
   * have.
   *
   * If `false`, this is the currently known maximum position associated to
   * the content, but the content is still evolving (typically, new media
   * segments are still being generated) and as such it can still have a
   * longer `endingPosition` in the future.
   */
  isEnd: boolean;
}

/**
 * Events triggered by a `ContentTimeBoundariesObserver` where the keys are the
 * event names and the value is the payload of those events.
 */
export interface IContentTimeBoundariesObserverEvent {
  /** Triggered when a minor error is encountered. */
  warning: IPlayerError;
  /** Triggered when a new `Period` is currently playing. */
  periodChange: IPeriod;
  /**
   * Triggered when the ending position of the currently-playing content became
   * known or changed.
   */
  endingPositionChange: IEndingPositionInformation;
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
  endOfStream: null;
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
  resumeStream: null;
}

/**
 * Calculate the last position from the last chosen audio and video
 * Representations for the last Period (or a default one, if no Representation
 * has been chosen).
 * @class MaximumPositionCalculator
 */
class MaximumPositionCalculator {
  private _manifest: IManifest;

  // TODO replicate for the minimum position ?
  private _lastAudioRepresentations: IRepresentation[] | undefined | null;
  private _lastVideoRepresentations: IRepresentation[] | undefined | null;

  /**
   * @param {Object} manifest
   */
  constructor(manifest: IManifest) {
    this._manifest = manifest;
    this._lastAudioRepresentations = undefined;
    this._lastVideoRepresentations = undefined;
  }

  /**
   * Update the last known audio Representations for the last Period.
   * If no Representations has been set, it should be set to `null`.
   *
   * Allows to calculate the maximum position more precizely in
   * `getMaximumAvailablePosition` and `getEndingPosition`.
   * @param {Object|null} representations
   */
  public updateLastAudioRepresentations(representations: IRepresentation[] | null): void {
    this._lastAudioRepresentations = representations;
  }

  /**
   * Update the last known video Representations for the last Period.
   * If no Representations has been set, it should be set to `null`.
   *
   * Allows to calculate the maximum position more precizely in
   * `getMaximumAvailablePosition` and `getEndingPosition`.
   * @param {Object|null} representations
   */
  public updateLastVideoRepresentations(representations: IRepresentation[] | null): void {
    this._lastVideoRepresentations = representations;
  }

  /**
   * Returns an estimate of the maximum position currently reachable (i.e.
   * segments are available) under the current circumstances.
   * @returns {number}
   */
  public getMaximumAvailablePosition(): number {
    if (this._manifest.isDynamic) {
      return this._manifest.getMaximumSafePosition();
    }
    if (
      this._lastVideoRepresentations === undefined ||
      this._lastAudioRepresentations === undefined
    ) {
      return this._manifest.getMaximumSafePosition();
    } else if (this._lastAudioRepresentations === null) {
      if (this._lastVideoRepresentations === null) {
        return this._manifest.getMaximumSafePosition();
      } else {
        const lastVideoPosition = getLastAvailablePositionFromRepresentations(
          this._lastVideoRepresentations,
        );
        if (typeof lastVideoPosition !== "number") {
          return this._manifest.getMaximumSafePosition();
        }
        return lastVideoPosition;
      }
    } else if (this._lastVideoRepresentations === null) {
      const lastAudioPosition = getLastAvailablePositionFromRepresentations(
        this._lastAudioRepresentations,
      );
      if (typeof lastAudioPosition !== "number") {
        return this._manifest.getMaximumSafePosition();
      }
      return lastAudioPosition;
    } else {
      const lastAudioPosition = getLastAvailablePositionFromRepresentations(
        this._lastAudioRepresentations,
      );
      const lastVideoPosition = getLastAvailablePositionFromRepresentations(
        this._lastVideoRepresentations,
      );
      if (
        typeof lastAudioPosition !== "number" ||
        typeof lastVideoPosition !== "number"
      ) {
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
  public getEndingPosition(): number | undefined {
    if (!this._manifest.isDynamic) {
      return this.getMaximumAvailablePosition();
    }
    if (
      this._lastVideoRepresentations === undefined ||
      this._lastAudioRepresentations === undefined
    ) {
      return undefined;
    } else if (this._lastAudioRepresentations === null) {
      if (this._lastVideoRepresentations === null) {
        return undefined;
      } else {
        return (
          getEndingPositionFromRepresentations(this._lastVideoRepresentations) ??
          undefined
        );
      }
    } else if (this._lastVideoRepresentations === null) {
      return (
        getEndingPositionFromRepresentations(this._lastAudioRepresentations) ?? undefined
      );
    } else {
      const lastAudioPosition = getEndingPositionFromRepresentations(
        this._lastAudioRepresentations,
      );
      const lastVideoPosition = getEndingPositionFromRepresentations(
        this._lastVideoRepresentations,
      );
      if (
        typeof lastAudioPosition !== "number" ||
        typeof lastVideoPosition !== "number"
      ) {
        return undefined;
      } else {
        return Math.min(lastAudioPosition, lastVideoPosition);
      }
    }
  }
}

/**
 * Returns last currently available position from the Representations given.
 * `undefined` if a time could not be found.
 * `null` if the Representations have no segments (it could be that they didn't
 * started yet or that they already finished for example).
 *
 * We consider the earliest last available position from every Representation
 * in the given Representations.
 * @param {Object} representations
 * @returns {Number|undefined|null}
 */
function getLastAvailablePositionFromRepresentations(
  representations: IRepresentation[],
): number | undefined | null {
  let min: null | number = null;

  /**
   * Some Manifest parsers use the exact same `IRepresentationIndex` reference
   * for each Representation of a given Representations, because in the actual source
   * DASH MPD file, indexing data is often defined at the AdaptationSet-level.
   * This variable allows to optimize the logic here when this is the case.
   */
  let lastIndex: IRepresentationIndex | undefined;
  for (const representation of representations) {
    if (representation.index !== lastIndex) {
      lastIndex = representation.index;
      const lastPosition = representation.index.getLastAvailablePosition();
      if (lastPosition === undefined) {
        // we cannot tell
        return undefined;
      }
      if (lastPosition !== null) {
        min = isNullOrUndefined(min) ? lastPosition : Math.min(min, lastPosition);
      }
    }
  }
  return min;
}

/**
 * Returns ending time from the Representations given, once all its segments are
 * available.
 * `undefined` if a time could not be found.
 * `null` if the Representations have no segments (it could be that they already
 * finished for example).
 *
 * We consider the earliest ending time from every Representation in the given
 * Representations.
 * @param {Object} representations
 * @returns {Number|undefined|null}
 */
function getEndingPositionFromRepresentations(
  representations: IRepresentation[],
): number | undefined | null {
  let min: null | number = null;

  /**
   * Some Manifest parsers use the exact same `IRepresentationIndex` reference
   * for each Representation of a given Representations, because in the actual source
   * DASH MPD file, indexing data is often defined at the AdaptationSet-level.
   * This variable allows to optimize the logic here when this is the case.
   */
  let lastIndex: IRepresentationIndex | undefined;
  for (let i = 0; i < representations.length; i++) {
    if (representations[i].index !== lastIndex) {
      lastIndex = representations[i].index;
      const lastPosition = representations[i].index.getEnd();
      if (lastPosition === undefined) {
        // we cannot tell
        return undefined;
      }
      if (lastPosition !== null) {
        min = isNullOrUndefined(min) ? lastPosition : Math.min(min, lastPosition);
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
  activePeriods: SortedList<IPeriod>;
  /**
   * If `true` the last segment for the last currently known Period has been
   * pushed for the current Adaptation and Representation choice.
   */
  hasFinishedLoadingLastPeriod: boolean;
}

export type IContentTimeObserverPlaybackObservation = Pick<
  IStreamOrchestratorPlaybackObservation,
  "position"
>;
