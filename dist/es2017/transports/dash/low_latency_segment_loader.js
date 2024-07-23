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
import { extractCompleteChunks } from "../../parsers/containers/isobmff";
import { concat } from "../../utils/byte_parsing";
import fetchRequest from "../../utils/request/fetch";
import byteRange from "../utils/byte_range";
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
export default function lowLatencySegmentLoader(url, content, options, callbacks, cancelSignal) {
    const { segment } = content;
    const headers = segment.range !== undefined ? { Range: byteRange(segment.range) } : undefined;
    let partialChunk = null;
    /**
     * Called each time `fetch` has new data available.
     * @param {Object} info
     */
    function onData(info) {
        const chunk = new Uint8Array(info.chunk);
        const concatenated = partialChunk !== null ? concat(partialChunk, chunk) : chunk;
        const res = extractCompleteChunks(concatenated);
        const completeChunks = res[0];
        partialChunk = res[1];
        if (completeChunks !== null) {
            completeChunks.forEach((completedChunk) => {
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
    return fetchRequest({
        url,
        headers,
        onData,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
    }).then((res) => ({
        resultType: "chunk-complete",
        resultData: res,
    }));
}
