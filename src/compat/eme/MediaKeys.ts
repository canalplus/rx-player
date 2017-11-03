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
import { Subscription } from "rxjs/Subscription";

import EventEmitter from "../../utils/eventemitter";
import { bytesToStr, strToBytes } from "../../utils/bytes";
import assert from "../../utils/assert";
import castToObservable from "../../utils/castToObservable";

import {
  MediaKeys_,
} from "../constants";
import * as events from "../events";
import CustomMediaKeySystemAccess from "./keySystemAccess";

let requestMediaKeySystemAccess :
  (keyType : string, config : MediaKeySystemConfiguration[]) =>
  Observable<MediaKeySystemAccess|CustomMediaKeySystemAccess>;

// TODO Implement MediaKeySession completely
interface IMockMediaKeySession {
  readonly closed: Promise<void>;
  readonly expiration: number;
  readonly keyStatuses: MediaKeyStatusMap;
  readonly sessionId : string;
  close(): Promise<void>;
  generateRequest(initDataType: string, initData: any): Promise<void>;
  load(sessionId: string): Promise<boolean>;
  remove(): Promise<void>;
  update(response: any): Promise<void>;
  addEventListener(type: string, listener: () => {}, useCapture: boolean): void;
  removeEventListener(type: string, listener: EventListener, useCapture: boolean): void;
  dispatchEvent(evt: Event): boolean;
}

type IMediaKeySessionType = "temporary" | "persistent-license" | "persistent-release-message";

interface IMockMediaKeys {
  _setVideo(vid : HTMLMediaElement) : void;
  createSession(sessionType? : IMediaKeySessionType) : IMockMediaKeySession;
  setServerCertificate(setServerCertificate : any) : Promise<void>;
}
interface IMockMediaKeysConstructor {
  new(ks : string) : IMockMediaKeys;
}

