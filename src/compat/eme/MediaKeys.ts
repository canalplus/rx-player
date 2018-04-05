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
import { Subject } from "rxjs/Subject";
import {
  bytesToStr,
  strToBytes,
} from "../../utils/bytes";
import castToObservable from "../../utils/castToObservable";
import EventEmitter from "../../utils/eventemitter";
import {
  MediaKeys_,
} from "../constants";
import * as events from "../events";
import CustomMediaKeySystemAccess from "./keySystemAccess";

let requestMediaKeySystemAccess :
(
  (keyType : string, config : MediaKeySystemConfiguration[]) =>
    Observable<MediaKeySystemAccess|CustomMediaKeySystemAccess>
) | null;

type MEDIA_KEY_SESSION_EVENTS =
  string;
  // "keymessage" |
  // "message" |
  // "keyadded" |
  // "ready" |
  // "keyerror" |
  // "error";

export interface IMediaKeySession
  extends EventEmitter<MEDIA_KEY_SESSION_EVENTS, MediaKeyMessageEvent|Event>
{
  // Attributes
  readonly sessionId : string;
  readonly expiration: number;
  readonly closed: Promise<void>;
  readonly keyStatuses: MediaKeyStatusMap;

  // Event handlers
  onmessage? : (message : MediaKeyMessageEvent) => void;
  onkeystatusesChange? : (evt : Event) => void;

  // Functions
  generateRequest(initDataType: string, initData: BufferSource) : Promise<void>;
  load(sessionId: string) : Promise<boolean>;
  update(response: BufferSource) : Promise<void>;
  close() : Promise<void>;
  remove() : Promise<void>;
}

interface IMockMediaKeys {
  _setVideo : (vid : HTMLMediaElement) => void;
  createSession : (sessionType? : MediaKeySessionType) => IMediaKeySession;
  setServerCertificate : (
    setServerCertificate : BufferSource
  ) => Promise<void>;
}

interface IMockMediaKeysConstructor {
  new(ks : string) : IMockMediaKeys;
}

// XXX TODO Put that were the following comment is:
// ```js
// // XXX TODO Put wrapUpdate here
// ```
// This was put here because of:
// https://github.com/Microsoft/TypeScript/issues/20104
// ---------------------------------------------------------------
type wrapUpdateFn =
  (license : ArrayBuffer, sessionId? : string) => Promise<void>;
type memUpdateFn =
  (license : Uint8Array, sessionId : string) => void;

// Wrap "MediaKeys.prototype.update" form an event based system to a
// Promise based function.
const wrapUpdate = (
  memUpdate : memUpdateFn
) : wrapUpdateFn => {
  return function(
    this : IMediaKeySession,
    license : ArrayBuffer,
    sessionId? : string
  ) : Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        memUpdate.call(this, license, sessionId);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  };
};
// ---------------------------------------------------------------
// End of the limitation

// XXX TODO Put that after the:
// ```js
// if (HTMLVideoElement.prototype.webkitGenerateKeyRequest) {
// ```
// line. This was put here because of:
// https://github.com/Microsoft/TypeScript/issues/20104
// ---------------------------------------------------------------

