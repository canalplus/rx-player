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
import arrayFind from "../../../../utils/array_find";
import log from "../log";
import { ProberStatus } from "../types";
import probeMediaConfiguration from "./probeMediaConfiguration";
/**
 * Probe configuration and get status from result.
 * @param {Object} config
 * @param {Array.<Object>} browserAPIS
 * @returns {Promise.<string>}
 */
function getStatusFromConfiguration(config, browserAPIS) {
    return probeMediaConfiguration(config, browserAPIS).then(({ globalStatus }) => {
        switch (globalStatus) {
            case ProberStatus.Unknown:
                return "Unknown";
            case ProberStatus.Supported:
                return "Supported";
        }
        return "NotSupported";
    });
}
/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
const mediaCapabilitiesProber = {
    /**
     * Set logger level
     * @param {string} level
     */
    set LogLevel(level) {
        log.setLevel(level);
    },
    /**
     * Get logger level
     * @returns {string}
     */
    get LogLevel() {
        return log.getLevel();
    },
    /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     * @param {string} hdcp
     * @returns {Promise}
     */
    getStatusForHDCP(hdcp) {
        if (hdcp === undefined || hdcp.length === 0) {
            return Promise.reject("MediaCapabilitiesProbers >>> Bad Arguments: " + "No HDCP Policy specified.");
        }
        const config = {
            hdcp,
        };
        const browserAPIS = [
            "isTypeSupportedWithFeatures",
            "getStatusForPolicy",
        ];
        return getStatusFromConfiguration(config, browserAPIS);
    },
    /**
     * Get decoding capabilities from a given video and/or audio
     * configuration.
     * @param {Object} mediaConfig
     * @returns {Promise}
     */
    getDecodingCapabilities(mediaConfig) {
        const config = {
            type: mediaConfig.type,
            video: mediaConfig.video,
            audio: mediaConfig.audio,
        };
        const browserAPIS = [
            "isTypeSupported",
            "isTypeSupportedWithFeatures",
            "decodingInfos",
        ];
        return getStatusFromConfiguration(config, browserAPIS);
    },
    /**
     * From an array of given configurations (type and key system configuration), return
     * supported ones.
     * @param {Array.<Object>} configurations
     * @returns {Promise}
     */
    getCompatibleDRMConfigurations(configurations) {
        const promises = [];
        configurations.forEach((configuration) => {
            const globalConfig = {
                keySystem: configuration,
            };
            const browserAPIS = ["requestMediaKeySystemAccess"];
            promises.push(probeMediaConfiguration(globalConfig, browserAPIS)
                .then(({ globalStatus, resultsFromAPIS }) => {
                const requestMediaKeySystemAccessResults = arrayFind(resultsFromAPIS, (result) => result.APIName === "requestMediaKeySystemAccess");
                return {
                    // As only one API is called, global status is
                    // requestMediaKeySystemAccess status.
                    globalStatus,
                    result: requestMediaKeySystemAccessResults === undefined
                        ? undefined
                        : requestMediaKeySystemAccessResults.result,
                };
            })
                .catch(() => {
                // API couln't be called.
                return { globalStatus: ProberStatus.NotSupported };
            }));
        });
        return Promise.all(promises).then((configs) => {
            // TODO I added those lines to work-around a type issue but does it
            // really correspond to the original intent? I find it hard to
            // understand and shouldn't we also rely on things like `globalStatus`
            // here?
            return configs
                .filter((x) => x.result !== undefined)
                .map(({ result }) => result);
        });
    },
    /**
     * Get display capabilites. Tells if display can output
     * with specific video and/or audio constrains.
     * @param {Object} displayConfig
     * @returns {Promise}
     */
    getDisplayCapabilities(displayConfig) {
        const config = { display: displayConfig };
        const browserAPIS = ["matchMedia", "isTypeSupportedWithFeatures"];
        return getStatusFromConfiguration(config, browserAPIS);
    },
};
export default mediaCapabilitiesProber;
