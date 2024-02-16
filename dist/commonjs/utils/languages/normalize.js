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
exports.normalizeTextTrack = exports.normalizeAudioTrack = void 0;
var is_non_empty_string_1 = require("../is_non_empty_string");
var is_null_or_undefined_1 = require("../is_null_or_undefined");
var ISO_639_1_to_ISO_639_3_1 = require("./ISO_639-1_to_ISO_639-3");
var ISO_639_2_to_ISO_639_3_1 = require("./ISO_639-2_to_ISO_639-3");
/**
 * Normalize language given.
 * Basically:
 *   - converts it to lowercase.
 *   - normalize "base" (what is before the possible first "-") to an ISO639-3
 *     compatible string.
 * @param {string} _language
 * @returns {string}
 */
function normalizeLanguage(_language) {
    if ((0, is_null_or_undefined_1.default)(_language) || _language === "") {
        return "";
    }
    var fields = ("" + _language).toLowerCase().split("-");
    var base = fields[0];
    var normalizedBase = normalizeBase(base);
    if ((0, is_non_empty_string_1.default)(normalizedBase)) {
        return normalizedBase;
    }
    return _language;
}
/**
 * Normalize language into an ISO639-3 format.
 * Returns undefined if it failed to do so
 * @param {string} base
 * @returns {string}
 */
function normalizeBase(base) {
    var result;
    switch (base.length) {
        case 2:
            result = ISO_639_1_to_ISO_639_3_1.default[base];
            break;
        case 3:
            result = ISO_639_2_to_ISO_639_3_1.default[base];
            break;
    }
    return result;
}
/**
 * Normalize text track from a user given input into an object
 * with three properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - closedCaption {Boolean}: Whether the track is a closed caption track
 * @param {Object|string|null|undefined} _language
 * @returns {Object|null|undefined}
 */
function normalizeTextTrack(_language) {
    if (!(0, is_null_or_undefined_1.default)(_language)) {
        var language = void 0;
        var closedCaption = false;
        if (typeof _language === "string") {
            language = _language;
        }
        else {
            language = _language.language;
            if (_language.closedCaption === true) {
                closedCaption = true;
            }
        }
        return { language: language, closedCaption: closedCaption, normalized: normalizeLanguage(language) };
    }
    return _language;
}
exports.normalizeTextTrack = normalizeTextTrack;
/**
 * Normalize audio track from a user given input into an object
 * with the following properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - audioDescription {Boolean}: Whether the track is a closed caption track
 *   - isDub {Boolean|undefined}: if true, this is a dub.
 * @param {Object|string|null|undefined} _language
 * @returns {Object|null|undefined}
 */
function normalizeAudioTrack(_language) {
    if ((0, is_null_or_undefined_1.default)(_language)) {
        return _language;
    }
    if (typeof _language === "string") {
        return {
            language: _language,
            audioDescription: false,
            normalized: normalizeLanguage(_language),
        };
    }
    var normalized = {
        language: _language.language,
        audioDescription: _language.audioDescription === true,
        normalized: normalizeLanguage(normalizeLanguage(_language.language)),
    };
    if (_language.isDub === true) {
        normalized.isDub = true;
    }
    return normalized;
}
exports.normalizeAudioTrack = normalizeAudioTrack;
exports.default = normalizeLanguage;
