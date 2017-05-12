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

const log = require("../utils/log");
const EventEmitter = require("../utils/eventemitter");
const { bytesToStr, strToBytes } = require("../utils/bytes");
const assert = require("../utils/assert");
const { Observable } = require("rxjs/Observable");
const { merge } = require("rxjs/observable/merge");
const fromEvent = require("rxjs/observable/FromEventObservable").FromEventObservable.create;
const never = require("rxjs/observable/NeverObservable").NeverObservable.create;
const defer = require("rxjs/observable/DeferObservable").DeferObservable.create;
const { on, castToObservable } = require("../utils/rx-utils");
const { MediaError } = require("../errors");

const doc = document;
const win = window;

const PREFIXES = ["", "webkit", "moz", "ms"];

const HTMLElement_      = win.HTMLElement;
const HTMLVideoElement_ = win.HTMLVideoElement;

const MediaSource_ = (
  win.MediaSource ||
  win.MozMediaSource ||
  win.WebKitMediaSource ||
  win.MSMediaSource);

let MediaKeys_ = (
  win.MediaKeys ||
  win.MozMediaKeys ||
  win.WebKitMediaKeys ||
  win.MSMediaKeys);

const isIE = (
  navigator.appName == "Microsoft Internet Explorer" ||
  navigator.appName == "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent)
);

const isFirefox = (
  navigator.userAgent.toLowerCase().indexOf("firefox") !== -1
);

const HAVE_METADATA    = 1;
const HAVE_ENOUGH_DATA = 4;

let MockMediaKeys = function() {
};

let requestMediaKeySystemAccess;
if (navigator.requestMediaKeySystemAccess) {
  requestMediaKeySystemAccess = (a, b) => castToObservable(navigator.requestMediaKeySystemAccess(a, b));
}

// @implement interface MediaKeySystemAccess
class KeySystemAccess {
  constructor(keyType, mediaKeys, mediaKeySystemConfiguration) {
    this._keyType = keyType;
    this._mediaKeys = mediaKeys;
    this._configuration = mediaKeySystemConfiguration;
  }
  get keySystem() {
    return this._keyType;
  }
  createMediaKeys() {
    return Observable.of(this._mediaKeys);
  }
  getConfiguration() {
    return this._configuration;
  }
}

function isEventSupported(element, eventNameSuffix) {
  const clone = document.createElement(element.tagName);
  const eventName = "on" + eventNameSuffix;
  if (eventName in clone) {
    return true;
  } else {
    clone.setAttribute(eventName, "return;");
    return typeof clone[eventName] == "function";
  }
}

function eventPrefixed(eventNames, prefixes) {
  return eventNames.reduce((parent, name) =>
    parent.concat((prefixes || PREFIXES).map((p) => p + name)), []);
}

function findSupportedEvent(element, eventNames) {
  return eventNames.filter((name) => isEventSupported(element, name))[0];
}

function compatibleListener(eventNames, prefixes) {
  let mem;
  eventNames = eventPrefixed(eventNames, prefixes);
  return (element) => {
    // if the element is a HTMLElement we can detect
    // the supported event, and memoize it in `mem`
    if (element instanceof HTMLElement_) {
      if (typeof mem == "undefined") {
        mem = findSupportedEvent(element, eventNames) || null;
      }

      if (mem) {
        return fromEvent(element, mem);
      } else {
        if (__DEV__) {
          log.warn(
            `compat: element <${element.tagName}> does not support any of these events: ${eventNames.join(", ")}`
          );
        }
        return never();
      }
    }

    // otherwise, we need to listen to all the events
    // and merge them into one observable sequence
    return on(element, eventNames);
  };
}

function isCodecSupported(codec) {
  return !!MediaSource_ && MediaSource_.isTypeSupported(codec);
}

const loadedMetadataEvent = compatibleListener(["loadedmetadata"]);
const sourceOpenEvent = compatibleListener(["sourceopen", "webkitsourceopen"]);
const onEncrypted = compatibleListener(["encrypted", "needkey"]);
const onKeyMessage = compatibleListener(["keymessage", "message"]);
const onKeyAdded = compatibleListener(["keyadded", "ready"]);
const onKeyError = compatibleListener(["keyerror", "error"]);
const onKeyStatusesChange = compatibleListener(["keystatuseschange"]);
const emeEvents = {
  onEncrypted,
  onKeyMessage,
  onKeyStatusesChange,
  onKeyError,
};

