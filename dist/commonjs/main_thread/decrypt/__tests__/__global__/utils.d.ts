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
/// <reference types="jest" />
import type { IEncryptedEventData } from "../../../../compat/eme";
import EventEmitter from "../../../../utils/event_emitter";
/** Default MediaKeySystemAccess configuration used by the RxPlayer. */
export declare const defaultKSConfig: ({
    audioCapabilities: {
        contentType: string;
    }[];
    distinctiveIdentifier: "optional";
    initDataTypes: readonly ["cenc"];
    persistentState: "optional";
    sessionTypes: readonly ["temporary"];
    videoCapabilities: {
        contentType: string;
    }[];
} | {
    audioCapabilities: undefined;
    distinctiveIdentifier: "optional";
    initDataTypes: readonly ["cenc"];
    persistentState: "optional";
    sessionTypes: readonly ["temporary"];
    videoCapabilities: undefined;
})[];
/**
 * Default "com.microsoft.playready.recommendation" MediaKeySystemAccess
 * configuration used by the RxPlayer.
 */
export declare const defaultPRRecommendationKSConfig: ({
    audioCapabilities: {
        robustness: string;
        contentType: string;
    }[];
    distinctiveIdentifier: "optional";
    initDataTypes: readonly ["cenc"];
    persistentState: "optional";
    sessionTypes: readonly ["temporary"];
    videoCapabilities: {
        robustness: string;
        contentType: string;
    }[];
} | {
    audioCapabilities: undefined;
    distinctiveIdentifier: "optional";
    initDataTypes: readonly ["cenc"];
    persistentState: "optional";
    sessionTypes: readonly ["temporary"];
    videoCapabilities: undefined;
})[];
/** Default Widevine MediaKeySystemAccess configuration used by the RxPlayer. */
export declare const defaultWidevineConfig: ({
    audioCapabilities: {
        contentType: string;
    }[];
    distinctiveIdentifier: "optional";
    initDataTypes: readonly ["cenc"];
    persistentState: "optional";
    sessionTypes: readonly ["temporary"];
    videoCapabilities: {
        contentType: string;
    }[];
} | {
    audioCapabilities: undefined;
    distinctiveIdentifier: "optional";
    initDataTypes: readonly ["cenc"];
    persistentState: "optional";
    sessionTypes: readonly ["temporary"];
    videoCapabilities: undefined;
})[];
/**
 * Custom implementation of an EME-compliant MediaKeyStatusMap.
 * @class MediaKeyStatusMapImpl
 */
export declare class MediaKeyStatusMapImpl {
    get size(): number;
    private _map;
    constructor();
    get(keyId: BufferSource): MediaKeyStatus | undefined;
    has(keyId: BufferSource): boolean;
    forEach(callbackfn: (value: MediaKeyStatus, key: BufferSource, parent: MediaKeyStatusMapImpl) => void, thisArg?: unknown): void;
    _setKeyStatus(keyId: BufferSource, value: MediaKeyStatus | undefined): void;
}
/**
 * Custom implementation of an EME-compliant MediaKeySession.
 * @class MediaKeySessionImpl
 */
export declare class MediaKeySessionImpl extends EventEmitter<Record<string, unknown>> {
    readonly closed: Promise<void>;
    readonly expiration: number;
    readonly keyStatuses: MediaKeyStatusMapImpl;
    readonly sessionId: string;
    onkeystatuseschange: ((this: MediaKeySessionImpl, ev: Event) => unknown) | null;
    onmessage: ((this: MediaKeySessionImpl, ev: MediaKeyMessageEvent) => unknown) | null;
    private _currentKeyId;
    private _close?;
    constructor();
    close(): Promise<void>;
    generateRequest(initDataType: string, initData: BufferSource): Promise<void>;
    load(_sessionId: string): Promise<boolean>;
    remove(): Promise<void>;
    update(_response: BufferSource): Promise<void>;
}
/**
 * Custom implementation of an EME-compliant MediaKeys.
 * @class MediaKeysImpl
 */
export declare class MediaKeysImpl {
    createSession(_sessionType?: MediaKeySessionType): MediaKeySessionImpl;
    setServerCertificate(_serverCertificate: BufferSource): Promise<true>;
}
/**
 * Custom implementation of an EME-compliant MediaKeySystemAccess.
 * @class MediaKeySystemAccessImpl
 */
export declare class MediaKeySystemAccessImpl {
    readonly keySystem: string;
    private readonly _config;
    constructor(keySystem: string, config: MediaKeySystemConfiguration[]);
    createMediaKeys(): Promise<MediaKeysImpl>;
    getConfiguration(): MediaKeySystemConfiguration[];
}
export declare function requestMediaKeySystemAccessImpl(keySystem: string, config: MediaKeySystemConfiguration[]): Promise<MediaKeySystemAccessImpl>;
/**
 * Mock functions coming from the compat directory.
 */
export declare function mockCompat(presets?: {
    canReuseMediaKeys?: jest.Mock;
    shouldRenewMediaKeySystemAccess?: jest.Mock;
    onEncrypted?: jest.Mock;
    requestMediaKeySystemAccess?: jest.Mock;
    setMediaKeys?: jest.Mock;
}): {
    mockEvents: Record<string, jest.Mock<any, any, any>>;
    eventTriggers: {
        triggerEncrypted(elt: HTMLMediaElement, value: unknown): void;
        triggerKeyMessage(session: MediaKeySessionImpl, value: unknown): void;
        triggerKeyError(session: MediaKeySessionImpl, value: unknown): void;
        triggerKeyStatusesChange(session: MediaKeySessionImpl, value: unknown): void;
    };
    mockRequestMediaKeySystemAccess: jest.Mock<any, any, any> | jest.Mock<Promise<MediaKeySystemAccessImpl>, [keySystem: string, config: MediaKeySystemConfiguration[]], any>;
    mockGetInitData: jest.Mock<IEncryptedEventData, [encryptedEvent: IEncryptedEventData], any>;
    mockSetMediaKeys: jest.Mock<any, any, any> | jest.Mock<Promise<void>, [], any>;
    mockGenerateKeyRequest: jest.Mock<Promise<void>, [mks: MediaKeySessionImpl, initializationDataType: any, initializationData: any], any>;
};
/**
 * Check that the ContentDecryptor, when called with those arguments, throws.
 * If that's the case, resolve with the corresponding error.
 * Else, reject.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @param {Array} keySystemsConfigs
 * @returns {Promise}
 */
export declare function testContentDecryptorError(ContentDecryptor: any, mediaElement: HTMLMediaElement, keySystemsConfigs: unknown[]): Promise<unknown>;
/**
 * Does the reverse operation than what `formatFakeChallengeFromInitData` does:
 * Retrieve initialization data from a fake challenge done in our tests
 * @param {Uint8Array} challenge
 * @returns {Object}
 */
export declare function extrackInfoFromFakeChallenge(challenge: Uint8Array): {
    initData: Uint8Array;
    initDataType: string;
};
/**
 * @param {BufferSource} initData
 * @param {string} initDataType
 * @returns {Uint8Array}
 */
export declare function formatFakeChallengeFromInitData(initData: BufferSource, initDataType: string): Uint8Array;
