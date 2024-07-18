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
import { concat } from "../../utils/byte_parsing";
import request from "../../utils/request";
import addQueryString from "../utils/add_query_string";
import byteRange from "../utils/byte_range";
/**
 * Perform a request for an initialization segment, agnostic to the container.
 * @param {string} initialUrl
 * @param {Object} segment
 * @param {Object} options
 * @param {CancellationSignal} cancelSignal
 * @param {Object} callbacks
 * @returns {Promise}
 */
export default function initSegmentLoader(initialUrl, segment, options, cancelSignal, callbacks) {
    var _a, _b;
    let url = initialUrl;
    if (((_a = options.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query") {
        url = addQueryString(url, options.cmcdPayload.value);
    }
    const cmcdHeaders = ((_b = options.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers" ? options.cmcdPayload.value : undefined;
    if (segment.range === undefined) {
        return request({
            url,
            responseType: "arraybuffer",
            headers: cmcdHeaders,
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            cancelSignal,
            onProgress: callbacks.onProgress,
        }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
    if (segment.indexRange === undefined) {
        return request({
            url,
            headers: Object.assign(Object.assign({}, cmcdHeaders), { Range: byteRange(segment.range) }),
            responseType: "arraybuffer",
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            cancelSignal,
            onProgress: callbacks.onProgress,
        }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
    // range and indexRange are contiguous (99% of the cases)
    if (segment.range[1] + 1 === segment.indexRange[0]) {
        return request({
            url,
            headers: Object.assign(Object.assign({}, cmcdHeaders), { Range: byteRange([segment.range[0], segment.indexRange[1]]) }),
            responseType: "arraybuffer",
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            cancelSignal,
            onProgress: callbacks.onProgress,
        }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
    const rangeRequest$ = request({
        url,
        headers: Object.assign(Object.assign({}, cmcdHeaders), { Range: byteRange(segment.range) }),
        responseType: "arraybuffer",
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
        onProgress: callbacks.onProgress,
    });
    const indexRequest$ = request({
        url,
        headers: Object.assign(Object.assign({}, cmcdHeaders), { Range: byteRange(segment.indexRange) }),
        responseType: "arraybuffer",
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
        onProgress: callbacks.onProgress,
    });
    return Promise.all([rangeRequest$, indexRequest$]).then(([initData, indexData]) => {
        const data = concat(new Uint8Array(initData.responseData), new Uint8Array(indexData.responseData));
        const sendingTime = Math.min(initData.sendingTime, indexData.sendingTime);
        const receivedTime = Math.max(initData.receivedTime, indexData.receivedTime);
        return {
            resultType: "segment-loaded",
            resultData: {
                url,
                responseData: data,
                size: initData.size + indexData.size,
                requestDuration: receivedTime - sendingTime,
                sendingTime,
                receivedTime,
            },
        };
    });
}
