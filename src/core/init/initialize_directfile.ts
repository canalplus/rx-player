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

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import {
  asapScheduler,
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
  observeOn,
  share,
  take,
} from "rxjs/operators";
import {
  clearElementSrc,
  setElementSrc$,
} from "../../compat";
import { MediaError } from "../../errors";
import log from "../../log";
import {
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";
import createEMEManager, { IEMEDisabledEvent } from "./create_eme_manager";
import EVENTS from "./events_generators";
import { IInitialTimeOptions } from "./get_initial_time";
import getStalledEvents from "./get_stalled_events";
import seekAndLoadOnMediaEvents from "./initial_seek_and_play";
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitClockTick,
  ILoadedEvent,
  ISpeedChangedEvent,
  IStalledEvent,
  IWarningEvent,
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
  if (!startAt) {
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
  if (!duration || !isFinite(duration)) {
    log.warn("startAt.fromLastPosition set but no known duration, " +
      "beginning at 0.");
    return 0;
  }

  if (startAt.fromLastPosition) {
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
export interface IDirectFileOptions {
  autoPlay : boolean;
  clock$ : Observable<IInitClockTick>;
  keySystems : IKeySystemOption[];
  mediaElement : HTMLMediaElement;
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  url : string;
}

// Events emitted by `initializeDirectfileContent`
export type IDirectfileEvent =
  ISpeedChangedEvent |
  IStalledEvent |
  ILoadedEvent |
  IWarningEvent |
  IEMEManagerEvent |
  IEMEDisabledEvent;

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

  // Start everything! (Just put the URL in the element's src).
  const linkURL$ = setElementSrc$(mediaElement, url);

  log.debug("Init: Calculating initial time");
  const initialTime = () =>
    getDirectFileInitialTime(mediaElement, startAt);
  log.debug("Init: Initial time calculated:", initialTime);

  const { seek$, load$ } =
    seekAndLoadOnMediaEvents(clock$, mediaElement, initialTime, autoPlay);

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = linkURL$.pipe(
    mergeMap(() => createEMEManager(mediaElement, keySystems)),
    observeOn(asapScheduler), // multiple Observables here are based on this one
    share()
  );

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const mediaError$ = throwOnMediaError(mediaElement);

  // Set the speed set by the user on the media element while pausing a
  // little longer while the buffer is empty.
  const playbackRate$ = updatePlaybackRate(mediaElement, speed$, clock$, {
    pauseWhenStalled: true,
  }).pipe(map(EVENTS.speedChanged));

  // Create Stalling Manager, an observable which will try to get out of
  // various infinite stalling issues
  const stalled$ = getStalledEvents(mediaElement, clock$)
    .pipe(map(EVENTS.stalled));

  // Manage "loaded" event and warn if autoplay is blocked on the current browser
  const loadedEvent$ = emeManager$.pipe(
    filter(({ type }) => type === "eme-init" || type === "eme-disabled"),
    take(1),
    mergeMapTo(load$),
    mergeMap((evt) => {
      if (evt === "autoplay-blocked") {
        const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY",
          "Cannot trigger auto-play automatically: your browser does not allow it.",
          false);
        return observableOf(EVENTS.warning(error), EVENTS.loaded());
      } else if (evt === "not-loaded-metadata") {
        const error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA",
          "Cannot load automatically: your browser falsely announced having loaded " +
          "the content.", false);
        return observableOf(EVENTS.warning(error));
      }
      return observableOf(EVENTS.loaded());
    }));

  const initialSeek$ = seek$.pipe(ignoreElements());

  return observableMerge(
    loadedEvent$,
    initialSeek$,
    emeManager$,
    mediaError$,
    playbackRate$,
    stalled$
  );
}
