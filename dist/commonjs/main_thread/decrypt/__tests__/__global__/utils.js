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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFakeChallengeFromInitData = exports.extrackInfoFromFakeChallenge = exports.testContentDecryptorError = exports.mockCompat = exports.requestMediaKeySystemAccessImpl = exports.MediaKeySystemAccessImpl = exports.MediaKeysImpl = exports.MediaKeySessionImpl = exports.MediaKeyStatusMapImpl = exports.defaultWidevineConfig = exports.defaultPRRecommendationKSConfig = exports.defaultKSConfig = void 0;
var base64_1 = require("../../../../utils/base64");
var event_emitter_1 = require("../../../../utils/event_emitter");
var flat_map_1 = require("../../../../utils/flat_map");
var string_parsing_1 = require("../../../../utils/string_parsing");
/** Default MediaKeySystemAccess configuration used by the RxPlayer. */
exports.defaultKSConfig = [
    {
        audioCapabilities: [
            { contentType: 'audio/mp4;codecs="mp4a.40.2"' },
            { contentType: "audio/webm;codecs=opus" },
        ],
        distinctiveIdentifier: "optional",
        initDataTypes: ["cenc"],
        persistentState: "optional",
        sessionTypes: ["temporary"],
        videoCapabilities: [
            { contentType: 'video/mp4;codecs="avc1.4d401e"' },
            { contentType: 'video/mp4;codecs="avc1.42e01e"' },
            { contentType: 'video/webm;codecs="vp8"' },
        ],
    },
    {
        audioCapabilities: undefined,
        distinctiveIdentifier: "optional",
        initDataTypes: ["cenc"],
        persistentState: "optional",
        sessionTypes: ["temporary"],
        videoCapabilities: undefined,
    },
];
/**
 * Default "com.microsoft.playready.recommendation" MediaKeySystemAccess
 * configuration used by the RxPlayer.
 */
exports.defaultPRRecommendationKSConfig = [
    {
        audioCapabilities: [
            { robustness: "3000", contentType: 'audio/mp4;codecs="mp4a.40.2"' },
            { robustness: "3000", contentType: "audio/webm;codecs=opus" },
            { robustness: "2000", contentType: 'audio/mp4;codecs="mp4a.40.2"' },
            { robustness: "2000", contentType: "audio/webm;codecs=opus" },
        ],
        distinctiveIdentifier: "optional",
        initDataTypes: ["cenc"],
        persistentState: "optional",
        sessionTypes: ["temporary"],
        videoCapabilities: [
            { robustness: "3000", contentType: 'video/mp4;codecs="avc1.4d401e"' },
            { robustness: "3000", contentType: 'video/mp4;codecs="avc1.42e01e"' },
            { robustness: "3000", contentType: 'video/webm;codecs="vp8"' },
            { robustness: "2000", contentType: 'video/mp4;codecs="avc1.4d401e"' },
            { robustness: "2000", contentType: 'video/mp4;codecs="avc1.42e01e"' },
            { robustness: "2000", contentType: 'video/webm;codecs="vp8"' },
        ],
    },
    {
        audioCapabilities: undefined,
        distinctiveIdentifier: "optional",
        initDataTypes: ["cenc"],
        persistentState: "optional",
        sessionTypes: ["temporary"],
        videoCapabilities: undefined,
    },
];
/** Default Widevine MediaKeySystemAccess configuration used by the RxPlayer. */
exports.defaultWidevineConfig = (function () {
    var ROBUSTNESSES = [
        "HW_SECURE_ALL",
        "HW_SECURE_DECODE",
        "HW_SECURE_CRYPTO",
        "SW_SECURE_DECODE",
        "SW_SECURE_CRYPTO",
    ];
    var videoCapabilities = (0, flat_map_1.default)(ROBUSTNESSES, function (robustness) {
        return [
            { contentType: 'video/mp4;codecs="avc1.4d401e"', robustness: robustness },
            { contentType: 'video/mp4;codecs="avc1.42e01e"', robustness: robustness },
            { contentType: 'video/webm;codecs="vp8"', robustness: robustness },
        ];
    });
    var audioCapabilities = (0, flat_map_1.default)(ROBUSTNESSES, function (robustness) {
        return [
            { contentType: 'audio/mp4;codecs="mp4a.40.2"', robustness: robustness },
            { contentType: "audio/webm;codecs=opus", robustness: robustness },
        ];
    });
    return [
        __assign(__assign({}, exports.defaultKSConfig[0]), { audioCapabilities: audioCapabilities, videoCapabilities: videoCapabilities }),
        exports.defaultKSConfig[1],
    ];
})();
/**
 * Custom implementation of an EME-compliant MediaKeyStatusMap.
 * @class MediaKeyStatusMapImpl
 */