function shouldRenewMediaKeys() {
  return isIE;
}

function sourceOpen(mediaSource) {
  if (mediaSource.readyState == "open") {
    return Observable.of(null);
  } else {
    return sourceOpenEvent(mediaSource).take(1);
  }
}

function canSeek(videoElement) {
  if (videoElement.readyState >= HAVE_METADATA) {
    return Observable.of(null);
  } else {
    return loadedMetadataEvent(videoElement).take(1);
  }
}

function canPlay(videoElement) {
  if (videoElement.readyState >= HAVE_ENOUGH_DATA) {
    return Observable.of(null);
  } else {
    return on(videoElement, "canplay").take(1);
  }
}


// Wrap "MediaKeys.prototype.update" form an event based system to a
// Promise based function.
function wrapUpdate(memUpdate, sessionObj) {

  function KeySessionError(err={}) {
    if (err.errorCode) {
      err = {
        systemCode: err.systemCode,
        code: err.errorCode.code,
      };
    }
    this.name = "KeySessionError";
    this.mediaKeyError = err;
    this.message = `MediaKeyError code:${err.code} and systemCode:${err.systemCode}`;
  }
  KeySessionError.prototype = new Error();

  return function(license, sessionId) {
    const session = typeof sessionObj == "function"
      ? sessionObj.call(this)
      : this;

    const keys = onKeyAdded(session);
    const errs = onKeyError(session).map((evt) => {
      throw new KeySessionError(session.error || evt);
    });

    try {
      memUpdate.call(this, license, sessionId);
      return merge(keys, errs).take(1);
    } catch(e) {
      return Observable.throw(e);
    }
  };

}

// Browser without any MediaKeys object: A mock for MediaKey and
// MediaKeySession are created, and the <video>.addKey api is used to
// pass the license.
//
// This is for Chrome with unprefixed EME api
if (!requestMediaKeySystemAccess && HTMLVideoElement_.prototype.webkitGenerateKeyRequest) {

  // Mock MediaKeySession interface for old chrome implementation
  // of the EME specifications
  const MockMediaKeySession = function(video, keySystem) {
    EventEmitter.call(this);

    this.sessionId = "";
    this._vid = video;
    this._key = keySystem;
    this._con = merge(
      onKeyMessage(video),
      onKeyAdded(video),
      onKeyError(video)
    ).subscribe((evt) => this.trigger(evt.type, evt));
  };

  MockMediaKeySession.prototype = Object.assign({
    generateRequest: function (initDataType, initData) {
      this._vid.webkitGenerateKeyRequest(this._key, initData);
    },

    update: wrapUpdate(function (license, sessionId) {
      if (this._key.indexOf("clearkey") >= 0) {
        const json = JSON.parse(bytesToStr(license));
        const key = strToBytes(atob(json.keys[0].k));
        const kid = strToBytes(atob(json.keys[0].kid));
        this._vid.webkitAddKey(this._key, key, kid, sessionId);
      } else {
        this._vid.webkitAddKey(this._key, license, null, sessionId);
      }
      this.sessionId = sessionId;
    }),

    close: function() {
      if (this._con) {
        this._con.unsubscribe();
      }
      this._con = null;
      this._vid = null;
    },
  }, EventEmitter.prototype);

  MockMediaKeys = function(keySystem) {
    this.ks_ = keySystem;
  };

  MockMediaKeys.prototype = {
    _setVideo(vid) {
      this._vid = vid;
    },
    createSession(/* sessionType */) {
      return new MockMediaKeySession(this._vid, this.ks_);
    },
  };

  const isTypeSupported = function(keyType) {
    // get any <video> element from the DOM or create one
    // and try the `canPlayType` method
    const video = doc.querySelector("video") || doc.createElement("video");
    if (video && video.canPlayType) {
      return !!video.canPlayType("video/mp4", keyType);
    } else {
      return false;
    }
  };

  requestMediaKeySystemAccess = function(keyType, keySystemConfigurations) {
    if (!isTypeSupported(keyType)) {
      return Observable.throw();
    }

    for (let i = 0; i < keySystemConfigurations.length; i++) {
      const keySystemConfiguration = keySystemConfigurations[i];
      const {
        videoCapabilities,
        audioCapabilities,
        initDataTypes,
        sessionTypes,
        distinctiveIdentifier,
        persistentState,
      } = keySystemConfiguration;

      let supported = true;
      supported = supported && (
        !initDataTypes ||
        !!initDataTypes.filter((initDataType) => initDataType === "cenc")[0]
      );
      supported = supported && (
        !sessionTypes ||
         sessionTypes.filter((sessionType) => sessionType === "temporary").length === sessionTypes.length
      );
      supported = supported && (distinctiveIdentifier !== "required");
      supported = supported && (persistentState !== "required");

      if (supported) {
        const keySystemConfigurationResponse = {
          videoCapabilities,
          audioCapabilities,
          initDataTypes: ["cenc"],
          distinctiveIdentifier: "not-allowed",
          persistentState: "not-allowed",
          sessionTypes: ["temporary"],
        };

        return Observable.of(
          new KeySystemAccess(keyType,
                              new MockMediaKeys(keyType),
                              keySystemConfigurationResponse)
        );
      }
    }

    return Observable.throw();
  };
}

