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
var eme_1 = require("../../../../compat/eme");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var types_1 = require("../types");
/**
 * @param {Object} config
 * @returns {Promise}
 */
function probeHDCPPolicy(config) {
    if ((0, is_null_or_undefined_1.default)(eme_1.default.requestMediaKeySystemAccess)) {
        return Promise.reject("MediaCapabilitiesProber >>> API_CALL: " + "API not available");
    }
    if ((0, is_null_or_undefined_1.default)(config.hdcp)) {
        return Promise.reject("MediaCapabilitiesProber >>> API_CALL: " +
            "Missing policy argument for calling getStatusForPolicy.");
    }
    var hdcp = "hdcp-" + config.hdcp;
    var policy = { minHdcpVersion: hdcp };
    var keySystem = "org.w3.clearkey";
    var drmConfig = {
        initDataTypes: ["cenc"],
        audioCapabilities: [
            {
                contentType: 'audio/mp4;codecs="mp4a.40.2"',
            },
        ],
        videoCapabilities: [
            {
                contentType: 'video/mp4;codecs="avc1.42E01E"',
            },
        ],
    };
    return eme_1.default
        .requestMediaKeySystemAccess(keySystem, [drmConfig])
        .then(function (mediaKeysSystemAccess) {
        return mediaKeysSystemAccess
            .createMediaKeys()
            .then(function (mediaKeys) {
            if (!("getStatusForPolicy" in mediaKeys)) {
                // do the check here, as mediaKeys can be either be native MediaKeys or
                // custom MediaKeys from compat.
                throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                    "getStatusForPolicy API not available");
            }
            return mediaKeys
                .getStatusForPolicy(policy)
                .then(function (result) {
                var status;
                if (result === "usable") {
                    status = [types_1.ProberStatus.Supported];
                }
                else {
                    status = [types_1.ProberStatus.NotSupported];
                }
                return status;
            });
        })
            .catch(function () {
            var status = [types_1.ProberStatus.Unknown];
            return status;
        });
    });
}
exports.default = probeHDCPPolicy;
