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
Object.defineProperty(exports, "__esModule", { value: true });
var array_find_1 = require("../../../../utils/array_find");
var log_1 = require("../log");
var types_1 = require("../types");
var probeMediaConfiguration_1 = require("./probeMediaConfiguration");
/**
 * Probe configuration and get status from result.
 * @param {Object} config
 * @param {Array.<Object>} browserAPIS
 * @returns {Promise.<string>}
 */
function getStatusFromConfiguration(config, browserAPIS) {
    return (0, probeMediaConfiguration_1.default)(config, browserAPIS).then(function (_a) {
        var globalStatus = _a.globalStatus;
        switch (globalStatus) {
            case types_1.ProberStatus.Unknown:
                return "Unknown";
            case types_1.ProberStatus.Supported:
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
var mediaCapabilitiesProber = {
    /**
     * Set logger level
     * @param {string} level
     */
    set LogLevel(level) {
        log_1.default.setLevel(level, log_1.default.getFormat());
    },
    /**
     * Get logger level
     * @returns {string}
     */
    get LogLevel() {
        return log_1.default.getLevel();
    },
    /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     * @param {string} hdcp
     * @returns {Promise}
     */
    getStatusForHDCP: function (hdcp) {
        if (hdcp === undefined || hdcp.length === 0) {
            return Promise.reject("MediaCapabilitiesProbers >>> Bad Arguments: " + "No HDCP Policy specified.");
        }
        var config = {
            hdcp: hdcp,
        };
        var browserAPIS = [
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
    getDecodingCapabilities: function (mediaConfig) {
        var config = {
            type: mediaConfig.type,
            video: mediaConfig.video,
            audio: mediaConfig.audio,
        };
        var browserAPIS = [
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
    getCompatibleDRMConfigurations: function (configurations) {
        var promises = [];
        configurations.forEach(function (configuration) {
            var globalConfig = {
                keySystem: configuration,
            };
            var browserAPIS = ["requestMediaKeySystemAccess"];
            promises.push((0, probeMediaConfiguration_1.default)(globalConfig, browserAPIS)
                .then(function (_a) {
                var globalStatus = _a.globalStatus, resultsFromAPIS = _a.resultsFromAPIS;
                var requestMediaKeySystemAccessResults = (0, array_find_1.default)(resultsFromAPIS, function (result) { return result.APIName === "requestMediaKeySystemAccess"; });
                return {
                    // As only one API is called, global status is
                    // requestMediaKeySystemAccess status.
                    globalStatus: globalStatus,
                    result: requestMediaKeySystemAccessResults === undefined
                        ? undefined
                        : requestMediaKeySystemAccessResults.result,
                };
            })
                .catch(function () {
                // API couln't be called.
                return { globalStatus: types_1.ProberStatus.NotSupported };
            }));
        });
        return Promise.all(promises).then(function (configs) {
            // TODO I added those lines to work-around a type issue but does it
            // really correspond to the original intent? I find it hard to
            // understand and shouldn't we also rely on things like `globalStatus`
            // here?
            return configs
                .filter(function (x) { return x.result !== undefined; })
                .map(function (_a) {
                var result = _a.result;
                return result;
            });
        });
    },
    /**
     * Get display capabilites. Tells if display can output
     * with specific video and/or audio constrains.
     * @param {Object} displayConfig
     * @returns {Promise}
     */
    getDisplayCapabilities: function (displayConfig) {
        var config = { display: displayConfig };
        var browserAPIS = ["matchMedia", "isTypeSupportedWithFeatures"];
        return getStatusFromConfiguration(config, browserAPIS);
    },
};
exports.default = mediaCapabilitiesProber;
