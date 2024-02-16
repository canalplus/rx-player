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
var browser_compatibility_types_1 = require("../../../compat/browser_compatibility_types");
var log_1 = require("../../../log");
var create_media_source_1 = require("../../../main_thread/init/utils/create_media_source");
var main_media_source_interface_1 = require("../../../mse/main_media_source_interface");
var create_cancellable_promise_1 = require("../../../utils/create_cancellable_promise");
var id_generator_1 = require("../../../utils/id_generator");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var generateMediaSourceId = (0, id_generator_1.default)();
/**
 * Open the media source and create the `MainMediaSourceInterface`.
 * @param {HTMLVideoElement} videoElement
 * @param {string} codec
 * @param {Object} cleanUpSignal
 * @returns {Promise.<Object>}
 */
function prepareSourceBuffer(videoElement, codec, cleanUpSignal) {
    return (0, create_cancellable_promise_1.default)(cleanUpSignal, function (resolve, reject) {
        if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_)) {
            throw new Error("No MediaSource Object was found in the current browser.");
        }
        // make sure the media has been correctly reset
        var oldSrc = (0, is_non_empty_string_1.default)(videoElement.src) ? videoElement.src : null;
        (0, create_media_source_1.resetMediaElement)(videoElement, oldSrc);
        log_1.default.info("Init: Creating MediaSource");
        var mediaSource = new main_media_source_interface_1.default(generateMediaSourceId());
        if (mediaSource.handle.type === "handle") {
            videoElement.srcObject = mediaSource.handle.value;
            cleanUpSignal.register(function () {
                (0, create_media_source_1.resetMediaElement)(videoElement, null);
            });
        }
        else {
            var objectURL_1 = URL.createObjectURL(mediaSource.handle.value);
            log_1.default.info("Init: Attaching MediaSource URL to the media element", objectURL_1);
            videoElement.src = objectURL_1;
            cleanUpSignal.register(function () {
                (0, create_media_source_1.resetMediaElement)(videoElement, objectURL_1);
            });
        }
        mediaSource.addEventListener("mediaSourceOpen", onSourceOpen);
        return function () {
            mediaSource.removeEventListener("mediaSourceOpen", onSourceOpen);
        };
        function onSourceOpen() {
            try {
                mediaSource.removeEventListener("mediaSourceOpen", onSourceOpen);
                resolve(mediaSource.addSourceBuffer("video" /* SourceBufferType.Video */, codec));
            }
            catch (err) {
                reject(err);
            }
        }
    });
}
exports.default = prepareSourceBuffer;
