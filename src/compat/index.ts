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

import nextTick from "next-tick";
import {
  defer as observableDefer,
  Observable,
  Observer,
  of as observableOf,
} from "rxjs";
import { take } from "rxjs/operators";
import log from "../log";
import castToObservable from "../utils/castToObservable";
import EventEmitter from "../utils/eventemitter";
import tryCatch from "../utils/rx-tryCatch";
import {
  ICompatMediaKeySystemAccess,
  ICompatMediaKeySystemConfiguration,
  ICompatTextTrack,
  ICompatVTTCue,
  isFirefox,
  isIE11,
  isIEOrEdge,
  isSamsungBrowser,
  MediaSource_,
  READY_STATES,
  VTTCue_,
} from "./constants";
import * as events from "./events";
import {
  exitFullscreen,
  isFullscreen,
  requestFullscreen,
} from "./fullscreen";

import {
  createSession,
  CustomMediaKeySystemAccess,
  getInitData,
  ICustomMediaKeys,
  ICustomMediaKeySession,
  ICustomMediaKeySystemAccess,
  requestMediaKeySystemAccess,
  setMediaKeys,
} from "./eme";

export interface ICustomSourceBuffer<T> {
  addEventListener : (eventName : string, cb : (arg : any) => void) => void;
  removeEventListener : (
    eventName : string,
    callback : (arg : any) => void
  ) => void;
  buffered : TimeRanges;
  changeType? : (type: string) => void;
  updating : boolean;
  timestampOffset : number;
  appendBuffer(data : T) : void;
  remove(from : number, to : number) : void;
  abort() : void;
}

/**
 * Returns true if the given codec is supported by the browser's MediaSource
 * implementation.
 * @returns {Boolean}
 */
function isCodecSupported(codec : string) : boolean {
  if (!MediaSource_) {
    return false;
  }

  /* tslint:disable no-unbound-method */
  if (typeof MediaSource_.isTypeSupported === "function") {
  /* tslint:enable no-unbound-method */
    return MediaSource_.isTypeSupported(codec);
  }

  return true;
}

function isVTTCue(cue : ICompatVTTCue|TextTrackCue) : cue is ICompatVTTCue {
  return typeof (window as any).VTTCue === "function" &&
    cue instanceof (window as any).VTTCue;
}

/**
 * Returns true if the browser has the minimum needed EME APIs to decrypt a
 * content.
 * @returns {Boolean}
 */
function hasEMEAPIs() : boolean {
  return typeof requestMediaKeySystemAccess === "function";
}

/**
 * TODO(pierre): fix patchSegmentInPlace to work with IE11. Maybe
 * try to put free atom inside traf children
 *
 * Returns true if the current target is tolerant enough for us to
 * simply be able to "patch" an ISOBMFF segment or if we have to create a
 * new one from scratch instead.
 *
 * TODO understand what the fudge Pierre meant here
 * @returns {Boolean}
 */
function canPatchISOBMFFSegment() {
  return !isIEOrEdge;
}

/**
 * Returns true if the current target require the media keys to be renewed on
 * each content.
 * @returns {Boolean}
 */
function shouldRenewMediaKeys() : boolean {
  return isIE11;
}

/**
 * Returns true if the mediakeys associated to a media element should be
 * unset once the content is stopped.
 * Depends on the target.
 * @returns {Boolean}
 */
function shouldUnsetMediaKeys() : boolean {
  return isIE11;
}

/**
 * Wait for the MediaSource's sourceopen event and emit. Emit immediatelly if
 * already received.
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
function onSourceOpen$(
  mediaSource : MediaSource
) : Observable<Event|null> {
  if (mediaSource.readyState === "open") {
    return observableOf(null);
  } else {
    return events.onSourceOpen$(mediaSource)
      .pipe(take(1));
  }
}

/**
 * Returns an observable emitting a single time, as soon as a seek is possible
 * (the metatada are loaded).
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function hasLoadedMetadata(
  mediaElement : HTMLMediaElement
) : Observable<unknown> {
  if (mediaElement.readyState >= READY_STATES.HAVE_METADATA) {
    return observableOf(null);
  } else {
    return events.onLoadedMetadata$(mediaElement)
      .pipe(take(1));
  }
}

interface IWebKitSourceBufferConstructor {
  new() : IWebKitSourceBuffer;
}

interface IWebKitSourceBuffer {
  append(data : ArrayBuffer) : void;
  remove(from : number, to : number) : void;
}

// old WebKit SourceBuffer implementation,
// where a synchronous append is used instead of appendBuffer
if (
  (window as any).WebKitSourceBuffer &&
  !(window as any).WebKitSourceBuffer.prototype.addEventListener
) {

  const sourceBufferWebkitRef : IWebKitSourceBufferConstructor =
    (window as any).WebKitSourceBuffer;
  const sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;

  for (const fnName in EventEmitter.prototype) {
    if (EventEmitter.prototype.hasOwnProperty(fnName)) {
      sourceBufferWebkitProto[fnName] = (EventEmitter.prototype as any)[fnName];
    }
  }

  sourceBufferWebkitProto._listeners = [];

  sourceBufferWebkitProto.__emitUpdate =
    function(eventName : string, val : any) {
      nextTick(() => {
        /* tslint:disable no-invalid-this */
        this.trigger(eventName, val);
        this.updating = false;
        this.trigger("updateend");
        /* tslint:enable no-invalid-this */
      });
    };

  sourceBufferWebkitProto.appendBuffer =
    function(data : any) {
      /* tslint:disable no-invalid-this */
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
      /* tslint:enable no-invalid-this */
    };
}