// Default MockMediaKeys implementation
let MockMediaKeys : IMockMediaKeysConstructor =
  class implements IMockMediaKeys {
    constructor() {}
    _setVideo() : void {
      throw new Error("MediaKeys is not implemented in your browser");
    }
    createSession() : IMockMediaKeySession {
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
    (license : any, sessionId? : string) => Promise<void>;
  type memUpdateFn =
    (license : Uint8Array, sessionId : string) => void;

  // Wrap "MediaKeys.prototype.update" form an event based system to a
  // Promise based function.
  const wrapUpdate = (
    memUpdate : memUpdateFn
  ) : wrapUpdateFn => {
    class KeySessionError extends Error {
      public name : "KeySessionError";
      public mediaKeyError : any;
      public message : string;

      constructor(err : any = {}) {
        super();
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, KeySessionError.prototype);

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
    }

    return function(
      this : IMockMediaKeySession,
      license : any,
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

  // Browser without any MediaKeys object: A mock for MediaKey and
  // MediaKeySession are created, and the <video>.addKey api is used to
  // pass the license.
  //
  // This is for Chrome with unprefixed EME api
  // XXX TODO Add definition to webkitGenerateKeyRequest
  if (HTMLVideoElement.prototype.webkitGenerateKeyRequest) {

    // TODO implement MediaKeySession completely
    class MockMediaKeySession extends EventEmitter
      implements IMockMediaKeySession
    {
      public sessionId : string;
      public update : (
        license : any,
        sessionId? : string
      ) => Promise<void>;
      public closed: Promise<void>;
      readonly expiration: number;
      public keyStatuses: MediaKeyStatusMap;
      public dispatchEvent: (evt: Event) => boolean;
      public load: (sessionId: string) => Promise<boolean>;
      public remove: () => Promise<void>;

      private _vid : HTMLMediaElement;
      private _key : string;
      private _con : Subscription;

      constructor(video : HTMLMediaElement, keySystem : string) {
        super();
        this.sessionId = "";
        this._vid = video;
        this._key = keySystem;
        this._con = Observable.merge(
          events.onKeyMessage$(video),
          events.onKeyAdded$(video),
          events.onKeyError$(video)
        ).subscribe((evt : Event) => this.trigger(evt.type, evt));

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

      generateRequest(_initDataType : string, initData : any) : Promise<void> {
        return new Promise((resolve) => {
          if (typeof this._vid.webkitGenerateKeyRequest !== "function") {
            throw new Error("impossible to generate a key request");
          }
          this._vid.webkitGenerateKeyRequest(this._key, initData);
          resolve();
        });
      }

      close(): Promise<void> {
        return new Promise((resolve) => {
          if (this._con) {
            this._con.unsubscribe();
          }
          resolve();
        });
      }
    }

    MockMediaKeys = class implements IMockMediaKeys {
      private ks_ : string;
      private _vid? : HTMLMediaElement;

      constructor(keySystem : string) {
        this.ks_ = keySystem;
      }

      _setVideo(vid : HTMLMediaElement) : void {
        this._vid = vid;
      }

      createSession(/* sessionType */) : IMockMediaKeySession {
        if (!this._vid) {
          throw new Error("Video not attached to the MediaKeys");
        }
        return new MockMediaKeySession(this._vid, this.ks_);
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

  // A MediaKeys object exist (or a mock) but no create function is
  // available. We need to add recent apis using Promises to mock the
  // most recent MediaKeys apis.
  // This is for IE11
  else if (MediaKeys_) {

    interface IIE11MediaKeys {
      memCreateSession(codec : string, initData : ArrayBuffer) :
        MediaKeySession;
    }

    // TODO implement MediaKeySession completely
    class SessionProxy extends EventEmitter implements IMockMediaKeySession {
      public sessionId : string;
      public update : (
        license : any,
        sessionId? : string
      ) => Promise<void>;
      public load: (sessionId: string) => Promise<boolean>;
      public remove: () => Promise<void>;
      public closed: Promise<void>;
      readonly expiration: number;
      public keyStatuses: MediaKeyStatusMap;
      public dispatchEvent: (evt: Event) => boolean;

      private _mk : IIE11MediaKeys;
      private _ss? : MediaKeySession;
      private _con? : Subscription;

      constructor(mk : IIE11MediaKeys) {
        super();
        this.sessionId = "";
        this._mk = mk;

        this.update = wrapUpdate((license, sessionId) => {
          assert(this._ss);
          (this._ss as any).update(license, sessionId);
          this.sessionId = sessionId;
        });
      }

      generateRequest(_initDataType : string, initData : ArrayBuffer) : Promise<void> {
        return new Promise((resolve) => {
          this._ss = this._mk.memCreateSession("video/mp4", initData);
          this._con = Observable.merge(
            events.onKeyMessage$(this._ss),
            events.onKeyAdded$(this._ss),
            events.onKeyError$(this._ss)
          ).subscribe((evt : Event) => this.trigger(evt.type, evt));
          resolve();
        });
      }

      close(): Promise<void> {
        return new Promise((resolve) => {
          if (this._ss) {
            this._ss.close();
            this._ss = undefined;
          }
          if (this._con) {
            this._con.unsubscribe();
            this._con = undefined;
          }
          resolve();
        });
      }
    }

    // Add empty prototype for some IE targets which do not set one and just
    // throws in the following lines
    if (!MediaKeys.prototype) {
      (MediaKeys as any).prototype = {};
    }

    // on IE11, each created session needs to be created on a new
    // MediaKeys object
    MediaKeys_.prototype.alwaysRenew = true;
    MediaKeys_.prototype.memCreateSession = MediaKeys_.prototype.createSession;
    MediaKeys_.prototype.createSession = function() : SessionProxy {
      return new SessionProxy(this as IIE11MediaKeys);
    };

    requestMediaKeySystemAccess = function(
      keyType : string,
      keySystemConfigurations : MediaKeySystemConfiguration[]
    ) : Observable<MediaKeySystemAccess|CustomMediaKeySystemAccess> {
      // TODO Authorize isTypeSupported for IE?
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
              new (MediaKeys as any)(keyType),
              keySystemConfigurationResponse
            )
          );
        }
      }

      return Observable.throw(undefined);
    };
  } else {
    requestMediaKeySystemAccess = () => {
      throw new Error("requestMediaKeySystemAccess is not implemented in your browser.");
    };
  }
}

export {
  IMockMediaKeys,
  MockMediaKeys,
  requestMediaKeySystemAccess,
};
