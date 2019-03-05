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
  concat as observableConcat,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  filter,
  mapTo,
  mergeMap,
  shareReplay,
  take,
  tap,
} from "rxjs/operators";
import {
  play$,
  shouldValidateMetadata,
  whenLoadedMetadata$,
} from "../../compat";
import log from "../../log";
import { IInitClockTick } from "./types";

type ILoadEvents =
  "not-loaded-metadata" | // metadata are not loaded. Manual action required
  "autoplay-blocked" | // loaded but autoplay is blocked by the browser
  "autoplay" | // loaded and autoplayed succesfully
  "loaded"; // loaded without autoplay enabled

/**
 * Emit once a "can-play" message as soon as the clock$ anounce that the content
 * can begin to be played.
 *
 * Warn you if the metadata is not yet loaded metadata by emitting a
 * "not-loaded-metadata" message first.
 * @param {Observable} clock$
 * @returns {Observable}
 */
function canPlay(
  clock$ : Observable<IInitClockTick>,
  mediaElement : HTMLMediaElement
) : Observable<"can-play"|"not-loaded-metadata"> {
  const isLoaded$ = clock$.pipe(
    filter((tick) => {
      const { seeking, stalled, readyState, currentRange } = tick;
      return !seeking &&
        stalled == null &&
        (readyState === 4 || readyState === 3 && currentRange != null) &&
        (!shouldValidateMetadata() || mediaElement.duration > 0);
    }),
    take(1),
    mapTo("can-play" as "can-play")
  );

  if (shouldValidateMetadata() && mediaElement.duration === 0) {
    return observableConcat(
      observableOf("not-loaded-metadata" as "not-loaded-metadata"),
      isLoaded$
    );
  }

  return isLoaded$;
}

/**
 * Try to play content then handle autoplay errors.
 * @param {HTMLMediaElement} - mediaElement
 * @returns {Observable}
 */
function autoPlay$(
  mediaElement: HTMLMediaElement
): Observable<"autoplay"|"autoplay-blocked"> {
  return play$(mediaElement).pipe(
    mapTo("autoplay" as "autoplay"),
    catchError((error) => {
      if (error.name === "NotAllowedError") {
        // auto-play was probably prevented.
        log.warn("Init: Media element can't play." +
          " It may be due to browser auto-play policies.");
        return observableOf("autoplay-blocked" as "autoplay-blocked");
      } else {
        throw error;
      }
    })
  );
}

/**
 * Returns two Observables:
 *
 *   - seek$: when subscribed, will seek to the wanted started time as soon as
 *     it can. Emit and complete when done.
 *
 *   - load$: when subscribed, will play if and only if the `mustAutoPlay`
 *     option is set as soon as it can. Emit and complete when done.
 *     When this observable emits, it also means that the content is `loaded`
 *     and can begin to play the current content.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {number|Function} startTime - Initial starting position. As seconds
 * or as a function returning seconds.
 * @param {boolean} autoPlay - Whether the player should auto-play
 * @returns {object}
 */
export default function seekAndLoadOnMediaEvents(
  clock$ : Observable<IInitClockTick>,
  mediaElement : HTMLMediaElement,
  startTime : number|(() => number),
  mustAutoPlay : boolean
) : { seek$ : Observable<unknown>; load$ : Observable<ILoadEvents> } {
  const seek$ = whenLoadedMetadata$(mediaElement).pipe(
    take(1),
    tap(() => {
      log.info("Init: Set initial time", startTime);
      mediaElement.currentTime = typeof startTime === "function" ?
        startTime() : startTime;
    }),
    shareReplay({ refCount: true })
  );

  const load$ : Observable<ILoadEvents> = seek$.pipe(
    mergeMap(() => {
      return canPlay(clock$, mediaElement).pipe(
        tap(() => log.info("Init: Can begin to play content")),
        mergeMap((evt) => {
          if (evt === "can-play") {
            if (!mustAutoPlay) {
              return observableOf("loaded" as "loaded");
            }
            return autoPlay$(mediaElement);
          }
          return observableOf(evt);
        })
      );
    }),
    shareReplay({ refCount: true })
  );

  return { seek$, load$ };
}
