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
var convert_element_to_index_segment_1 = require("./convert_element_to_index_segment");
var parse_s_element_1 = require("./parse_s_element");
/**
 * Allows to generate the "timeline" for the "Timeline" RepresentationIndex.
 * Call this function when the timeline is unknown.
 * This function was added to only perform that task lazily, i.e. only when
 * first needed.
 * @param {Array.<Object>|HTMLCollection} elements - All S nodes constituting
 * the corresponding SegmentTimeline node.
 * @returns {Array.<Object>}
 */
function constructTimelineFromElements(elements) {
    var initialTimeline = [];
    if (Array.isArray(elements)) {
        for (var i = 0; i < elements.length; i++) {
            initialTimeline.push((0, parse_s_element_1.parseSElementNode)(elements[i]));
        }
    }
    else {
        for (var i = 0; i < elements.length; i++) {
            initialTimeline.push((0, parse_s_element_1.parseSHTMLElement)(elements[i]));
        }
    }
    var timeline = [];
    for (var i = 0; i < initialTimeline.length; i++) {
        var item = initialTimeline[i];
        var previousItem = timeline[timeline.length - 1] === undefined ? null : timeline[timeline.length - 1];
        var nextItem = initialTimeline[i + 1] === undefined ? null : initialTimeline[i + 1];
        var timelineElement = (0, convert_element_to_index_segment_1.default)(item, previousItem, nextItem);
        if (timelineElement !== null) {
            timeline.push(timelineElement);
        }
    }
    return timeline;
}
exports.default = constructTimelineFromElements;
