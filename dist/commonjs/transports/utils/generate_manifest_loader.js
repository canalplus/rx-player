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
var assert_1 = require("../../utils/assert");
var request_1 = require("../../utils/request");
var call_custom_manifest_loader_1 = require("./call_custom_manifest_loader");
/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} preferredType
 * @returns {Function}
 */
function generateRegularManifestLoader(preferredType) {
    return function regularManifestLoader(url, loaderOptions, cancelSignal) {
        if (url === undefined) {
            throw new Error("Cannot perform HTTP(s) request. URL not known");
        }
        // What follows could be written in a single line, but TypeScript wouldn't
        // shut up.
        // So I wrote that instead, temporarily of course ;)
        switch (preferredType) {
            case "arraybuffer":
                return (0, request_1.default)({
                    url: url,
                    responseType: "arraybuffer",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                });
            case "text":
                return (0, request_1.default)({
                    url: url,
                    responseType: "text",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                });
            case "document":
                return (0, request_1.default)({
                    url: url,
                    responseType: "document",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                });
            default:
                (0, assert_1.assertUnreachable)(preferredType);
        }
    };
}
/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
function generateManifestLoader(_a, preferredType) {
    var customManifestLoader = _a.customManifestLoader;
    var regularManifestLoader = generateRegularManifestLoader(preferredType);
    if (typeof customManifestLoader !== "function") {
        return regularManifestLoader;
    }
    return (0, call_custom_manifest_loader_1.default)(customManifestLoader, regularManifestLoader);
}
exports.default = generateManifestLoader;
