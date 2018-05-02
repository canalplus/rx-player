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

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import {
  clearElementSrc,
  setElementSrc$,
} from "../../compat";
import { CustomError } from "../../errors";
import log from "../../utils/log";
import EMEManager, {
  IKeySystemOption,
} from "../eme";
import { IStreamClockTick } from "./clock";
import { IInitialTimeOptions } from "./get_initial_time";
import createMediaErrorHandler from "./media_error_handler";
import SpeedManager from "./speed_manager";
import StallingManager from "./stalling_manager";
import EVENTS, {
  IStreamEvent,
} from "./stream_events";
import handleInitialVideoEvents from "./video_events";

/**
 * @param {HTMLMediaElement} mediaElement
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

export interface IDirectFileStreamOptions {
  autoPlay : boolean;
  clock$ : Observable<IStreamClockTick>;
  keySystems : IKeySystemOption[];
  mediaElement : HTMLMediaElement;
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  url : string;
}

/**
 * Initialize stream playback by merging all Observables that are required to
 * make the system cooperate.
 * @param {MediaSource} mediaSource
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
} : IDirectFileStreamOptions) : Observable<IStreamEvent> {
  /**
   * Observable through which all warning events will be sent.
   * @type {Subject}
   */
  const warning$ = new Subject<Error|CustomError>();
  const warningEvents$ = warning$.map(EVENTS.warning);

  clearElementSrc(mediaElement);

  log.debug("calculating initial time");
  const initialTime = () =>
    getDirectFileInitialTime(mediaElement, startAt);
  log.debug("initial time calculated:", initialTime);

  const {
    initialSeek$,
    loadAndPlay$,
  } = handleInitialVideoEvents(mediaElement, initialTime, autoPlay);

  /**
   * Create EME Manager, an observable which will manage every EME-related
   * issue.
   * @type {Observable}
   */
  const emeManager$ = EMEManager(mediaElement, keySystems, warning$);

  /**
   * Translate errors coming from the video element into RxPlayer errors
   * through a throwing Observable.
   * @type {Observable}
   */
  const mediaErrorHandler$ = createMediaErrorHandler(mediaElement);

  /**
   * Create Speed Manager, an observable which will set the speed set by the
   * user on the video element while pausing a little longer while the buffer
   * is stalled.
   * @type {Observable}
   */
  const speedManager$ = SpeedManager(mediaElement, speed$, clock$, {
    pauseWhenStalled: true,
  }).map(EVENTS.speedChanged);

  /**
   * Create Stalling Manager, an observable which will try to get out of
   * various infinite stalling issues
   * @type {Observable}
   */
  const stallingManager$ = StallingManager(mediaElement, clock$)
  .map(EVENTS.stalled);

  const loadedEvent$ = loadAndPlay$
    .mapTo(EVENTS.loaded());

  const linkURL$ = setElementSrc$(mediaElement, url)
    .ignoreElements();

  const mutedInitialSeek$ = initialSeek$
    .ignoreElements();

  const directFile$ : Observable<IStreamEvent> = Observable.merge(
    loadedEvent$,
    mutedInitialSeek$,
    emeManager$ as Observable<void>, // TODO RxJS do something weird here
    mediaErrorHandler$ as Observable<void>, // TODO RxJS do something weird here
    speedManager$,
    stallingManager$,
    linkURL$
  );

  return Observable.merge(directFile$, warningEvents$);
}
