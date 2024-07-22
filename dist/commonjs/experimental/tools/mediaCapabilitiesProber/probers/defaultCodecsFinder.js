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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDefaultAudioCodec = exports.findDefaultVideoCodec = void 0;
var browser_compatibility_types_1 = require("../../../../compat/browser_compatibility_types");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
/**
 * Check if one of given video codecs are supported for decode.
 * These video codecs are chose for their wide proven compatibility and
 * popularity.
 * @returns {string}
 */
function findDefaultVideoCodec() {
    var e_1, _a;
    var videoCodecs = [
        'video/mp4;codecs="avc1.4d401e"',
        'video/mp4;codecs="avc1.42e01e"',
        'video/webm;codecs="vp8"',
    ];
    /* eslint-disable @typescript-eslint/unbound-method */
    if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_) ||
        typeof browser_compatibility_types_1.MediaSource_.isTypeSupported !== "function") {
        /* eslint-enable @typescript-eslint/unbound-method */
        throw new Error("Cannot check video codec support: No API available.");
    }
    try {
        for (var videoCodecs_1 = __values(videoCodecs), videoCodecs_1_1 = videoCodecs_1.next(); !videoCodecs_1_1.done; videoCodecs_1_1 = videoCodecs_1.next()) {
            var codec = videoCodecs_1_1.value;
            if (browser_compatibility_types_1.MediaSource_.isTypeSupported(codec)) {
                return codec;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (videoCodecs_1_1 && !videoCodecs_1_1.done && (_a = videoCodecs_1.return)) _a.call(videoCodecs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    throw new Error("No default video codec found.");
}
exports.findDefaultVideoCodec = findDefaultVideoCodec;
/**
 * Check if one of given audio codecs are supported for decode.
 * These audio codecs are chose for their wide proven compatibility and
 * popularity.
 * @returns {string}
 */
function findDefaultAudioCodec() {
    var e_2, _a;
    var audioCodecs = ['audio/mp4;codecs="mp4a.40.2"', "audio/webm;codecs=opus"];
    /* eslint-disable @typescript-eslint/unbound-method */
    if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_) ||
        typeof browser_compatibility_types_1.MediaSource_.isTypeSupported !== "function") {
        /* eslint-enable @typescript-eslint/unbound-method */
        throw new Error("Cannot check audio codec support: No API available.");
    }
    try {
        for (var audioCodecs_1 = __values(audioCodecs), audioCodecs_1_1 = audioCodecs_1.next(); !audioCodecs_1_1.done; audioCodecs_1_1 = audioCodecs_1.next()) {
            var codec = audioCodecs_1_1.value;
            if (browser_compatibility_types_1.MediaSource_.isTypeSupported(codec)) {
                return codec;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (audioCodecs_1_1 && !audioCodecs_1_1.done && (_a = audioCodecs_1.return)) _a.call(audioCodecs_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    throw new Error("No default audio codec found.");
}
exports.findDefaultAudioCodec = findDefaultAudioCodec;
