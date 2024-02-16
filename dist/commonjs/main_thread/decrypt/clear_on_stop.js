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
var should_unset_media_keys_1 = require("../../compat/should_unset_media_keys");
var log_1 = require("../../log");
var dispose_decryption_resources_1 = require("./dispose_decryption_resources");
var media_keys_infos_store_1 = require("./utils/media_keys_infos_store");
/**
 * Clear DRM-related resources that should be cleared when the current content
 * stops its playback.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Promise}
 */
function clearOnStop(mediaElement) {
    log_1.default.info("DRM: Clearing-up DRM session.");
    if ((0, should_unset_media_keys_1.default)()) {
        log_1.default.info("DRM: disposing current MediaKeys.");
        return (0, dispose_decryption_resources_1.default)(mediaElement);
    }
    var currentState = media_keys_infos_store_1.default.getState(mediaElement);
    if (currentState !== null &&
        currentState.keySystemOptions.closeSessionsOnStop === true) {
        log_1.default.info("DRM: closing all current sessions.");
        return currentState.loadedSessionsStore.closeAllSessions();
    }
    log_1.default.info("DRM: Nothing to clear. Returning right away. No state =", currentState === null);
    return Promise.resolve();
}
exports.default = clearOnStop;
