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
var request_1 = require("../../utils/request");
var warn_once_1 = require("../../utils/warn_once");
var byte_range_1 = require("../utils/byte_range");
var infer_segment_container_1 = require("../utils/infer_segment_container");
var add_segment_integrity_checks_to_loader_1 = require("./add_segment_integrity_checks_to_loader");
var construct_segment_url_1 = require("./construct_segment_url");
var init_segment_loader_1 = require("./init_segment_loader");
var low_latency_segment_loader_1 = require("./low_latency_segment_loader");
/**
 * Perform requests for "text" segments
 * @param {boolean} lowLatencyMode
 * @returns {Function}
 */
function generateTextTrackLoader(_a) {
    var lowLatencyMode = _a.lowLatencyMode, checkMediaSegmentIntegrity = _a.checkMediaSegmentIntegrity;
    return checkMediaSegmentIntegrity !== true
        ? textTrackLoader
        : (0, add_segment_integrity_checks_to_loader_1.default)(textTrackLoader);
    /**
     * @param {Object|null} wantedCdn
     * @param {Object} context
     * @param {Object} options
     * @param {Object} cancelSignal
     * @param {Object} callbacks
     * @returns {Promise}
     */
    function textTrackLoader(wantedCdn, context, options, cancelSignal, callbacks) {
        var segment = context.segment;
        var range = segment.range;
        var url = (0, construct_segment_url_1.default)(wantedCdn, segment);
        if (url === null) {
            return Promise.resolve({
                resultType: "segment-created",
                resultData: null,
            });
        }
        if (segment.isInit) {
            return (0, init_segment_loader_1.default)(url, segment, options, cancelSignal, callbacks);
        }
        var containerType = (0, infer_segment_container_1.default)(context.type, context.mimeType);
        var seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
        if (lowLatencyMode && seemsToBeMP4) {
            if ((0, request_1.fetchIsSupported)()) {
                return (0, low_latency_segment_loader_1.default)(url, context, options, callbacks, cancelSignal);
            }
            else {
                (0, warn_once_1.default)("DASH: Your browser does not have the fetch API. You will have " +
                    "a higher chance of rebuffering when playing close to the live edge");
            }
        }
        if (seemsToBeMP4) {
            return (0, request_1.default)({
                url: url,
                responseType: "arraybuffer",
                headers: Array.isArray(range) ? { Range: (0, byte_range_1.default)(range) } : null,
                timeout: options.timeout,
                connectionTimeout: options.connectionTimeout,
                onProgress: callbacks.onProgress,
                cancelSignal: cancelSignal,
            }).then(function (data) { return ({ resultType: "segment-loaded", resultData: data }); });
        }
        return (0, request_1.default)({
            url: url,
            responseType: "text",
            headers: Array.isArray(range) ? { Range: (0, byte_range_1.default)(range) } : null,
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            onProgress: callbacks.onProgress,
            cancelSignal: cancelSignal,
        }).then(function (data) { return ({ resultType: "segment-loaded", resultData: data }); });
    }
}
exports.default = generateTextTrackLoader;
