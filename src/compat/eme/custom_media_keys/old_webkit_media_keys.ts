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

import { base64ToBytes } from "../../../utils/base64";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import { utf8ToStr } from "../../../utils/string_parsing";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
  ICustomMediaKeyStatusMap,
  IMediaKeySessionEvents,
} from "./types";

export interface IOldWebkitHTMLMediaElement extends HTMLVideoElement {
  webkitGenerateKeyRequest : (keyType: string, initData : ArrayBuffer) => void;
  webkitAddKey : (
    keyType: string,
    key : BufferSource,
    kid : BufferSource|null,
    sessionId : string
  ) => void;
}

/**
 * Returns true if the given media element has old webkit methods
 * corresponding to the IOldWebkitHTMLMediaElement interface.
 * @param {HTMLMediaElement} element
 * @returns {Boolean}
 */
export function isOldWebkitMediaElement(
  element : HTMLMediaElement|IOldWebkitHTMLMediaElement
) : element is IOldWebkitHTMLMediaElement {
  return typeof (element as IOldWebkitHTMLMediaElement)
    .webkitGenerateKeyRequest === "function";
}

/**
 * MediaKeySession implementation for older versions of WebKit relying on APIs
 * such as `webkitGenerateKeyRequest` `webkitAddKey` to be called on the
 * HTMLMediaElement.
 * @class OldWebkitMediaKeySession
 */
class OldWebkitMediaKeySession
  extends EventEmitter<IMediaKeySessionEvents>
  implements ICustomMediaKeySession
{
  public readonly closed: Promise<void>;
  public expiration: number;
  public keyStatuses: ICustomMediaKeyStatusMap;
  public sessionId: string;

  private readonly _vid: IOldWebkitHTMLMediaElement;
  private readonly _key: string;

  private _closeSession : () => void;

  constructor(mediaElement: IOldWebkitHTMLMediaElement, keySystem: string) {
    super();
    this._vid = mediaElement;
    this._key = keySystem;

    this.sessionId = "";
    this._closeSession = noop; // Just here to make TypeScript happy
    this.keyStatuses = new Map();
    this.expiration = NaN;

    const onSessionRelatedEvent = (evt : Event) => {
      this.trigger(evt.type, evt);
    };
    this.closed = new Promise((resolve) => {
      this._closeSession = () => {
        ["keymessage", "message", "keyadded", "ready", "keyerror", "error"]
          .forEach(evt => {
            mediaElement.removeEventListener(evt, onSessionRelatedEvent);
            mediaElement.removeEventListener(`webkit${evt}`, onSessionRelatedEvent);
          });
        resolve();
      };
    });


    ["keymessage", "message", "keyadded", "ready", "keyerror", "error"]
      .forEach(evt => {
        mediaElement.addEventListener(evt, onSessionRelatedEvent);
        mediaElement.addEventListener(`webkit${evt}`, onSessionRelatedEvent);
      });
  }

  public update(license: Uint8Array) : Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this._key.indexOf("clearkey") >= 0) {
          const licenseTypedArray =
            license instanceof ArrayBuffer ? new Uint8Array(license) :
            license;
          /* eslint-disable @typescript-eslint/no-unsafe-member-access */
          /* eslint-disable @typescript-eslint/no-unsafe-argument */
          /* eslint-disable @typescript-eslint/no-unsafe-assignment */
          const json = JSON.parse(utf8ToStr(licenseTypedArray));
          const key = base64ToBytes(json.keys[0].k);
          const kid = base64ToBytes(json.keys[0].kid);
          /* eslint-enable @typescript-eslint/no-unsafe-member-access */
          /* eslint-enable @typescript-eslint/no-unsafe-argument */
          /* eslint-enable @typescript-eslint/no-unsafe-assignment */
          resolve(this._vid.webkitAddKey(this._key, key, kid, /* sessionId */ ""));
        } else {
          resolve(this._vid.webkitAddKey(this._key, license, null, /* sessionId */ ""));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  public generateRequest(
    _initDataType: string,
    initData: ArrayBuffer
  ): Promise<void> {
    return new Promise((resolve) => {
      this._vid.webkitGenerateKeyRequest(this._key, initData);
      resolve();
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this._closeSession();
      resolve();
    });
  }

  /**
   * Load a Persistent MediaKeySession.
   * Do nothing here because this implementation doesn't handle them.
   * @returns {Promise.<boolean>}
   */
  public load(): Promise<boolean> {
    // Not implemented. Always return false as in "no session with that id".
    return Promise.resolve(false);
  }

  public remove(): Promise<void> {
    return Promise.resolve();
  }
}

class OldWebKitCustomMediaKeys implements ICustomMediaKeys {
  private readonly _keySystem: string;
  private _videoElement?: IOldWebkitHTMLMediaElement;

  constructor(keySystem: string) {
    this._keySystem = keySystem;
  }

  _setVideo(videoElement: IOldWebkitHTMLMediaElement|HTMLMediaElement): void {
    if (!isOldWebkitMediaElement(videoElement)) {
      throw new Error("Video not attached to the MediaKeys");
    }
    this._videoElement = videoElement;
  }

  createSession(/* sessionType */): ICustomMediaKeySession {
    if (this._videoElement == null) {
      throw new Error("Video not attached to the MediaKeys");
    }
    return new OldWebkitMediaKeySession(this._videoElement, this._keySystem);
  }

  setServerCertificate(): Promise<void> {
    throw new Error("Server certificate is not implemented in your browser");
  }
}

export default function getOldWebKitMediaKeysCallbacks() : {
  isTypeSupported: (keyType: string) => boolean;
  createCustomMediaKeys: (keyType: string) => OldWebKitCustomMediaKeys;
  setMediaKeys: (
    elt: HTMLMediaElement,
    mediaKeys: MediaKeys|ICustomMediaKeys|null
  ) => void;
} {
  const isTypeSupported = function (keyType: string): boolean {
    // get any <video> element from the DOM or create one
    // and try the `canPlayType` method
    let videoElement = document.querySelector("video");
    if (videoElement == null) {
      videoElement = document.createElement("video");
    }
    if (videoElement != null && typeof videoElement.canPlayType === "function") {
      return !!(videoElement.canPlayType as unknown as (
        mimeType : string,
        keyType? : string
      ) => boolean)("video/mp4", keyType);
    } else {
      return false;
    }
  };
  const createCustomMediaKeys =
    (keyType: string) => new OldWebKitCustomMediaKeys(keyType);
  const setMediaKeys = (
    elt: HTMLMediaElement,
    mediaKeys: MediaKeys|ICustomMediaKeys|null
  ): void => {
    if (mediaKeys === null) {
      return;
    }
    if (!(mediaKeys instanceof OldWebKitCustomMediaKeys)) {
      throw new Error("Custom setMediaKeys is supposed to be called " +
                      "with old webkit custom MediaKeys.");
    }
    return mediaKeys._setVideo(elt);
  };
  return {
    isTypeSupported,
    createCustomMediaKeys,
    setMediaKeys,
  };
}
