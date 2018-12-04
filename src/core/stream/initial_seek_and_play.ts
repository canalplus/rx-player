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
  Observer,
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
import { play$ } from "../../compat";
import { onLoadedMetadata$ } from "../../compat/events";
import log from "../../log";
import { IStreamClockTick } from "./types";

type ILoadEvents = "autoplay-blocked"|"autoplay"|"loaded";

/**
 * On Subscription, set the initial time given on the media element.
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
  return Observable.create((obs: Observer<void>) => {
    log.info("Stream: Set initial time", startTime);
    mediaElement.currentTime = typeof startTime === "function" ?
      startTime() : startTime;
    obs.next(undefined);
    obs.complete();
  });
}

/**
 * Emit a single time as soon as the clock$ anounce that the content can begin
 * to be played.
 * @param {Observable} clock$
 * @returns {Observable}
 */
function canPlay(clock$ : Observable<IStreamClockTick>) {
  return clock$.pipe(filter(tick => {
    return !tick.seeking && tick.stalled == null &&
      (tick.readyState === 4 || tick.readyState === 3 && tick.currentRange != null);
  }), take(1));

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
        log.warn("Stream: Media element can't play." +
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
  clock$ : Observable<IStreamClockTick>,
  mediaElement : HTMLMediaElement,
  startTime : number|(() => number),
  mustAutoPlay : boolean
) : { seek$ : Observable<void>; load$ : Observable<ILoadEvents> } {
  const seek$ = onLoadedMetadata$(mediaElement).pipe(
    mergeMap(() => doInitialSeek(mediaElement, startTime)),
    // equivalent to a sane shareReplay:
    // https://github.com/ReactiveX/rxjs/issues/3336
    // XXX TODO Replace it when that issue is resolved
    multicast(() => new ReplaySubject(1)),
    refCount()
  );

  const load$ = seek$.pipe(
    mergeMap(() => {
      return canPlay(clock$, mediaElement).pipe(
        tap(() => log.info("Stream: Can begin to play content")),
        mergeMap(() => {
          if (!mustAutoPlay) {
            return observableOf("loaded");
          }
          return autoPlay$(mediaElement);
        })
      );
    }),

    // equivalent to a sane shareReplay:
    // https://github.com/ReactiveX/rxjs/issues/3336
    // XXX TODO Replace it when that issue is resolved
    multicast(() => new ReplaySubject(1)),
    refCount()
  );

  return { seek$, load$ };
}
