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
  merge as observableMerge,
  Observable,
  ReplaySubject,
} from "rxjs";
import {
  ignoreElements,
  map,
  tap,
  shareReplay,
} from "rxjs/operators";
import log from "../../log";
import Manifest from "../../manifest";
import { IStreamOrchestratorClockTick } from "../stream";
import emitLoadedEventWhenReady, {
  ILoadEvents,
} from "./emit_loaded_event";
import { IInitClockTick } from "./types";

/** Arguments for the `initialSeekAndPlay` function. */
export interface IInitialSeekAndPlayArguments {
  /** `true` if you want to play automatically when possible. */
  autoPlay : boolean;
  /** Manifest linked to that content. */
  manifest : Manifest;
  /** Always emits the last speed requested by the user. */
  speed$ : Observable<number>;
  /** The initial time you want to seek to. */
  startTime : number;
}

/**
 * When the HTMLMediaElement is ready, perform if needed:
 *  - the initial seek
 *  - the initial autoplay operation
 *
 * Returns the following Observables:
 *
 *   - `clock$`: The central observable performing both the seek and autoPlay.
 *     Also returns an updated clock's tick (which includes information such as
 *     the position offset until the seek is taken into account or the last
 *     wanted playback speed).
 *
 *   - `loaded$`: An observable emitting events specifically related to the
 *     loading status. Will always emit its last value on subscription.
 *
 *     @see ILoadEvents for more information.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} initClock$
 * @param {Object} streamClockArgument
 * @returns {Observable}
 */
export default function initialSeekAndPlay(
  mediaElement : HTMLMediaElement,
  initClock$ : Observable<IInitClockTick>,
  { autoPlay,
    manifest,
    speed$,
    startTime } : IInitialSeekAndPlayArguments
) : {
    clock$: Observable<IStreamOrchestratorClockTick>;
    loaded$ : Observable<ILoadEvents>;
  }
{
  /**
   * `true` once the content is considered "loaded".
   * This means it can begin to play.
   */
  let isLoaded = false;

  /** `true` once the seek to a protential initial position has been performed. */
  let isSeekDone = false;

  /**
   * Emit loading-related events.
   * As its own ReplaySubject to avoid polluting the more general clock$
   * Observable.
   */
  const loaded$ = new ReplaySubject<ILoadEvents>(1);

  /**
   * Silent Observable (does not emit anything) which performs autoPlay if
   * needed and which emits through `loaded$` the current loading status.
   * Completes when done.
   */
  const load$ = emitLoadedEventWhenReady(initClock$, mediaElement, autoPlay, false).pipe(
    tap((evt) => {
      isLoaded = true;
      loaded$.next(evt);
    }),
    ignoreElements());

  /**
   * Observable trying to perform the initial seek and emitting updated clock
   * ticks.
   */
  const clock$ = observableCombineLatest([initClock$, speed$]).pipe(
    map(([tick, speed]) => {
      /**
       * When this value is `false`, the `startTime` should be considered as
       * the current position instead of the clock tick's `position` property.
       * This is because that clock tick was triggered before the initial seek
       * was done.
       */
      const isTickPositionRight = isSeekDone;

      // perform initial seek, if ready and not already done
      if (!isSeekDone && (tick.readyState > 0 || tick.event === "loadedmetadata")) {
        if (mediaElement.currentTime !== startTime) {
          log.info("Init: Set initial time", startTime);
          mediaElement.currentTime = startTime;
        }
        isSeekDone = true;
      }
      const liveGap = !manifest.isLive ? Infinity :
                      isTickPositionRight  ?
                        manifest.getMaximumPosition() - tick.position :
                        manifest.getMaximumPosition() - startTime;
      return {
        position: tick.position,
        getCurrentTime: tick.getCurrentTime,
        duration: tick.duration,
        isPaused: isLoaded ? tick.paused :
                             !autoPlay,
        liveGap,
        readyState: tick.readyState,
        speed,
        stalled: tick.stalled,

        // wantedTimeOffset is an offset to add to the timing's current time to have
        // the "real" wanted position.
        // For now, this is seen when the media element has not yet seeked to its
        // initial position, the currentTime will most probably be 0 where the
        // effective starting position will be _startTime_.
        // Thus we initially set a wantedTimeOffset equal to startTime.
        wantedTimeOffset: isTickPositionRight ? 0 :
                                                startTime,
      };
    }));

  return { loaded$,
           clock$: observableMerge(load$, clock$).pipe(
             shareReplay({ bufferSize: 1, refCount: true })) };
}
