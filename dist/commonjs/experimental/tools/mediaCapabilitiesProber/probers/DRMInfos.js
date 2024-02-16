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
var log_1 = require("../log");
var types_1 = require("../types");
/**
 * @param {Object} mediaConfig
 * @returns {Promise}
 */
function probeDRMInfos(mediaConfig) {
    var keySystem = mediaConfig.keySystem;
    if ((0, is_null_or_undefined_1.default)(keySystem) || (0, is_null_or_undefined_1.default)(keySystem.type)) {
        return Promise.reject("MediaCapabilitiesProber >>> API_CALL: " +
            "Missing a type argument to request a media key system access.");
    }
    var type = keySystem.type;
    var configuration = keySystem.configuration === undefined ? {} : keySystem.configuration;
    var result = { type: type, configuration: configuration };
    if ((0, is_null_or_undefined_1.default)(eme_1.default.requestMediaKeySystemAccess)) {
        log_1.default.debug("MediaCapabilitiesProber >>> API_CALL: " +
            "Your browser has no API to request a media key system access.");
        // In that case, the API lack means that no EME workflow may be started.
        // So, the DRM configuration is not supported.
        return Promise.resolve([types_1.ProberStatus.NotSupported, result]);
    }
    return eme_1.default
        .requestMediaKeySystemAccess(type, [configuration])
        .then(function (keySystemAccess) {
        result.compatibleConfiguration = keySystemAccess.getConfiguration();
        var status = [
            types_1.ProberStatus.Supported,
            result,
        ];
        return status;
    })
        .catch(function () {
        return [types_1.ProberStatus.NotSupported, result];
    });
}
exports.default = probeDRMInfos;
