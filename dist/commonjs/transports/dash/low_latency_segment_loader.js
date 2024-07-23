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
var isobmff_1 = require("../../parsers/containers/isobmff");
var byte_parsing_1 = require("../../utils/byte_parsing");
var fetch_1 = require("../../utils/request/fetch");
var byte_range_1 = require("../utils/byte_range");
/**
 * Load segments through a "chunk" mode (decodable chunk by decodable chunk).
 *
 * This method is particularly adapted to low-latency streams.
 *
 * @param {string} url - URL of the segment to download.
 * @param {Object} content - Context of the segment needed.
 * @param {Object} options
 * @param {Object} callbacks
 * @param {CancellationSignal} cancelSignal
 * @returns {Promise}
 */
function lowLatencySegmentLoader(url, content, options, callbacks, cancelSignal) {
    var segment = content.segment;
    var headers = segment.range !== undefined ? { Range: (0, byte_range_1.default)(segment.range) } : undefined;
    var partialChunk = null;
    /**
     * Called each time `fetch` has new data available.
     * @param {Object} info
     */
    function onData(info) {
        var chunk = new Uint8Array(info.chunk);
        var concatenated = partialChunk !== null ? (0, byte_parsing_1.concat)(partialChunk, chunk) : chunk;
        var res = (0, isobmff_1.extractCompleteChunks)(concatenated);
        var completeChunks = res[0];
        partialChunk = res[1];
        if (completeChunks !== null) {
            completeChunks.forEach(function (completedChunk) {
                callbacks.onNewChunk(completedChunk);
            });
            if (cancelSignal.isCancelled()) {
                return;
            }
        }
        callbacks.onProgress({
            duration: info.duration,
            size: info.size,
            totalSize: info.totalSize,
        });
        if (cancelSignal.isCancelled()) {
            return;
        }
    }
    return (0, fetch_1.default)({
        url: url,
        headers: headers,
        onData: onData,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal: cancelSignal,
    }).then(function (res) { return ({
        resultType: "chunk-complete",
        resultData: res,
    }); });
}
exports.default = lowLatencySegmentLoader;
