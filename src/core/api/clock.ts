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
 * This file defines a global clock for the RxPlayer.
 *
 * Each clock tick also pass information about the current state of the
 * media element to sub-parts of the player.
 */

import objectAssign from "object-assign";
import {
  defer as observableDefer,
  fromEvent as observableFromEvent,
  interval as observableInterval,
  merge as observableMerge,
  Observable,
  ReplaySubject,
} from "rxjs";
import {
  map,
  mapTo,
  multicast,
  refCount,
  startWith,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import {
  getLeftSizeOfRange,
  getRange,
} from "../../utils/ranges";

export type IMediaInfosState = "init" | // set once on first emit
                               "canplay" | // HTML5 Event
                               "play" | // HTML5 Event
                               "progress" | // HTML5 Event
                               "seeking" | // HTML5 Event
                               "seeked" | // HTML5 Event
                               "loadedmetadata" | // HTML5 Event
                               "ratechange" | // HTML5 Event
                               "timeupdate"; // Interval

// Information recuperated on the media element on each clock
// tick
interface IMediaInfos {
  bufferGap : number; // Gap between `currentTime` and the next position with
                      // bufferred data
  buffered : TimeRanges; // Buffered ranges for the media element
  currentRange : { start : number; // Buffered ranges related to `currentTime`
                   end : number; } |
                 null;
  currentTime : number; // Current position set on the media element
  duration : number; // Current duration set on the media element
  ended: boolean; // Current `ended` value set on the media element
  paused : boolean; // Current `paused` value set on the media element
  playbackRate : number; // Current `playbackRate` set on the mediaElement
  readyState : number; // Current `readyState` value on the media element
  seeking : boolean; // Current `seeking` value on the mediaElement
  state : IMediaInfosState; } // see type

type stalledStatus = { // set if the player is stalled
                       reason : "seeking" | // Building buffer after seeking
                                "not-ready" | // Building buffer after low readyState
                                "buffering"; // Other cases
                       timestamp : number; // `performance.now` at the time the
                                           // stalling happened
                     } |
                     null; // the player is not stalled

// Global information emitted on each clock tick
export interface IClockTick extends IMediaInfos {
  stalled : stalledStatus; // see type
}

const { SAMPLING_INTERVAL_MEDIASOURCE,
        SAMPLING_INTERVAL_NO_MEDIASOURCE,
        RESUME_GAP_AFTER_SEEKING,
        RESUME_GAP_AFTER_NOT_ENOUGH_DATA,
        RESUME_GAP_AFTER_BUFFERING,
        STALL_GAP } = config;

/**
 * HTMLMediaElement Events for which timings are calculated and emitted.
 * @type {Array.<string>}
 */
const SCANNED_MEDIA_ELEMENTS_EVENTS : IMediaInfosState[] = [ "canplay",
                                                             "play",
                                                             "progress",
                                                             "seeking",
                                                             "seeked",
                                                             "loadedmetadata",
                                                             "ratechange" ];

/**
 * Returns the amount of time in seconds the buffer should have ahead of the
 * current position before resuming playback. Based on the infos of the stall.
 * Waiting time differs between a "seeking" stall and a buffering stall.
 * @param {Object|null} stalled
 * @returns {Number}
 */
function getResumeGap(stalled : stalledStatus) : number {
  if (!stalled) {
    return 0;
  }

  switch (stalled.reason) {
    case "seeking":
      return RESUME_GAP_AFTER_SEEKING;
    case "not-ready":
      return RESUME_GAP_AFTER_NOT_ENOUGH_DATA;
    default:
      return RESUME_GAP_AFTER_BUFFERING;
  }
}

/**
 * @param {Object} currentRange
 * @param {Number} duration
 * @returns {Boolean}
 */
function hasLoadedUntilTheEnd(
  currentRange : { start : number; end : number }|null,
  duration : number
) : boolean {
  return currentRange != null &&
         (duration - currentRange.end) <= STALL_GAP;
}

/**
 * Generate a basic timings object from the media element and the eventName
 * which triggered the request.
 * @param {HTMLMediaElement} mediaElement
 * @param {string} currentState
 * @returns {Object}
 */
function getMediaInfos(
  mediaElement : HTMLMediaElement,
  currentState : IMediaInfosState
) : IMediaInfos {
  const { buffered,
          currentTime,
          duration,
          ended,
          paused,
          playbackRate,
          readyState,
          seeking } = mediaElement;

  return { bufferGap: getLeftSizeOfRange(buffered, currentTime),
           buffered,
           currentRange: getRange(buffered, currentTime),
           currentTime,
           duration,
           ended,
           paused,
           playbackRate,
           readyState,
           seeking,
           state: currentState };
}

/**
 * Infer stalled status of the media based on:
 *   - the return of the function getMediaInfos
 *   - the previous timings object.
 *
 * @param {Object} prevTimings - Previous timings object. See function to know
 * the different properties needed.
 * @param {Object} currentTimings - Current timings object. This does not need
 * to have every single infos, see function to know which properties are needed.
 * @param {Boolean} withMediaSource - False if the directfile API is used.
 * @returns {Object|null}
 */
function getStalledStatus(
  prevTimings : IClockTick,
  currentTimings : IMediaInfos,
  withMediaSource : boolean
) : stalledStatus {
  const { state: currentState,
          currentTime,
          bufferGap,
          currentRange,
          duration,
          paused,
          readyState,
          ended } = currentTimings;

  const { stalled: prevStalled,
          state: prevState,
          currentTime: prevTime } = prevTimings;

  const fullyLoaded = hasLoadedUntilTheEnd(currentRange, duration);

  const canStall = (readyState >= 1 &&
                    currentState !== "loadedmetadata" &&
                    !prevStalled &&
                    !(fullyLoaded || ended));

  let shouldStall;
  let shouldUnstall;

  if (withMediaSource) {
    if (canStall &&
        (bufferGap <= STALL_GAP || bufferGap === Infinity || readyState === 1)
    ) {
      shouldStall = true;
    } else if (prevStalled &&
               readyState > 1 &&
               bufferGap < Infinity &&
               (bufferGap > getResumeGap(prevStalled) || fullyLoaded || ended)
    ) {
      shouldUnstall = true;
    }
  }

  // when using a direct file, the media will stall and unstall on its
  // own, so we only try to detect when the media timestamp has not changed
  // between two consecutive timeupdates
  else {
    if (canStall &&
        (!paused && currentState === "timeupdate" &&
         prevState === "timeupdate" && currentTime === prevTime ||
         currentState === "seeking" && bufferGap === Infinity)
    ) {
      shouldStall = true;
    } else if (prevStalled &&
               (currentState !== "seeking" && currentTime !== prevTime ||
                currentState === "canplay" ||
                bufferGap < Infinity &&
                (bufferGap > getResumeGap(prevStalled) || fullyLoaded || ended))
    ) {
      shouldUnstall = true;
    }
  }

  if (shouldStall) {
    let reason : "seeking" | "not-ready" | "buffering";
    if (currentState === "seeking" || currentTimings.seeking) {
      reason = "seeking";
    } else if (readyState === 1) {
      reason = "not-ready";
    } else {
      reason = "buffering";
    }
    return { reason,
             timestamp: performance.now() };
  }
  else if (shouldUnstall) {
    return null;
  }
  else {
    return prevStalled;
  }
}

/**
 * Timings observable.
 *
 * This Observable samples snapshots of player's current state:
 *   * time position
 *   * playback rate
 *   * current buffered range
 *   * gap with current buffered range ending
 *   * media duration
 *
 * In addition to sampling, this Observable also reacts to "seeking" and "play"
 * events.
 *
 * Observable is shared for performance reason: reduces the number of event
 * listeners and intervals/timeouts but also limit access to the media element
 * properties and gap calculations.
 *
 * The sampling is manual instead of based on "timeupdate" to reduce the
 * number of events.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} options
 * @returns {Observable}
 */
function createClock(
  mediaElement : HTMLMediaElement,
  { withMediaSource } : { withMediaSource : boolean }
) : Observable<IClockTick> {
  return observableDefer(() : Observable<IClockTick> => {
    let lastTimings : IClockTick = objectAssign(getMediaInfos(mediaElement, "init"),
                                                { stalled: null });

    function getCurrentClockTick(state : IMediaInfosState) : IClockTick {
      const mediaTimings = getMediaInfos(mediaElement, state);
      const stalledState = getStalledStatus(lastTimings, mediaTimings, withMediaSource);

      // /!\ Mutate mediaTimings
      return objectAssign(mediaTimings, { stalled: stalledState });
    }

    const eventObs : Array< Observable< IMediaInfosState > > =
      SCANNED_MEDIA_ELEMENTS_EVENTS.map((eventName) =>
        observableFromEvent(mediaElement, eventName)
          .pipe(mapTo(eventName)));

    const interval = withMediaSource ? SAMPLING_INTERVAL_MEDIASOURCE :
                                       SAMPLING_INTERVAL_NO_MEDIASOURCE;

    const interval$ : Observable<"timeupdate"> =
      observableInterval(interval)
        .pipe(mapTo("timeupdate"));

    return observableMerge(interval$, ...eventObs)
      .pipe(
        map((state : IMediaInfosState) => {
          lastTimings = getCurrentClockTick(state);
          log.debug("API: new clock tick", lastTimings);
          return lastTimings;
        }),

        startWith(lastTimings));
  }).pipe(
    multicast(() => new ReplaySubject<IClockTick>(1)), // Always emit the last
    refCount()
  );
}

export default createClock;
