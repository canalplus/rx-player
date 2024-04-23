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
export interface MSMediaKeyError {
    readonly code: number;
    readonly systemCode: number;
    readonly MS_MEDIA_KEYERR_CLIENT: number;
    readonly MS_MEDIA_KEYERR_DOMAIN: number;
    readonly MS_MEDIA_KEYERR_HARDWARECHANGE: number;
    readonly MS_MEDIA_KEYERR_OUTPUT: number;
    readonly MS_MEDIA_KEYERR_SERVICE: number;
    readonly MS_MEDIA_KEYERR_UNKNOWN: number;
}
export interface MSMediaKeySession extends EventTarget {
    readonly error: MSMediaKeyError | null;
    readonly keySystem: string;
    readonly sessionId: string;
    close(): void;
    update(key: Uint8Array): void;
}
export interface MSMediaKeys {
    readonly keySystem: string;
    createSession(type: string, initData: Uint8Array, cdmData?: Uint8Array | null): MSMediaKeySession;
}
interface IMSMediaKeysConstructor {
    new (keySystem: string): MSMediaKeys;
    isTypeSupported(keySystem: string, type?: string | null): boolean;
    isTypeSupportedWithFeatures(keySystem: string, type?: string | null): string;
}
declare let MSMediaKeysConstructor: IMSMediaKeysConstructor | undefined;
export { MSMediaKeysConstructor };
