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
 * This function basically put in relation:
 *   - an `ISegmentFetcher`, which will be used to perform the segment requests
 *   - a `TaskPrioritizer`, which will handle the priority of a segment request
 *
 * and returns functions to fetch segments with a given priority.
 * @param {Object} prioritizer
 * @param {Object} fetcher
 * @returns {Object}
 */
function applyPrioritizerToSegmentFetcher(prioritizer, fetcher) {
    /**
     * Map Promises returned by the `createRequest` method into the actual tasks
     * used by the `TaskPrioritizer`, allowing to update task priorities just by
     * using the Promise.
     */
    var taskHandlers = new WeakMap();
    return {
        /**
         * Create a Segment request with a given priority.
         * @param {Object} content - content to request
         * @param {Number} priority - priority at which the content should be requested.
         * Lower number == higher priority.
         * @param {Object} callbacks
         * @param {Object} cancelSignal
         * @returns {Promise}
         */
        createRequest: function (content, priority, callbacks, cancelSignal) {
            var givenTask = function (innerCancelSignal) {
                return fetcher(content, callbacks, innerCancelSignal);
            };
            var ret = prioritizer.create(givenTask, priority, callbacks, cancelSignal);
            taskHandlers.set(ret, givenTask);
            return ret;
        },
        /**
         * Update the priority of a pending request, created through
         * `createRequest`.
         * @param {Promise} task - The Promise returned by `createRequest`.
         * @param {Number} priority - The new priority value.
         */
        updatePriority: function (task, priority) {
            var correspondingTask = taskHandlers.get(task);
            if (correspondingTask === undefined) {
                log_1.default.warn("Fetchers: Cannot update the priority of a request: task not found.");
                return;
            }
            prioritizer.updatePriority(correspondingTask, priority);
        },
    };
}
exports.default = applyPrioritizerToSegmentFetcher;
