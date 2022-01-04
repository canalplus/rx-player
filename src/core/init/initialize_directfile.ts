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
  EMPTY,
  filter,
  ignoreElements,
  merge as observableMerge,
  mergeMap,
  switchMap,
  Observable,
  of as observableOf,
  share,
  take,
} from "rxjs";
import {
  clearElementSrc,
  setElementSrc$,
} from "../../compat";
import log from "../../log";
import deferSubscriptions from "../../utils/defer_subscriptions";
import { IReadOnlySharedReference } from "../../utils/reference";
import { PlaybackObserver } from "../api";
import { IKeySystemOption } from "../eme";
import linkDrmAndContent from "./create_eme_manager";
import emitLoadedEvent from "./emit_loaded_event";
import { IInitialTimeOptions } from "./get_initial_time";
import initialSeekAndPlay from "./initial_seek_and_play";
import StallAvoider from "./stall_avoider";
import throwOnMediaError from "./throw_on_media_error";
import { IDirectfileEvent } from "./types";
import updatePlaybackRate from "./update_playback_rate";

// NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
// first type parameter as `any` instead of the perfectly fine `unknown`,
// leading to linter issues, as it forbids the usage of `any`.
// This is why we're disabling the eslint rule.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

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
                                      keySystems : IKeySystemOption[];
                                      mediaElement : HTMLMediaElement;
                                      playbackObserver : PlaybackObserver;
                                      speed : IReadOnlySharedReference<number>;
                                      startAt? : IInitialTimeOptions;
                                      url? : string; }

/**
 * Launch a content in "Directfile mode".
 * @param {Object} directfileOptions
 * @returns {Observable}
 */
export default function initializeDirectfileContent({
  autoPlay,
  keySystems,
  mediaElement,
  playbackObserver,
  speed,
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

  const { seekAndPlay$ } = initialSeekAndPlay({ mediaElement,
                                                playbackObserver,
                                                startTime: initialTime,
                                                mustAutoPlay: autoPlay });

  /** Initialize decryption capabilities and the HTMLMediaElement's src attribute. */
  const drmEvents$ = linkDrmAndContent(mediaElement,
                                       keySystems,
                                       EMPTY,
                                       linkURL$).pipe(
    deferSubscriptions(),
    share()
  );

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const mediaError$ = throwOnMediaError(mediaElement);

  const observation$ = playbackObserver.observe(true);

  // Set the speed set by the user on the media element while pausing a
  // little longer while the buffer is empty.
  const playbackRate$ =
    updatePlaybackRate(mediaElement, speed, observation$)
      .pipe(ignoreElements());

  /**
   * Observable trying to avoid various stalling situations, emitting "stalled"
   * events when it cannot, as well as "unstalled" events when it get out of one.
   */
  const stallAvoider$ = StallAvoider(playbackObserver, null, EMPTY, EMPTY);

  /**
   * Emit a "loaded" events once the initial play has been performed and the
   * media can begin playback.
   * Also emits warning events if issues arise when doing so.
   */
  const loadingEvts$ = drmEvents$.pipe(
    filter((evt) => evt.type === "decryption-ready" ||
                    evt.type === "decryption-disabled"),
    take(1),
    mergeMap(() => seekAndPlay$),
    switchMap((evt) => {
      if (evt.type === "warning") {
        return observableOf(evt);
      }
      return emitLoadedEvent(observation$, mediaElement, null, true);
    }));

  return observableMerge(loadingEvts$,
                         drmEvents$.pipe(ignoreElements()),
                         mediaError$,
                         playbackRate$,
                         stallAvoider$);
}

export { IDirectfileEvent };
