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
  combineLatest as observableCombineLatest,
  defer as observableDefer,
  EMPTY,
  fromEvent as observableFromEvent,
  interval as observableInterval,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  startWith,
  switchMap,
  take,
  tap,
} from "rxjs/operators";
import {
  onSourceOpen$,
  onSourceClose$,
  onSourceEnded$,
} from "../../compat/event_listeners";
import log from "../../log";
import Manifest from "../../manifest";
import { fromEvent } from "../../utils/event_emitter";

/** Number of seconds in a regular year. */
const YEAR_IN_SECONDS = 365 * 24 * 3600;

/**
 * Keep the MediaSource duration up-to-date with the Manifest one on
 * subscription:
 * Set the current duration initially and then update if needed after
 * each Manifest updates.
 * @param {Object} manifest
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
export default function DurationUpdater(
  manifest : Manifest,
  mediaSource : MediaSource
) : Observable<never> {
  return observableDefer(() => {
    let lastDurationUpdate: number | undefined;
    return setMediaSourceDuration(mediaSource, manifest, undefined).pipe(
      mergeMap((initialDurationUpdate) => {
        // only update `lastDurationUpdate` if the MediaSource's duration has
        // been updated.
        if (initialDurationUpdate !== null) {
          lastDurationUpdate = initialDurationUpdate;
        }

        return fromEvent(manifest, "manifestUpdate").pipe(
          switchMap(() => setMediaSourceDuration(mediaSource,
                                                 manifest,
                                                 lastDurationUpdate)),
          tap((durationUpdate) => {
            if (durationUpdate !== null) {
              lastDurationUpdate = durationUpdate;
            }
          })
        );
      }),
      ignoreElements()
    );
  });
}

/**
 * Checks that duration can be updated on the MediaSource, and then
 * sets it.
 *
 * Returns either:
 *   - the new duration it has been updated to if it has
 *   - `null` if it hasn'nt been updated
 *
 * @param {MediaSource} mediaSource
 * @param {Object} manifest
 * @param {number | undefined} lastSetDuration
 * @returns {Observable.<number | null>}
 */
function setMediaSourceDuration(
  mediaSource: MediaSource,
  manifest: Manifest,
  lastSetDuration?: number
): Observable<number | null> {
  return isMediaSourceOpened$(mediaSource).pipe(
    switchMap((isMediaSourceOpened) => {
      if (!isMediaSourceOpened) {
        return EMPTY;
      }
      return whenSourceBuffersEndedUpdates$(mediaSource.sourceBuffers);
    }),
    take(1),
    map(() : number | null => {
      const maximumPosition = manifest.getMaximumPosition();
      const { isLive } = manifest;
      // Some targets poorly support setting a very high number for durations.
      // Yet, in live contents, we would prefer setting a value as high as possible
      // to still be able to seek anywhere we want to (even ahead of the Manifest if
      // we want to). As such, we put it at a safe default value of 2^32 excepted
      // when the maximum position is already relatively close to that value, where
      // we authorize exceptionally going over it.
      const newDuration = !isLive ? maximumPosition :
                                    Math.max(Math.pow(2, 32),
                                             maximumPosition + YEAR_IN_SECONDS);

      if (mediaSource.duration >= newDuration ||
          // Even if the MediaSource duration is different than the duration that
          // we want to set now, the last duration we wanted to set may be the same,
          // as the MediaSource duration may have been changed by the browser.
          //
          // In that case, we do not want to update it.
          //
          newDuration === lastSetDuration) {
        return null;
      }
      if (isNaN(mediaSource.duration) || !isFinite(mediaSource.duration) ||
          newDuration - mediaSource.duration > 0.01) {
        log.info("Init: Updating duration", newDuration);
        mediaSource.duration = newDuration;
        return newDuration;
      }
      return null;
    }),
    catchError((err) => {
      log.warn("Duration Updater: Can't update duration on the MediaSource.", err);
      return observableOf(null);
    })
  );
}

/**
 * Returns an Observable which will emit only when all the SourceBuffers ended
 * all pending updates.
 * @param {SourceBufferList} sourceBuffers
 * @returns {Observable}
 */
function whenSourceBuffersEndedUpdates$(
  sourceBuffers: SourceBufferList
) : Observable<undefined> {
  if (sourceBuffers.length === 0) {
    return observableOf(undefined);
  }
  const sourceBufferUpdatingStatuses : Array<Observable<boolean>> = [];

  for (let i = 0; i < sourceBuffers.length; i++) {
    const sourceBuffer = sourceBuffers[i];
    sourceBufferUpdatingStatuses.push(
      observableMerge(
        observableFromEvent(sourceBuffer, "updatestart").pipe(mapTo(true)),
        observableFromEvent(sourceBuffer, "update").pipe(mapTo(false)),
        observableInterval(500).pipe(mapTo(sourceBuffer.updating))
      ).pipe(
        startWith(sourceBuffer.updating),
        distinctUntilChanged()
      )
    );
  }
  return observableCombineLatest(sourceBufferUpdatingStatuses).pipe(
    filter((areUpdating) => {
      return areUpdating.every((isUpdating) => !isUpdating);
    }),
    mapTo(undefined)
  );
}

/**
 * Emit a boolean that tells if the media source is opened or not.
 * @param {MediaSource} mediaSource
 * @returns {Object}
 */
function isMediaSourceOpened$(mediaSource: MediaSource): Observable<boolean> {
  return observableMerge(onSourceOpen$(mediaSource).pipe(mapTo(true)),
                         onSourceEnded$(mediaSource).pipe(mapTo(false)),
                         onSourceClose$(mediaSource).pipe(mapTo(false))
  ).pipe(
    startWith(mediaSource.readyState === "open"),
    distinctUntilChanged()
  );
}
