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

import {
  distinctUntilChanged,
  ignoreElements,
  map,
  merge as observableMerge,
  Observable,
  skipWhile,
  startWith,
  tap,
} from "rxjs";
import { MediaError } from "../../errors";
import Manifest, {
  Adaptation,
  IRepresentationIndex,
} from "../../manifest";
import { fromEvent } from "../../utils/event_emitter";
import filterMap from "../../utils/filter_map";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import createSharedReference from "../../utils/reference";
import { IReadOnlyPlaybackObserver } from "../api";
import {
  IStreamOrchestratorEvent,
  IStreamOrchestratorPlaybackObservation,
} from "../stream";
import EVENTS from "./events_generators";
import { IWarningEvent } from "./types";

// NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
// first type parameter as `any` instead of the perfectly fine `unknown`,
// leading to linter issues, as it forbids the usage of `any`.
// This is why we're disabling the eslint rule.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/**
 * Observes the position and Adaptations being played and deduce various events
 * related to the available time boundaries:
 *  - Emit when the theoretical duration of the content becomes known or when it
 *    changes.
 *  - Emit warnings when the duration goes out of what is currently
 *    theoretically playable.
 *
 * @param {Object} manifest
 * @param {Observable} streams
 * @param {Object} playbackObserver
 * @returns {Observable}
 */
export default function ContentTimeBoundariesObserver(
  manifest : Manifest,
  streams : Observable<IStreamOrchestratorEvent>,
  playbackObserver : IReadOnlyPlaybackObserver<IContentTimeObserverPlaybackObservation>

) : Observable<IContentDurationUpdateEvent | IWarningEvent> {
  /**
   * Allows to calculate the minimum and maximum playable position on the
   * whole content.
   */
  const maximumPositionCalculator = new MaximumPositionCalculator(manifest);

  // trigger warnings when the wanted time is before or after the manifest's
  // segments
  const outOfManifest$ = playbackObserver.getReference().asObservable().pipe(
    filterMap<IContentTimeObserverPlaybackObservation, IWarningEvent, null>((
      { position }
    ) => {
      const wantedPosition = position.pending ?? position.last;
      if (
        wantedPosition < manifest.getMinimumSafePosition()
      ) {
        const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST",
                                       "The current position is behind the " +
                                       "earliest time announced in the Manifest.");
        return EVENTS.warning(warning);
      } else if (
        wantedPosition > maximumPositionCalculator.getMaximumAvailablePosition()
      ) {
        const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST",
                                       "The current position is after the latest " +
                                       "time announced in the Manifest.");
        return EVENTS.warning(warning);
      }
      return null;
    }, null));

  /**
   * Contains the content duration according to the last audio and video
   * Adaptation chosen for the last Period.
   * `undefined` if unknown yet.
   */
  const contentDuration = createSharedReference<number | undefined>(undefined);

  const updateDurationOnManifestUpdate$ = fromEvent(manifest, "manifestUpdate").pipe(
    startWith(null),
    tap(() => {
      const duration = manifest.isDynamic ?
        maximumPositionCalculator.getEndingPosition() :
        maximumPositionCalculator.getMaximumAvailablePosition();
      contentDuration.setValue(duration);
    }),
    ignoreElements()
  );

  const updateDurationAndTimeBoundsOnTrackChange$ = streams.pipe(
    tap((message) => { // Update Manifest's bounds and duration if necessary
      if (message.type === "adaptationChange") {
        const lastPeriod = manifest.periods[manifest.periods.length - 1];
        if (message.value.period.id === lastPeriod?.id) {
          if (message.value.type === "audio" || message.value.type === "video") {
            if (message.value.type === "audio") {
              maximumPositionCalculator
                .updateLastAudioAdaptation(message.value.adaptation);
            } else {
              maximumPositionCalculator
                .updateLastVideoAdaptation(message.value.adaptation);
            }
            const newDuration = manifest.isDynamic ?
              maximumPositionCalculator.getMaximumAvailablePosition() :
              maximumPositionCalculator.getEndingPosition();
            contentDuration.setValue(newDuration);
          }
        }
      }
    }),
    ignoreElements()
  );

  return observableMerge(
    updateDurationOnManifestUpdate$,
    updateDurationAndTimeBoundsOnTrackChange$,
    outOfManifest$,
    contentDuration.asObservable().pipe(
      skipWhile((val) => val === undefined),
      distinctUntilChanged(),
      map(value => ({ type: "contentDurationUpdate" as const, value }))
    ));
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

/**
 * Emitted when the duration of the full content (== the last playable position)
 * has changed.
 */
export interface IContentDurationUpdateEvent {
  type: "contentDurationUpdate";
  /** The new theoretical duration, `undefined` if unknown, */
  value : number | undefined;
}

export type IContentTimeObserverPlaybackObservation =
  Pick<IStreamOrchestratorPlaybackObservation, "position">;
