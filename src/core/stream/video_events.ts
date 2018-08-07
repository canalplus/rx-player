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
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  mapTo,
  mergeMapTo,
  shareReplay,
  tap,
} from "rxjs/operators";
import {
  canPlay,
  hasLoadedMetadata,
  play$,
} from "../../compat";
import log from "../../log";
import EVENTS, { IInitialPlaybackEvent } from "./stream_events";

/**
 * Try to call play on the given media element:
 *
 *   - If it works emit `undefined` through the returned Observable, then
 *     complete it.
 *
 *   - If it fails probably because of an auto-play policy, trigger a warning event
 *     then emit `undefined` through the returned Observable then
 *     complete it.
 *
 *   - if it fails for any other reason, throw through the Observable.
 * @param {HTMLMediaElement} videoElement
 * @param {Subject} warning$
 * @returns {Observable}
 */
function playUnlessAutoPlayPolicy$(
  mediaElement : HTMLMediaElement
): Observable<IInitialPlaybackEvent> {
  return play$(mediaElement)
    .pipe(
      mapTo(EVENTS.initialPlayback({ autoPlayStatus: "allowed" })),
      catchError((error) => {
      if (error.name === "NotAllowedError") {
        // auto-play was probably prevented.
        log.debug("Media element can't play." +
          " It may be due to browser auto-play policies.");
        return observableOf(EVENTS.initialPlayback({
          autoPlayStatus: "blocked",
        }));
      } else {
        throw error;
      }
    })
  );
}

/**
 * Set the initial time given as soon as possible on the video element.
 * Emit when done.
 * @param {HMTLMediaElement} videoElement
 * @param {number|Function} startTime
 * @returns {Observable}
 */
function doInitialSeek(
  videoElement : HTMLMediaElement,
  startTime : number|(() => number)
) : Observable<void> {
  return hasLoadedMetadata(videoElement)
    .pipe(
      tap(() => {
        log.info("set initial time", startTime);

        // reset playbackRate to 1 in case we were at 0 (from a stalled
        // retry for instance)
        videoElement.playbackRate = 1;
        videoElement.currentTime = typeof startTime === "function" ?
          startTime() : startTime;
      }),
      shareReplay() // we don't want to repeat the side-effect on each
                    // subscription of this very same observable
    );
}

/**
 * @param {HTMLMediaElement} videoElement
 * @param {number|Function} startTime
 * @param {boolean} mustAutoPlay
 * @param {Subject} warning$
 * @returns {object}
 */
export default function handleVideoEvents(
  videoElement : HTMLMediaElement,
  startTime : number|(() => number),
  mustAutoPlay : boolean
) : {
  initialSeek$ : Observable<void>;
  loadedContent$: Observable<void>;
  handlePlayback$ : Observable<IInitialPlaybackEvent>;
} {
  const initialSeek$ = doInitialSeek(videoElement, startTime);
  const handledCanPlay$ = canPlay(videoElement).pipe(
    tap(() => log.info("canplay event"))
  );

  const loadedContent$ = observableCombineLatest(
    initialSeek$,
    handledCanPlay$
  ).pipe(
    mapTo(undefined),
    shareReplay()
  );

  const handlePlayback$ = loadedContent$.pipe(
    mergeMapTo(mustAutoPlay ?
      playUnlessAutoPlayPolicy$(videoElement) :
      observableOf(EVENTS.initialPlayback())
    ),
    shareReplay() // avoid doing "play" each time someone subscribes
  );

  return {
    initialSeek$,
    loadedContent$,
    handlePlayback$,
  };
}
