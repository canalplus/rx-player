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

var _ = require("canal-js-utils/misc");
var log = require("canal-js-utils/log");
var Promise_ = require("canal-js-utils/promise");
var EventEmitter = require("canal-js-utils/eventemitter");
var { bytesToStr, strToBytes } = require("canal-js-utils/bytes");
var assert = require("canal-js-utils/assert");
var { Observable } = require("canal-js-utils/rx");
var { merge, never, fromEvent, just } = Observable;
var { on } = require("canal-js-utils/rx-ext");

var doc = document;
var win = window;

var PREFIXES = ["", "webkit", "moz", "ms"];

var HTMLElement_      = win.HTMLElement;
var HTMLVideoElement_ = win.HTMLVideoElement;

var MediaSource_ = (
  win.MediaSource ||
  win.MozMediaSource ||
  win.WebKitMediaSource ||
  win.MSMediaSource);

var MediaKeys_ = (
  win.MediaKeys ||
  win.MozMediaKeys ||
  win.WebKitMediaKeys ||
  win.MSMediaKeys);

var isIE = (
  navigator.appName == "Microsoft Internet Explorer" ||
  navigator.appName == "Netscape" && /Trident\//.test(navigator.userAgent)
);

var MockMediaKeys = _.noop;

var requestMediaKeySystemAccess;
if (navigator.requestMediaKeySystemAccess)
  requestMediaKeySystemAccess = (a, b) => navigator.requestMediaKeySystemAccess(a, b);

function castToPromise(prom) {
  if (prom && typeof prom.then == "function") {
    return prom;
  } else {
    return Promise_.resolve(prom);
  }
}

function wrap(fn) {
  return function() {
    var retValue;
    try {
      retValue = fn.apply(this, arguments);
    } catch(error) {
      return Promise_.reject(error);
    }
    return castToPromise(retValue);
  };
}

function isEventSupported(element, eventNameSuffix) {
  var clone = document.createElement(element.tagName);
  var eventName = "on" + eventNameSuffix;
  if (eventName in clone) {
    return true;
  } else {
    clone.setAttribute(eventName, "return;");
    return _.isFunction(clone[eventName]);
  }
}

function eventPrefixed(eventNames, prefixes) {
  return _.flatten(eventNames, (name) => _.map(prefixes || PREFIXES, p => p + name));
}

function findSupportedEvent(element, eventNames) {
  return _.find(eventNames, name => isEventSupported(element, name));
}

