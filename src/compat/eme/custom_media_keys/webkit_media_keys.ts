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
  Subject,
} from "rxjs";
import { takeUntil } from "rxjs/operators";
import EventEmitter from "../../../utils/event_emitter";
import PPromise from "../../../utils/promise";
import * as events from "../../event_listeners";
import getWebKitFairplayInitData from "../get_webkit_fairplay_initdata";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
  ICustomMediaKeyStatusMap,
  IMediaKeySessionEvents,
} from "./types";
import {
  IWebKitMediaKeys,
  WebKitMediaKeysConstructor,
} from "./webkit_media_keys_constructor";

export interface ICustomWebKitMediaKeys {
  _setVideo: (videoElement: HTMLMediaElement) => void;
  createSession(mimeType: string, initData: Uint8Array): ICustomMediaKeySession;
  setServerCertificate(setServerCertificate: BufferSource): Promise<void>;
}

/**
 * Check if keyType is for fairplay DRM
 * @param {string} keyType
 * @returns {boolean}
 */
function isFairplayKeyType(keyType: string): boolean {
  return keyType === "com.apple.fps.1_0" ||
         keyType === "com.apple.fps.2_0";
}

/**
 * Set media keys on video element using native HTMLMediaElement
 * setMediaKeys from WebKit.
 * @param {HTMLMediaElement} videoElement
 * @param {Object|null} mediaKeys
 */
function setWebKitMediaKeys(videoElement: HTMLMediaElement,
                            mediaKeys: IWebKitMediaKeys|null): void {
  /* tslint:disable no-unsafe-any */
  if ((videoElement as any).webkitSetMediaKeys === undefined) {
    throw new Error("No webKitMediaKeys API.");
  }
  return (videoElement as any).webkitSetMediaKeys(mediaKeys);
  /* tslint:enable no-unsafe-any */
}

/**
 * On Safari browsers (>= 9), there are specific webkit prefixed APIs for cyphered
 * content playback. Standard EME APIs are therefore available since Safari 12.1, but they
 * don't allow to play fairplay cyphered content.
 *
 * This class implements a standard EME API polyfill that wraps webkit prefixed Safari
 * EME custom APIs.
 */
class WebkitMediaKeySession extends EventEmitter<IMediaKeySessionEvents>
                            implements ICustomMediaKeySession {
  public readonly update: (license: Uint8Array) =>
    Promise<void>;
  public readonly closed: Promise<void>;
  public expiration: number;
  public keyStatuses: ICustomMediaKeyStatusMap;

  private readonly _videoElement: HTMLMediaElement;
  private readonly _closeSession$: Subject<void>;
  private readonly _keyType: string;
  private _nativeSession: undefined | any;
  private _serverCertificate: Uint8Array;

  constructor(mediaElement: HTMLMediaElement,
              serverCertificate: Uint8Array,
              keyType: string) {
    super();
    this._serverCertificate = serverCertificate;
    this._closeSession$ = new Subject();
    this._videoElement = mediaElement;
    this._keyType = keyType;

    this.closed = new PPromise((resolve) => {
      this._closeSession$.subscribe(resolve);
    });
    this.keyStatuses = new Map();
    this.expiration = NaN;

    this.update = (license: Uint8Array) => {
      /* tslint:disable no-unsafe-any */
      return new PPromise((resolve, reject) => {
        if (this._nativeSession === undefined ||
            this._nativeSession.update === undefined ||
            typeof this._nativeSession.update !== "function") {
          return reject("Unavailable WebKit key session.");
        }
        try {
          resolve(this._nativeSession.update(license));
        } catch (err) {
          reject(err);
        }
      });
      /* tslint:enable no-unsafe-any */
    };
  }

  /* tslint:disable no-unsafe-any */
  listenEvent(session: any) {
    observableMerge(events.onKeyMessage$(session),
                    events.onKeyAdded$(session),
                    events.onKeyError$(session))
      .pipe(takeUntil(this._closeSession$))
      .subscribe((evt: Event) => {
        this.trigger(evt.type, evt);
      });
  }
  /* tslint:enable no-unsafe-any */

  generateRequest(_initDataType: string,
                  initData: ArrayBuffer): Promise<void> {
    return new PPromise((resolve) => {
      /* tslint:disable no-unsafe-any */
      if ((this._videoElement as any).webkitKeys === undefined ||
        (this._videoElement as any).webkitKeys.createSession === undefined) {
        throw new Error("No WebKitMediaKeys API.");
      }
      const formattedInitData = isFairplayKeyType(this._keyType) ?
        getWebKitFairplayInitData(initData, this._serverCertificate) :
        initData;
      const keySession =
        (this._videoElement as any).webkitKeys.createSession("video/mp4",
          formattedInitData);
      /* tslint:enable no-unsafe-any */
      if (keySession === undefined || keySession === null) {
        throw new Error("Impossible to get the key sessions");
      }
      this.listenEvent(keySession);
      this._nativeSession = keySession;
      resolve();
    });
  }

  close(): Promise<void> {
    return new PPromise((resolve, reject) => {
      this._closeSession$.next();
      this._closeSession$.complete();
      /* tslint:disable no-unsafe-any */
      if (this._nativeSession === undefined) {
        reject("No session to close.");
      }
      this._nativeSession.close();
      /* tslint:enable no-unsafe-any */
      resolve();
    });
  }

  load(): Promise<boolean> {
    return PPromise.resolve(false);
  }

  remove(): Promise<void> {
    return PPromise.resolve();
  }

  get sessionId(): string {
    /* tslint:disable */
    return this._nativeSession?.sessionId ?? "";
    /* tslint:enable */
  }
}

