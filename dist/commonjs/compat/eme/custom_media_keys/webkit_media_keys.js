"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var event_emitter_1 = require("../../../utils/event_emitter");
var noop_1 = require("../../../utils/noop");
var starts_with_1 = require("../../../utils/starts_with");
var wrapInPromise_1 = require("../../../utils/wrapInPromise");
var get_webkit_fairplay_initdata_1 = require("../get_webkit_fairplay_initdata");
var webkit_media_keys_constructor_1 = require("./webkit_media_keys_constructor");
/**
 * Check if keyType is for fairplay DRM
 * @param {string} keyType
 * @returns {boolean}
 */
function isFairplayKeyType(keyType) {
    return (0, starts_with_1.default)(keyType, "com.apple.fps");
}
/**
 * Set media keys on video element using native HTMLMediaElement
 * setMediaKeys from WebKit.
 * @param {HTMLMediaElement} elt
 * @param {Object|null} mediaKeys
 * @returns {Promise}
 */
function setWebKitMediaKeys(elt, mediaKeys) {
    return (0, wrapInPromise_1.default)(function () {
        if (elt.webkitSetMediaKeys === undefined) {
            throw new Error("No webKitMediaKeys API.");
        }
        elt.webkitSetMediaKeys(mediaKeys);
    });
}
/**
 * On Safari browsers (>= 9), there are specific webkit prefixed APIs for cyphered
 * content playback. Standard EME APIs are therefore available since Safari 12.1, but they
 * don't allow to play fairplay cyphered content.
 *
 * This class implements a standard EME API polyfill that wraps webkit prefixed Safari
 * EME custom APIs.
 */
