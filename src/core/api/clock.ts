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
import objectAssign from "../../utils/object_assign";
import {
  getLeftSizeOfRange,
  getRange,
} from "../../utils/ranges";

/** "State" that triggered the clock tick. */
export type IMediaInfosState = "init" | // set once on first emit
                               "canplay" | // HTML5 Event
                               "play" | // HTML5 Event
                               "progress" | // HTML5 Event
                               "seeking" | // HTML5 Event
                               "seeked" | // HTML5 Event
                               "loadedmetadata" | // HTML5 Event
                               "ratechange" | // HTML5 Event
                               "timeupdate"; // Interval

/** Information recuperated on the media element on each clock tick. */
interface IMediaInfos {
  /** Gap between `currentTime` and the next position with un-buffered data. */
  bufferGap : number;
  /** Value of `buffered` (buffered ranges) for the media element. */
  buffered : TimeRanges;
  /** The buffered range we are currently playing. */
  currentRange : { start : number;
                   end : number; } |
                 null;
  /** Current `currentTime` (position) set on the media element. */
  currentTime : number;
  /** Current `duration` set on the media element. */
  duration : number;
  /** Current `ended` set on the media element. */
  ended: boolean;
  /** Current `paused` set on the media element. */
  paused : boolean;
  /** Current `playbackRate` set on the media element. */
  playbackRate : number;
  /** Current `readyState` value on the media element. */
  readyState : number;
  /** Current `seeking` value on the mediaElement. */
  seeking : boolean;
  /** "State" that triggered this clock tick. */
  state : IMediaInfosState; }

/** Describes when the player is "stalled" and what event started that status. */
export type IStalledStatus =
  /** Set if the player is stalled. */
  {
    /** What started the player to stall. */
    reason : "seeking" | // Building buffer after seeking
             "not-ready" | // Building buffer after low readyState
             "buffering"; // Other cases
    /** `performance.now` at the time the stalling happened. */
    timestamp : number;
  } |
  /** The player is not stalled. */
  null;

/** Information emitted on each clock tick. */
export interface IClockTick extends IMediaInfos {
  /** Set if the player is stalled. */
  stalled : IStalledStatus;
}

