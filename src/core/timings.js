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

import config from "../config.js";
import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { BufferedRanges } from "./ranges";

const {
  SAMPLING_INTERVAL_MEDIASOURCE,
  SAMPLING_INTERVAL_NO_MEDIASOURCE,
  RESUME_AFTER_SEEKING_GAP,
  RESUME_AFTER_BUFFERING_GAP,
  STALL_GAP,
} = config;

/**
 * Amount of time substracted from the live edge to prevent buffering ahead
 * of it.
 *
 * TODO This property should be removed in a next version (after multiple
 * tests).
 * We should be the closest to the live edge when it comes to buffering.
 */
const LIVE_BUFFER_PROTECTION = 10;

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
 * @returns {Boolean}
 */
const getResumeGap = stalled =>
  stalled.state == "seeking"
    ? RESUME_AFTER_SEEKING_GAP
    : RESUME_AFTER_BUFFERING_GAP;

/**
 * TODO I just don't get it for this one.
 * gap + range.end ??? HELP
 * @param {Number} gap
 * @param {Object} range
 * @param {Number} duration
 * @returns {Boolean}
 */
const isEnding = (gap, range, duration) =>
  !!range && (duration - (gap + range.end)) <= STALL_GAP;

/**
 * Generate a basic timings object from the video element and the eventName
 * which triggered the request.
 * TODO stop doing that class move name outside
 * rename getTimingsBase?
 * @param {HTMLMediaElement} video
 * @param {string} name
 * @returns {Object}
 */
