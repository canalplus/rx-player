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
  map,
  mapTo,
  merge as observableMerge,
  Observable,
  shareReplay,
  startWith,
} from "rxjs";
import config from "../../config";
import log from "../../log";
import objectAssign from "../../utils/object_assign";
import { getRange } from "../../utils/ranges";

/** "Event" that triggered the clock tick. */
export type IClockMediaEventType =
  /** First clock tick automatically emitted. */
  "init" | // set once on first emit
  /** Regularly emitted clock tick when no event happened in a long time. */
  "timeupdate" |
  /** On the HTML5 event with the same name */
  "canplay" |
  /** On the HTML5 event with the same name */
  "canplaythrough" | // HTML5 Event
  /** On the HTML5 event with the same name */
  "play" |
  /** On the HTML5 event with the same name */
  "seeking" |
  /** On the HTML5 event with the same name */
  "seeked" |
  /** On the HTML5 event with the same name */
  "stalled" |
  /** On the HTML5 event with the same name */
  "loadedmetadata" |
  /** On the HTML5 event with the same name */
  "ratechange" |
  /** An internal seek happens */
  "internal-seeking";

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
  /** `currentTime` (position) set on the media element at the time of the tick. */
  position : number;
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
   /** Event that triggered this clock tick. */
  event : IClockMediaEventType;
}

/**
 * Describes when the player is "rebuffering" and what event started that
 * status.
 * "Rebuffering" is a status where the player has not enough buffer ahead to
 * play reliably.
 * The RxPlayer should pause playback when the clock indicates the rebuffering
 * status.
 */
export interface IRebufferingStatus {
  /** What started the player to rebuffer. */
  reason : "seeking" | // Building buffer after seeking
           "not-ready" | // Building buffer after low readyState
           "internal-seek" | // Building buffer after a seek happened inside the player
           "buffering"; // Other cases
  /** `performance.now` at the time the rebuffering happened. */
  timestamp : number;
  /**
   * Position, in seconds, at which data is awaited.
   * If `null` the player is rebuffering but not because it is awaiting future data.
   */
  position : number | null;
}

/**
 * Describes when the player is "frozen".
 * This status is reserved for when the player is stuck at the same position for
 * an unknown reason.
 */
export interface IFreezingStatus {
  /** `performance.now` at the time the freezing started to be detected. */
  timestamp : number;
}

/** Information emitted on each clock tick. */
export interface IClockTick extends IMediaInfos {
  /**
   * Set if the player is short on audio and/or video media data and is a such,
   * rebuffering.
   * `null` if not.
   */
  rebuffering : IRebufferingStatus | null;
  /**
   * Set if the player is frozen, that is, stuck in place for unknown reason.
   * Note that this reason can be a valid one, such as a necessary license not
   * being obtained yet.
   *
   * `null` if the player is not frozen.
   */
  freezing : IFreezingStatus | null;
  getCurrentTime : () => number;
}

/** Handle time relative information */
export interface IClockHandler {
  clock$: Observable<IClockTick>;
  setCurrentTime: (time: number) => void;
}

const { SAMPLING_INTERVAL_MEDIASOURCE,
        SAMPLING_INTERVAL_LOW_LATENCY,
        SAMPLING_INTERVAL_NO_MEDIASOURCE,
        RESUME_GAP_AFTER_SEEKING,
        RESUME_GAP_AFTER_NOT_ENOUGH_DATA,
        RESUME_GAP_AFTER_BUFFERING,
        REBUFFERING_GAP,
        MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING } = config;

/**
 * HTMLMediaElement Events for which timings are calculated and emitted.
 * @type {Array.<string>}
 */
const SCANNED_MEDIA_ELEMENTS_EVENTS : IClockMediaEventType[] = [ "canplay",
                                                                 "play",
                                                                 "seeking",
                                                                 "seeked",
                                                                 "loadedmetadata",
                                                                 "ratechange" ];

/**
 * Returns the amount of time in seconds the buffer should have ahead of the
 * current position before resuming playback. Based on the infos of the
 * rebuffering status.
 *
 * Waiting time differs between a rebuffering happening after a "seek" or one
 * happening after a buffer starvation occured.
 * @param {Object|null} rebufferingStatus
 * @param {Boolean} lowLatencyMode
 * @returns {Number}
 */
