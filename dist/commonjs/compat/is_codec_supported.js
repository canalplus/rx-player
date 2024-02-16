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
var log_1 = require("../log");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var is_worker_1 = require("../utils/is_worker");
var browser_compatibility_types_1 = require("./browser_compatibility_types");
/**
 * Setting this value limit the number of entries in the support map
 * preventing important memory usage, value is arbitrary
 */
var MAX_SUPPORT_MAP_ENTRIES = 200;
/**
 * caching the codec support reduce the amount of call to `isTypeSupported`
 * and help for performance especially on low-end devices.
 */
var supportMap = new Map();
/**
 * Returns true if the given codec is supported by the browser's MediaSource
 * implementation.
 * @param {string} mimeType - The MIME media type that you want to test support
 * for in the current browser.
 * This may include the codecs parameter to provide added details about the
 * codecs used within the file.
 * @returns {Boolean}
 */
function isCodecSupported(mimeType) {
    if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_)) {
        if (is_worker_1.default) {
            log_1.default.error("Compat: Cannot request codec support in a worker without MSE.");
        }
        return false;
    }
    /* eslint-disable @typescript-eslint/unbound-method */
    if (typeof browser_compatibility_types_1.MediaSource_.isTypeSupported === "function") {
        /* eslint-enable @typescript-eslint/unbound-method */
        var cachedSupport = supportMap.get(mimeType);
        if (cachedSupport !== undefined) {
            return cachedSupport;
        }
        else {
            var isSupported = browser_compatibility_types_1.MediaSource_.isTypeSupported(mimeType);
            if (supportMap.size >= MAX_SUPPORT_MAP_ENTRIES) {
                supportMap.clear();
            }
            supportMap.set(mimeType, isSupported);
            return isSupported;
        }
    }
    return true;
}
exports.default = isCodecSupported;
