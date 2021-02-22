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
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  ignoreElements,
  map,
  mergeMap,
  mergeMapTo,
  share,
  take,
} from "rxjs/operators";
import {
  clearElementSrc,
  setElementSrc$,
} from "../../compat";
import { MediaError } from "../../errors";
import log from "../../log";
import deferSubscriptions from "../../utils/defer_subscriptions";
import { IKeySystemOption } from "../eme";
import createEMEManager from "./create_eme_manager";
import EVENTS from "./events_generators";
import { IInitialTimeOptions } from "./get_initial_time";
import throwOnMediaError from "./throw_on_media_error";
import tryBeginningPlayback from "./try_beginning_playback";
import tryInitialSeek from "./try_initial_seek";
import {
  IDirectfileEvent,
  IInitClockTick,
} from "./types";
import updatePlaybackRate from "./update_playback_rate";

/**
 * calculate initial time as a position in seconds.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object|undefined} startAt
 * @returns {number}
 */
function getDirectFileInitialTime(
  mediaElement : HTMLMediaElement,
  startAt? : IInitialTimeOptions
) : number {
  if (startAt == null) {
    return 0;
  }

  if (startAt.position != null) {
    return startAt.position;
  } else if (startAt.wallClockTime != null) {
    return startAt.wallClockTime;
  } else if (startAt.fromFirstPosition != null) {
    return startAt.fromFirstPosition;
  }

  const duration = mediaElement.duration;
  if (duration == null || !isFinite(duration)) {
    log.warn("startAt.fromLastPosition set but no known duration, " +
             "beginning at 0.");
    return 0;
  }

  if (typeof startAt.fromLastPosition === "number") {
    return Math.max(0, duration + startAt.fromLastPosition);
  } else if (startAt.percentage != null) {
    const { percentage } = startAt;
    if (percentage >= 100) {
      return duration;
    } else if (percentage <= 0) {
      return 0;
    }
    const ratio = +percentage / 100;
    return duration * ratio;
  }

  return 0;
}

// Argument used by `initializeDirectfileContent`
export interface IDirectFileOptions { autoPlay : boolean;
                                      clock$ : Observable<IInitClockTick>;
                                      keySystems : IKeySystemOption[];
                                      mediaElement : HTMLMediaElement;
                                      speed$ : Observable<number>;
                                      startAt? : IInitialTimeOptions;
                                      url? : string; }

/**
 * Launch a content in "Directfile mode".
 * @param {Object} directfileOptions
 * @returns {Observable}
 */
export default function initializeDirectfileContent({
  autoPlay,
  clock$,
  keySystems,
  mediaElement,
  speed$,
  startAt,
  url,
} : IDirectFileOptions) : Observable<IDirectfileEvent> {

  clearElementSrc(mediaElement);

  if (url == null) {
    throw new Error("No URL for a DirectFile content");
  }

  // Start everything! (Just put the URL in the element's src).
  const linkURL$ = setElementSrc$(mediaElement, url);

  log.debug("Init: Calculating initial time");
  const initialTime = () => getDirectFileInitialTime(mediaElement, startAt);
  log.debug("Init: Initial time calculated:", initialTime);

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = linkURL$.pipe(
    mergeMap(() => createEMEManager(mediaElement, keySystems, EMPTY)),
    deferSubscriptions(),
    share()
  );

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const mediaError$ = throwOnMediaError(mediaElement);

  // Set the speed set by the user on the media element while pausing a
  // little longer while the buffer is empty.
  const playbackRate$ =
    updatePlaybackRate(mediaElement, speed$, clock$, { pauseWhenStalled: true })
      .pipe(ignoreElements());

  // Create Stalling Manager, an observable which will try to get out of
  // various infinite stalling issues
  const stalled$ = clock$.pipe(
    map(tick => tick.stalled === null ? EVENTS.unstalled() :
                                        EVENTS.stalled(tick.stalled)));

  // Manage "loaded" event and warn if autoplay is blocked on the current browser
  const loadedEvent$ = emeManager$.pipe(
    filter(function isEMEReady(evt) {
      if (evt.type === "created-media-keys") {
        evt.value.attachMediaKeys$.next();
        return true;
      }
      return evt.type === "eme-disabled" || evt.type === "attached-media-keys";
    }),
    take(1),
    mergeMapTo(tryBeginningPlayback(clock$, mediaElement, autoPlay, true)),
    mergeMap((evt) => {
      if (evt === "autoplay-blocked") {
        const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY",
                                     "Cannot trigger auto-play automatically: " +
                                     "your browser does not allow it.");
        return observableOf(EVENTS.warning(error), EVENTS.loaded(null));
      } else if (evt === "not-loaded-metadata") {
        const error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA",
                                     "Cannot load automatically: your browser " +
                                     "falsely announced having loaded the content.");
        return observableOf(EVENTS.warning(error));
      }
      return observableOf(EVENTS.loaded(null));
    }));

  const initialSeek$ = clock$.pipe(
    filter((tick) => tryInitialSeek(tick, mediaElement, initialTime)),
    take(1),
    ignoreElements());

  return observableMerge(loadedEvent$,
                         initialSeek$,
                         emeManager$,
                         mediaError$,
                         playbackRate$,
                         stalled$);
}

export { IDirectfileEvent };
