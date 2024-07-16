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
var add_query_string_1 = require("./add_query_string");
var call_custom_manifest_loader_1 = require("./call_custom_manifest_loader");
/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} preferredType
 * @returns {Function}
 */
function generateRegularManifestLoader(preferredType) {
    return function regularManifestLoader(initialUrl, loaderOptions, cancelSignal) {
        var _a, _b;
        if (initialUrl === undefined) {
            throw new Error("Cannot perform HTTP(s) request. URL not known");
        }
        var url = ((_a = loaderOptions.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
            ? (0, add_query_string_1.default)(initialUrl, loaderOptions.cmcdPayload.value)
            : initialUrl;
        var cmcdHeaders = ((_b = loaderOptions.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers"
            ? loaderOptions.cmcdPayload.value
            : undefined;
        // What follows could be written in a single line, but TypeScript wouldn't
        // shut up.
        // So I wrote that instead, temporarily of course ;)
        switch (preferredType) {
            case "arraybuffer":
                return (0, request_1.default)({
                    url: url,
                    headers: cmcdHeaders,
                    responseType: "arraybuffer",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                });
            case "text":
                return (0, request_1.default)({
                    url: url,
                    headers: cmcdHeaders,
                    responseType: "text",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                });
            case "document":
                return (0, request_1.default)({
                    url: url,
                    headers: cmcdHeaders,
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
 * @param {string} preferredType
 * @returns {Function}
 */
function generateManifestLoader(_a, preferredType, integrityCheck) {
    var customManifestLoader = _a.customManifestLoader;
    var regularManifestLoader = generateRegularManifestLoader(preferredType);
    var actualLoader = typeof customManifestLoader !== "function"
        ? regularManifestLoader
        : (0, call_custom_manifest_loader_1.default)(customManifestLoader, regularManifestLoader);
    return integrityCheck !== null ? integrityCheck(actualLoader) : actualLoader;
}
exports.default = generateManifestLoader;