class WebKitCustomMediaKeys implements ICustomWebKitMediaKeys {
  private _videoElement?: HTMLMediaElement;
  private _mediaKeys?: IWebKitMediaKeys;
  private _serverCertificate?: Uint8Array;
  private _keyType: string;

  constructor(keyType: string) {
    if (WebKitMediaKeysConstructor === undefined) {
      throw new Error("No WebKitMediaKeys API.");
    }
    this._keyType = keyType;
    this._mediaKeys = new WebKitMediaKeysConstructor(keyType);
  }

  _setVideo(videoElement: HTMLMediaElement): void {
    this._videoElement = videoElement;
    if (this._videoElement === undefined) {
      throw new Error("Video not attached to the MediaKeys");
    }
    return setWebKitMediaKeys(this._videoElement, this._mediaKeys);
  }

  createSession(/* sessionType */): ICustomMediaKeySession {
    if (this._videoElement === undefined ||
      this._mediaKeys === undefined ||
      this._serverCertificate === undefined) {
      throw new Error("Video not attached to the MediaKeys");
    }
    return new WebkitMediaKeySession(this._videoElement,
                                     this._serverCertificate,
                                     this._keyType);
  }

  setServerCertificate(serverCertificate: Uint8Array): Promise<void> {
    this._serverCertificate = serverCertificate;
    return PPromise.resolve();
  }
}

export default function getWebKitMediaKeysCallbacks() {
  if (WebKitMediaKeysConstructor === undefined) {
    throw new Error("No WebKitMediaKeys API.");
  }
  const isTypeSupported = WebKitMediaKeysConstructor.isTypeSupported;
  const createCustomMediaKeys = (keyType: string) =>
    new WebKitCustomMediaKeys(keyType);
  const setMediaKeys = (elt: HTMLMediaElement,
                        mediaKeys: MediaKeys|ICustomMediaKeys|null): void => {
    if (mediaKeys === null) {
      return setWebKitMediaKeys(elt, mediaKeys);
    }
    if (!(mediaKeys instanceof WebKitCustomMediaKeys)) {
      throw new Error("Custom setMediaKeys is supposed to be called " +
                      "with webkit custom MediaKeys.");
    }
    return mediaKeys._setVideo(elt);
  };
  return {
    isTypeSupported,
    createCustomMediaKeys,
    setMediaKeys,
  };
}
