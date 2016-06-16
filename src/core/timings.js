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

const { Observable } = require("rxjs/Observable");
const { BehaviorSubject } = require("rxjs/BehaviorSubject");
const { BufferedRanges } = require("./ranges");

// time changes interval in milliseconds
const SAMPLING_INTERVAL_MEDIASOURCE = 1000;
const SAMPLING_INTERVAL_NO_MEDIASOURCE = 500;

// time in seconds protecting live buffer to prevent ahead of time
// buffering
const LIVE_PROTECTION = 10;

// stall gap in seconds
const STALL_GAP = 0.5;
const RESUME_GAP = 5;

// seek gap in seconds
const SEEK_GAP = 2;

const SCANNED_VIDEO_EVENTS = [
  "canplay",
  "play",
  "progress",
  "seeking",
  "seeked",
  "loadedmetadata",
];

// waiting time differs between a "seeking" stall and
// a buffering stall
function resumeGap(stalled) {
  return (stalled.name == "seeking")
    ? STALL_GAP
    : RESUME_GAP;
}

function isEnding(gap, range, duration) {
  if (range) {
    return (duration - (gap + range.end)) <= STALL_GAP;
  } else {
    return false;
  }
}

class Timings {
  constructor(ts,
              buffered,
              duration,
              gap,
              name,
              playback,
              range,
              readyState,
              stalled,
              paused) {
    this.ts = ts;
    this.buffered = buffered;
    this.duration = duration;
    this.gap = gap;
    this.name = name;
    this.playback = playback;
    this.range = range;
    this.readyState = readyState;
    this.stalled = stalled;
    this.paused = paused;
  }

  clone() {
    return new Timings(this.ts,
                       this.buffered,
                       this.duration,
                       this.gap,
                       this.name,
                       this.playback,
                       this.range,
                       this.readyState,
                       this.stalled,
                       this.paused);
  }
}

function getEmptyTimings() {
  return new Timings(0,
                     new BufferedRanges(),
                     0,
                     Infinity,
                     "timeupdate",
                     1,
                     null,
                     0,
                     null,
                     null);
}

function getTimings(video, name) {
  const ts = video.currentTime;
  const paused = video.paused;
  const buffered = new BufferedRanges(video.buffered);
  return new Timings(ts,
                     buffered,
                     video.duration,
                     buffered.getGap(ts),
                     name,
                     video.playbackRate,
                     buffered.getRange(ts),
                     video.readyState,
                     null,
                     paused);
}

function scanTimings(prevTimings, currentTimings, requiresMediaSource) {
  const {
    name: currentName,
    ts: currentTs,
    gap: gap,
    range,
    duration,
    paused,
    readyState,
    playback,
  } = currentTimings;

  const {
    stalled: prevStalled,
    name: prevName,
    ts: prevTs,
  } = prevTimings;

  const ending = isEnding(gap, range, duration);

  const mayStall = (
    readyState >= 1 &&
    currentName != "loadedmetadata" &&
    !prevStalled &&
    !ending
  );

  let shouldStall, shouldUnstall;

  // when using a direct file, the video will stall and unstall on its
  // own, so we only try to detect when the video timestamp has not changed
  // between two consecutive timeupdates
  if (requiresMediaSource) {
    shouldStall = (
      mayStall &&
      (gap <= STALL_GAP || gap === Infinity || readyState === 1)
    );

    shouldUnstall = (
      prevStalled &&
      readyState > 1 &&
      gap < Infinity && (gap > resumeGap(prevStalled) || ending)
    );
  }
  else {
    shouldStall = (
      mayStall &&
      ( !paused && currentName == "timeupdate" && prevName == "timeupdate" && currentTs === prevTs ||
        currentName == "seeking" && gap === Infinity )
    );

    shouldUnstall = (
      prevStalled &&
      ( currentName != "seeking" && currentTs !== prevTs ||
        currentName == "canplay" ||
        gap < Infinity && (gap > resumeGap(prevStalled) || ending))
    );
  }

  let stalled;
  if (shouldStall) {
    stalled = { name: currentName, playback };
  }
  else if (shouldUnstall) {
    stalled = null;
  }
  else {
    stalled = prevStalled;
  }

  currentTimings.stalled = stalled;
  return currentTimings;
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
 */
function createTimingsSampler(video, { requiresMediaSource }) {
  return Observable.create((obs) => {
    let prevTimings = getTimings(video, "init");

    function emitSample(evt) {
      const timingEventType = evt && evt.type || "timeupdate";
      const currentTimings = getTimings(video, timingEventType);
      prevTimings = scanTimings(prevTimings, currentTimings, requiresMediaSource);
      obs.next(prevTimings);
    }

    const samplerTimeInterval = requiresMediaSource
      ? SAMPLING_INTERVAL_MEDIASOURCE
      : SAMPLING_INTERVAL_NO_MEDIASOURCE;

    const timeUpdateHandler = setInterval(emitSample, samplerTimeInterval);
    SCANNED_VIDEO_EVENTS.forEach((eventName) => video.addEventListener(eventName, emitSample));

    obs.next(prevTimings);

    return () => {
      clearInterval(timeUpdateHandler);
      SCANNED_VIDEO_EVENTS.forEach((eventName) => video.removeEventListener(eventName, emitSample));
    };
  })
    .multicast(() => new BehaviorSubject({ name: "init", stalled: null }))
    .refCount();
}

function seekingsSampler(timingsSampling) {
  return timingsSampling
    .filter((t) => (
      t.name == "seeking" &&
      ( t.gap === Infinity ||
        t.gap < -SEEK_GAP )
    ))
    // skip the first seeking event generated by the set of the
    // initial seeking time in the video
    .skip(1)
    .startWith(true);
}

function toWallClockTime(ts, manifest) {
  return new Date((ts + manifest.availabilityStartTime) * 1000);
}

function fromWallClockTime(timeInMs, manifest) {
  return normalizeWallClockTime(timeInMs, manifest) / 1000 - manifest.availabilityStartTime;
}

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

function getLiveGap(ts, manifest) {
  if (!manifest.isLive) {
    return Infinity;
  }

  const {
    availabilityStartTime,
    presentationLiveGap,
  } = manifest;

  const liveGap = (Date.now() / 1000 - ts);
  return (liveGap - (availabilityStartTime + presentationLiveGap + LIVE_PROTECTION));
}

module.exports = {
  getEmptyTimings,
  getTimings,
  createTimingsSampler,
  seekingsSampler,
  getLiveGap,
  toWallClockTime,
  fromWallClockTime,
};
