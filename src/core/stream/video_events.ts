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
} from "rxjs";
import {
  catchError,
  mapTo,
  mergeMap,
  shareReplay,
  tap,
} from "rxjs/operators";
import {
  canPlay,
  hasLoadedMetadata,
  play$,
} from "../../compat";
import log from "../../log";

/**
 * Set the initial time given as soon as possible on the video element.
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
        log.info("set initial time", startTime);

        // reset playbackRate to 1 in case we were at 0 (from a stalled
        // retry for instance)
        mediaElement.playbackRate = 1;
        mediaElement.currentTime = typeof startTime === "function" ?
          startTime() : startTime;
      }),
      shareReplay() // we don't want to repeat the side-effect on each
                    // subscription of this very same observable
    );
}

/**
 * @param {HTMLMediaElement} mediaElement
 * @param {number|Function} startTime - Initial starting position. As seconds
 * or as a function returning seconds.
 * @param {boolean} autoPlay - Whether the player should auto-play
 * @returns {object}
 */
export default function seekAndLoadOnMediaEvent(
  mediaElement : HTMLMediaElement,
  startTime : number|(() => number),
  mustAutoPlay : boolean
) : {
  seek$ : Observable<void>;
  load$ : Observable<"autoplay-blocked"|"autoplay"|"loaded">;
} {
  const seek$ = doInitialSeek(mediaElement, startTime);

  const load$ = canPlay(mediaElement).pipe(

    tap(() => log.info("canplay event")),

    mergeMap(() => {
      if (mustAutoPlay) {
        return play$(mediaElement).pipe(
          mapTo("autoplay" as "autoplay"),
          catchError((error) => {
            if (error.name === "NotAllowedError") {
              // auto-play was probably prevented.
              log.warn("Media element can't play." +
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

    shareReplay()
  );

  return { seek$, load$ };
}