const { SAMPLING_INTERVAL_MEDIASOURCE,
        SAMPLING_INTERVAL_LOW_LATENCY,
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
 * @param {Boolean} lowLatencyMode
 * @returns {Number}
 */
function getResumeGap(stalled : IStalledStatus, lowLatencyMode : boolean) : number {
  if (stalled === null) {
    return 0;
  }
  const suffix : "LOW_LATENCY" | "DEFAULT" = lowLatencyMode ? "LOW_LATENCY" :
                                                              "DEFAULT";

  switch (stalled.reason) {
    case "seeking":
      return RESUME_GAP_AFTER_SEEKING[suffix];
    case "not-ready":
      return RESUME_GAP_AFTER_NOT_ENOUGH_DATA[suffix];
    case "buffering":
      return RESUME_GAP_AFTER_BUFFERING[suffix];
  }
}

/**
 * @param {Object} currentRange
 * @param {Number} duration
 * @param {Boolean} lowLatencyMode
 * @returns {Boolean}
 */
function hasLoadedUntilTheEnd(
  currentRange : { start : number; end : number }|null,
  duration : number,
  lowLatencyMode : boolean
) : boolean {
  const suffix : "LOW_LATENCY" | "DEFAULT" = lowLatencyMode ? "LOW_LATENCY" :
                                                              "DEFAULT";
  return currentRange !== null &&
         (duration - currentRange.end) <= STALL_GAP[suffix];
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
 * @param {Object} options
 * @returns {Object|null}
 */
function getStalledStatus(
  prevTimings : IClockTick,
  currentTimings : IMediaInfos,
  { withMediaSource, lowLatencyMode } : IClockOptions
) : IStalledStatus {
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

  const fullyLoaded = hasLoadedUntilTheEnd(currentRange, duration, lowLatencyMode);

  const canStall = (readyState >= 1 &&
                    currentState !== "loadedmetadata" &&
                    prevStalled === null &&
                    !(fullyLoaded || ended));

  let shouldStall : boolean | undefined;
  let shouldUnstall : boolean | undefined;

  if (withMediaSource) {
    if (canStall &&
        (bufferGap <= (lowLatencyMode ? STALL_GAP.LOW_LATENCY : STALL_GAP.DEFAULT) ||
         bufferGap === Infinity || readyState === 1)
    ) {
      shouldStall = true;
    } else if (prevStalled !== null &&
               readyState > 1 &&
               ((bufferGap < Infinity &&
                 bufferGap > getResumeGap(prevStalled, lowLatencyMode)) ||
                fullyLoaded || ended)
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
    } else if (prevStalled !== null &&
               (currentState !== "seeking" && currentTime !== prevTime ||
                currentState === "canplay" ||
                bufferGap < Infinity &&
                (bufferGap > getResumeGap(prevStalled, lowLatencyMode) ||
                 fullyLoaded || ended))
    ) {
      shouldUnstall = true;
    }
  }

  if (shouldUnstall === true) {
    return null;
  } else if (shouldStall === true || prevStalled !== null) {
    let reason : "seeking" | "not-ready" | "buffering";
    if (currentState === "seeking" ||
        currentTimings.seeking ||
        prevStalled !== null && prevStalled.reason === "seeking") {
      reason = "seeking";
    } else if (readyState === 1) {
      reason = "not-ready";
    } else {
      reason = "buffering";
    }
    if (prevStalled !== null && prevStalled.reason === reason) {
      return prevStalled;
    }
    return { reason,
             timestamp: performance.now() };
  }
  return null;
}

export interface IClockOptions {
  withMediaSource : boolean;
  lowLatencyMode : boolean;
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
  options : IClockOptions
) : Observable<IClockTick> {
  return observableDefer(() : Observable<IClockTick> => {
    let lastTimings : IClockTick = objectAssign(getMediaInfos(mediaElement, "init"),
                                                { stalled: null });

    function getCurrentClockTick(state : IMediaInfosState) : IClockTick {
      const mediaTimings = getMediaInfos(mediaElement, state);
      const stalledState = getStalledStatus(lastTimings, mediaTimings, options);

      // /!\ Mutate mediaTimings
      return objectAssign(mediaTimings, { stalled: stalledState });
    }

    const eventObs : Array< Observable< IMediaInfosState > > =
      SCANNED_MEDIA_ELEMENTS_EVENTS.map((eventName) =>
        observableFromEvent(mediaElement, eventName)
          .pipe(mapTo(eventName)));

    const interval = options.lowLatencyMode  ? SAMPLING_INTERVAL_LOW_LATENCY :
                     options.withMediaSource ? SAMPLING_INTERVAL_MEDIASOURCE :
                     SAMPLING_INTERVAL_NO_MEDIASOURCE;

    const interval$ : Observable<"timeupdate"> =
      observableInterval(interval)
        .pipe(mapTo("timeupdate"));

    return observableMerge(interval$, ...eventObs)
      .pipe(
        map((state : IMediaInfosState) => {
          lastTimings = getCurrentClockTick(state);
          if (log.getLevel() === "DEBUG") {
            log.debug("API: current playback timeline:\n" +
                      prettyPrintBuffered(lastTimings.buffered,
                                          lastTimings.currentTime),
                      `\n${state}`);
          }
          return lastTimings;
        }),

        startWith(lastTimings));
  }).pipe(
    multicast(() => new ReplaySubject<IClockTick>(1)), // Always emit the last
    refCount()
  );
}

/**
 * Pretty print a TimeRanges Object, to see the current content of it in a
 * one-liner string.
 *
 * @example
 * This function is called by giving it directly the TimeRanges, such as:
 * ```js
 * prettyPrintBuffered(document.getElementsByTagName("video")[0].buffered);
 * ```
 *
 * Let's consider this possible return:
 *
 * ```
 * 0.00|==29.95==|29.95 ~30.05~ 60.00|==29.86==|89.86
 *          ^14
 * ```
 * This means that our video element has 29.95 seconds of buffer between 0 and
 * 29.95 seconds.
 * Then 30.05 seconds where no buffer is found.
 * Then 29.86 seconds of buffer between 60.00 and 89.86 seconds.
 *
 * A caret on the second line indicates the current time we're at.
 * The number coming after it is the current time.
 * @param {TimeRanges} buffered
 * @param {number} currentTime
 * @returns {string}
 */
function prettyPrintBuffered(
  buffered : TimeRanges,
  currentTime : number
) : string {
  let str = "";
  let currentTimeStr = "";

  for (let i = 0; i < buffered.length; i++) {
    const start = buffered.start(i);
    const end = buffered.end(i);
    const fixedStart = start.toFixed(2);
    const fixedEnd = end.toFixed(2);
    const fixedDuration = (end - start).toFixed(2);
    const newIntervalStr = `${fixedStart}|==${fixedDuration}==|${fixedEnd}`;
    str += newIntervalStr;
    if (currentTimeStr.length === 0 && end > currentTime) {
      const padBefore = str.length - Math.floor(newIntervalStr.length / 2);
      currentTimeStr = " ".repeat(padBefore) + `^${currentTime}`;
    }
    if (i < buffered.length - 1) {
      const nextStart = buffered.start(i + 1);
      const fixedDiff = (nextStart - end).toFixed(2);
      const holeStr = ` ~${fixedDiff}~ `;
      str += holeStr;
      if (currentTimeStr.length === 0 && currentTime < nextStart) {
        const padBefore = str.length - Math.floor(holeStr.length / 2);
        currentTimeStr = " ".repeat(padBefore) + `^${currentTime}`;
      }
    }
  }
  if (currentTimeStr.length === 0) {
    currentTimeStr = " ".repeat(str.length) + `^${currentTime}`;
  }
  return str + "\n" + currentTimeStr;
}

export default createClock;