function getRebufferingEndGap(
  rebufferingStatus : IRebufferingStatus,
  lowLatencyMode : boolean
) : number {
  if (rebufferingStatus === null) {
    return 0;
  }
  const suffix : "LOW_LATENCY" | "DEFAULT" = lowLatencyMode ? "LOW_LATENCY" :
                                                              "DEFAULT";

  switch (rebufferingStatus.reason) {
    case "seeking":
    case "internal-seek":
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
         (duration - currentRange.end) <= REBUFFERING_GAP[suffix];
}

/**
 * Generate a basic timings object from the media element and the eventName
 * which triggered the request.
 * @param {HTMLMediaElement} mediaElement
 * @param {string} event
 * @returns {Object}
 */
function getMediaInfos(
  mediaElement : HTMLMediaElement,
  event : IClockMediaEventType
) : IMediaInfos {
  const { buffered,
          currentTime,
          duration,
          ended,
          paused,
          playbackRate,
          readyState,
          seeking } = mediaElement;

  const currentRange = getRange(buffered, currentTime);
  return { bufferGap: currentRange !== null ? currentRange.end - currentTime :
                                              // TODO null/0 would probably be
                                              // more appropriate
                                              Infinity,
           buffered,
           currentRange,
           position: currentTime,
           duration,
           ended,
           paused,
           playbackRate,
           readyState,
           seeking,
           event };
}

/**
 * Infer rebuffering status of the media based on:
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
function getRebufferingStatus(
  prevTimings : IClockTick,
  currentTimings : IMediaInfos,
  { withMediaSource, lowLatencyMode } : IClockOptions
) : IRebufferingStatus | null {
  const { event: currentEvt,
          position: currentTime,
          bufferGap,
          currentRange,
          duration,
          paused,
          readyState,
          ended } = currentTimings;

  const { rebuffering: prevRebuffering,
          event: prevEvt,
          position: prevTime } = prevTimings;

  const fullyLoaded = hasLoadedUntilTheEnd(currentRange, duration, lowLatencyMode);

  const canSwitchToRebuffering = (readyState >= 1 &&
                                  currentEvt !== "loadedmetadata" &&
                                  prevRebuffering === null &&
                                  !(fullyLoaded || ended));

  let rebufferEndPosition : number | null = null;
  let shouldRebuffer : boolean | undefined;
  let shouldStopRebuffer : boolean | undefined;

  const rebufferGap = lowLatencyMode ? REBUFFERING_GAP.LOW_LATENCY :
                                       REBUFFERING_GAP.DEFAULT;

  if (withMediaSource) {
    if (canSwitchToRebuffering) {
      if (bufferGap <= rebufferGap) {
        shouldRebuffer = true;
        rebufferEndPosition = currentTime + bufferGap;
      } else if (bufferGap === Infinity) {
        shouldRebuffer = true;
        rebufferEndPosition = currentTime;
      }
    } else if (prevRebuffering !== null) {
      const resumeGap = getRebufferingEndGap(prevRebuffering, lowLatencyMode);
      if (shouldRebuffer !== true && prevRebuffering !== null && readyState > 1 &&
          (fullyLoaded || ended || (bufferGap < Infinity && bufferGap > resumeGap)))
      {
        shouldStopRebuffer = true;
      } else if (bufferGap === Infinity || bufferGap <= resumeGap) {
        rebufferEndPosition = bufferGap === Infinity ? currentTime :
                                                       currentTime + bufferGap;
      }
    }
  }

  // when using a direct file, the media will stall and unstall on its
  // own, so we only try to detect when the media timestamp has not changed
  // between two consecutive timeupdates
  else {
    if (canSwitchToRebuffering &&
        (!paused && currentEvt === "timeupdate" &&
         prevEvt === "timeupdate" && currentTime === prevTime ||
         currentEvt === "seeking" && bufferGap === Infinity)
    ) {
      shouldRebuffer = true;
    } else if (prevRebuffering !== null &&
               (currentEvt !== "seeking" && currentTime !== prevTime ||
                currentEvt === "canplay" ||
                bufferGap < Infinity &&
                (bufferGap > getRebufferingEndGap(prevRebuffering, lowLatencyMode) ||
                 fullyLoaded || ended))
    ) {
      shouldStopRebuffer = true;
    }
  }

  if (shouldStopRebuffer === true) {
    return null;
  } else if (shouldRebuffer === true || prevRebuffering !== null) {
    let reason : "seeking" | "not-ready" | "buffering" | "internal-seek";
    if (currentEvt === "seeking" ||
        prevRebuffering !== null && prevRebuffering.reason === "seeking") {
      reason = "seeking";
    } else if (currentTimings.seeking &&
        ((currentEvt === "internal-seeking") ||
        (prevRebuffering !== null && prevRebuffering.reason === "internal-seek"))) {
      reason = "internal-seek";
    } else if (currentTimings.seeking) {
      reason = "seeking";
    } else if (readyState === 1) {
      reason = "not-ready";
    } else {
      reason = "buffering";
    }
    if (prevRebuffering !== null && prevRebuffering.reason === reason) {
      return { reason: prevRebuffering.reason,
               timestamp: prevRebuffering.timestamp,
               position: rebufferEndPosition };
    }
    return { reason,
             timestamp: performance.now(),
             position: rebufferEndPosition };
  }
  return null;
}

/**
 * Detect if the current media can be considered as "freezing" (i.e. not
 * advancing for unknown reasons).
 *
 * Returns a corresponding `IFreezingStatus` object if that's the case and
 * `null` if not.
 * @param {Object} prevTimings
 * @param {Object} currentTimings
 * @returns {Object|null}
 */
function getFreezingStatus(
  prevTimings : IClockTick,
  currentTimings : IMediaInfos
) : IFreezingStatus | null {
  if (prevTimings.freezing) {
    if (currentTimings.ended ||
        currentTimings.paused ||
        currentTimings.readyState === 0 ||
        currentTimings.playbackRate === 0 ||
        prevTimings.position !== currentTimings.position)
    {
      return null; // Quit freezing status
    }
    return prevTimings.freezing; // Stay in it
  }

  return currentTimings.event === "timeupdate" &&
         currentTimings.bufferGap > MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING &&
         !currentTimings.ended &&
         !currentTimings.paused &&
         currentTimings.readyState >= 1 &&
         currentTimings.playbackRate !== 0 &&
         currentTimings.position === prevTimings.position ?
           { timestamp: performance.now() } :
           null;
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
) : IClockHandler {
  // Allow us to identify seek performed internally by the player.
  let internalSeekingComingCounter = 0;
  function setCurrentTime(time: number) {
    mediaElement.currentTime = time;
    internalSeekingComingCounter += 1;
  }
  const clock$ = observableDefer(() : Observable<IClockTick> => {
    let lastTimings : IClockTick = objectAssign(
      getMediaInfos(mediaElement, "init"),
      { rebuffering: null,
        freezing: null,
        getCurrentTime: () => mediaElement.currentTime });

    function getCurrentClockTick(event : IClockMediaEventType) : IClockTick {
      let tmpEvt: IClockMediaEventType = event;
      if (tmpEvt === "seeking" && internalSeekingComingCounter > 0) {
        tmpEvt = "internal-seeking";
        internalSeekingComingCounter -= 1;
      }
      const mediaTimings = getMediaInfos(mediaElement, tmpEvt);
      const rebufferingStatus = getRebufferingStatus(lastTimings, mediaTimings, options);
      const freezingStatus = getFreezingStatus(lastTimings, mediaTimings);
      const timings = objectAssign({},
                                   { rebuffering: rebufferingStatus,
                                     freezing: freezingStatus,
                                     getCurrentTime: () => mediaElement.currentTime },
                                   mediaTimings);
      log.debug("API: current media element state", timings);
      return timings;
    }

    const eventObs : Array< Observable< IClockMediaEventType > > =
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
        map((event : IClockMediaEventType) => {
          lastTimings = getCurrentClockTick(event);
          if (log.getLevel() === "DEBUG") {
            log.debug("API: current playback timeline:\n" +
                      prettyPrintBuffered(lastTimings.buffered,
                                          lastTimings.position),
                      `\n${event}`);
          }
          return lastTimings;
        }),

        startWith(lastTimings));
  }).pipe(
    // Always emit the last tick when already subscribed
    shareReplay({ bufferSize: 1, refCount: true }));

  return { clock$, setCurrentTime };
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
