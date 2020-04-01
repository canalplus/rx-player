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
import { TypedArray } from "../../../core/eme";
import EventEmitter from "../../../utils/event_emitter";
import PPromise from "../../../utils/promise";
import * as events from "../../event_listeners";
import getWebKitInitData from "../get_webkit_initdata";
import {
  ICustomMediaKeySession,
  ICustomMediaKeyStatusMap,
  IMediaKeySessionEvents,
} from "./types";
import wrapUpdate from "./wrap_update";

export interface ICustomWebKitMediaKeys {
  _setVideo: (videoElement: HTMLMediaElement) => void;
  createSession(mimeType: string, initData: Uint8Array): ICustomMediaKeySession;
  setServerCertificate(setServerCertificate: ArrayBuffer | TypedArray): Promise<void>;
}

/* tslint:disable no-unsafe-any */
const { WebKitMediaKeys } = (window as any);
/* tslint:enable no-unsafe-any */

class WebkitMediaKeySession extends EventEmitter<IMediaKeySessionEvents>
                            implements ICustomMediaKeySession {
  public readonly update: (license: ArrayBuffer, sessionId?: string) =>
    Promise<void>;
  public readonly closed: Promise<void>;
  public expiration: number;
  public keyStatuses: ICustomMediaKeyStatusMap;
  public sessionId: string;

  private readonly _videoElement: HTMLMediaElement;
  private readonly _closeSession$: Subject<void>;
  private _nativeSession: undefined | any;
  private _serverCertificate: Uint8Array;

  constructor(mediaElement: HTMLMediaElement,
              serverCertificate: Uint8Array) {
    super();
    this._serverCertificate = serverCertificate;
    this._closeSession$ = new Subject();
    this._videoElement = mediaElement;

    this.sessionId = "";
    this.closed = new PPromise((resolve) => {
      this._closeSession$.subscribe(resolve);
    });
    this.keyStatuses = new Map();
    this.expiration = NaN;

    this.update = wrapUpdate((license, sessionId?) => {
      /* tslint:disable no-unsafe-any */
      if (this._nativeSession === undefined ||
        this._nativeSession.update === undefined ||
        typeof this._nativeSession.update !== "function") {
        throw new Error("Unavailable WebKit key session.");
      }
      this._nativeSession.update(license);
      /* tslint:enable no-unsafe-any */
      this.sessionId = sessionId;
    });
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
      const formattedInitData =
        getWebKitInitData(initData, this._serverCertificate);
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
}

class WebKitCustomMediaKeys implements ICustomWebKitMediaKeys {
  private _videoElement?: HTMLMediaElement;
  private _mediaKeys?: MediaKeys;
  private _serverCertificate?: Uint8Array;

  constructor(keyType: string) {
    /* tslint:disable no-unsafe-any */
    this._mediaKeys = new WebKitMediaKeys(keyType);
    /* tslint:enable no-unsafe-any */
  }

  _setVideo(videoElement: HTMLMediaElement): void {
    this._videoElement = videoElement;
    if (this._videoElement === undefined) {
      throw new Error("Video not attached to the MediaKeys");
    }
    /* tslint:disable no-unsafe-any */
    if ((this._videoElement as any).webkitSetMediaKeys === undefined) {
      throw new Error("No webKitMediaKeys API.");
    }
    (this._videoElement as any).webkitSetMediaKeys(this._mediaKeys);
    /* tslint:enable no-unsafe-any */
  }

  createSession(/* sessionType */): ICustomMediaKeySession {
    if (this._videoElement === undefined ||
      this._mediaKeys === undefined ||
      this._serverCertificate === undefined) {
      throw new Error("Video not attached to the MediaKeys");
    }
    return new WebkitMediaKeySession(this._videoElement, this._serverCertificate);
  }

  setServerCertificate(serverCertificate: Uint8Array): Promise<void> {
    this._serverCertificate = serverCertificate;
    return PPromise.resolve();
  }
}

export default function getWebKitMediaKeysCallbacks() {
  /* tslint:disable no-unsafe-any */
  const isTypeSupported = WebKitMediaKeys.isTypeSupported;
  /* tslint:enable no-unsafe-any */
  const createCustomMediaKeys = (keyType: string) => new WebKitCustomMediaKeys(keyType);
  return {
    isTypeSupported,
    createCustomMediaKeys,
  };
}
