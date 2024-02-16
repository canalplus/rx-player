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
var global_scope_1 = require("../../../../utils/global_scope");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var types_1 = require("../types");
/**
 * @param {Object} config
 * @returns {Promise}
 */
function probeMatchMedia(config) {
    return new Promise(function (resolve) {
        /* eslint-disable @typescript-eslint/unbound-method */
        if (typeof global_scope_1.default.matchMedia !== "function") {
            /* eslint-enable @typescript-eslint/unbound-method */
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " + "matchMedia not available");
        }
        if ((0, is_null_or_undefined_1.default)(config.display) ||
            config.display.colorSpace === undefined ||
            config.display.colorSpace.length === 0) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "Not enough arguments for calling matchMedia.");
        }
        var match = global_scope_1.default.matchMedia("(color-gamut: ".concat(config.display.colorSpace, ")"));
        if (match.media === "not all") {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "Bad arguments for calling matchMedia.");
        }
        var result = [
            match.matches ? types_1.ProberStatus.Supported : types_1.ProberStatus.NotSupported,
        ];
        resolve(result);
    });
}
exports.default = probeMatchMedia;
