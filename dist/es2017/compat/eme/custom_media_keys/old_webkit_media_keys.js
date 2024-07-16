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
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import noop from "../../../utils/noop";
import { utf8ToStr } from "../../../utils/string_parsing";
import wrapInPromise from "../../../utils/wrapInPromise";
/**
 * Returns true if the given media element has old webkit methods
 * corresponding to the IOldWebkitHTMLMediaElement interface.
 * @param {HTMLMediaElement} element
 * @returns {Boolean}
 */
export function isOldWebkitMediaElement(element) {
    return (typeof (element === null || element === void 0 ? void 0 : element.webkitGenerateKeyRequest) ===
        "function");
}
/**
 * MediaKeySession implementation for older versions of WebKit relying on APIs
 * such as `webkitGenerateKeyRequest` `webkitAddKey` to be called on the
 * HTMLMediaElement.
 * @class OldWebkitMediaKeySession
 */
class OldWebkitMediaKeySession extends EventEmitter {
    constructor(mediaElement, keySystem) {
        super();
        this._vid = mediaElement;
        this._key = keySystem;
        this.sessionId = "";
        this._closeSession = noop; // Just here to make TypeScript happy
        this.keyStatuses = new Map();
        this.expiration = NaN;
        const onSessionRelatedEvent = (evt) => {
            this.trigger(evt.type, evt);
        };
        this.closed = new Promise((resolve) => {
            this._closeSession = () => {
                ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach((evt) => {
                    mediaElement.removeEventListener(evt, onSessionRelatedEvent);
                    mediaElement.removeEventListener(`webkit${evt}`, onSessionRelatedEvent);
                });
                resolve();
            };
        });
        ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach((evt) => {
            mediaElement.addEventListener(evt, onSessionRelatedEvent);
            mediaElement.addEventListener(`webkit${evt}`, onSessionRelatedEvent);
        });
    }
    update(license) {
        return new Promise((resolve, reject) => {
            try {
                if (this._key.indexOf("clearkey") >= 0) {
                    const licenseTypedArray = license instanceof ArrayBuffer ? new Uint8Array(license) : license;
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
                }
                else {
                    resolve(this._vid.webkitAddKey(this._key, license, null, /* sessionId */ ""));
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    generateRequest(_initDataType, initData) {
        return new Promise((resolve) => {
            this._vid.webkitGenerateKeyRequest(this._key, initData);
            resolve();
        });
    }
    close() {
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
    load() {
        // Not implemented. Always return false as in "no session with that id".
        return Promise.resolve(false);
    }
    remove() {
        return Promise.resolve();
    }
}
class OldWebKitCustomMediaKeys {
    constructor(keySystem) {
        this._keySystem = keySystem;
    }
    _setVideo(videoElement) {
        return wrapInPromise(() => {
            if (!isOldWebkitMediaElement(videoElement)) {
                throw new Error("Video not attached to the MediaKeys");
            }
            this._videoElement = videoElement;
        });
    }
    createSession( /* sessionType */) {
        if (isNullOrUndefined(this._videoElement)) {
            throw new Error("Video not attached to the MediaKeys");
        }
        return new OldWebkitMediaKeySession(this._videoElement, this._keySystem);
    }
    setServerCertificate() {
        throw new Error("Server certificate is not implemented in your browser");
    }
}
export default function getOldWebKitMediaKeysCallbacks() {
    const isTypeSupported = function (keyType) {
        // get any <video> element from the DOM or create one
        // and try the `canPlayType` method
        let videoElement = document.querySelector("video");
        if (isNullOrUndefined(videoElement)) {
            videoElement = document.createElement("video");
        }
        if (!isNullOrUndefined(videoElement) &&
            typeof videoElement.canPlayType === "function") {
            return !!videoElement.canPlayType("video/mp4", keyType);
        }
        else {
            return false;
        }
    };
    const createCustomMediaKeys = (keyType) => new OldWebKitCustomMediaKeys(keyType);
    const setMediaKeys = (elt, mediaKeys) => {
        if (mediaKeys === null) {
            return Promise.resolve(undefined);
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
