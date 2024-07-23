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
/**
 * This file exports a MinimalPlayer class for which features can be lazy-loaded.
 *
 * This allows to import a "minimal" player with a small bundle size and then
 * import only features that is needed.
 */
import isDebugModeEnabled from "./compat/is_debug_mode_enabled";
import patchWebkitSourceBuffer from "./compat/patch_webkit_source_buffer";
import features from "./features";
import logger from "./log";
import Player from "./main_thread/api";
import MainCodecSupportProber from "./mse/main_codec_support_prober";
patchWebkitSourceBuffer();
// TODO this should be auto-imported when the various features that needs it
// are added.
// For now, I'm scare of breaking things so I'm not removing it yet.
features.codecSupportProber = MainCodecSupportProber;
if (isDebugModeEnabled()) {
    logger.setLevel("DEBUG");
}
else if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
    logger.setLevel("NONE" /* __LOGGER_LEVEL__.CURRENT_LEVEL */);
}
/**
 * Minimal Player which starts with no feature.
 */
export default Player;
