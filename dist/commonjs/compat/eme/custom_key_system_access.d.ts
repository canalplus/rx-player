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
import type { ICustomMediaKeys } from "./custom_media_keys";
export interface ICustomMediaKeySystemAccess {
    readonly keySystem: string;
    getConfiguration(): MediaKeySystemConfiguration;
    createMediaKeys(): Promise<MediaKeys | ICustomMediaKeys>;
}
/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
export default class CustomMediaKeySystemAccess implements ICustomMediaKeySystemAccess {
    private readonly _keyType;
    private readonly _mediaKeys;
    private readonly _configuration;
    /**
     * @param {string} _keyType - type of key system (e.g. "widevine" or
     * "com.widevine.alpha").
     * @param {Object} _mediaKeys - MediaKeys implementation
     * @param {Object} _configuration - Configuration accepted for this
     * MediaKeySystemAccess.
     */
    constructor(_keyType: string, _mediaKeys: ICustomMediaKeys | MediaKeys, _configuration: MediaKeySystemConfiguration);
    /**
     * @returns {string} - current key system type (e.g. "widevine" or
     * "com.widevine.alpha").
     */
    get keySystem(): string;
    /**
     * @returns {Promise.<Object>} - Promise wrapping the MediaKeys for this
     * MediaKeySystemAccess. Never rejects.
     */
    createMediaKeys(): Promise<ICustomMediaKeys | MediaKeys>;
    /**
     * @returns {Object} - Configuration accepted for this MediaKeySystemAccess.
     */
    getConfiguration(): MediaKeySystemConfiguration;
}
//# sourceMappingURL=custom_key_system_access.d.ts.map