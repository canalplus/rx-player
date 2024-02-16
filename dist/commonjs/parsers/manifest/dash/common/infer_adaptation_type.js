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
var manifest_1 = require("../../../../manifest");
var array_find_1 = require("../../../../utils/array_find");
var array_includes_1 = require("../../../../utils/array_includes");
/** Different `role`s a text Adaptation can be. */
var SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];
/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Array.<Object>} representations
 * @param {string|null} adaptationMimeType
 * @param {string|null} adaptationCodecs
 * @param {Array.<Object>|null} adaptationRoles
 * @returns {string} - "audio"|"video"|"text"|"metadata"|"unknown"
 */
function inferAdaptationType(representations, adaptationMimeType, adaptationCodecs, adaptationRoles) {
    function fromMimeType(mimeType, roles) {
        var topLevel = mimeType.split("/")[0];
        if ((0, array_includes_1.default)(manifest_1.SUPPORTED_ADAPTATIONS_TYPE, topLevel)) {
            return topLevel;
        }
        if (mimeType === "application/ttml+xml") {
            return "text";
        }
        // manage DASH-IF mp4-embedded subtitles and metadata
        if (mimeType === "application/mp4") {
            if (roles !== null) {
                if ((0, array_find_1.default)(roles, function (role) {
                    return role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
                        (0, array_includes_1.default)(SUPPORTED_TEXT_TYPES, role.value);
                }) !== undefined) {
                    return "text";
                }
            }
            return undefined;
        }
    }
    function fromCodecs(codecs) {
        switch (codecs.substring(0, 3)) {
            case "avc":
            case "hev":
            case "hvc":
            case "vp8":
            case "vp9":
            case "av1":
                return "video";
            case "vtt":
                return "text";
        }
        switch (codecs.substring(0, 4)) {
            case "mp4a":
                return "audio";
            case "wvtt":
            case "stpp":
                return "text";
        }
    }
    if (adaptationMimeType !== null) {
        var typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles);
        if (typeFromMimeType !== undefined) {
            return typeFromMimeType;
        }
    }
    if (adaptationCodecs !== null) {
        var typeFromCodecs = fromCodecs(adaptationCodecs);
        if (typeFromCodecs !== undefined) {
            return typeFromCodecs;
        }
    }
    for (var i = 0; i < representations.length; i++) {
        var representation = representations[i];
        var _a = representation.attributes, mimeType = _a.mimeType, codecs = _a.codecs;
        if (mimeType !== undefined) {
            var typeFromMimeType = fromMimeType(mimeType, adaptationRoles);
            if (typeFromMimeType !== undefined) {
                return typeFromMimeType;
            }
        }
        if (codecs !== undefined) {
            var typeFromCodecs = fromCodecs(codecs);
            if (typeFromCodecs !== undefined) {
                return typeFromCodecs;
            }
        }
    }
    return undefined;
}
exports.default = inferAdaptationType;
