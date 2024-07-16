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
var log_1 = require("../../../log");
/**
 * @param {Object} segmentInfo
 * @param {Object} sourceBufferInterface
 * @param {Object} segmentFetcher
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function loadAndPushSegment(segmentInfo, sourceBufferInterface, segmentFetcher, cancelSignal) {
    var pushOperations = [];
    return segmentFetcher(segmentInfo, {
        onChunk: function (parseChunk) {
            var parsed = parseChunk(undefined);
            var data;
            var timestampOffset;
            var codec = segmentInfo.representation.getMimeTypeString();
            if (parsed.segmentType === "init") {
                data = parsed.initializationData;
                timestampOffset = 0;
            }
            else {
                data = parsed.chunkData;
                timestampOffset = parsed.chunkOffset;
            }
            var pushOperation;
            if (data === null) {
                pushOperation = Promise.resolve(null);
            }
            else {
                pushOperation = sourceBufferInterface.appendBuffer(data, {
                    appendWindow: [segmentInfo.period.start, segmentInfo.period.end],
                    timestampOffset: timestampOffset,
                    codec: codec,
                });
            }
            pushOperations.push(pushOperation);
        },
        onAllChunksReceived: function () {
            return;
        },
        onRetry: function (error) {
            log_1.default.warn("Retrying segment request", error);
        },
    }, cancelSignal).then(function () { return Promise.all(pushOperations); });
}
exports.default = loadAndPushSegment;