class WebkitMediaKeySession
  extends EventEmitter<MEDIA_KEY_SESSION_EVENTS, MediaKeyMessageEvent|Event>
  implements IMediaKeySession
{
  public sessionId : string;
  public closed: Promise<void>;
  public readonly expiration: number;
  public keyStatuses: MediaKeyStatusMap;
  public update : (
    license : ArrayBuffer,
    sessionId? : string
  ) => Promise<void>;

  private _vid : HTMLMediaElement;
  private _key : string;
  private _closeSession$ : Subject<void>;

  constructor(video : HTMLMediaElement, keySystem : string) {
    super();
    this._closeSession$ = new Subject();
    this._vid = video;
    this._key = keySystem;

    this.sessionId = "";
    this.closed = new Promise((resolve) => {
      this._closeSession$.subscribe(resolve);
    });
    this.keyStatuses = new Map();
    this.expiration = NaN;
    Observable.merge(
      events.onKeyMessage$(video),
      events.onKeyAdded$(video),
      events.onKeyError$(video)
    )
      .takeUntil(this._closeSession$)
      .subscribe((evt : Event) => this.trigger(evt.type, evt));

    this.update = wrapUpdate((license, sessionId?) => {
      if (this._key.indexOf("clearkey") >= 0) {
        const json = JSON.parse(bytesToStr(license));
        const key = strToBytes(atob(json.keys[0].k));
        const kid = strToBytes(atob(json.keys[0].kid));
        (this._vid as any).webkitAddKey(this._key, key, kid, sessionId);
      } else {
        (this._vid as any).webkitAddKey(this._key, license, null, sessionId);
      }
      this.sessionId = sessionId;
    });
  }

  generateRequest(_initDataType : string, initData : ArrayBuffer) : Promise<void> {
    return new Promise((resolve) => {
      if (typeof this._vid.webkitGenerateKeyRequest !== "function") {
        throw new Error("impossible to generate a key request");
      }
      this._vid.webkitGenerateKeyRequest(this._key, initData);
      resolve();
    });
  }

  close() : Promise<void> {
    return new Promise((resolve) => {
      this._closeSession$.next();
      this._closeSession$.complete();
      resolve();
    });
  }

  load() : Promise<boolean> {
    return new Promise((resolve) => {
      resolve(false);
    });
  }

  remove() : Promise<void> {
    return new Promise((resolve) => {
      resolve();
    });
  }
}
// ---------------------------------------------------------------
// End of the limitation

// XXX TODO Put that were the following comment is:
// ```js
// // XXX TODO Put IE11MediaKeySession here
// ```
// This was put here because of:
// https://github.com/Microsoft/TypeScript/issues/20104
// ---------------------------------------------------------------
interface IIE11MediaKeys {
  memCreateSession(codec : string, initData : ArrayBuffer) : MediaKeySession;
}

// TODO implement MediaKeySession completely
class IE11MediaKeySession
  extends EventEmitter<MEDIA_KEY_SESSION_EVENTS, MediaKeyMessageEvent|Event>
  implements IMediaKeySession
{
  public sessionId : string;
  public update : (
    license : ArrayBuffer,
    sessionId? : string
  ) => Promise<void>;
  public closed: Promise<void>;
  readonly expiration: number;
  public keyStatuses: MediaKeyStatusMap;

  private _mk : IIE11MediaKeys;
  private _ss? : MediaKeySession;
  private _closeSession$ : Subject<void>;

  constructor(mk : IIE11MediaKeys) {
    super();
    this.sessionId = "";
    this.expiration = NaN;
    this.keyStatuses = new Map();
    this._mk = mk;
    this._closeSession$ = new Subject();
    this.closed = new Promise((resolve) => {
      this._closeSession$.subscribe(resolve);
    });

    this.update = wrapUpdate((license, sessionId) => {
      if (!this._ss) {
        throw new Error("MediaKeySession not set");
      }
      (this._ss as any).update(license, sessionId);
      this.sessionId = sessionId;
    });
  }

  generateRequest(_initDataType : string, initData : ArrayBuffer) : Promise<void> {
    return new Promise((resolve) => {
      this._ss = this._mk.memCreateSession("video/mp4", initData);
      Observable.merge(
        events.onKeyMessage$(this._ss),
        events.onKeyAdded$(this._ss),
        events.onKeyError$(this._ss)
      )
        .takeUntil(this._closeSession$)
        .subscribe((evt : Event) => this.trigger(evt.type, evt));
      resolve();
    });
  }

  close() : Promise<void> {
    return new Promise((resolve) => {
      if (this._ss) {
        /* tslint:disable no-floating-promises */
        this._ss.close();
        /* tslint:enable no-floating-promises */
        this._ss = undefined;
      }
      this._closeSession$.next();
      this._closeSession$.complete();
      resolve();
    });
  }

  load() : Promise<boolean> {
    return new Promise((resolve) => {
      resolve(false);
    });
  }

  remove() : Promise<void> {
    return new Promise((resolve) => {
      resolve();
    });
  }
}
// ---------------------------------------------------------------
// End of the limitation

// Default MockMediaKeys implementation
let MockMediaKeys : IMockMediaKeysConstructor =
  class implements IMockMediaKeys {
    _setVideo() : void {
      throw new Error("MediaKeys is not implemented in your browser");
    }
    createSession() : IMediaKeySession {
      throw new Error("MediaKeys is not implemented in your browser");
    }
    setServerCertificate() : Promise<void> {
      throw new Error("MediaKeys is not implemented in your browser");
    }
  };