var MediaKeyStatusMapImpl = /** @class */ (function () {
    function MediaKeyStatusMapImpl() {
        this._map = new Map();
    }
    Object.defineProperty(MediaKeyStatusMapImpl.prototype, "size", {
        get: function () {
            return this._map.size;
        },
        enumerable: false,
        configurable: true
    });
    MediaKeyStatusMapImpl.prototype.get = function (keyId) {
        var keyIdAB = keyId instanceof ArrayBuffer ? keyId : keyId.buffer;
        return this._map.get(keyIdAB);
    };
    MediaKeyStatusMapImpl.prototype.has = function (keyId) {
        var keyIdAB = keyId instanceof ArrayBuffer ? keyId : keyId.buffer;
        return this._map.has(keyIdAB);
    };
    MediaKeyStatusMapImpl.prototype.forEach = function (callbackfn, 
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    thisArg) {
        var _this = this;
        this._map.forEach(function (value, key) { return callbackfn.bind(thisArg, value, key, _this); });
    };
    MediaKeyStatusMapImpl.prototype._setKeyStatus = function (keyId, value) {
        var keyIdAB = keyId instanceof ArrayBuffer ? keyId : keyId.buffer;
        if (value === undefined) {
            this._map.delete(keyIdAB);
        }
        else {
            this._map.set(keyIdAB, value);
        }
    };
    return MediaKeyStatusMapImpl;
}());
exports.MediaKeyStatusMapImpl = MediaKeyStatusMapImpl;
/**
 * Custom implementation of an EME-compliant MediaKeySession.
 * @class MediaKeySessionImpl
 */
var MediaKeySessionImpl = /** @class */ (function (_super) {
    __extends(MediaKeySessionImpl, _super);
    function MediaKeySessionImpl() {
        var _this = _super.call(this) || this;
        _this._currentKeyId = 0;
        _this.expiration = Number.MAX_VALUE;
        _this.keyStatuses = new MediaKeyStatusMapImpl();
        _this.closed = new Promise(function (res) {
            _this._close = res;
        });
        _this.onkeystatuseschange = null;
        _this.onmessage = null;
        _this.sessionId = "";
        return _this;
    }
    MediaKeySessionImpl.prototype.close = function () {
        if (this._close !== undefined) {
            this._close();
        }
        return Promise.resolve();
    };
    MediaKeySessionImpl.prototype.generateRequest = function (initDataType, initData) {
        var _this = this;
        var msg = formatFakeChallengeFromInitData(initData, initDataType);
        setTimeout(function () {
            var event = Object.assign(new CustomEvent("message"), {
                message: msg.buffer,
                messageType: "license-request",
            });
            _this.trigger("message", event);
            if (_this.onmessage !== null && _this.onmessage !== undefined) {
                _this.onmessage(event);
            }
        }, 5);
        return Promise.resolve();
    };
    MediaKeySessionImpl.prototype.load = function (_sessionId) {
        throw new Error("Not implemented yet");
    };
    MediaKeySessionImpl.prototype.remove = function () {
        return Promise.resolve();
    };
    MediaKeySessionImpl.prototype.update = function (_response) {
        var _this = this;
        this.keyStatuses._setKeyStatus(new Uint8Array([0, 1, 2, this._currentKeyId++]), "usable");
        var event = new CustomEvent("keystatuseschange");
        setTimeout(function () {
            _this.trigger("keyStatusesChange", event);
            if (_this.onkeystatuseschange !== null && _this.onkeystatuseschange !== undefined) {
                _this.onkeystatuseschange(event);
            }
        }, 50);
        return Promise.resolve();
    };
    return MediaKeySessionImpl;
}(event_emitter_1.default));
exports.MediaKeySessionImpl = MediaKeySessionImpl;
/**
 * Custom implementation of an EME-compliant MediaKeys.
 * @class MediaKeysImpl
 */
