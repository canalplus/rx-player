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
var browser_detection_1 = require("./browser_detection");
var webkit_media_keys_constructor_1 = require("./eme/custom_media_keys/webkit_media_keys_constructor");
/**
 * On Safari 12.1, it seems that since fairplay CDM implementation
 * within the browser is not standard with EME w3c current spec, the
 * requestMediaKeySystemAccess API doesn't resolve positively, even
 * if the drm (fairplay in most cases) is supported.
 * @returns {boolean}
 */
function shouldFavourCustomSafariEME() {
    return (browser_detection_1.isSafariDesktop || browser_detection_1.isSafariMobile) && webkit_media_keys_constructor_1.WebKitMediaKeysConstructor !== undefined;
}
exports.default = shouldFavourCustomSafariEME;
