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
var errors_1 = require("../../../errors");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Function} onError
 * @param {Object} cancelSignal
 */
function listenToMediaError(mediaElement, onError, cancelSignal) {
    if (cancelSignal.isCancelled()) {
        return;
    }
    mediaElement.addEventListener("error", onMediaError);
    cancelSignal.register(function () {
        mediaElement.removeEventListener("error", onMediaError);
    });
    function onMediaError() {
        var mediaError = mediaElement.error;
        var errorCode;
        var errorMessage;
        if (!(0, is_null_or_undefined_1.default)(mediaError)) {
            errorCode = mediaError.code;
            errorMessage = mediaError.message;
        }
        switch (errorCode) {
            case 1:
                errorMessage =
                    errorMessage !== null && errorMessage !== void 0 ? errorMessage : "The fetching of the associated resource was aborted by the user's request.";
                return onError(new errors_1.MediaError("MEDIA_ERR_ABORTED", errorMessage));
            case 2:
                errorMessage =
                    errorMessage !== null && errorMessage !== void 0 ? errorMessage : "A network error occurred which prevented the media from being " +
                        "successfully fetched";
                return onError(new errors_1.MediaError("MEDIA_ERR_NETWORK", errorMessage));
            case 3:
                errorMessage =
                    errorMessage !== null && errorMessage !== void 0 ? errorMessage : "An error occurred while trying to decode the media resource";
                return onError(new errors_1.MediaError("MEDIA_ERR_DECODE", errorMessage));
            case 4:
                errorMessage =
                    errorMessage !== null && errorMessage !== void 0 ? errorMessage : "The media resource has been found to be unsuitable.";
                return onError(new errors_1.MediaError("MEDIA_ERR_SRC_NOT_SUPPORTED", errorMessage));
            default:
                errorMessage =
                    errorMessage !== null && errorMessage !== void 0 ? errorMessage : "The HTMLMediaElement errored due to an unknown reason.";
                return onError(new errors_1.MediaError("MEDIA_ERR_UNKNOWN", errorMessage));
        }
    }
}
exports.default = listenToMediaError;