var MediaKeysImpl = /** @class */ (function () {
    function MediaKeysImpl() {
    }
    MediaKeysImpl.prototype.createSession = function (_sessionType) {
        return new MediaKeySessionImpl();
    };
    MediaKeysImpl.prototype.setServerCertificate = function (_serverCertificate) {
        return Promise.resolve(true);
    };
    return MediaKeysImpl;
}());
exports.MediaKeysImpl = MediaKeysImpl;
/**
 * Custom implementation of an EME-compliant MediaKeySystemAccess.
 * @class MediaKeySystemAccessImpl
 */
var MediaKeySystemAccessImpl = /** @class */ (function () {
    function MediaKeySystemAccessImpl(keySystem, config) {
        this.keySystem = keySystem;
        this._config = config;
    }
    MediaKeySystemAccessImpl.prototype.createMediaKeys = function () {
        return Promise.resolve(new MediaKeysImpl());
    };
    MediaKeySystemAccessImpl.prototype.getConfiguration = function () {
        return this._config;
    };
    return MediaKeySystemAccessImpl;
}());
exports.MediaKeySystemAccessImpl = MediaKeySystemAccessImpl;
function requestMediaKeySystemAccessImpl(keySystem, config) {
    return Promise.resolve(new MediaKeySystemAccessImpl(keySystem, config));
}
exports.requestMediaKeySystemAccessImpl = requestMediaKeySystemAccessImpl;
var MockedDecryptorEventEmitter = /** @class */ (function (_super) {
    __extends(MockedDecryptorEventEmitter, _super);
    function MockedDecryptorEventEmitter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MockedDecryptorEventEmitter.prototype.triggerEncrypted = function (elt, value) {
        this.trigger("encrypted", { elt: elt, value: value });
    };
    MockedDecryptorEventEmitter.prototype.triggerKeyError = function (session, value) {
        this.trigger("keyerror", { session: session, value: value });
    };
    MockedDecryptorEventEmitter.prototype.triggerKeyStatusesChange = function (session, value) {
        this.trigger("keystatuseschange", { session: session, value: value });
    };
    MockedDecryptorEventEmitter.prototype.triggerKeyMessage = function (session, value) {
        this.trigger("keymessage", { session: session, value: value });
    };
    return MockedDecryptorEventEmitter;
}(event_emitter_1.default));
/**
 * Mock functions coming from the compat directory.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function mockCompat(presets) {
    var _a, _b, _c;
    if (presets === void 0) { presets = {}; }
    var ee = new MockedDecryptorEventEmitter();
    var onEncrypted = (_a = presets.onEncrypted) !== null && _a !== void 0 ? _a : jest.fn(function (elt, fn, signal) {
        elt.addEventListener("encrypted", fn);
        signal.register(function () {
            elt.removeEventListener("encrypted", fn);
        });
        ee.addEventListener("encrypted", function (evt) {
            if (evt.elt === elt) {
                fn(evt.value);
            }
        }, signal);
    });
    var mockEvents = {
        onKeyMessage: jest.fn(function (elt, fn, signal) {
            elt.addEventListener("message", fn, signal);
            ee.addEventListener("keymessage", function (evt) {
                if (evt.session === elt) {
                    fn(evt.value);
                }
            }, signal);
        }),
        onKeyError: jest.fn(function (elt, fn, signal) {
            elt.addEventListener("error", fn, signal);
            ee.addEventListener("keyerror", function (evt) {
                if (evt.session === elt) {
                    fn(evt.value);
                }
            }, signal);
        }),
        onKeyStatusesChange: jest.fn(function (elt, fn, signal) {
            elt.addEventListener("keystatuseschange", fn, signal);
            ee.addEventListener("keystatuseschange", function (evt) {
                if (evt.session === elt) {
                    fn(evt.value);
                }
            }, signal);
        }),
    };
    var mockRmksa = (_b = presets.requestMediaKeySystemAccess) !== null && _b !== void 0 ? _b : jest.fn(requestMediaKeySystemAccessImpl);
    var mockSetMediaKeys = (_c = presets.setMediaKeys) !== null && _c !== void 0 ? _c : jest.fn(function () { return Promise.resolve(); });
    var mockGenerateKeyRequest = jest.fn(function (mks, initializationDataType, initializationData) {
        return mks.generateRequest(initializationDataType, initializationData);
    });
    var mockGetInitData = jest.fn(function (encryptedEvent) {
        return encryptedEvent;
    });
    if (presets.shouldRenewMediaKeySystemAccess === undefined) {
        jest.mock("../../../../compat/should_renew_media_key_system_access", function () {
            return jest.fn(function () { return false; });
        });
    }
    else {
        jest.mock("../../../../compat/should_renew_media_key_system_access", function () { return presets.shouldRenewMediaKeySystemAccess; });
    }
    if (presets.canReuseMediaKeys === undefined) {
        jest.mock("../../../../compat/can_reuse_media_keys", function () { return jest.fn(function () { return true; }); });
    }
    else {
        jest.mock("../../../../compat/can_reuse_media_keys", function () { return presets.canReuseMediaKeys; });
    }
    var emeImplementation = {
        onEncrypted: onEncrypted,
        requestMediaKeySystemAccess: mockRmksa,
        setMediaKeys: mockSetMediaKeys,
    };
    jest.mock("../../../../compat/eme", function () { return ({
        __esModule: true,
        default: emeImplementation,
        getInitData: mockGetInitData,
        generateKeyRequest: mockGenerateKeyRequest,
    }); });
    return {
        mockEvents: mockEvents,
        eventTriggers: {
            triggerEncrypted: function (elt, value) {
                ee.triggerEncrypted(elt, value);
            },
            triggerKeyMessage: function (session, value) {
                ee.triggerKeyMessage(session, value);
            },
            triggerKeyError: function (session, value) {
                ee.triggerKeyError(session, value);
            },
            triggerKeyStatusesChange: function (session, value) {
                ee.triggerKeyStatusesChange(session, value);
            },
        },
        mockRequestMediaKeySystemAccess: mockRmksa,
        mockGetInitData: mockGetInitData,
        mockSetMediaKeys: mockSetMediaKeys,
        mockGenerateKeyRequest: mockGenerateKeyRequest,
    };
}
exports.mockCompat = mockCompat;
/**
 * Check that the ContentDecryptor, when called with those arguments, throws.
 * If that's the case, resolve with the corresponding error.
 * Else, reject.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @param {Array} keySystemsConfigs
 * @returns {Promise}
 */
