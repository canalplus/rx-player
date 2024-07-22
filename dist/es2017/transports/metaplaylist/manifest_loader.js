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
import request from "../../utils/request";
import addQueryString from "../utils/add_query_string";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";
/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} initialUrl
 * @param {Object} loaderOptions
 * @param {Object} cancelSignal
 */
function regularManifestLoader(initialUrl, loaderOptions, cancelSignal) {
    var _a, _b;
    if (initialUrl === undefined) {
        throw new Error("Cannot perform HTTP(s) request. URL not known");
    }
    const url = ((_a = loaderOptions.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
        ? addQueryString(initialUrl, loaderOptions.cmcdPayload.value)
        : initialUrl;
    return request({
        url,
        headers: ((_b = loaderOptions.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers"
            ? loaderOptions.cmcdPayload.value
            : undefined,
        responseType: "text",
        timeout: loaderOptions.timeout,
        connectionTimeout: loaderOptions.connectionTimeout,
        cancelSignal,
    });
}
/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
export default function generateManifestLoader({ customManifestLoader, }) {
    return typeof customManifestLoader !== "function"
        ? regularManifestLoader
        : callCustomManifestLoader(customManifestLoader, regularManifestLoader);
}