var WebkitMediaKeySession = /** @class */ (function (_super) {
    __extends(WebkitMediaKeySession, _super);
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {string} keyType
     * @param {Uint8Array | undefined} serverCertificate
     */
    function WebkitMediaKeySession(mediaElement, keyType, serverCertificate) {
        var _this = _super.call(this) || this;
        _this._serverCertificate = serverCertificate;
        _this._videoElement = mediaElement;
        _this._keyType = keyType;
        _this._unbindSession = noop_1.default;
        _this._closeSession = noop_1.default; // Just here to make TypeScript happy
        _this.closed = new Promise(function (resolve) {
            _this._closeSession = resolve;
        });
        _this.keyStatuses = new Map();
        _this.expiration = NaN;
        return _this;
    }
    WebkitMediaKeySession.prototype.update = function (license) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            if (_this._nativeSession === undefined ||
                _this._nativeSession.update === undefined ||
                typeof _this._nativeSession.update !== "function") {
                return reject("Unavailable WebKit key session.");
            }
            try {
                var uInt8Arraylicense = void 0;
                if (license instanceof ArrayBuffer) {
                    uInt8Arraylicense = new Uint8Array(license);
                }
                else if (license instanceof Uint8Array) {
                    uInt8Arraylicense = license;
                }
                else {
                    uInt8Arraylicense = new Uint8Array(license.buffer);
                }
                /* eslint-disable @typescript-eslint/no-unsafe-member-access */
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                resolve(_this._nativeSession.update(uInt8Arraylicense));
                /* eslint-enable @typescript-eslint/no-unsafe-member-access */
            }
            catch (err) {
                reject(err);
            }
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        });
    };
    WebkitMediaKeySession.prototype.generateRequest = function (_initDataType, initData) {
        var _this = this;
        return new Promise(function (resolve) {
            var _a;
            var elt = _this._videoElement;
            if (((_a = elt.webkitKeys) === null || _a === void 0 ? void 0 : _a.createSession) === undefined) {
                throw new Error("No WebKitMediaKeys API.");
            }
            var formattedInitData;
            if (isFairplayKeyType(_this._keyType)) {
                if (_this._serverCertificate === undefined) {
                    throw new Error("A server certificate is needed for creating fairplay session.");
                }
                formattedInitData = (0, get_webkit_fairplay_initdata_1.default)(initData, _this._serverCertificate);
            }
            else {
                formattedInitData = initData;
            }
            var keySession = elt.webkitKeys.createSession("video/mp4", formattedInitData);
            if (keySession === undefined || keySession === null) {
                throw new Error("Impossible to get the key sessions");
            }
            _this._listenEvent(keySession);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            _this._nativeSession = keySession;
            resolve();
        });
    };
    WebkitMediaKeySession.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._unbindSession();
            _this._closeSession();
            if (_this._nativeSession === undefined) {
                reject("No session to close.");
                return;
            }
            /* eslint-disable @typescript-eslint/no-floating-promises */
            _this._nativeSession.close();
            /* eslint-enable @typescript-eslint/no-floating-promises */
            resolve();
        });
    };
    WebkitMediaKeySession.prototype.load = function () {
        return Promise.resolve(false);
    };
    WebkitMediaKeySession.prototype.remove = function () {
        return Promise.resolve();
    };
    Object.defineProperty(WebkitMediaKeySession.prototype, "sessionId", {
        get: function () {
            var _a, _b;
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            /* eslint-disable @typescript-eslint/no-unsafe-return */
            return (_b = (_a = this._nativeSession) === null || _a === void 0 ? void 0 : _a.sessionId) !== null && _b !== void 0 ? _b : "";
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
            /* eslint-enable @typescript-eslint/no-unsafe-return */
        },
        enumerable: false,
        configurable: true
    });
    WebkitMediaKeySession.prototype._listenEvent = function (session) {
        var _this = this;
        this._unbindSession(); // If previous session was linked
        var onEvent = function (evt) {
            _this.trigger(evt.type, evt);
        };
        /* eslint-disable @typescript-eslint/no-unsafe-call */
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach(function (evt) {
            session.addEventListener(evt, onEvent);
            session.addEventListener("webkit".concat(evt), onEvent);
        });
        this._unbindSession = function () {
            ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach(function (evt) {
                session.removeEventListener(evt, onEvent);
                session.removeEventListener("webkit".concat(evt), onEvent);
            });
        };
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        /* eslint-enable @typescript-eslint/no-unsafe-call */
    };
    return WebkitMediaKeySession;
}(event_emitter_1.default));
var WebKitCustomMediaKeys = /** @class */ (function () {
    function WebKitCustomMediaKeys(keyType) {
        if (webkit_media_keys_constructor_1.WebKitMediaKeysConstructor === undefined) {
            throw new Error("No WebKitMediaKeys API.");
        }
        this._keyType = keyType;
        this._mediaKeys = new webkit_media_keys_constructor_1.WebKitMediaKeysConstructor(keyType);
    }
    WebKitCustomMediaKeys.prototype._setVideo = function (videoElement) {
        this._videoElement = videoElement;
        if (this._videoElement === undefined) {
            throw new Error("Video not attached to the MediaKeys");
        }
        return setWebKitMediaKeys(this._videoElement, this._mediaKeys);
    };
    WebKitCustomMediaKeys.prototype.createSession = function ( /* sessionType */) {
        if (this._videoElement === undefined || this._mediaKeys === undefined) {
            throw new Error("Video not attached to the MediaKeys");
        }
        return new WebkitMediaKeySession(this._videoElement, this._keyType, this._serverCertificate);
    };
    WebKitCustomMediaKeys.prototype.setServerCertificate = function (serverCertificate) {
        this._serverCertificate = serverCertificate;
        return Promise.resolve();
    };
    return WebKitCustomMediaKeys;
}());
function getWebKitMediaKeysCallbacks() {
    if (webkit_media_keys_constructor_1.WebKitMediaKeysConstructor === undefined) {
        throw new Error("No WebKitMediaKeys API.");
    }
    var isTypeSupported = webkit_media_keys_constructor_1.WebKitMediaKeysConstructor.isTypeSupported;
    var createCustomMediaKeys = function (keyType) { return new WebKitCustomMediaKeys(keyType); };
    var setMediaKeys = function (elt, mediaKeys) {
        if (mediaKeys === null) {
            return setWebKitMediaKeys(elt, mediaKeys);
        }
        if (!(mediaKeys instanceof WebKitCustomMediaKeys)) {
            throw new Error("Custom setMediaKeys is supposed to be called " + "with webkit custom MediaKeys.");
        }
        return mediaKeys._setVideo(elt);
    };
    return {
        isTypeSupported: isTypeSupported,
        createCustomMediaKeys: createCustomMediaKeys,
        setMediaKeys: setMediaKeys,
    };
}
exports.default = getWebKitMediaKeysCallbacks;
