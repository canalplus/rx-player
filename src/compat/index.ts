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

import onEvent from "../utils/rx-onEvent";
import EventEmitter from "../utils/eventemitter";
import log from "../utils/log";

import {
  MediaSource_,
  VTTCue_,
  isIE,
  isFirefox,
  READY_STATES,
} from "./constants";
import * as events from "./events";
import {
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
} from "./fullscreen";
import {
  requestMediaKeySystemAccess,
  setMediaKeys,
  KeySystemAccess,
} from "./eme";

/**
 * Returns true if the given codec is supported by the browser's MediaSource
 * implementation.
 * @returns {Boolean}
 */
function isCodecSupported(codec : string) : boolean {
  if (!MediaSource_) {
    return false;
  }

  if (typeof MediaSource_.isTypeSupported === "function") {
    return MediaSource_.isTypeSupported(codec);
  }

  return true;
}

/**
 * Returns true if the current target require the media keys to be renewed on
 * each content.
 * @returns {Boolean}
 */
function shouldRenewMediaKeys() : boolean {
  return isIE;
}

/**
 * Returns true if the mediakeys associated to a video element should be
 * unset once the content is stopped.
 * Depends on the target.
 * @returns {Boolean}
 */
function shouldUnsetMediaKeys() : boolean {
  return isIE;
}

/**
 * Wait for the MediaSource's sourceopen event and emit. Emit immediatelly if
 * already received.
 * @param {MediaSource}
 * @returns {Observable}
 */
function onSourceOpen$(
  mediaSource : MediaSource
) : Observable<Event>|Observable<null> {
  if (mediaSource.readyState === "open") {
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
function canSeek(
  videoElement : HTMLMediaElement
) : Observable<Event>|Observable<null> {
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
function canPlay(
  videoElement : HTMLMediaElement
) : Observable<Event>|Observable<null> {
  if (videoElement.readyState >= READY_STATES.HAVE_ENOUGH_DATA) {
    return Observable.of(null);
  } else {
    return onEvent<Event>(videoElement, "canplay").take(1);
  }
}

// old WebKit SourceBuffer implementation,
// where a synchronous append is used instead of appendBuffer
if (
  window.WebKitSourceBuffer &&
  !window.WebKitSourceBuffer.prototype.addEventListener
) {

  const sourceBufferWebkitRef = window.WebKitSourceBuffer;
  const sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;

  for (const fnName in EventEmitter.prototype) {
    if (EventEmitter.prototype.hasOwnProperty(fnName)) {
      sourceBufferWebkitProto[fnName] = (EventEmitter.prototype as any)[fnName];
    }
  }

  sourceBufferWebkitProto._listeners = [];

  sourceBufferWebkitProto.__emitUpdate =
    function(eventName : string, val : any) {
      setTimeout(() => {
        this.trigger(eventName, val);
        this.updating = false;
        this.trigger("updateend");
      }, 0);
    };

  sourceBufferWebkitProto.appendBuffer =
    function(data : any) {
      if (this.updating) {
        throw new Error("updating");
      }
      this.trigger("updatestart");
      this.updating = true;
      try {
        this.append(data);
      } catch (error) {
        this.__emitUpdate("error", error);
        return;
      }
      this.__emitUpdate("update");
    };
}

/**
 * Add text track to the given media element.
 * Returns an object with the following properties:
 *   - track {TextTrack}: the added text track
 *   - trackElement {HTMLElement|undefined}: the added <track> element.
 *     undefined if no trackElement was added.
 * @param {HTMLMediaElement} video
 * @param {Boolean} hidden
 * @returns {Object}
 */
function addTextTrack(
  video : HTMLMediaElement,
  hidden : boolean
) : { track : TextTrack, trackElement? : HTMLTrackElement } {
  let track;
  let trackElement;

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
 *
 * TODO This seems to be about an old Firefox version. Delete it?
 * @param {Object} timing
 * @returns {Boolean}
 */
function isPlaybackStuck(
  time : number,
  currentRange : { start: number, end: number }|null,
  state : string,
  isStalled : boolean
) : boolean {
  const FREEZE_THRESHOLD = 10; // video freeze threshold in seconds
  return (
    isFirefox && isStalled && state === "timeupdate" &&
    !!currentRange && currentRange.end - time > FREEZE_THRESHOLD
  );
}

/**
 * Clear video src attribute.
 *
 * On IE11,  video.src = "" is not sufficient as it
 * does not clear properly the current MediaKey Session.
 * Microsoft recommended to use video.removeAttr("src").
 * @param {HTMLMediaElement} video
 */
function clearVideoSrc(video : HTMLMediaElement) : void {
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
function isOffline() : boolean {
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
function makeCue(
  startTime : number,
  endTime : number,
  payload : string
) : VTTCue|TextTrackCue|null {
  if (!VTTCue_) {
    throw new Error("VTT cues not supported in your target");
  }
  if (startTime >= endTime) {

    // IE/Edge will throw in this case.
    // See issue #501
    log.warn("Invalid cue times: " + startTime + " - " + endTime);
    return null;
  }

  return new VTTCue_(startTime, endTime, payload);
}

export {
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
  setMediaKeys,
  shouldRenewMediaKeys,
  shouldUnsetMediaKeys,
  onSourceOpen$,
};
