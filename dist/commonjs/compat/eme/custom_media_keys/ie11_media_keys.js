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
exports.MSMediaKeysConstructor = void 0;
var event_emitter_1 = require("../../../utils/event_emitter");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var task_canceller_1 = require("../../../utils/task_canceller");
var wrapInPromise_1 = require("../../../utils/wrapInPromise");
var events = require("../../event_listeners");
var ms_media_keys_constructor_1 = require("./ms_media_keys_constructor");
Object.defineProperty(exports, "MSMediaKeysConstructor", { enumerable: true, get: function () { return ms_media_keys_constructor_1.MSMediaKeysConstructor; } });
var IE11MediaKeySession = /** @class */ (function (_super) {
    __extends(IE11MediaKeySession, _super);
    function IE11MediaKeySession(mk) {
        var _this = _super.call(this) || this;
        _this.expiration = NaN;
        _this.keyStatuses = new Map();
        _this._mk = mk;
        _this._sessionClosingCanceller = new task_canceller_1.default();
        _this.closed = new Promise(function (resolve) {
            _this._sessionClosingCanceller.signal.register(function () { return resolve(); });
        });
        _this.update = function (license) {
            return new Promise(function (resolve, reject) {
                if (_this._ss === undefined) {
                    return reject("MediaKeySession not set.");
                }
                try {
                    resolve(_this._ss.update(license, ""));
                }
                catch (err) {
                    reject(err);
                }
            });
        };
        return _this;
    }
    IE11MediaKeySession.prototype.generateRequest = function (_initDataType, initData) {
        var _this = this;
        return new Promise(function (resolve) {
            var initDataU8;
            if (initData instanceof Uint8Array) {
                initDataU8 = initData;
            }
            else if (initData instanceof ArrayBuffer) {
                initDataU8 = new Uint8Array(initData);
            }
            else {
                initDataU8 = new Uint8Array(initData.buffer);
            }
            _this._ss = _this._mk.createSession("video/mp4", initDataU8);
            events.onKeyMessage(_this._ss, function (evt) {
                var _a;
                _this.trigger((_a = evt.type) !== null && _a !== void 0 ? _a : "message", evt);
            }, _this._sessionClosingCanceller.signal);
            events.onKeyAdded(_this._ss, function (evt) {
                var _a;
                _this.trigger((_a = evt.type) !== null && _a !== void 0 ? _a : "keyadded", evt);
            }, _this._sessionClosingCanceller.signal);
            events.onKeyError(_this._ss, function (evt) {
                var _a;
                _this.trigger((_a = evt.type) !== null && _a !== void 0 ? _a : "keyerror", evt);
            }, _this._sessionClosingCanceller.signal);
            resolve();
        });
    };
    IE11MediaKeySession.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (!(0, is_null_or_undefined_1.default)(_this._ss)) {
                _this._ss.close();
                _this._ss = undefined;
            }
            _this._sessionClosingCanceller.cancel();
            resolve();
        });
    };
    IE11MediaKeySession.prototype.load = function () {
        return Promise.resolve(false);
    };
    IE11MediaKeySession.prototype.remove = function () {
        return Promise.resolve();
    };
    Object.defineProperty(IE11MediaKeySession.prototype, "sessionId", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this._ss) === null || _a === void 0 ? void 0 : _a.sessionId) !== null && _b !== void 0 ? _b : "";
        },
        enumerable: false,
        configurable: true
    });
    return IE11MediaKeySession;
}(event_emitter_1.default));
var IE11CustomMediaKeys = /** @class */ (function () {
    function IE11CustomMediaKeys(keyType) {
        if (ms_media_keys_constructor_1.MSMediaKeysConstructor === undefined) {
            throw new Error("No MSMediaKeys API.");
        }
        this._mediaKeys = new ms_media_keys_constructor_1.MSMediaKeysConstructor(keyType);
    }
    IE11CustomMediaKeys.prototype._setVideo = function (videoElement) {
        var _this = this;
        return (0, wrapInPromise_1.default)(function () {
            _this._videoElement = videoElement;
            if (_this._videoElement.msSetMediaKeys !== undefined) {
                _this._videoElement.msSetMediaKeys(_this._mediaKeys);
            }
        });
    };
    IE11CustomMediaKeys.prototype.createSession = function ( /* sessionType */) {
        if (this._videoElement === undefined || this._mediaKeys === undefined) {
            throw new Error("Video not attached to the MediaKeys");
        }
        return new IE11MediaKeySession(this._mediaKeys);
    };
    IE11CustomMediaKeys.prototype.setServerCertificate = function () {
        throw new Error("Server certificate is not implemented in your browser");
    };
    return IE11CustomMediaKeys;
}());
function getIE11MediaKeysCallbacks() {
    var isTypeSupported = function (keySystem, type) {
        if (ms_media_keys_constructor_1.MSMediaKeysConstructor === undefined) {
            throw new Error("No MSMediaKeys API.");
        }
        if (type !== undefined) {
            return ms_media_keys_constructor_1.MSMediaKeysConstructor.isTypeSupported(keySystem, type);
        }
        return ms_media_keys_constructor_1.MSMediaKeysConstructor.isTypeSupported(keySystem);
    };
    var createCustomMediaKeys = function (keyType) { return new IE11CustomMediaKeys(keyType); };
    var setMediaKeys = function (elt, mediaKeys) {
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
        isTypeSupported: isTypeSupported,
        createCustomMediaKeys: createCustomMediaKeys,
        setMediaKeys: setMediaKeys,
    };
}
exports.default = getIE11MediaKeysCallbacks;
