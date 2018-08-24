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
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  ignoreElements,
  map,
  mergeMap,
} from "rxjs/operators";
import {
  clearElementSrc,
  setElementSrc$,
} from "../../compat";
import {
  MediaError,
} from "../../errors";
import log from "../../log";
import { IKeySystemOption } from "../eme/types";
import createEMEManager from "./create_eme_manager";
import EVENTS from "./events_generators";
import { IInitialTimeOptions } from "./get_initial_time";
import seekAndLoadOnMediaEvents from "./initial_seek_and_play";
import createMediaErrorManager from "./media_error_manager";
import SpeedManager from "./speed_manager";
import StallingManager from "./stalling_manager";
import {
  ISpeedChangedEvent,
  IStalledEvent,
  IStreamClockTick,
  IStreamLoadedEvent,
  IStreamWarningEvent,
} from "./types";

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

// Argument used by `StreamDirectFile`
export interface IDirectFileStreamOptions {
  autoPlay : boolean;
  clock$ : Observable<IStreamClockTick>;
  keySystems : IKeySystemOption[];
  mediaElement : HTMLMediaElement;
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  url : string;
}

// Events emitted by `StreamDirectFile`
export type IDirectfileEvent =
  ISpeedChangedEvent |
  IStalledEvent |
  IStreamLoadedEvent |
  IStreamWarningEvent;

/**
 * Launch a Stream in "Directfile mode".
 * @param {Object} directfileOptions
 * @returns {Observable}
 */
export default function StreamDirectFile({
  autoPlay,
  clock$,
  keySystems,
  mediaElement,
  speed$,
  startAt,
  url,
} : IDirectFileStreamOptions) : Observable<IDirectfileEvent> {
  clearElementSrc(mediaElement);

  log.debug("calculating initial time");
  const initialTime = () =>
    getDirectFileInitialTime(mediaElement, startAt);
  log.debug("initial time calculated:", initialTime);

  const {
    seek$,
    load$,
  } = seekAndLoadOnMediaEvents(mediaElement, initialTime, autoPlay);

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = createEMEManager(mediaElement, keySystems);

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const errorManager$ = createMediaErrorManager(mediaElement);

  // Create Speed Manager, an observable which will set the speed set by the
  // user on the media element while pausing a little longer while the buffer
  // is stalled.
  const speedManager$ = SpeedManager(mediaElement, speed$, clock$, {
    pauseWhenStalled: true,
  }).pipe(map(EVENTS.speedChanged));

  // Create Stalling Manager, an observable which will try to get out of
  // various infinite stalling issues
  const stallingManager$ = StallingManager(mediaElement, clock$)
    .pipe(map(EVENTS.stalled));

  // Manage "loaded" event and warn if autoplay is blocked on the current browser
  const loadedEvent$ = load$
    .pipe(mergeMap((evt) => {
      if (evt === "autoplay-blocked") {
        const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY", null, false);
        return observableOf(EVENTS.warning(error), EVENTS.loaded());
      }
      return observableOf(EVENTS.loaded);
    }));

  // Start everything! (Just put the URL in the element's src).
  const linkURL$ = setElementSrc$(mediaElement, url).pipe(ignoreElements());

  const initialSeek$ = seek$.pipe(ignoreElements());

  return observableMerge(
    loadedEvent$,
    initialSeek$,
    emeManager$,
    errorManager$,
    speedManager$,
    stallingManager$,
    linkURL$
  );
}
