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
exports.LOCAL_MANIFEST = void 0;
var media_source_content_initializer_1 = require("../../main_thread/init/media_source_content_initializer");
var main_codec_support_prober_1 = require("../../mse/main_codec_support_prober");
var local_1 = require("../../transports/local");
function addLocalManifestFeature(features) {
    features.transports.local = local_1.default;
    features.mainThreadMediaSourceInit = media_source_content_initializer_1.default;
    features.codecSupportProber = main_codec_support_prober_1.default;
}
exports.LOCAL_MANIFEST = addLocalManifestFeature;
exports.default = addLocalManifestFeature;
