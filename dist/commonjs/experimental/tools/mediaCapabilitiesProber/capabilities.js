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
var utils_1 = require("./utils");
var decodingInfos = [
    "type",
    {
        video: ["contentType", "width", "height", "bitrate", "framerate", "bitsPerComponent"],
    },
    {
        audio: ["contentType", "channels", "bitrate", "samplerate"],
    },
];
var getStatusForPolicy = ["hdcp"];
var isTypeSupported = [
    {
        video: ["contentType"],
    },
    {
        audio: ["contentType"],
    },
];
var matchMedia = [
    {
        display: ["colorSpace"],
    },
];
var requestMediaKeySystemAccess = [
    {
        keySystem: [
            "type",
            {
                configuration: [
                    "label",
                    "initDataTypes",
                    "audioCapabilities",
                    "videoCapabilities",
                    "distinctiveIdentifier",
                    "persistentState",
                    "sessionTypes",
                ],
            },
        ],
    },
];
var isTypeSupportedWithFeatures = [
    "type",
    {
        video: ["contentType", "width", "height", "bitrate", "framerate", "bitsPerComponent"],
    },
    {
        audio: ["contentType", "channels", "bitrate", "samplerate"],
    },
    "hdcp",
    {
        keySystem: [
            "type",
            {
                configuration: [
                    "label",
                    "initDataTypes",
                    "audioCapabilities",
                    "videoCapabilities",
                    "distinctiveIdentifier",
                    "persistentState",
                    "sessionTypes",
                ],
            },
        ],
    },
    {
        display: ["colorSpace", "width", "height", "bitsPerComponent"],
    },
];
var capabilites = {
    decodingInfos: decodingInfos,
    getStatusForPolicy: getStatusForPolicy,
    isTypeSupported: isTypeSupported,
    matchMedia: matchMedia,
    requestMediaKeySystemAccess: requestMediaKeySystemAccess,
    isTypeSupportedWithFeatures: isTypeSupportedWithFeatures,
};
/**
 * Get probed configuration.
 * @param {Object} config
 * @param {Array<string>} probers
 * @returns {Object}
 */
function getProbedConfiguration(config, probers) {
    var target = [];
    (0, utils_1.extend)(target, probers.map(function (prober) { return capabilites[prober]; }));
    return (0, utils_1.filterConfigurationWithCapabilities)(target, config);
}
exports.default = getProbedConfiguration;
