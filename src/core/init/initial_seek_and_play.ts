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
  catchError,
  concat as observableConcat,
  filter,
  mapTo,
  mergeMap,
  Observable,
  of as observableOf,
  shareReplay,
  startWith,
  take,
  tap,
} from "rxjs";
import {
  play,
  shouldValidateMetadata,
  whenLoadedMetadata$,
} from "../../compat";
import { MediaError } from "../../errors";
import log from "../../log";
import {
  createSharedReference,
  IReadOnlySharedReference,
} from "../../utils/reference";
import {
  IPlaybackObservation,
  PlaybackObserver,
} from "../api";
import EVENTS from "./events_generators";
import { IWarningEvent } from "./types";

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
 * Emit once as soon as the playback observation announces that the content can
 * begin to be played by calling the `play` method.
 *
 * This depends on browser-defined criteria (e.g. the readyState status) as well
 * as RxPlayer-defined ones (e.g.) not rebuffering.
 *
 * @param {Observable} observation$
 * @returns {Observable.<undefined>}
 */
export function waitUntilPlayable(
  observation$ : Observable<IPlaybackObservation>
) : Observable<undefined> {
  return observation$.pipe(
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

/** Object returned by `initialSeekAndPlay`. */
export interface IInitialSeekAndPlayObject {
  /**
   * Observable which, when subscribed, will try to seek at the initial position
   * then play if needed as soon as the HTMLMediaElement's properties are right.
   *
   * Emits various events relative to the status of this operation.
   */
  seekAndPlay$ : Observable<IInitialPlayEvent>;

  /**
   * Shared reference whose value becomes `true` once the initial seek has
   * been considered / has been done by `seekAndPlay$`.
   */
  initialSeekPerformed : IReadOnlySharedReference<boolean>;

  /**
   * Shared reference whose value becomes `true` once the initial play has
   * been considered / has been done by `seekAndPlay$`.
   */
  initialPlayPerformed: IReadOnlySharedReference<boolean>;
}

/**
 * Creates an Observable allowing to seek at the initially wanted position and
 * to play if autoPlay is wanted.
 * @param {Object} args
 * @returns {Object}
 */
export default function initialSeekAndPlay(
  { mediaElement,
    playbackObserver,
    startTime,
    mustAutoPlay } : { playbackObserver : PlaybackObserver;
                       mediaElement : HTMLMediaElement;
                       mustAutoPlay : boolean;
                       startTime : number|(() => number); }
) : IInitialSeekAndPlayObject {
  const initialSeekPerformed = createSharedReference(false);
  const initialPlayPerformed = createSharedReference(false);

  const seek$ = whenLoadedMetadata$(mediaElement).pipe(
    take(1),
    tap(() => {
      log.info("Init: Set initial time", startTime);
      const initialTime = typeof startTime === "function" ? startTime() :
                                                            startTime;
      playbackObserver.setCurrentTime(initialTime);
      initialSeekPerformed.setValue(true);
      initialSeekPerformed.finish();
    }),
    shareReplay({ refCount: true })
  );

  const seekAndPlay$ = seek$.pipe(
    mergeMap(() : Observable<IWarningEvent | undefined> => {
      if (!shouldValidateMetadata() || mediaElement.duration > 0) {
        return waitUntilPlayable(playbackObserver.observe(true));
      } else {
        const error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA",
                                     "Cannot load automatically: your browser " +
                                     "falsely announced having loaded the content.");
        return waitUntilPlayable(playbackObserver.observe(true))
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
        initialPlayPerformed.setValue(true);
        initialPlayPerformed.finish();
        return observableOf({ type: "skipped" as const });
      }
      return autoPlay(mediaElement).pipe(mergeMap((autoplayEvt) => {
        initialPlayPerformed.setValue(true);
        initialPlayPerformed.finish();
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

  return { seekAndPlay$, initialPlayPerformed, initialSeekPerformed };
}
