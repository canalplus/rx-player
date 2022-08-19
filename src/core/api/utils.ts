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
  defer as observableDefer,
  EMPTY,
  filter,
  map,
  merge as observableMerge,
  Observable,
  startWith,
  switchMap,
  take,
} from "rxjs";
import config from "../../config";
import { IPlayerState } from "../../public_types";
import { IStallingSituation } from "../init";
import { IPlaybackObservation } from "./playback_observer";

/**
 * Returns Observable which will emit:
 *   - `"seeking"` when we are seeking in the given mediaElement
 *   - `"seeked"` when a seek is considered as finished by the given observation$
 *     Observable.
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} observation$
 * @returns {Observable}
 */
export function emitSeekEvents(
  mediaElement : HTMLMediaElement | null,
  observation$ : Observable<IPlaybackObservation>
) : Observable<"seeking" | "seeked"> {
  return observableDefer(() => {
    if (mediaElement === null) {
      return EMPTY;
    }

    let isSeeking$ = observation$.pipe(
      filter((observation : IPlaybackObservation) => observation.event === "seeking"),
      map(() => "seeking" as const)
    );

    if (mediaElement.seeking) {
      isSeeking$ = isSeeking$.pipe(startWith("seeking" as const));
    }

    const hasSeeked$ = isSeeking$.pipe(
      switchMap(() =>
        observation$.pipe(
          filter((observation : IPlaybackObservation) => observation.event === "seeked"),
          map(() => "seeked" as const),
          take(1)))
    );
    return observableMerge(isSeeking$, hasSeeked$);
  });
}

/** Player state dictionnary. */
export const enum PLAYER_STATES {
  STOPPED = "STOPPED",
  LOADED = "LOADED",
  LOADING = "LOADING",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
  BUFFERING = "BUFFERING",
  SEEKING = "SEEKING",
  FREEZING = "FREEZING",
  RELOADING = "RELOADING",
}

/**
 * Get state string for a _loaded_ content.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} stalledStatus - Current stalled state:
 *   - null when not stalled
 *   - a description of the situation if stalled.
 * @returns {string}
 */
export function getLoadedContentState(
  mediaElement : HTMLMediaElement,
  stalledStatus : IStallingSituation |
                  null
) : IPlayerState {
  const { FORCED_ENDED_THRESHOLD } = config.getCurrent();
  if (mediaElement.ended) {
    return PLAYER_STATES.ENDED;
  }

  if (stalledStatus !== null) {
    // On some old browsers (e.g. Chrome 54), the browser does not
    // emit an 'ended' event in some conditions. Detect if we
    // reached the end by comparing the current position and the
    // duration instead.
    const gapBetweenDurationAndCurrentTime = Math.abs(mediaElement.duration -
                                                      mediaElement.currentTime);
    if (FORCED_ENDED_THRESHOLD != null &&
        gapBetweenDurationAndCurrentTime < FORCED_ENDED_THRESHOLD
    ) {
      return PLAYER_STATES.ENDED;
    }

    return stalledStatus === "seeking"  ? PLAYER_STATES.SEEKING :
           stalledStatus === "freezing" ? PLAYER_STATES.FREEZING :
                                          PLAYER_STATES.BUFFERING;
  }
  return mediaElement.paused ? PLAYER_STATES.PAUSED :
                               PLAYER_STATES.PLAYING;
}
