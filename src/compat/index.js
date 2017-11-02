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

import onEvent from "../utils/rx-onEvent.js";
import EventEmitter from "../utils/eventemitter";
import log from "../utils/log.js";
import {
  HTMLVideoElement_,
  MediaSource_,
  VTTCue_,
  isIE,
  isFirefox,
  READY_STATES,
} from "./constants.js";
import * as events from "./events.js";
import {
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
} from "./fullscreen.js";
import {
  requestMediaKeySystemAccess,
  setMediaKeys,
  KeySystemAccess,
} from "./eme";

function isCodecSupported(codec) {
  return !!MediaSource_ && MediaSource_.isTypeSupported(codec);
}

function shouldRenewMediaKeys() {
  return isIE;
}

/**
 * Returns true if the mediakeys associated to a video element should be
 * unset once the content is stopped.
 * Depends on the target.
 * @returns {Boolean}
 */
function shouldUnsetMediaKeys() {
  return isIE;
}

/**
 * Wait for the MediaSource's sourceopen event and emit. Emit immediatelly if
 * already received.
 * @param {MediaSource}
 * @returns {Observable}
 */
function onSourceOpen$(mediaSource) {
  if (mediaSource.readyState == "open") {
    return Observable.of(null);
  } else {
    return events.onSourceOpen$(mediaSource).take(1);
  }
}

/**
 * Returns an observable emitting a single time, as soon as a seek is possible
 * (the metatada are loaded).
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function canSeek(videoElement) {
  if (videoElement.readyState >= READY_STATES.HAVE_METADATA) {
    return Observable.of(null);
  } else {
    return events.onLoadedMetadata$(videoElement).take(1);
  }
}

/**
 * Returns ane observable emitting a single time, as soon as a play is possible.
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function canPlay(videoElement) {
  if (videoElement.readyState >= READY_STATES.HAVE_ENOUGH_DATA) {
    return Observable.of(null);
  } else {
    return onEvent(videoElement, "canplay").take(1);
  }
}


// TODO Lacking side-effect?
if (
  window.WebKitSourceBuffer &&
  !window.WebKitSourceBuffer.prototype.addEventListener
) {

  const SourceBuffer = window.WebKitSourceBuffer;
  const SBProto = SourceBuffer.prototype;

  for (const fnNAme in EventEmitter.prototype) {
    SBProto[fnNAme] = EventEmitter.prototype[fnNAme];
  }

  SBProto.__listeners = [];

  SBProto.appendBuffer = function(data) {
    if (this.updating) {
      throw new Error("updating");
    }
    this.trigger("updatestart");
    this.updating = true;
    try {
      this.append(data);
    } catch(error) {
      this.__emitUpdate("error", error);
      return;
    }
    this.__emitUpdate("update");
  };

  SBProto.__emitUpdate = function(eventName, val) {
    setTimeout(() => {
      this.trigger(eventName, val);
      this.updating = false;
      this.trigger("updateend");
    }, 0);
  };
}

function addTextTrack(video, hidden) {
  let track, trackElement;
  const kind = "subtitles";
  if (isIE) {
    const tracksLength = video.textTracks.length;
    track = tracksLength > 0 ?
      video.textTracks[tracksLength - 1] : video.addTextTrack(kind);
    track.mode = hidden ? track.HIDDEN : track.SHOWING;
  } else {
    // there is no removeTextTrack method... so we need to reuse old
    // text-tracks objects and clean all its pending cues
    trackElement = document.createElement("track");
    video.appendChild(trackElement);
    track = trackElement.track;
    trackElement.kind = kind;
    track.mode = hidden ? "hidden" : "showing";
  }
  return { track, trackElement };
}

/**
 * firefox fix: sometimes the stream can be stalled, even if we are in a
 * buffer.
 * @param {Object} timing
 * @returns {Boolean}
 */
function isPlaybackStuck(timing) {
  const FREEZE_THRESHOLD = 10; // video freeze threshold in seconds
  return (
    isFirefox &&
    timing.stalled &&
    timing.state === "timeupdate" &&
    timing.range &&
    timing.range.end - timing.currentTime > FREEZE_THRESHOLD
  );
}

/*
 * Clear video src attribute.
 *
 * On IE11,  video.src = "" is not sufficient as it
 * does not clear properly the current MediaKey Session.
 * Microsoft recommended to use video.removeAttr("src").
 * @param {HTMLMediaElement} video
 */
function clearVideoSrc(video) {
  video.src = "";
  video.removeAttribute("src");
}

/**
 * Some browsers have a builtin API to know if it's connected at least to a
 * LAN network, at most to the internet.
 *
 * /!\ This feature can be dangerous as you can both have false positives and
 * false negatives.
 *
 * False positives:
 *   - you can still play local contents (on localhost) if isOffline == true
 *   - on some browsers isOffline might be true even if we're connected to a LAN
 *     or a router (it would mean we're just not able to connect to the
 *     Internet). So we can eventually play LAN contents if isOffline == true
 *
 * False negatives:
 *   - in some cases, we even might have isOffline at false when we do not have
 *     any connection:
 *       - in browsers that do not support the feature
 *       - in browsers running in some virtualization softwares where the
 *         network adapters are always connected.
 *
 * Use with these cases in mind.
 * @returns {Boolean}
 */
function isOffline() {
  return navigator.onLine === false;
}

/**
 * Creates a cue using the best platform-specific interface available.
 *
 * @param {Number} startTime
 * @param {Number} endTime
 * @param {string} payload
 * @returns {TextTrackCue} or null if the parameters were invalid.
 */
function makeCue(startTime, endTime, payload) {
  if (startTime >= endTime) {

    // IE/Edge will throw in this case.
    // See issue #501
    log.warn("Invalid cue times: " + startTime + " - " + endTime);
    return null;
  }

  return new VTTCue_(startTime, endTime, payload);
}

/**
 * Get informations about playback frame counts.
 * HTMLVideoElement API is supported in Firefox >= 25.
 *
 * @param {HTMLVideoElement} videoElement
 */
const getVideoPlaybackQuality = function(videoElement){
  const hasWebKit = ("webkitDroppedFrameCount" in videoElement)
    && ("webkitDecodedFrameCount" in videoElement);
  const hasQuality = ("getVideoPlaybackQuality" in videoElement);
  let result = null;

  if (hasQuality) {
    result = videoElement.getVideoPlaybackQuality();
  }
  else if (hasWebKit) {
    result = {
      droppedVideoFrames: videoElement.webkitDroppedFrameCount,
      totalVideoFrames: videoElement.webkitDroppedFrameCount
        + videoElement.webkitDecodedFrameCount,
      creationTime: new Date(),
    };
  }

  return result;
};

export {
  HTMLVideoElement_,
  KeySystemAccess,
  MediaSource_,
  VTTCue_,
  addTextTrack,
  canPlay,
  canSeek,
  clearVideoSrc,
  events,
  exitFullscreen,
  isCodecSupported,
  isFirefox,
  isFullscreen,
  isIE,
  isOffline,
  isPlaybackStuck,
  makeCue,
  requestFullscreen,
  requestMediaKeySystemAccess,
  getVideoPlaybackQuality,
  setMediaKeys,
  shouldRenewMediaKeys,
  shouldUnsetMediaKeys,
  onSourceOpen$,
};
