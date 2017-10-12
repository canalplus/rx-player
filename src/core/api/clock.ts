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
import { Observer } from "rxjs/Observer";
import { ReplaySubject } from "rxjs/ReplaySubject";

import config from "../../config";
import { getLeftSizeOfRange, getRange } from "../../utils/ranges";

interface IVideoTiming {
  currentTime : number;
  buffered : TimeRanges;
  duration : number;
  bufferGap : number;
  state : string;
  playbackRate : number;
  currentRange : { start : number, end : number }|null;
  readyState : number;
  paused : boolean;
}

type stalledStatus = { state : string, timestamp : number } | null;

export interface IClockTick extends IVideoTiming {
  stalled : stalledStatus;
}

const {
  SAMPLING_INTERVAL_MEDIASOURCE,
  SAMPLING_INTERVAL_NO_MEDIASOURCE,
  RESUME_AFTER_SEEKING_GAP,
  RESUME_AFTER_BUFFERING_GAP,
  STALL_GAP,
} = config;

/**
 * HTMLMediaElement Events for which timings are calculated and emitted.
 * @type {Array.<string>}
 */
const SCANNED_VIDEO_EVENTS = [
  "canplay",
  "play",
  "progress",
  "seeking",
  "seeked",
  "loadedmetadata",
];

/**
 * Returns the amount of time in seconds the buffer should have ahead of the
 * current position before resuming playback. Based on the infos of the stall.
 * Waiting time differs between a "seeking" stall and a buffering stall.
 * @param {Object|null} stalled
 * @returns {Boolean}
 */
function getResumeGap(stalled : stalledStatus) : number {
  if (!stalled) {
    return 0;
  }

  return stalled.state === "seeking"
    ? RESUME_AFTER_SEEKING_GAP
    : RESUME_AFTER_BUFFERING_GAP;
}

/**
 * TODO I just don't get it for this one.
 * gap + range.end ??? HELP
 * @param {Number} gap
 * @param {Object} range
 * @param {Number} duration
 * @returns {Boolean}
 */
function isEnding(
  bufferGap : number,
  currentRange : { start : number, end : number}|null,
  duration : number
) : boolean {
  return currentRange != null &&
    (duration - (bufferGap + currentRange.end)) <= STALL_GAP;
}

/**
 * Generate a basic timings object from the video element and the eventName
 * which triggered the request.
 * @param {HTMLMediaElement} video
 * @param {string} name
 * @returns {Object}
 */
function getTimings(video : HTMLMediaElement, name : string) : IVideoTiming {
  const {
    currentTime,
    paused,
    playbackRate,
    readyState,
    buffered,
    duration,
  } = video;

  return {
    currentTime,
    buffered,
    duration,
    bufferGap: getLeftSizeOfRange(buffered, currentTime),
    state: name,
    playbackRate,
    currentRange: getRange(buffered, currentTime),
    readyState,
    paused,
  };
}

/**
 * Infer stalled status of the video based on:
 *   - the return of the function getTimings
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
  currentTimings : IVideoTiming,
  withMediaSource : boolean
) : stalledStatus {
  const {
    state: currentState,
    currentTime,
    bufferGap,
    currentRange,
    duration,
    paused,
    readyState,
  } = currentTimings;

  const {
    stalled: prevStalled,
    state: prevState,
    currentTime: prevTime,
  } = prevTimings;

  const ending = isEnding(bufferGap, currentRange, duration);

  const canStall = (
    readyState >= 1 &&
    currentState !== "loadedmetadata" &&
    !prevStalled &&
    !ending
  );

  let shouldStall;
  let shouldUnstall;

  if (withMediaSource) {
    if (
      canStall &&
      (bufferGap <= STALL_GAP || bufferGap === Infinity || readyState === 1)
    ) {
      shouldStall = true;
    } else if (
      prevStalled &&
      readyState > 1 &&
      bufferGap < Infinity && (bufferGap > getResumeGap(prevStalled) || ending)
    ) {
      shouldUnstall = true;
    }
  }

  // when using a direct file, the video will stall and unstall on its
  // own, so we only try to detect when the video timestamp has not changed
  // between two consecutive timeupdates
  else {
    if (
      canStall &&
      ( !paused && currentState === "timeupdate" &&
        prevState === "timeupdate" && currentTime === prevTime ||
        currentState === "seeking" && bufferGap === Infinity )
    ) {
      shouldStall = true;
    } else if (
      prevStalled &&
      ( currentState !== "seeking" && currentTime !== prevTime ||
        currentState === "canplay" ||
        bufferGap < Infinity &&
        (bufferGap > getResumeGap(prevStalled) || ending)
      )
    ) {
      shouldUnstall = true;
    }
  }

  if (shouldStall) {
    return { state: currentState, timestamp: Date.now() };
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
 * This streams samples snapshots of player's current state:
 *   * time position
 *   * playback rate
 *   * current buffered range
 *   * gap with current buffered range ending
 *   * video duration
 *
 * In addition to sampling, this stream also reacts to "seeking" and "play"
 * events.
 *
 * Observable is shared for performance reason: reduces the number of event
 * listeners and intervals/timeouts but also limit access to <video>
 * properties and gap calculations.
 *
 * The sampling is manual instead of based on "timeupdate" to reduce the
 * number of events.
 * @param {HTMLMediaElement} video
 * @param {Object} options
 * @returns {Observable}
 */
function createTimingsSampler(
  video : HTMLMediaElement,
  { withMediaSource } : { withMediaSource : boolean }
) : Observable<IClockTick> {
  return Observable.create((obs : Observer<IClockTick>) => {
    let lastTimings : IClockTick = Object.assign(getTimings(video, "init"),
      { stalled: null }
    );

    /**
     * Emit timings sample.
     * Meant to be used as a callback on various async events.
     * @param {Event} [evt] - The Event which triggered the callback, if one.
     */
    function emitSample(evt? : Event) {
      const timingEventType = evt && evt.type || "timeupdate";
      const videoTimings = getTimings(video, timingEventType);
      const stalledState =
        getStalledStatus(lastTimings, videoTimings, withMediaSource);

      // /!\ Mutate videoTimings
      lastTimings = Object.assign(videoTimings,
        { stalled: stalledState }
      );
      obs.next(lastTimings);
    }

    const interval = withMediaSource
      ? SAMPLING_INTERVAL_MEDIASOURCE
      : SAMPLING_INTERVAL_NO_MEDIASOURCE;

    const intervalID = setInterval(emitSample, interval);
    SCANNED_VIDEO_EVENTS.forEach((eventName) =>
      video.addEventListener(eventName, emitSample));

    obs.next(lastTimings);

    return () => {
      clearInterval(intervalID);
      SCANNED_VIDEO_EVENTS.forEach((eventName) =>
        video.removeEventListener(eventName, emitSample));
    };
  })
    .multicast(() => new ReplaySubject(1))
    .refCount();
}

export default createTimingsSampler;
