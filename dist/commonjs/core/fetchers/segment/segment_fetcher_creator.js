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
var config_1 = require("../../../config");
var cdn_prioritizer_1 = require("../cdn_prioritizer");
var prioritized_segment_fetcher_1 = require("./prioritized_segment_fetcher");
var segment_fetcher_1 = require("./segment_fetcher");
var task_prioritizer_1 = require("./task_prioritizer");
/**
 * Interact with the transport pipelines to download segments with the right
 * priority.
 *
 * @class SegmentFetcherCreator
 */
var SegmentFetcherCreator = /** @class */ (function () {
    /**
     * @param {Object} transport
     */
    function SegmentFetcherCreator(transport, cmcdDataBuilder, options, cancelSignal) {
        var cdnPrioritizer = new cdn_prioritizer_1.default(cancelSignal);
        var _a = config_1.default.getCurrent(), MIN_CANCELABLE_PRIORITY = _a.MIN_CANCELABLE_PRIORITY, MAX_HIGH_PRIORITY_LEVEL = _a.MAX_HIGH_PRIORITY_LEVEL;
        this._transport = transport;
        this._prioritizer = new task_prioritizer_1.default({
            prioritySteps: {
                high: MAX_HIGH_PRIORITY_LEVEL,
                low: MIN_CANCELABLE_PRIORITY,
            },
        });
        this._cdnPrioritizer = cdnPrioritizer;
        this._backoffOptions = options;
        this._cmcdDataBuilder = cmcdDataBuilder;
    }
    /**
     * Create a segment fetcher, allowing to easily perform segment requests.
     * @param {string} bufferType - The type of buffer concerned (e.g. "audio",
     * "video", etc.)
     * @param {Object} eventListeners
     * @returns {Object}
     */
    SegmentFetcherCreator.prototype.createSegmentFetcher = function (bufferType, eventListeners) {
        var requestOptions = (0, segment_fetcher_1.getSegmentFetcherRequestOptions)(this._backoffOptions);
        var pipelines = this._transport[bufferType];
        // Types are very complicated here as they are per-type of buffer.
        var segmentFetcher = (0, segment_fetcher_1.default)({
            bufferType: bufferType,
            pipeline: pipelines,
            cdnPrioritizer: this._cdnPrioritizer,
            cmcdDataBuilder: this._cmcdDataBuilder,
            eventListeners: eventListeners,
            requestOptions: requestOptions,
        });
        return (0, prioritized_segment_fetcher_1.default)(this._prioritizer, segmentFetcher);
    };
    return SegmentFetcherCreator;
}());
exports.default = SegmentFetcherCreator;
