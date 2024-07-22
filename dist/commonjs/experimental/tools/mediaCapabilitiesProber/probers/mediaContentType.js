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
var browser_compatibility_types_1 = require("../../../../compat/browser_compatibility_types");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var types_1 = require("../types");
/**
 * @param {Object} config
 * @returns {Promise}
 */
function probeContentType(config) {
    return new Promise(function (resolve) {
        if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_)) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " + "MediaSource API not available");
        }
        /* eslint-disable @typescript-eslint/unbound-method */
        if (typeof browser_compatibility_types_1.MediaSource_.isTypeSupported !== "function") {
            /* eslint-enable @typescript-eslint/unbound-method */
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " + "isTypeSupported not available");
        }
        var contentTypes = [];
        if (config.video !== undefined &&
            config.video.contentType !== undefined &&
            config.video.contentType.length > 0) {
            contentTypes.push(config.video.contentType);
        }
        if (config.audio !== undefined &&
            config.audio.contentType !== undefined &&
            config.audio.contentType.length > 0) {
            contentTypes.push(config.audio.contentType);
        }
        if (contentTypes.length === 0) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "Not enough arguments for calling isTypeSupported.");
        }
        for (var i = 0; i < contentTypes.length; i++) {
            if (!browser_compatibility_types_1.MediaSource_.isTypeSupported(contentTypes[i])) {
                resolve([types_1.ProberStatus.NotSupported]);
                return;
            }
        }
        resolve([types_1.ProberStatus.Supported]);
    });
}
exports.default = probeContentType;
