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
import { base64ToBytes, bytesToBase64 } from "../../../../utils/base64";
import EventEmitter from "../../../../utils/event_emitter";
import flatMap from "../../../../utils/flat_map";
import { strToUtf8, utf8ToStr } from "../../../../utils/string_parsing";
/** Default MediaKeySystemAccess configuration used by the RxPlayer. */
export const defaultKSConfig = [
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
export const defaultPRRecommendationKSConfig = [
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
export const defaultWidevineConfig = (() => {
    const ROBUSTNESSES = [
        "HW_SECURE_ALL",
        "HW_SECURE_DECODE",
        "HW_SECURE_CRYPTO",
        "SW_SECURE_DECODE",
        "SW_SECURE_CRYPTO",
    ];
    const videoCapabilities = flatMap(ROBUSTNESSES, (robustness) => {
        return [
            { contentType: 'video/mp4;codecs="avc1.4d401e"', robustness },
            { contentType: 'video/mp4;codecs="avc1.42e01e"', robustness },
            { contentType: 'video/webm;codecs="vp8"', robustness },
        ];
    });
    const audioCapabilities = flatMap(ROBUSTNESSES, (robustness) => {
        return [
            { contentType: 'audio/mp4;codecs="mp4a.40.2"', robustness },
            { contentType: "audio/webm;codecs=opus", robustness },
        ];
    });
    return [
        Object.assign(Object.assign({}, defaultKSConfig[0]), { audioCapabilities, videoCapabilities }),
        defaultKSConfig[1],
    ];
})();
/**
 * Custom implementation of an EME-compliant MediaKeyStatusMap.
 * @class MediaKeyStatusMapImpl
 */
export class MediaKeyStatusMapImpl {
    get size() {
        return this._map.size;
    }
    constructor() {
        this._map = new Map();
    }
    get(keyId) {
        const keyIdAB = keyId instanceof ArrayBuffer ? keyId : keyId.buffer;
        return this._map.get(keyIdAB);
    }
    has(keyId) {
        const keyIdAB = keyId instanceof ArrayBuffer ? keyId : keyId.buffer;
        return this._map.has(keyIdAB);
    }
    forEach(callbackfn, 
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    thisArg) {
        this._map.forEach((value, key) => callbackfn.bind(thisArg, value, key, this));
    }
    _setKeyStatus(keyId, value) {
        const keyIdAB = keyId instanceof ArrayBuffer ? keyId : keyId.buffer;
        if (value === undefined) {
            this._map.delete(keyIdAB);
        }
        else {
            this._map.set(keyIdAB, value);
        }
    }
}
/**
 * Custom implementation of an EME-compliant MediaKeySession.
 * @class MediaKeySessionImpl
 */
export class MediaKeySessionImpl extends EventEmitter {
    constructor() {
        super();
        this._currentKeyId = 0;
        this.expiration = Number.MAX_VALUE;
        this.keyStatuses = new MediaKeyStatusMapImpl();
        this.closed = new Promise((res) => {
            this._close = res;
        });
        this.onkeystatuseschange = null;
        this.onmessage = null;
        this.sessionId = "";
    }
    close() {
        if (this._close !== undefined) {
            this._close();
        }
        return Promise.resolve();
    }
    generateRequest(initDataType, initData) {
        const msg = formatFakeChallengeFromInitData(initData, initDataType);
        setTimeout(() => {
            const event = Object.assign(new CustomEvent("message"), {
                message: msg.buffer,
                messageType: "license-request",
            });
            this.trigger("message", event);
            if (this.onmessage !== null && this.onmessage !== undefined) {
                this.onmessage(event);
            }
        }, 5);
        return Promise.resolve();
    }
    load(_sessionId) {
        throw new Error("Not implemented yet");
    }
    remove() {
        return Promise.resolve();
    }
    update(_response) {
        this.keyStatuses._setKeyStatus(new Uint8Array([0, 1, 2, this._currentKeyId++]), "usable");
        const event = new CustomEvent("keystatuseschange");
        setTimeout(() => {
            this.trigger("keyStatusesChange", event);
            if (this.onkeystatuseschange !== null && this.onkeystatuseschange !== undefined) {
                this.onkeystatuseschange(event);
            }
        }, 50);
        return Promise.resolve();
    }
}
/**
 * Custom implementation of an EME-compliant MediaKeys.
 * @class MediaKeysImpl
 */
export class MediaKeysImpl {
    createSession(_sessionType) {
        return new MediaKeySessionImpl();
    }
    setServerCertificate(_serverCertificate) {
        return Promise.resolve(true);
    }
}
/**
 * Custom implementation of an EME-compliant MediaKeySystemAccess.
 * @class MediaKeySystemAccessImpl
 */
export class MediaKeySystemAccessImpl {
    constructor(keySystem, config) {
        this.keySystem = keySystem;
        this._config = config;
    }
    createMediaKeys() {
        return Promise.resolve(new MediaKeysImpl());
    }
    getConfiguration() {
        return this._config;
    }
}
export function requestMediaKeySystemAccessImpl(keySystem, config) {
    return Promise.resolve(new MediaKeySystemAccessImpl(keySystem, config));
}
class MockedDecryptorEventEmitter extends EventEmitter {
    triggerEncrypted(elt, value) {
        this.trigger("encrypted", { elt, value });
    }
    triggerKeyError(session, value) {
        this.trigger("keyerror", { session, value });
    }
    triggerKeyStatusesChange(session, value) {
        this.trigger("keystatuseschange", { session, value });
    }
    triggerKeyMessage(session, value) {
        this.trigger("keymessage", { session, value });
    }
}
/**
 * Mock functions coming from the compat directory.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function mockCompat(presets = {}) {
    var _a, _b, _c;
    const ee = new MockedDecryptorEventEmitter();
    const onEncrypted = (_a = presets.onEncrypted) !== null && _a !== void 0 ? _a : jest.fn((elt, fn, signal) => {
        elt.addEventListener("encrypted", fn);
        signal.register(() => {
            elt.removeEventListener("encrypted", fn);
        });
        ee.addEventListener("encrypted", (evt) => {
            if (evt.elt === elt) {
                fn(evt.value);
            }
        }, signal);
    });
    const mockEvents = {
        onKeyMessage: jest.fn((elt, fn, signal) => {
            elt.addEventListener("message", fn, signal);
            ee.addEventListener("keymessage", (evt) => {
                if (evt.session === elt) {
                    fn(evt.value);
                }
            }, signal);
        }),
        onKeyError: jest.fn((elt, fn, signal) => {
            elt.addEventListener("error", fn, signal);
            ee.addEventListener("keyerror", (evt) => {
                if (evt.session === elt) {
                    fn(evt.value);
                }
            }, signal);
        }),
        onKeyStatusesChange: jest.fn((elt, fn, signal) => {
            elt.addEventListener("keystatuseschange", fn, signal);
            ee.addEventListener("keystatuseschange", (evt) => {
                if (evt.session === elt) {
                    fn(evt.value);
                }
            }, signal);
        }),
    };
    const mockRmksa = (_b = presets.requestMediaKeySystemAccess) !== null && _b !== void 0 ? _b : jest.fn(requestMediaKeySystemAccessImpl);
    const mockSetMediaKeys = (_c = presets.setMediaKeys) !== null && _c !== void 0 ? _c : jest.fn(() => Promise.resolve());
    const mockGenerateKeyRequest = jest.fn((mks, initializationDataType, initializationData) => {
        return mks.generateRequest(initializationDataType, initializationData);
    });
    const mockGetInitData = jest.fn((encryptedEvent) => {
        return encryptedEvent;
    });
    if (presets.shouldRenewMediaKeySystemAccess === undefined) {
        jest.mock("../../../../compat/should_renew_media_key_system_access", () => jest.fn(() => false));
    }
    else {
        jest.mock("../../../../compat/should_renew_media_key_system_access", () => presets.shouldRenewMediaKeySystemAccess);
    }
    if (presets.canReuseMediaKeys === undefined) {
        jest.mock("../../../../compat/can_reuse_media_keys", () => jest.fn(() => true));
    }
    else {
        jest.mock("../../../../compat/can_reuse_media_keys", () => presets.canReuseMediaKeys);
    }
    const emeImplementation = {
        onEncrypted,
        requestMediaKeySystemAccess: mockRmksa,
        setMediaKeys: mockSetMediaKeys,
    };
    jest.mock("../../../../compat/eme", () => ({
        __esModule: true,
        default: emeImplementation,
        getInitData: mockGetInitData,
        generateKeyRequest: mockGenerateKeyRequest,
    }));
    return {
        mockEvents,
        eventTriggers: {
            triggerEncrypted(elt, value) {
                ee.triggerEncrypted(elt, value);
            },
            triggerKeyMessage(session, value) {
                ee.triggerKeyMessage(session, value);
            },
            triggerKeyError(session, value) {
                ee.triggerKeyError(session, value);
            },
            triggerKeyStatusesChange(session, value) {
                ee.triggerKeyStatusesChange(session, value);
            },
        },
        mockRequestMediaKeySystemAccess: mockRmksa,
        mockGetInitData,
        mockSetMediaKeys,
        mockGenerateKeyRequest,
    };
}
/**
 * Check that the ContentDecryptor, when called with those arguments, throws.
 * If that's the case, resolve with the corresponding error.
 * Else, reject.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @param {Array} keySystemsConfigs
 * @returns {Promise}
 */
export function testContentDecryptorError(ContentDecryptor, mediaElement, keySystemsConfigs) {
    return new Promise((res, rej) => {
        const contentDecryptor = new ContentDecryptor(mediaElement, keySystemsConfigs);
        contentDecryptor.addEventListener("error", (error) => {
            res(error);
        });
        setTimeout(() => {
            rej(new Error("Timeout exceeded"));
        }, 10);
    });
}
/**
 * Does the reverse operation than what `formatFakeChallengeFromInitData` does:
 * Retrieve initialization data from a fake challenge done in our tests
 * @param {Uint8Array} challenge
 * @returns {Object}
 */
export function extrackInfoFromFakeChallenge(challenge) {
    const licenseData = JSON.stringify(utf8ToStr(challenge));
    const initData = base64ToBytes(licenseData[1]);
    return { initData, initDataType: licenseData[0] };
}
/**
 * @param {BufferSource} initData
 * @param {string} initDataType
 * @returns {Uint8Array}
 */
export function formatFakeChallengeFromInitData(initData, initDataType) {
    const initDataAB = initData instanceof ArrayBuffer ? initData : initData.buffer;
    const objChallenge = [initDataType, bytesToBase64(new Uint8Array(initDataAB))];
    return strToUtf8(JSON.stringify(objChallenge));
}
