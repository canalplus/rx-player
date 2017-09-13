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

import objectAssign from "object-assign";
import { Observable } from "rxjs/Observable";

import EventEmitter from "../../utils/eventemitter";
import { bytesToStr, strToBytes } from "../../utils/bytes";
import assert from "../../utils/assert";
import castToObservable from "../../utils/castToObservable.js";

import {
  HTMLVideoElement_,
  MediaKeys_,
} from "../constants.js";
import * as events from "../events.js";
import KeySystemAccess from "./keySystemAccess.js";

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
    this.message =
      `MediaKeyError code:${err.code} and systemCode:${err.systemCode}`;
  }
  KeySessionError.prototype = new Error();

  return function(license, sessionId) {
    const session = typeof sessionObj == "function"
      ? sessionObj.call(this)
      : this;

    const keys = events.onKeyAdded(session);
    const errs = events.onKeyError(session).map((evt) => {
      throw new KeySessionError(session.error || evt);
    });

    try {
      memUpdate.call(this, license, sessionId);
      return Observable.merge(keys, errs).take(1);
    } catch(e) {
      return Observable.throw(e);
    }
  };
}

let requestMediaKeySystemAccess;
if (navigator.requestMediaKeySystemAccess) {
  requestMediaKeySystemAccess = (a, b) =>
    castToObservable(navigator.requestMediaKeySystemAccess(a, b));
}

let MockMediaKeys = function() {
};

// Browser without any MediaKeys object: A mock for MediaKey and
// MediaKeySession are created, and the <video>.addKey api is used to
// pass the license.
//
// This is for Chrome with unprefixed EME api
if (
  !requestMediaKeySystemAccess &&
  HTMLVideoElement_.prototype.webkitGenerateKeyRequest
) {
  // Mock MediaKeySession interface for old chrome implementation
  // of the EME specifications
  const MockMediaKeySession = function(video, keySystem) {
    EventEmitter.call(this);

    this.sessionId = "";
    this._vid = video;
    this._key = keySystem;
    this._con = Observable.merge(
      events.onKeyMessage(video),
      events.onKeyAdded(video),
      events.onKeyError(video)
    ).subscribe((evt) => this.trigger(evt.type, evt));
  };

  MockMediaKeySession.prototype = objectAssign({
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
    const video = document.querySelector("video") ||
      document.createElement("video");
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
        sessionTypes
          .filter((sessionType) => sessionType === "temporary").length ===
            sessionTypes.length
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

  SessionProxy.prototype = objectAssign({
    generateRequest: function(initDataType, initData) {
      this._ss = this._mk.memCreateSession("video/mp4", initData);
      this._con = Observable.merge(
        events.onKeyMessage(this._ss),
        events.onKeyAdded(this._ss),
        events.onKeyError(this._ss)
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
      supported = supported && (!initDataTypes ||
        !!initDataTypes.filter((idt) => idt === "cenc")[0]);
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

export {
  MockMediaKeys,
  requestMediaKeySystemAccess,
};
