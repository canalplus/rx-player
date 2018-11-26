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
  Observable,
  of as observableOf,
  ReplaySubject,
} from "rxjs";
import {
  catchError,
  filter,
  mapTo,
  mergeMap,
  multicast,
  refCount,
  take,
  tap,
} from "rxjs/operators";
import {
  hasLoadedMetadata,
  play$,
} from "../../compat";
import log from "../../log";
import { IStreamClockTick } from "./types";

/**
 * Set the initial time given as soon as possible on the media element.
 * Emit when done.
 * @param {HMTLMediaElement} mediaElement
 * @param {number|Function} startTime - Initial starting position. As seconds
 * or as a function returning seconds.
 * @returns {Observable}
 */
function doInitialSeek(
  mediaElement : HTMLMediaElement,
  startTime : number|(() => number)
) : Observable<void> {
  return hasLoadedMetadata(mediaElement)
    .pipe(
      tap(() => {
        log.info("Stream: Set initial time", startTime);

        // reset playbackRate to 1 in case we were at 0 (from a stalled
        // retry for instance)
        mediaElement.playbackRate = 1;
        mediaElement.currentTime = typeof startTime === "function" ?
          startTime() : startTime;
      }),

      // equivalent to a sane shareReplay:
      // https://github.com/ReactiveX/rxjs/issues/3336
      // XXX TODO Replace it when that issue is resolved
      multicast(() => new ReplaySubject(1)),
      refCount()
    );
}

/**
 * Emit a single time as soon as the clock$ anounce that the content can begin
 * to be played.
 * @param {Observable} clock$
 * @returns {Observable}
 */
function canPlay(clock$ : Observable<IStreamClockTick>) {
  return clock$.pipe(filter(tick => {
    return tick.seeking !== true && tick.stalled == null &&
      (tick.readyState === 4 || tick.readyState === 3 && tick.currentRange != null);
  }), take(1));
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
  clock$ : Observable<IStreamClockTick>,
  mediaElement : HTMLMediaElement,
  startTime : number|(() => number),
  mustAutoPlay : boolean
) : {
  seek$ : Observable<void>;
  load$ : Observable<"autoplay-blocked"|"autoplay"|"loaded">;
} {
  const seek$ = doInitialSeek(mediaElement, startTime);
  const load$ = seek$.pipe(
    mergeMap(() => canPlay(clock$)),
    tap(() => log.info("Stream: Can begin to play content")),
    mergeMap(() => {
      if (mustAutoPlay) {
        return play$(mediaElement).pipe(
          mapTo("autoplay" as "autoplay"),
          catchError((error) => {
            if (error.name === "NotAllowedError") {
              // auto-play was probably prevented.
              log.warn("Stream: Media element can't play." +
                " It may be due to browser auto-play policies.");
              return observableOf("autoplay-blocked" as "autoplay-blocked");
            } else {
              throw error;
            }
          })
        );
      }
      return observableOf("loaded" as "loaded");
    }),

    // equivalent to a sane shareReplay:
    // https://github.com/ReactiveX/rxjs/issues/3336
    // XXX TODO Replace it when that issue is resolved
    multicast(() => new ReplaySubject(1)),
    refCount()
  );

  return { seek$, load$ };
}
