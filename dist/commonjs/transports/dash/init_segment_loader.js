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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var byte_parsing_1 = require("../../utils/byte_parsing");
var request_1 = require("../../utils/request");
var byte_range_1 = require("../utils/byte_range");
/**
 * Perform a request for an initialization segment, agnostic to the container.
 * @param {string} url
 * @param {Object} segment
 * @param {Object} options
 * @param {CancellationSignal} cancelSignal
 * @param {Object} callbacks
 * @returns {Promise}
 */
function initSegmentLoader(url, segment, options, cancelSignal, callbacks) {
    if (segment.range === undefined) {
        return (0, request_1.default)({
            url: url,
            responseType: "arraybuffer",
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            cancelSignal: cancelSignal,
            onProgress: callbacks.onProgress,
        }).then(function (data) { return ({ resultType: "segment-loaded", resultData: data }); });
    }
    if (segment.indexRange === undefined) {
        return (0, request_1.default)({
            url: url,
            headers: { Range: (0, byte_range_1.default)(segment.range) },
            responseType: "arraybuffer",
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            cancelSignal: cancelSignal,
            onProgress: callbacks.onProgress,
        }).then(function (data) { return ({ resultType: "segment-loaded", resultData: data }); });
    }
    // range and indexRange are contiguous (99% of the cases)
    if (segment.range[1] + 1 === segment.indexRange[0]) {
        return (0, request_1.default)({
            url: url,
            headers: { Range: (0, byte_range_1.default)([segment.range[0], segment.indexRange[1]]) },
            responseType: "arraybuffer",
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            cancelSignal: cancelSignal,
            onProgress: callbacks.onProgress,
        }).then(function (data) { return ({ resultType: "segment-loaded", resultData: data }); });
    }
    var rangeRequest$ = (0, request_1.default)({
        url: url,
        headers: { Range: (0, byte_range_1.default)(segment.range) },
        responseType: "arraybuffer",
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal: cancelSignal,
        onProgress: callbacks.onProgress,
    });
    var indexRequest$ = (0, request_1.default)({
        url: url,
        headers: { Range: (0, byte_range_1.default)(segment.indexRange) },
        responseType: "arraybuffer",
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal: cancelSignal,
        onProgress: callbacks.onProgress,
    });
    return Promise.all([rangeRequest$, indexRequest$]).then(function (_a) {
        var _b = __read(_a, 2), initData = _b[0], indexData = _b[1];
        var data = (0, byte_parsing_1.concat)(new Uint8Array(initData.responseData), new Uint8Array(indexData.responseData));
        var sendingTime = Math.min(initData.sendingTime, indexData.sendingTime);
        var receivedTime = Math.max(initData.receivedTime, indexData.receivedTime);
        return {
            resultType: "segment-loaded",
            resultData: {
                url: url,
                responseData: data,
                size: initData.size + indexData.size,
                requestDuration: receivedTime - sendingTime,
                sendingTime: sendingTime,
                receivedTime: receivedTime,
            },
        };
    });
}
exports.default = initSegmentLoader;
