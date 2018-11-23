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
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
} from "rxjs";
import {
  catchError,
  filter,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  multicast,
  refCount,
  take,
  tap,
  takeUntil,
} from "rxjs/operators";
import {
  canPlay,
  hasLoadedMetadata,
  play$,
} from "../../compat";
import {
  onDurationChange$,
  onPlayPause$,
  onVolumeChange$,
} from "../../compat/events";
import log from "../../log";

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

function handlePlayError(error: Error) {
  if (error.name === "NotAllowedError") {
    // auto-play was probably prevented.
    log.warn("Stream: Media element can't play." +
      " It may be due to browser auto-play policies.");
    return observableOf("autoplay-blocked" as "autoplay-blocked");
  } else {
    throw error;
  }
}

/**
 * Try to play on mediaElement, and wait for his duration to be
 * striclty positive.
 * @param {HTMLMediaElement} _mediaElement
 * @returns {Observable}
 */
function playAndCheckMediaDuration$(
  _mediaElement: HTMLMediaElement
): Observable<"autoplay-blocked"|"loaded"> {
  return play$(_mediaElement).pipe(
    catchError(handlePlayError),
    mergeMap((status) => {
      if (status !== "autoplay-blocked") {
        if (_mediaElement.duration > 0) {
          return observableOf("loaded" as "loaded");
        } else {
          return onDurationChange$(_mediaElement).pipe(
            filter((evt: any) => {
              return (evt != null && evt.target != null && evt.target.duration > 0);
            }),
            take(1),
            mapTo("loaded" as "loaded")
          );
        }
      }
      return observableOf(status as "autoplay-blocked");
    }),
    take(1)
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
  mediaElement : HTMLMediaElement,
  startTime : number|(() => number),
  mustAutoPlay : boolean
) : {
  seek$ : Observable<void>;
  load$ : Observable<{
    evt: "autoplay-blocked"|"autoplay"|"loaded";
    playPauseEvents$: Observable<boolean>;
  }>;
} {
  let playPauseEvents$: Observable<boolean>;
  const seek$ = doInitialSeek(mediaElement, startTime);
  const load$ = observableConcat(
    seek$.pipe(ignoreElements()),
    canPlay(mediaElement)
  ).pipe(

    tap(() => log.info("Stream: canplay event")),

    mergeMap(() => {

      const initialMediaDuration = mediaElement.duration;
      let autoPlayBlocked = false;

      playPauseEvents$ = onPlayPause$(mediaElement).pipe(
        map((x) => (x && x.type === "play") ? true : false),
        // equivalent to a sane shareReplay:
        // https://github.com/ReactiveX/rxjs/issues/3336
        // XXX TODO Replace it when that issue is resolved
        filter((_, i) => {
          return (i > 0 || initialMediaDuration > 0 || autoPlayBlocked);
        }),
        multicast(() => new ReplaySubject(1)),
        refCount()
      );

      playPauseEvents$.subscribe();

      if (initialMediaDuration === 0) {
        let lastVolume = mediaElement.volume;
        const volumeChange$ = onVolumeChange$(mediaElement).pipe(
          tap((evt) => {
            if (evt && evt.target instanceof HTMLMediaElement) {
              const { volume } = evt.target;
              lastVolume = volume;
            }
          })
        );

        mediaElement.volume = 0;
        const mediaDurationChecked$ = playAndCheckMediaDuration$(mediaElement);

        return observableMerge(
          volumeChange$.pipe(ignoreElements(), takeUntil(mediaDurationChecked$)),
          mediaDurationChecked$.pipe(
            mergeMap((status) => {
              mediaElement.volume = lastVolume;
              mediaElement.pause();
              autoPlayBlocked = status === "autoplay-blocked";

              if (mustAutoPlay && !autoPlayBlocked) {
                /* tslint:disable no-floating-promises */
                mediaElement.play();
                /* tslint:enable no-floating-promises */
              }
              return observableOf(status);
            })
          )
        );
      } else if (mustAutoPlay) {
        return play$(mediaElement).pipe(
          mapTo("autoplay" as "autoplay"),
          catchError(handlePlayError)
        );
      }
      return observableOf("loaded" as "loaded");
    }),
    map((evt) => ({
      evt,
      playPauseEvents$,
    })),
    // equivalent to a sane shareReplay:
    // https://github.com/ReactiveX/rxjs/issues/3336
    // XXX TODO Replace it when that issue is resolved
    multicast(() => new ReplaySubject(1)),
    refCount()
  );

  return { seek$, load$ };
}
