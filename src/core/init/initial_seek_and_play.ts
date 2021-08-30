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
  startWith,
  take,
  tap,
} from "rxjs/operators";
import {
  play,
  shouldValidateMetadata,
  whenLoadedMetadata$,
} from "../../compat";
import { MediaError } from "../../errors";
import log from "../../log";
import EVENTS from "./events_generators";
import {
  IInitClockTick,
  IWarningEvent,
} from "./types";

/** Event emitted when trying to perform the initial `play`. */
export type IInitialPlayEvent =
  /** Autoplay is not enabled, but all required steps to do so are there. */
  { type: "skipped" } |
  /**
   * Tried to play, but autoplay is blocked by the browser.
   * A corresponding warning should have already been sent.
   */
  { type: "autoplay-blocked" } |
  /** Autoplay was done with success. */
  { type: "autoplay" } |
  /** Warnings preventing the initial play from happening normally. */
  IWarningEvent;

/**
 * Emit once as soon as the clock$ announce that the content can begin to be
 * played by calling the `play` method.
 *
 * This depends on browser-defined criteria (e.g. the readyState status) as well
 * as RxPlayer-defined ones (e.g.) not rebuffering.
 *
 * @param {Observable} clock$
 * @returns {Observable.<undefined>}
 */
export function waitUntilPlayable(
  clock$ : Observable<IInitClockTick>
) : Observable<undefined> {
  return clock$.pipe(
    filter(({ seeking, rebuffering, readyState }) => !seeking &&
                                                     rebuffering === null &&
                                                     readyState >= 1),
    take(1),
    mapTo(undefined)
  );
}

/**
 * Try to play content then handle autoplay errors.
 * @param {HTMLMediaElement} - mediaElement
 * @returns {Observable}
 */
function autoPlay(
  mediaElement: HTMLMediaElement
): Observable<"autoplay"|"autoplay-blocked"> {
  return play(mediaElement).pipe(
    mapTo("autoplay" as const),
    catchError((error : unknown) => {
      if (error instanceof Error && error.name === "NotAllowedError") {
        // auto-play was probably prevented.
        log.warn("Init: Media element can't play." +
                 " It may be due to browser auto-play policies.");
        return observableOf("autoplay-blocked" as const);
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
 *   - play$: when subscribed, will autoplay if and only if the `mustAutoPlay`
 *     option is set as soon as it can.
 *     Emit and complete when done.
 *     Might also emit some warning events if issues related to the initial
 *     playback arised
 *
 * Both Observables are `shareReplay`, meaning that they re-emit everything on
 * subscription.
 *
 * /!\ `play$` has a dependency on `seek$`, as such, the player will try to seek
 * as soon as either Observable is subscribed to.
 *
 * @param {Object} args
 * @returns {Object}
 */
export default function initialSeekAndPlay(
  { clock$,
    mediaElement,
    startTime,
    mustAutoPlay,
    setCurrentTime } : { clock$ : Observable<IInitClockTick>;
                         isDirectfile : boolean;
                         mediaElement : HTMLMediaElement;
                         mustAutoPlay : boolean;
                         /** Perform an internal seek. */
                         setCurrentTime: (nb: number) => void;
                         startTime : number|(() => number); }
) : { seek$ : Observable<unknown>; play$ : Observable<IInitialPlayEvent> } {
  const seek$ = whenLoadedMetadata$(mediaElement).pipe(
    take(1),
    tap(() => {
      log.info("Init: Set initial time", startTime);
      const initialTime = typeof startTime === "function" ? startTime() :
                                                            startTime;
      setCurrentTime(initialTime);
    }),
    shareReplay({ refCount: true })
  );

  const play$ = seek$.pipe(
    mergeMap(() : Observable<IWarningEvent | undefined> => {
      if (!shouldValidateMetadata() || mediaElement.duration > 0) {
        return waitUntilPlayable(clock$);
      } else {
        const error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA",
                                     "Cannot load automatically: your browser " +
                                     "falsely announced having loaded the content.");
        return waitUntilPlayable(clock$)
          .pipe(startWith(EVENTS.warning(error)));
      }
    }),

    mergeMap((evt) : Observable<IInitialPlayEvent> => {
      if (evt !== undefined) {
        return observableOf(evt);
      }
      log.info("Init: Can begin to play content");
      if (!mustAutoPlay) {
        if (mediaElement.autoplay) {
          log.warn("Init: autoplay is enabled on HTML media element. " +
                   "Media will play as soon as possible.");
        }
        return observableOf({ type: "skipped" as const });
      }
      return autoPlay(mediaElement).pipe(mergeMap((autoplayEvt) => {
        if (autoplayEvt === "autoplay") {
          return observableOf({ type: "autoplay" as const });
        } else {
          const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY",
                                       "Cannot trigger auto-play automatically: " +
                                       "your browser does not allow it.");
          return observableConcat(
            observableOf(EVENTS.warning(error)),
            observableOf({ type: "autoplay-blocked" as const })
          );
        }
      }));
    }),
    shareReplay({ refCount: true })
  );

  return { seek$, play$ };
}