/**
 * Add text track to the given media element.
 * Returns an object with the following properties:
 *   - track {TextTrack}: the added text track
 *   - trackElement {HTMLElement|undefined}: the added <track> element.
 *     undefined if no trackElement was added.
 * @param {HTMLMediaElement} mediaElement
 * @param {Boolean} hidden
 * @returns {Object}
 */
function addTextTrack(
  mediaElement : HTMLMediaElement,
  hidden : boolean
) : {
  track : ICompatTextTrack;
  trackElement? : HTMLTrackElement;
} {
  let track;
  let trackElement;

  const kind = "subtitles";
  if (isIEOrEdge) {
    const tracksLength = mediaElement.textTracks.length;
    track = tracksLength > 0 ?
      mediaElement.textTracks[tracksLength - 1] : mediaElement.addTextTrack(kind);
    track.mode = hidden ? track.HIDDEN : track.SHOWING;
  } else {
    // there is no removeTextTrack method... so we need to reuse old
    // text-tracks objects and clean all its pending cues
    trackElement = document.createElement("track");
    mediaElement.appendChild(trackElement);
    track = trackElement.track;
    trackElement.kind = kind;
    track.mode = hidden ? "hidden" : "showing";
  }
  return { track, trackElement };
}

/**
 * firefox fix: sometimes playback can be stalled, even if we are in a buffer.
 * TODO This seems to be about an old Firefox version. Delete it?
 * @param {number} time
 * @param {Object|null} currentRange
 * @param {string} state
 * @param {Boolean} isStalled
 * @returns {Boolean}
 */
function isPlaybackStuck(
  time : number,
  currentRange : {
    start: number;
    end: number;
  }|null,
  state : string,
  isStalled : boolean
) : boolean {
  const FREEZE_THRESHOLD = 10; // freeze threshold in seconds
  return (
    isFirefox && isStalled && state === "timeupdate" &&
    !!currentRange && currentRange.end - time > FREEZE_THRESHOLD
  );
}

function shouldValidateMetadata() {
  return isSamsungBrowser;
}

/**
 * Clear element's src attribute.
 *
 * On IE11, element.src = "" is not sufficient as it
 * does not clear properly the current MediaKey Session.
 * Microsoft recommended to use element.removeAttr("src").
 * @param {HTMLMediaElement} element
 */
function clearElementSrc(element : HTMLMediaElement) : void {
  element.src = "";
  element.removeAttribute("src");
}

/**
 * Set an URL to the element's src.
 * Emit ``undefined`` when done.
 * Unlink src on unsubscription.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {string} url
 * @returns {Observable}
 */
function setElementSrc$(
  mediaElement : HTMLMediaElement,
  url : string
) : Observable<void> {
  return Observable.create((observer : Observer<void>) => {
    log.info("Setting URL to Element", url, mediaElement);

    mediaElement.src = url;

    observer.next(undefined);
    return () => {
      clearElementSrc(mediaElement);
    };
  });
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
  /* tslint:disable no-boolean-literal-compare */
  return navigator.onLine === false;
  /* tslint:enable no-boolean-literal-compare */
}

/**
 * Creates a cue using the best platform-specific interface available.
 *
 * @param {Number} startTime
 * @param {Number} endTime
 * @param {string} payload
 * @returns {VTTCue|TextTrackCue|null} Text track cue or null if the parameters
 * were invalid.
 */
function makeCue(
  startTime : number,
  endTime : number,
  payload : string
) : ICompatVTTCue|TextTrackCue|null {
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

/**
 * Call play on the media element on subscription and return the response as an
 * observable.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function play$(mediaElement : HTMLMediaElement) : Observable<unknown> {
  return observableDefer(() =>
    // mediaElement.play is not always a Promise. In the improbable case it
    // throws, I prefer still to catch to return the error wrapped in an
    // Observable
    tryCatch(() => castToObservable(mediaElement.play()))
  );
}

/**
 * If the changeType MSE API is implemented, update the current codec of the
 * SourceBuffer and return true if it succeeded.
 * In any other cases, return false.
 * @param {Object} sourceBuffer
 * @param {string} codec
 * @returns {boolean}
 */
function tryToChangeSourceBufferType(
  sourceBuffer : ICustomSourceBuffer<unknown>,
  codec : string
) : boolean {
  if (typeof sourceBuffer.changeType === "function") {
    try {
      sourceBuffer.changeType(codec);
    } catch (e) {
      log.warn("Could not call 'changeType' on the given SourceBuffer:", e);
      return false;
    }
    return true;
  }
  return false;
}

export {
  createSession,
  CustomMediaKeySystemAccess,
  ICompatMediaKeySystemAccess,
  ICompatMediaKeySystemConfiguration,
  ICompatTextTrack,
  ICompatVTTCue,
  ICustomMediaKeySession,
  ICustomMediaKeySystemAccess,
  ICustomMediaKeys,
  MediaSource_,
  VTTCue_,
  addTextTrack,
  canPatchISOBMFFSegment,
  clearElementSrc,
  events,
  exitFullscreen,
  getInitData,
  hasEMEAPIs,
  hasLoadedMetadata,
  isCodecSupported,
  isFullscreen,
  isOffline,
  isPlaybackStuck,
  isVTTCue,
  makeCue,
  onSourceOpen$,
  play$,
  requestFullscreen,
  requestMediaKeySystemAccess,
  setElementSrc$,
  setMediaKeys,
  shouldRenewMediaKeys,
  shouldUnsetMediaKeys,
  shouldValidateMetadata,
  tryToChangeSourceBufferType,
};
