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
var resolve_url_1 = require("../../../../utils/resolve_url");
/**
 * @param {Array.<string>} currentBaseURLs
 * @param {Array.<Object>} newBaseUrlsIR
 * @returns {Array.<string>}
 */
function resolveBaseURLs(currentBaseURLs, newBaseUrlsIR) {
    var _a;
    if (newBaseUrlsIR.length === 0) {
        return currentBaseURLs;
    }
    var newBaseUrls = newBaseUrlsIR.map(function (ir) {
        return { url: ir.value };
    });
    if (currentBaseURLs.length === 0) {
        return newBaseUrls;
    }
    var result = [];
    for (var i = 0; i < currentBaseURLs.length; i++) {
        var curBaseUrl = currentBaseURLs[i];
        for (var j = 0; j < newBaseUrls.length; j++) {
            var newBaseUrl = newBaseUrls[j];
            var newUrl = (0, resolve_url_1.default)(curBaseUrl.url, newBaseUrl.url);
            result.push({
                url: newUrl,
                serviceLocation: (_a = newBaseUrl.serviceLocation) !== null && _a !== void 0 ? _a : curBaseUrl.serviceLocation,
            });
        }
    }
    return result;
}
exports.default = resolveBaseURLs;