// A MediaKeys object exist (or a mock) but no create function is
// available. We need to add recent apis using Promises to mock the
// most recent MediaKeys apis.
// This is for IE11
else if (MediaKeys_ && !requestMediaKeySystemAccess) {

  const SessionProxy = function(mk) {
    EventEmitter.call(this);
    this.sessionId = "";
    this._mk = mk;
  };

  SessionProxy.prototype = Object.assign({
    generateRequest: function(initDataType, initData) {
      this._ss = this._mk.memCreateSession("video/mp4", initData);
      this._con = merge(
        onKeyMessage(this._ss),
        onKeyAdded(this._ss),
        onKeyError(this._ss)
      ).subscribe((evt) => this.trigger(evt.type, evt));
    },

    update: wrapUpdate(function(license, sessionId) {
      assert(this._ss);
      this._ss.update(license, sessionId);
      this.sessionId = sessionId;
    }, function() {
      return this._ss;
    }),

    close: function() {
      if (this._ss) {
        this._ss.close();
        this._ss = null;
      }
      if (this._con) {
        this._con.unsubscribe();
        this._con = null;
      }
    },
  }, EventEmitter.prototype);

  // on IE11, each created session needs to be created on a new
  // MediaKeys object
  MediaKeys_.prototype.alwaysRenew = true;
  MediaKeys_.prototype.memCreateSession = MediaKeys_.prototype.createSession;
  MediaKeys_.prototype.createSession = function() {
    return new SessionProxy(this);
  };

  requestMediaKeySystemAccess = function(keyType, keySystemConfigurations) {
    if (!MediaKeys_.isTypeSupported(keyType)) {
      return Observable.throw();
    }

    for (let i = 0; i < keySystemConfigurations.length; i++) {
      const keySystemConfiguration = keySystemConfigurations[i];
      const {
        videoCapabilities,
        audioCapabilities,
        initDataTypes,
        distinctiveIdentifier,
      } = keySystemConfiguration;

      let supported = true;
      supported = supported && (!initDataTypes || !!initDataTypes.filter((idt) => idt === "cenc")[0]);
      supported = supported && (distinctiveIdentifier !== "required");

      if (supported) {
        const keySystemConfigurationResponse = {
          videoCapabilities,
          audioCapabilities,
          initDataTypes: ["cenc"],
          distinctiveIdentifier: "not-allowed",
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };

        return Observable.of(
          new KeySystemAccess(keyType,
                              new MediaKeys_(keyType),
                              keySystemConfigurationResponse)
        );
      }
    }

    return Observable.throw();
  };
}

