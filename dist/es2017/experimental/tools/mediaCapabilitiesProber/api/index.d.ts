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
import type { ICompatibleKeySystem, IDisplayConfiguration, IMediaConfiguration, IMediaKeySystemConfiguration } from "../types";
/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
declare const mediaCapabilitiesProber: {
    /**
     * Set logger level
     * @param {string} level
     */
    LogLevel: string;
    /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     * @param {string} hdcp
     * @returns {Promise}
     */
    getStatusForHDCP(hdcp: string): Promise<string>;
    /**
     * Get decoding capabilities from a given video and/or audio
     * configuration.
     * @param {Object} mediaConfig
     * @returns {Promise}
     */
    getDecodingCapabilities(mediaConfig: IMediaConfiguration): Promise<string>;
    /**
     * From an array of given configurations (type and key system configuration), return
     * supported ones.
     * @param {Array.<Object>} configurations
     * @returns {Promise}
     */
    getCompatibleDRMConfigurations(configurations: Array<{
        type: string;
        configuration: IMediaKeySystemConfiguration;
    }>): Promise<ICompatibleKeySystem[]>;
    /**
     * Get display capabilites. Tells if display can output
     * with specific video and/or audio constrains.
     * @param {Object} displayConfig
     * @returns {Promise}
     */
    getDisplayCapabilities(displayConfig: IDisplayConfiguration): Promise<string>;
};
export default mediaCapabilitiesProber;
