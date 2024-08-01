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
var global_scope_1 = require("../../../../../utils/global_scope");
var types_1 = require("../../types");
var format_1 = require("./format");
/**
 * @returns {Promise}
 */
function isTypeSupportedWithFeaturesAPIAvailable() {
    return new Promise(function (resolve) {
        if (!("MSMediaKeys" in global_scope_1.default)) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " + "MSMediaKeys API not available");
        }
        /* eslint-disable @typescript-eslint/no-explicit-any */
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        if (!("isTypeSupportedWithFeatures" in global_scope_1.default.MSMediaKeys)) {
            /* eslint-enable @typescript-eslint/no-explicit-any */
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "isTypeSupportedWithFeatures not available");
        }
        resolve();
    });
}
/**
 * @param {Object} config
 * @returns {Promise}
 */
function probeTypeWithFeatures(config) {
    return isTypeSupportedWithFeaturesAPIAvailable().then(function () {
        var keySystem = config.keySystem;
        var type = (function () {
            if (keySystem === undefined ||
                keySystem.type === undefined ||
                keySystem.type.length === 0) {
                return "org.w3.clearkey";
            }
            return keySystem.type;
        })();
        var features = (0, format_1.default)(config);
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        /* eslint-disable @typescript-eslint/no-unsafe-call */
        /* eslint-disable @typescript-eslint/no-explicit-any */
        var result = global_scope_1.default.MSMediaKeys.isTypeSupportedWithFeatures(type, features);
        /* eslint-enable @typescript-eslint/no-explicit-any */
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        /* eslint-enable @typescript-eslint/no-unsafe-call */
        function formatSupport(support) {
            if (support === "") {
                throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                    "Bad arguments for calling isTypeSupportedWithFeatures");
            }
            else {
                switch (support) {
                    case "Not Supported":
                        return [types_1.ProberStatus.NotSupported];
                    case "Maybe":
                        return [types_1.ProberStatus.Unknown];
                    case "Probably":
                        return [types_1.ProberStatus.Supported];
                    default:
                        return [types_1.ProberStatus.Unknown];
                }
            }
        }
        return formatSupport(result);
    });
}
exports.default = probeTypeWithFeatures;
