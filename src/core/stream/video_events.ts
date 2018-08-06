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
  Subject,
} from "rxjs";
import {
  mergeMapTo,
  shareReplay,
  tap,
} from "rxjs/operators";
import {
  canPlay,
  hasLoadedMetadata,
  playUnlessAutoPlayPolicy$,
} from "../../compat";
import log from "../../log";

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
  mustAutoPlay : boolean,
  warning$ : Subject<Error>
) : {
  initialSeek$ : Observable<void>;
  loadAndPlay$ : Observable<void>;
} {
  const initialSeek$ = doInitialSeek(videoElement, startTime);
  const handledCanPlay$ = canPlay(videoElement).pipe(
    tap(() => log.info("canplay event"))
  );

  const loadAndPlay$ = observableCombineLatest(
    initialSeek$,
    handledCanPlay$
  ).pipe(
    mergeMapTo(mustAutoPlay ?
      playUnlessAutoPlayPolicy$(videoElement, warning$) :
      observableOf(undefined)
    ),
    shareReplay() // avoid doing "play" each time someone subscribes
  );

  return {
    initialSeek$,
    loadAndPlay$,
  };
}
