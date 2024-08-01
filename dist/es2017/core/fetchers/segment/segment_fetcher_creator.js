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
import config from "../../../config";
import CdnPrioritizer from "../cdn_prioritizer";
import applyPrioritizerToSegmentFetcher from "./prioritized_segment_fetcher";
import createSegmentFetcher, { getSegmentFetcherRequestOptions } from "./segment_fetcher";
import TaskPrioritizer from "./task_prioritizer";
/**
 * Interact with the transport pipelines to download segments with the right
 * priority.
 *
 * @class SegmentFetcherCreator
 */
export default class SegmentFetcherCreator {
    /**
     * @param {Object} transport
     */
    constructor(transport, cmcdDataBuilder, options, cancelSignal) {
        const cdnPrioritizer = new CdnPrioritizer(cancelSignal);
        const { MIN_CANCELABLE_PRIORITY, MAX_HIGH_PRIORITY_LEVEL } = config.getCurrent();
        this._transport = transport;
        this._prioritizer = new TaskPrioritizer({
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
    createSegmentFetcher(bufferType, eventListeners) {
        const requestOptions = getSegmentFetcherRequestOptions(this._backoffOptions);
        const pipelines = this._transport[bufferType];
        // Types are very complicated here as they are per-type of buffer.
        const segmentFetcher = createSegmentFetcher({
            bufferType,
            pipeline: pipelines,
            cdnPrioritizer: this._cdnPrioritizer,
            cmcdDataBuilder: this._cmcdDataBuilder,
            eventListeners,
            requestOptions,
        });
        return applyPrioritizerToSegmentFetcher(this._prioritizer, segmentFetcher);
    }
}
