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
exports.isKnownError = exports.NetworkErrorTypes = exports.OtherError = exports.NetworkError = exports.MediaError = exports.formatError = exports.ErrorTypes = exports.ErrorCodes = exports.SourceBufferError = exports.EncryptedMediaError = exports.CustomLoaderError = void 0;
var custom_loader_error_1 = require("./custom_loader_error");
exports.CustomLoaderError = custom_loader_error_1.default;
var encrypted_media_error_1 = require("./encrypted_media_error");
exports.EncryptedMediaError = encrypted_media_error_1.default;
var error_codes_1 = require("./error_codes");
Object.defineProperty(exports, "ErrorCodes", { enumerable: true, get: function () { return error_codes_1.ErrorCodes; } });
Object.defineProperty(exports, "ErrorTypes", { enumerable: true, get: function () { return error_codes_1.ErrorTypes; } });
Object.defineProperty(exports, "NetworkErrorTypes", { enumerable: true, get: function () { return error_codes_1.NetworkErrorTypes; } });
var format_error_1 = require("./format_error");
exports.formatError = format_error_1.default;
var is_known_error_1 = require("./is_known_error");
exports.isKnownError = is_known_error_1.default;
var media_error_1 = require("./media_error");
exports.MediaError = media_error_1.default;
var network_error_1 = require("./network_error");
exports.NetworkError = network_error_1.default;
var other_error_1 = require("./other_error");
exports.OtherError = other_error_1.default;
var source_buffer_error_1 = require("./source_buffer_error");
exports.SourceBufferError = source_buffer_error_1.default;
