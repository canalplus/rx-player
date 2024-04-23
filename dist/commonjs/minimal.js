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
/**
 * This file exports a MinimalPlayer class for which features can be lazy-loaded.
 *
 * This allows to import a "minimal" player with a small bundle size and then
 * import only features that is needed.
 */
var is_debug_mode_enabled_1 = require("./compat/is_debug_mode_enabled");
var patch_webkit_source_buffer_1 = require("./compat/patch_webkit_source_buffer");
var features_1 = require("./features");
var log_1 = require("./log");
var api_1 = require("./main_thread/api");
var main_codec_support_prober_1 = require("./mse/main_codec_support_prober");
(0, patch_webkit_source_buffer_1.default)();
// TODO this should be auto-imported when the various features that needs it
// are added.
// For now, I'm scare of breaking things so I'm not removing it yet.
features_1.default.codecSupportProber = main_codec_support_prober_1.default;
if ((0, is_debug_mode_enabled_1.default)()) {
    log_1.default.setLevel("DEBUG");
}
else if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
    log_1.default.setLevel("NONE" /* __LOGGER_LEVEL__.CURRENT_LEVEL */);
}
/**
 * Minimal Player which starts with no feature.
 */
exports.default = api_1.default;