function compatibleListener(eventNames, prefixes) {
  var mem;
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
          log.warn(`compat: element <${element.tagName}> does not support any of these events: ${eventNames.join(", ")}`);
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

// On IE11, we use the "progress" instead of "loadedmetadata" to set
// the "currentTime.
//
// Internet Explorer emits an error when setting the "currentTime"
// before a "progress" event sent just after the "loadedmetadata"
// after receiving the first init-segments. Other browsers do not
// even send this "progress" before receiving the first data-segment.
//
// TODO(pierre): try to find a solution without "browser sniffing"...
var loadedMetadataEvent = compatibleListener(isIE ? ["progress"] : ["loadedmetadata"]);
var sourceOpenEvent = compatibleListener(["sourceopen", "webkitsourceopen"]);
var onEncrypted = compatibleListener(["encrypted", "needkey"]);
var onKeyMessage = compatibleListener(["keymessage", "message"]);
var onKeyAdded = compatibleListener(["keyadded", "ready"]);
var onKeyError = compatibleListener(["keyerror", "error"]);
var onKeyStatusesChange = compatibleListener(["keystatuseschange"]);
var emeEvents = {
  onEncrypted,
  onKeyMessage,
  onKeyStatusesChange,
  onKeyError,
};

function sourceOpen(mediaSource) {
  if (mediaSource.readyState == "open")
    return just();
  else
    return sourceOpenEvent(mediaSource).take(1);
}

// Wrap "MediaKeys.prototype.update" form an event based system to a
// Promise based function.
function wrapUpdateWithPromise(memUpdate, sessionObj) {

  function KeySessionError(err={}) {
    if (err.errorCode) {
      err = {
        systemCode: err.systemCode,
        code: err.errorCode.code
      };
    }
    this.name = "KeySessionError";
    this.mediaKeyError = err;
    this.message = `MediaKeyError code:${err.code} and systemCode:${err.systemCode}`;
  }
  KeySessionError.prototype = new Error();

  return function(license, sessionId) {
    var session = _.isFunction(sessionObj)
      ? sessionObj.call(this)
      : this;

    var keys = onKeyAdded(session);
    var errs = onKeyError(session).map(evt => { throw new KeySessionError(session.error || evt); });
    try {
      memUpdate.call(this, license, sessionId);
      return merge(keys, errs).take(1).toPromise();
    } catch(e) {
      return Promise_.reject(e);
    }
  };
}

// Browser without any MediaKeys object: A mock for MediaKey and
// MediaKeySession are created, and the <video>.addKey api is used to
// pass the license.
// This is for Chrome with unprefixed EME api
if (!requestMediaKeySystemAccess && HTMLVideoElement_.prototype.webkitGenerateKeyRequest) {

  // Mock MediaKeySession interface for old chrome implementation
  // of the EME specifications
  var MockMediaKeySession = function(video, keySystem) {
    EventEmitter.call(this);

    this._vid = video;
    this._key = keySystem;
    this._con = merge(
      onKeyMessage(video),
      onKeyAdded(video),
      onKeyError(video)
    ).subscribe(evt => this.trigger(evt.type, evt));
  };
  MockMediaKeySession.prototype = _.extend({}, EventEmitter.prototype, {
    generateRequest: wrap(function (initDataType, initData) {
      this._vid.webkitGenerateKeyRequest(this._key, initData);
    }),
    update: wrapUpdateWithPromise(function (license, sessionId) {
      if (this._key.indexOf("clearkey") >= 0) {
        var json = JSON.parse(bytesToStr(license));
        var key = strToBytes(atob(json.keys[0].k));
        var kid = strToBytes(atob(json.keys[0].kid));
        this._vid.webkitAddKey(this._key, key, kid, sessionId);
      } else {
        this._vid.webkitAddKey(this._key, license, null, sessionId);
      }
    }),
    close: wrap(function() {
      if (this._con)
        this._con.dispose();
      this._con = null;
      this._vid = null;
    }),
  });

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

  var isTypeSupported = function(keyType) {
    // get any <video> element from the DOM or create one
    // and try the `canPlayType` method
    var video = doc.querySelector("video") || doc.createElement("video");
    if (video && video.canPlayType) {
      return !!video.canPlayType("video/mp4", keyType);
    } else {
      return false;
    }
  };

  requestMediaKeySystemAccess = function(keyType) {
    if (!isTypeSupported(keyType))
      return Promise_.reject();

    return Promise_.resolve({
      createMediaKeys() {
        return Promise_.resolve(new MockMediaKeys(keyType));
      }
    });
  };
}

// A MediaKeys object exist (or a mock) but no create function is
// available. We need to add recent apis using Promises to mock the
// most recent MediaKeys apis.
// This is for IE11
else if (MediaKeys_ && !requestMediaKeySystemAccess) {

  var SessionProxy = function(mk) {
    EventEmitter.call(this);
    this._mk = mk;
  };

  SessionProxy.prototype = _.extend(EventEmitter.prototype, {
    generateRequest: wrap(function(initDataType, initData) {
      this._ss = this._mk.memCreateSession("video/mp4", initData);
      this._con = merge(
        onKeyMessage(this._ss),
        onKeyAdded(this._ss),
        onKeyError(this._ss)
      ).subscribe(evt => this.trigger(evt.type, evt));
    }),
    update: wrapUpdateWithPromise(function(license, sessionId) {
      assert(this._ss);
      this._ss.update(license, sessionId);
    }, function() {
      return this._ss;
    }),
    close: wrap(function() {
      if (this._ss) {
        this._ss.close();
        this._ss = null;
        this._con.dispose();
        this._con = null;
      }
    }),
  });

  // on IE11, each created session needs to be created on a new
  // MediaKeys object
  MediaKeys_.prototype.alwaysRenew = true;
  MediaKeys_.prototype.memCreateSession = MediaKeys_.prototype.createSession;
  MediaKeys_.prototype.createSession = function() {
    return new SessionProxy(this);
  };

  requestMediaKeySystemAccess = function(keyType) {
    if (!MediaKeys_.isTypeSupported(keyType))
      return Promise_.reject();

    return Promise_.resolve({
      createMediaKeys() {
        return Promise_.resolve(new MediaKeys_(keyType));
      }
    });
  };
}

if (!MediaKeys_) {
  var noMediaKeys = () => { throw new Error("eme: MediaKeys is not available"); };

  MediaKeys_ = {
    create: noMediaKeys,
    isTypeSupported: noMediaKeys,
  };
}

function _setMediaKeys(elt, mk) {
  if (mk instanceof MockMediaKeys) return mk._setVideo(elt);
  if (elt.setMediaKeys)
    return elt.setMediaKeys(mk);

  if (mk === null)
    return;

  if (elt.WebkitSetMediaKeys)
    return elt.WebkitSetMediaKeys(mk);

  if (elt.mozSetMediaKeys)
    return elt.mozSetMediaKeys(mk);

  // IE11 requires that the video has received metadata
  // (readyState>=1) before setting metadata.
  //
  // TODO: how to handle dispose properly ?
  if (elt.msSetMediaKeys) {
    return new Promise_((res, rej) => {
      if (elt.readyState >= 1) {
        elt.msSetMediaKeys(mk);
        res();
      } else {
        elt.addEventListener("loadedmetatdata", () => {
          try {
            elt.msSetMediaKeys(mk);
          } catch(e) {
            return rej(e);
          } finally {
            elt.removeEventListener("loadedmetatdata");
          }
          res();
        });
      }
    });
  }

  throw new Error("compat: cannot find setMediaKeys method");
}

var setMediaKeys = (elt, mk) => {
  return castToPromise(_setMediaKeys(elt, mk));
};

if (win.WebKitSourceBuffer && !win.WebKitSourceBuffer.prototype.addEventListener) {

  var SourceBuffer = win.WebKitSourceBuffer;
  var SBProto = SourceBuffer.prototype;

  _.extend(SBProto, EventEmitter.prototype);
  SBProto.__listeners = [];

  SBProto.appendBuffer = function(data) {
    if (this.updating) throw new Error("SourceBuffer updating");
    this.trigger("updatestart");
    this.updating = true;
    try {
      this.append(data);
    } catch(err) {
      this.__emitUpdate("error", err);
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
  if (isFullscreen()) return;
  if (elt.requestFullscreen)       return elt.requestFullscreen();
  if (elt.msRequestFullscreen)     return elt.msRequestFullscreen();
  if (elt.mozRequestFullScreen)    return elt.mozRequestFullScreen();
  if (elt.webkitRequestFullscreen) return elt.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
}

function exitFullscreen() {
  if (!isFullscreen()) return;
  if (doc.exitFullscreen)       return doc.exitFullscreen();
  if (doc.msExitFullscreen)     return doc.msExitFullscreen();
  if (doc.mozCancelFullScreen)  return doc.mozCancelFullScreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
}

function isFullscreen() {
  return !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
}

function visibilityChange() {
  var prefix;
  if (doc.hidden != null)            prefix = "";
  else if (doc.mozHidden != null)    prefix = "moz";
  else if (doc.msHidden != null)     prefix = "ms";
  else if (doc.webkitHidden != null) prefix = "webkit";

  var hidden = prefix ? prefix + "Hidden" : "hidden";
  var visibilityChangeEvent = prefix + "visibilitychange";

  return on(doc, visibilityChangeEvent)
    .map(() => doc[hidden]);
}

function videoSizeChange() {
  return on(win, "resize");
}

// On IE11, fullscreen change events is called MSFullscreenChange
var onFullscreenChange = compatibleListener(["fullscreenchange", "FullscreenChange"], PREFIXES.concat("MS"));

module.exports = {
  HTMLVideoElement_,
  MediaSource_,
  isCodecSupported,
  sourceOpen,
  loadedMetadataEvent,

  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents,

  isFullscreen,
  onFullscreenChange,
  requestFullscreen,
  exitFullscreen,

  videoSizeChange,
  visibilityChange,
};