function getTimings(video, name) {
  const {
    currentTime,
    paused,
    playbackRate,
    readyState,
    buffered,
    duration,
  } = video;
  const bufferedRanges = new BufferedRanges(buffered);

  return {
    currentTime,
    buffered: bufferedRanges, // TODO rename to bufferedRanges
    duration,
    bufferGap: bufferedRanges.getGap(currentTime),
    state: name,
    playbackRate,
    currentRange: bufferedRanges.getRange(currentTime),
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
const getStalledStatus = (prevTimings, currentTimings, withMediaSource) => {
  const {
    state: currentName,
    currentTime: currentTs,
    bufferGap: gap,
    currentRange: range,
    duration,
    paused,
    readyState,
    playbackRate: playback,
  } = currentTimings;

  const {
    stalled: prevStalled,
    state: prevName,
    currentTime: prevTs,
  } = prevTimings;

  const ending = isEnding(gap, range, duration);

  const canStall = (
    readyState >= 1 &&
    currentName != "loadedmetadata" &&
    !prevStalled &&
    !ending
  );

  let shouldStall, shouldUnstall;

  if (withMediaSource) {
    shouldStall = (
      canStall &&
      (gap <= STALL_GAP || gap === Infinity || readyState === 1)
    );

    shouldUnstall = (
      prevStalled &&
      readyState > 1 &&
      gap < Infinity && (gap > getResumeGap(prevStalled) || ending)
    );
  }

  // when using a direct file, the video will stall and unstall on its
  // own, so we only try to detect when the video timestamp has not changed
  // between two consecutive timeupdates
  else {
    shouldStall = (
      canStall &&
      ( !paused && currentName == "timeupdate" && prevName == "timeupdate" &&
        currentTs === prevTs || currentName == "seeking" && gap === Infinity )
    );

    shouldUnstall = (
      prevStalled &&
      ( currentName != "seeking" && currentTs !== prevTs ||
        currentName == "canplay" ||
        gap < Infinity && (gap > getResumeGap(prevStalled) || ending))
    );
  }

  if (shouldStall) {
    return { state: currentName, playbackRate: playback };
  }
  else if (shouldUnstall) {
    return null;
  }
  else {
    return prevStalled;
  }
};

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
function createTimingsSampler(video, { withMediaSource }) {
  return Observable.create((obs) => {
    let prevTimings = getTimings(video, "init");

    /**
     * Emit timings sample.
     * Meant to be used as a callback on various async events.
     * @param {Event} [evt] - The Event which triggered the callback, if one.
     */
    function emitSample(evt) {
      const timingEventType = evt && evt.type || "timeupdate";
      const currentTimings = getTimings(video, timingEventType);
      currentTimings.stalled =
        getStalledStatus(prevTimings, currentTimings, withMediaSource);
      prevTimings = currentTimings;
      obs.next(prevTimings);
    }

    const interval = withMediaSource
      ? SAMPLING_INTERVAL_MEDIASOURCE
      : SAMPLING_INTERVAL_NO_MEDIASOURCE;

    const intervalID = setInterval(emitSample, interval);
    SCANNED_VIDEO_EVENTS.forEach((eventName) =>
      video.addEventListener(eventName, emitSample));

    obs.next(prevTimings);

    return () => {
      clearInterval(intervalID);
      SCANNED_VIDEO_EVENTS.forEach((eventName) =>
        video.removeEventListener(eventName, emitSample));
    };
  })

    // XXX timings refacto WHAT? why this initial sh*t? Test it
    .multicast(() => new BehaviorSubject({ state: "init", stalled: null }))
    .refCount()
    .do((e) => console.log("!!!!!!!TIMINGS", e));
}

function toWallClockTime(position, manifest) {
  return new Date((position + manifest.availabilityStartTime) * 1000);
}

/**
 * TODO This function should have more of a seekTo kind of name
 * ``fromWallClockTime`` should probably just do:
 * ```js
 * (timeInSeconds, manifest) => {
 *   return timeInSeconds - manifest.availabilityStartTime;
 * };
 * ```
 * It should be the exact opposite of ``toWallClockTime``
 */
function fromWallClockTime(timeInMs, manifest) {
  return normalizeWallClockTime(timeInMs, manifest) / 1000
    - manifest.availabilityStartTime;
}

/**
 * TODO This function should have more of a seekTo kind of name
 */
function normalizeWallClockTime(timeInMs, manifest) {
  const {
    suggestedPresentationDelay,
    presentationLiveGap,
    timeShiftBufferDepth,
  } = manifest;

  if (typeof timeInMs != "number") {
    timeInMs = timeInMs.getTime();
  }

  const now = Date.now();
  const max = now - (presentationLiveGap + suggestedPresentationDelay) * 1000;
  const min = now - (timeShiftBufferDepth) * 1000;
  return Math.max(Math.min(timeInMs, max), min);
}

function getMinimumBufferPosition(manifest) {
  // we have to know both the min and the max to be sure
  const [min] = getBufferLimits(manifest);
  return min;
}

/**
 * Get maximum position to which we should be able to construct a buffer.
 * @param {Manifest} manifest
 * @returns {Number}
 */
function getMaximumBufferPosition(manifest) {
  if (!manifest.isLive) {
    return manifest.getDuration();
  }

  const {
    availabilityStartTime,
    presentationLiveGap,
  } = manifest;
  const now = Date.now() / 1000;
  return now - availabilityStartTime - presentationLiveGap;
}

/**
 * Get maximum buffer position with, for live contents, an added security to
 * prevent buffering ahead of the live edge.
 *
 * TODO This method should be removed in a next version (after multiple tests).
 * We should be the closest to the live edge when it comes to buffering.
 *
 * @param {Manifest} manifest
 * @returns {Number}
 */
function getMaximumSecureBufferPosition(manifest) {
  const maximumBufferPosition = getMaximumBufferPosition(manifest);
  return manifest.isLive ?
    maximumBufferPosition - LIVE_BUFFER_PROTECTION : maximumBufferPosition;
}

function getBufferLimits(manifest) {
  // TODO use RTT for the manifest request + 3 or something
  const BUFFER_DEPTH_SECURITY = 5;

  if (!manifest.isLive) {
    return [0, manifest.getDuration()];
  }

  const {
    availabilityStartTime,
    presentationLiveGap,
    timeShiftBufferDepth,
  } = manifest;

  const now = Date.now() / 1000;
  const max = now - availabilityStartTime - presentationLiveGap;
  return [
    Math.min(max, max - timeShiftBufferDepth + BUFFER_DEPTH_SECURITY),
    max,
  ];
}

export {
  getTimings,
  createTimingsSampler,
  toWallClockTime,
  fromWallClockTime,
  getMinimumBufferPosition,
  getMaximumBufferPosition,
  getMaximumSecureBufferPosition,
  getBufferLimits,
};