if (navigator.requestMediaKeySystemAccess) {
  requestMediaKeySystemAccess = (a : string, b : MediaKeySystemConfiguration[]) =>
    castToObservable(navigator.requestMediaKeySystemAccess(a, b));
} else {

  // XXX TODO Put wrapUpdate here

  // This is for Chrome with unprefixed EME api
  if (HTMLVideoElement.prototype.webkitGenerateKeyRequest) {

    MockMediaKeys = class implements IMockMediaKeys {
      private ks_ : string;
      private _vid? : HTMLMediaElement;

      constructor(keySystem : string) {
        this.ks_ = keySystem;
      }

      _setVideo(vid : HTMLMediaElement) : void {
        this._vid = vid;
      }

      createSession(/* sessionType */) : IMediaKeySession {
        if (!this._vid) {
          throw new Error("Video not attached to the MediaKeys");
        }
        return new WebkitMediaKeySession(this._vid, this.ks_);
      }

      setServerCertificate() : Promise<void> {
        throw new Error("Server certificate is not implemented in your browser");
      }
    };

    const isTypeSupported = function(keyType : string) : boolean {
      // get any <video> element from the DOM or create one
      // and try the `canPlayType` method
      const video = document.querySelector("video") ||
        document.createElement("video");
      if (video && video.canPlayType) {
        return !!(video as any).canPlayType("video/mp4", keyType);
      } else {
        return false;
      }
    };

    requestMediaKeySystemAccess = function(
      keyType : string,
      keySystemConfigurations : MediaKeySystemConfiguration[]
    ) : Observable<CustomMediaKeySystemAccess> {
      if (!isTypeSupported(keyType)) {
        return Observable.throw(undefined);
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
            .filter((sessionType) => sessionType === "temporary")
            .length === sessionTypes.length
        );
        supported = supported && (distinctiveIdentifier !== "required");
        supported = supported && (persistentState !== "required");

        if (supported) {
          const keySystemConfigurationResponse = {
            videoCapabilities,
            audioCapabilities,
            initDataTypes: ["cenc"],
            sessionTypes: ["temporary"],

            // TODO TypesScript bug or what? Check and open an issue
            distinctiveIdentifier: "not-allowed" as "not-allowed",
            persistentState: "not-allowed" as "not-allowed",
          };

          return Observable.of(
            new CustomMediaKeySystemAccess(
              keyType,
              new MockMediaKeys(keyType),
              keySystemConfigurationResponse
            )
          );
        }
      }

      return Observable.throw(undefined);
    };
  }

  // This is for IE11
  else if (
    MediaKeys_ &&
    MediaKeys_.prototype &&
    typeof MediaKeys_.prototype.createSession === "function" &&
    typeof MediaKeys_.isTypeSupported === "function"
  ) {
    // XXX TODO Put IE11MediaKeySession here

    // on IE11, each created session needs to be created on a new
    // MediaKeys object
    MediaKeys_.prototype.alwaysRenew = true;
    MediaKeys_.prototype.memCreateSession = MediaKeys_.prototype.createSession;
    MediaKeys_.prototype.createSession = function() : IE11MediaKeySession {
      /* tslint:disable no-invalid-this */
      return new IE11MediaKeySession(this);
      /* tslint:enable no-invalid-this */
    };

    requestMediaKeySystemAccess = function(
      keyType : string,
      keySystemConfigurations : MediaKeySystemConfiguration[]
    ) : Observable<MediaKeySystemAccess|CustomMediaKeySystemAccess> {
      // TODO Why TS Do not understand that isTypeSupported exists here?
      if (!(MediaKeys_ as any).isTypeSupported(keyType)) {
        return Observable.throw(undefined);
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
            distinctiveIdentifier: "not-allowed" as "not-allowed",
            persistentState: "required" as "required",
            sessionTypes: ["temporary", "persistent-license"],
          };

          return Observable.of(
            new CustomMediaKeySystemAccess(
              keyType,

              // TODO Authorize 1 argument for IE?
              new (MediaKeys_ as any)(keyType),
              keySystemConfigurationResponse
            )
          );
        }
      }

      return Observable.throw(undefined);
    };
  } else {
    requestMediaKeySystemAccess = null;
  }
}

export {
  IMockMediaKeys,
  MockMediaKeys,
  requestMediaKeySystemAccess,
};