function testContentDecryptorError(ContentDecryptor, mediaElement, keySystemsConfigs) {
    return new Promise(function (res, rej) {
        var contentDecryptor = new ContentDecryptor(mediaElement, keySystemsConfigs);
        contentDecryptor.addEventListener("error", function (error) {
            res(error);
        });
        setTimeout(function () {
            rej(new Error("Timeout exceeded"));
        }, 10);
    });
}
exports.testContentDecryptorError = testContentDecryptorError;
/**
 * Does the reverse operation than what `formatFakeChallengeFromInitData` does:
 * Retrieve initialization data from a fake challenge done in our tests
 * @param {Uint8Array} challenge
 * @returns {Object}
 */
function extrackInfoFromFakeChallenge(challenge) {
    var licenseData = JSON.stringify((0, string_parsing_1.utf8ToStr)(challenge));
    var initData = (0, base64_1.base64ToBytes)(licenseData[1]);
    return { initData: initData, initDataType: licenseData[0] };
}
exports.extrackInfoFromFakeChallenge = extrackInfoFromFakeChallenge;
/**
 * @param {BufferSource} initData
 * @param {string} initDataType
 * @returns {Uint8Array}
 */
function formatFakeChallengeFromInitData(initData, initDataType) {
    var initDataAB = initData instanceof ArrayBuffer ? initData : initData.buffer;
    var objChallenge = [initDataType, (0, base64_1.bytesToBase64)(new Uint8Array(initDataAB))];
    return (0, string_parsing_1.strToUtf8)(JSON.stringify(objChallenge));
}
exports.formatFakeChallengeFromInitData = formatFakeChallengeFromInitData;