if (!MediaKeys_) {
  const noMediaKeys = () => {
    throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", null, true);
  };

  MediaKeys_ = {
    create: noMediaKeys,
    isTypeSupported: noMediaKeys,
  };
}

function _setMediaKeys(elt, mk) {
  if (mk instanceof MockMediaKeys) {
    return mk._setVideo(elt);
  }

  if (elt.setMediaKeys) {
    return elt.setMediaKeys(mk);
  }

  if (mk === null) {
    return;
  }

  if (elt.WebkitSetMediaKeys) {
    return elt.WebkitSetMediaKeys(mk);
  }

  if (elt.mozSetMediaKeys) {
    return elt.mozSetMediaKeys(mk);
  }

  if (elt.msSetMediaKeys) {
    return elt.msSetMediaKeys(mk);
  }
}

const setMediaKeys = (elt, mk) => {
  return defer(() =>
    castToObservable(_setMediaKeys(elt, mk))
  );
};

if (win.WebKitSourceBuffer && !win.WebKitSourceBuffer.prototype.addEventListener) {

  const SourceBuffer = win.WebKitSourceBuffer;
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

function requestFullscreen(elt) {
  if (!isFullscreen()) {
    if (elt.requestFullscreen) {
      elt.requestFullscreen();
    } else if (elt.msRequestFullscreen) {
      elt.msRequestFullscreen();
    } else if (elt.mozRequestFullScreen) {
      elt.mozRequestFullScreen();
    } else if (elt.webkitRequestFullscreen) {
      elt.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  }
}

function exitFullscreen() {
  if (isFullscreen()) {
    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    }
  }
}

function isFullscreen() {
  return !!(
    doc.fullscreenElement ||
    doc.mozFullScreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement
  );
}

function visibilityChange() {
  let prefix;
  if (doc.hidden != null) {
    prefix = "";
  } else if (doc.mozHidden != null) {
    prefix = "moz";
  } else if (doc.msHidden != null) {
    prefix = "ms";
  } else if (doc.webkitHidden != null) {
    prefix = "webkit";
  }

  const hidden = prefix ? prefix + "Hidden" : "hidden";
  const visibilityChangeEvent = prefix + "visibilitychange";

  return on(doc, visibilityChangeEvent)
    .map(() => doc[hidden]);
}

function videoSizeChange() {
  return on(win, "resize");
}

function addTextTrack(video, hideNativeSubtitle) {
  let track, trackElement;
  const kind = "subtitles";
  if (isIE) {
    const tracksLength = video.textTracks.length;
    track = tracksLength > 0 ? video.textTracks[tracksLength - 1] : video.addTextTrack(kind);
    track.mode = hideNativeSubtitle ? track.HIDDEN : track.SHOWING;
  } else {
    // there is no removeTextTrack method... so we need to reuse old
    // text-tracks objects and clean all its pending cues
    trackElement = document.createElement("track");
    video.appendChild(trackElement);
    track = trackElement.track;
    trackElement.kind = kind;
    track.mode = hideNativeSubtitle ? "hidden" : "showing";
  }
  return { track, trackElement };
}

function isVTTSupported() {
  return !isIE;
}

function isPlaybackStuck(timing) {
  // firefox fix: sometimes, the stream can be stalled, even if we are in a buffer.
  const FREEZE_THRESHOLD = 10; // video freeze threshold in seconds
  return (
    isFirefox &&
    timing.name === "timeupdate" &&
    timing.range &&
    timing.range.end - timing.ts > FREEZE_THRESHOLD
  );
}

// On IE11, fullscreen change events is called MSFullscreenChange
const onFullscreenChange = compatibleListener(["fullscreenchange", "FullscreenChange"], PREFIXES.concat("MS"));

module.exports = {
  HTMLVideoElement_,
  MediaSource_,
  isCodecSupported,
  sourceOpen,
  canSeek,
  canPlay,

  KeySystemAccess,
  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents,
  shouldRenewMediaKeys,

  isFullscreen,
  onFullscreenChange,
  requestFullscreen,
  exitFullscreen,

  videoSizeChange,
  visibilityChange,

  addTextTrack,
  isVTTSupported,
  isPlaybackStuck,
  isIE,
  isFirefox,
};
