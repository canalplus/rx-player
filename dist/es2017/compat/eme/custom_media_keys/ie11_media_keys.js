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
import EventEmitter from "../../../utils/event_emitter";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import TaskCanceller from "../../../utils/task_canceller";
import wrapInPromise from "../../../utils/wrapInPromise";
import * as events from "../../event_listeners";
import { MSMediaKeysConstructor } from "./ms_media_keys_constructor";
class IE11MediaKeySession extends EventEmitter {
    constructor(mk) {
        super();
        this.expiration = NaN;
        this.keyStatuses = new Map();
        this._mk = mk;
        this._sessionClosingCanceller = new TaskCanceller();
        this.closed = new Promise((resolve) => {
            this._sessionClosingCanceller.signal.register(() => resolve());
        });
        this.update = (license) => {
            return new Promise((resolve, reject) => {
                if (this._ss === undefined) {
                    return reject("MediaKeySession not set.");
                }
                try {
                    resolve(this._ss.update(license, ""));
                }
                catch (err) {
                    reject(err);
                }
            });
        };
    }
    generateRequest(_initDataType, initData) {
        return new Promise((resolve) => {
            let initDataU8;
            if (initData instanceof Uint8Array) {
                initDataU8 = initData;
            }
            else if (initData instanceof ArrayBuffer) {
                initDataU8 = new Uint8Array(initData);
            }
            else {
                initDataU8 = new Uint8Array(initData.buffer);
            }
            this._ss = this._mk.createSession("video/mp4", initDataU8);
            events.onKeyMessage(this._ss, (evt) => {
                var _a;
                this.trigger((_a = evt.type) !== null && _a !== void 0 ? _a : "message", evt);
            }, this._sessionClosingCanceller.signal);
            events.onKeyAdded(this._ss, (evt) => {
                var _a;
                this.trigger((_a = evt.type) !== null && _a !== void 0 ? _a : "keyadded", evt);
            }, this._sessionClosingCanceller.signal);
            events.onKeyError(this._ss, (evt) => {
                var _a;
                this.trigger((_a = evt.type) !== null && _a !== void 0 ? _a : "keyerror", evt);
            }, this._sessionClosingCanceller.signal);
            resolve();
        });
    }
    close() {
        return new Promise((resolve) => {
            if (!isNullOrUndefined(this._ss)) {
                this._ss.close();
                this._ss = undefined;
            }
            this._sessionClosingCanceller.cancel();
            resolve();
        });
    }
    load() {
        return Promise.resolve(false);
    }
    remove() {
        return Promise.resolve();
    }
    get sessionId() {
        var _a, _b;
        return (_b = (_a = this._ss) === null || _a === void 0 ? void 0 : _a.sessionId) !== null && _b !== void 0 ? _b : "";
    }
}
class IE11CustomMediaKeys {
    constructor(keyType) {
        if (MSMediaKeysConstructor === undefined) {
            throw new Error("No MSMediaKeys API.");
        }
        this._mediaKeys = new MSMediaKeysConstructor(keyType);
    }
    _setVideo(videoElement) {
        return wrapInPromise(() => {
            this._videoElement = videoElement;
            if (this._videoElement.msSetMediaKeys !== undefined) {
                this._videoElement.msSetMediaKeys(this._mediaKeys);
            }
        });
    }
    createSession( /* sessionType */) {
        if (this._videoElement === undefined || this._mediaKeys === undefined) {
            throw new Error("Video not attached to the MediaKeys");
        }
        return new IE11MediaKeySession(this._mediaKeys);
    }
    setServerCertificate() {
        throw new Error("Server certificate is not implemented in your browser");
    }
}
export default function getIE11MediaKeysCallbacks() {
    const isTypeSupported = (keySystem, type) => {
        if (MSMediaKeysConstructor === undefined) {
            throw new Error("No MSMediaKeys API.");
        }
        if (type !== undefined) {
            return MSMediaKeysConstructor.isTypeSupported(keySystem, type);
        }
        return MSMediaKeysConstructor.isTypeSupported(keySystem);
    };
    const createCustomMediaKeys = (keyType) => new IE11CustomMediaKeys(keyType);
    const setMediaKeys = (elt, mediaKeys) => {
        if (mediaKeys === null) {
            // msSetMediaKeys only accepts native MSMediaKeys as argument.
            // Calling it with null or undefined will raise an exception.
            // There is no way to unset the mediakeys in that case, so return here.
            return Promise.resolve(undefined);
        }
        if (!(mediaKeys instanceof IE11CustomMediaKeys)) {
            throw new Error("Custom setMediaKeys is supposed to be called " + "with IE11 custom MediaKeys.");
        }
        return mediaKeys._setVideo(elt);
    };
    return {
        isTypeSupported,
        createCustomMediaKeys,
        setMediaKeys,
    };
}
export { MSMediaKeysConstructor };
