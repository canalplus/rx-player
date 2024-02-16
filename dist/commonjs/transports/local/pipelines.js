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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
var classes_1 = require("../../manifest/classes");
var local_1 = require("../../parsers/manifest/local");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var call_custom_manifest_loader_1 = require("../utils/call_custom_manifest_loader");
var segment_loader_1 = require("./segment_loader");
var segment_parser_1 = require("./segment_parser");
var text_parser_1 = require("./text_parser");
/**
 * Returns pipelines used for local Manifest streaming.
 * @param {Object} transportOptions
 * @returns {Object}
 */
function getLocalManifestPipelines(transportOptions) {
    var customManifestLoader = transportOptions.manifestLoader;
    var manifestPipeline = {
        loadManifest: function (url, loaderOptions, cancelSignal) {
            if ((0, is_null_or_undefined_1.default)(customManifestLoader)) {
                throw new Error("A local Manifest is not loadable through regular HTTP(S) " +
                    " calls. You have to set a `manifestLoader` when calling " +
                    "`loadVideo`");
            }
            return (0, call_custom_manifest_loader_1.default)(customManifestLoader, function () {
                throw new Error("Cannot fallback from the `manifestLoader` of a " + "`local` transport");
            })(url, loaderOptions, cancelSignal);
        },
        parseManifest: function (manifestData) {
            var loadedManifest = manifestData.responseData;
            if (typeof manifestData !== "object") {
                throw new Error("Wrong format for the manifest data");
            }
            var parsed = (0, local_1.default)(loadedManifest);
            var warnings = [];
            var manifest = new classes_1.default(parsed, transportOptions, warnings);
            return { manifest: manifest, url: undefined, warnings: warnings };
        },
    };
    var segmentPipeline = {
        loadSegment: segment_loader_1.default,
        parseSegment: segment_parser_1.default,
    };
    var textTrackPipeline = {
        loadSegment: segment_loader_1.default,
        parseSegment: text_parser_1.default,
    };
    return {
        manifest: manifestPipeline,
        audio: segmentPipeline,
        video: segmentPipeline,
        text: textTrackPipeline,
    };
}
exports.default = getLocalManifestPipelines;
