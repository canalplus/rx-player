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
var request_1 = require("../../utils/request");
var call_custom_manifest_loader_1 = require("../utils/call_custom_manifest_loader");
/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @param {Object} loaderOptions
 * @param {Object} cancelSignal
 */
function regularManifestLoader(url, loaderOptions, cancelSignal) {
    if (url === undefined) {
        throw new Error("Cannot perform HTTP(s) request. URL not known");
    }
    return (0, request_1.default)({
        url: url,
        responseType: "text",
        timeout: loaderOptions.timeout,
        connectionTimeout: loaderOptions.connectionTimeout,
        cancelSignal: cancelSignal,
    });
}
/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
function generateManifestLoader(_a) {
    var customManifestLoader = _a.customManifestLoader;
    return typeof customManifestLoader !== "function"
        ? regularManifestLoader
        : (0, call_custom_manifest_loader_1.default)(customManifestLoader, regularManifestLoader);
}
exports.default = generateManifestLoader;
