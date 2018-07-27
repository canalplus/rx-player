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

import {
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
  throwError as observableThrow,
} from "rxjs";
import { takeUntil } from "rxjs/operators";
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

type TypedArray =
  Int8Array |
  Int16Array |
  Int32Array |
  Uint8Array |
  Uint16Array |
  Uint32Array |
  Uint8ClampedArray |
  Float32Array |
  Float64Array;

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
  readonly closed: Promise<void>;
  expiration: number;
  keyStatuses: MediaKeyStatusMap;
  sessionId : string;

  // Event handlers
  onmessage? : (message : MediaKeyMessageEvent) => void;
  onkeystatusesChange? : (evt : Event) => void;

  // Functions
  generateRequest(
    initDataType: string,
    initData: ArrayBuffer | TypedArray | DataView | null
  ): Promise<void>;
  load(sessionId: string) : Promise<boolean>;
  update(response: ArrayBuffer | TypedArray | DataView | null): Promise<void>;
  close() : Promise<void>;
  remove() : Promise<void>;
}

export interface IMockMediaKeys {
  _setVideo : (vid : HTMLMediaElement) => void;
  createSession(sessionType? : MediaKeySessionType) : IMediaKeySession;
  setServerCertificate(setServerCertificate : ArrayBuffer|TypedArray) : Promise<void>;
}

interface IMockMediaKeysConstructor {
  new(ks : string) : IMockMediaKeys;
}

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

  // This is for Chrome with unprefixed EME api
  if (HTMLVideoElement.prototype.webkitGenerateKeyRequest) {

    class WebkitMediaKeySession
    extends EventEmitter<MEDIA_KEY_SESSION_EVENTS, MediaKeyMessageEvent|Event>
      implements IMediaKeySession
    {
      public readonly update : (
        license : ArrayBuffer,
        sessionId? : string
      ) => Promise<void>;
      public readonly closed: Promise<void>;
      public expiration: number;
      public keyStatuses: MediaKeyStatusMap;
      public sessionId : string;

      private readonly _vid : HTMLMediaElement;
      private readonly _key : string;
      private readonly _closeSession$ : Subject<void>;

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
        observableMerge(
          events.onKeyMessage$(video),
          events.onKeyAdded$(video),
          events.onKeyError$(video)
        )
          .pipe(takeUntil(this._closeSession$))
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
        return Promise.resolve(false);
      }

      remove() : Promise<void> {
        return Promise.resolve();
      }
    }

    MockMediaKeys = class implements IMockMediaKeys {
      private readonly ks_ : string;
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
        return observableThrow(undefined);
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

          return observableOf(
            new CustomMediaKeySystemAccess(
              keyType,
              new MockMediaKeys(keyType),
              keySystemConfigurationResponse
            )
          );
        }
      }

      return observableThrow(undefined);
    };
  }

  // This is for IE11
  else if (
    MediaKeys_ &&
    MediaKeys_.prototype &&
    typeof MediaKeys_.prototype.createSession === "function" &&
    typeof MediaKeys_.isTypeSupported === "function"
  ) {
    interface IIE11MediaKeys {
      memCreateSession(codec : string, initData : ArrayBuffer) : MediaKeySession;
    }

    // TODO implement MediaKeySession completely
    class IE11MediaKeySession
    extends EventEmitter<MEDIA_KEY_SESSION_EVENTS, MediaKeyMessageEvent|Event>
      implements IMediaKeySession
    {
      public readonly update : (
        license : ArrayBuffer,
        sessionId? : string
      ) => Promise<void>;
      public readonly closed: Promise<void>;
      public expiration: number;
      public keyStatuses: MediaKeyStatusMap;
      public sessionId : string;

      private readonly _mk : IIE11MediaKeys;
      private readonly _closeSession$ : Subject<void>;
      private _ss? : MediaKeySession;

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
          observableMerge(
            events.onKeyMessage$(this._ss),
            events.onKeyAdded$(this._ss),
            events.onKeyError$(this._ss)
          )
            .pipe(takeUntil(this._closeSession$))
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
        return Promise.resolve(false);
      }

      remove() : Promise<void> {
        return Promise.resolve();
      }
    }

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
        return observableThrow(undefined);
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

          return observableOf(
            new CustomMediaKeySystemAccess(
              keyType,

              // TODO Authorize 1 argument for IE?
              new (MediaKeys_ as any)(keyType),
              keySystemConfigurationResponse
            )
          );
        }
      }

      return observableThrow(undefined);
    };
  } else {
    requestMediaKeySystemAccess = null;
  }
}

export {
  MockMediaKeys,
  requestMediaKeySystemAccess,
};
