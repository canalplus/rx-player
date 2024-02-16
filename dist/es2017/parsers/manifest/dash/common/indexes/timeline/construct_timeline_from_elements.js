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
import convertElementsToIndexSegment from "./convert_element_to_index_segment";
import { parseSElementNode, parseSHTMLElement } from "./parse_s_element";
/**
 * Allows to generate the "timeline" for the "Timeline" RepresentationIndex.
 * Call this function when the timeline is unknown.
 * This function was added to only perform that task lazily, i.e. only when
 * first needed.
 * @param {Array.<Object>|HTMLCollection} elements - All S nodes constituting
 * the corresponding SegmentTimeline node.
 * @returns {Array.<Object>}
 */
export default function constructTimelineFromElements(elements) {
    const initialTimeline = [];
    if (Array.isArray(elements)) {
        for (let i = 0; i < elements.length; i++) {
            initialTimeline.push(parseSElementNode(elements[i]));
        }
    }
    else {
        for (let i = 0; i < elements.length; i++) {
            initialTimeline.push(parseSHTMLElement(elements[i]));
        }
    }
    const timeline = [];
    for (let i = 0; i < initialTimeline.length; i++) {
        const item = initialTimeline[i];
        const previousItem = timeline[timeline.length - 1] === undefined ? null : timeline[timeline.length - 1];
        const nextItem = initialTimeline[i + 1] === undefined ? null : initialTimeline[i + 1];
        const timelineElement = convertElementsToIndexSegment(item, previousItem, nextItem);
        if (timelineElement !== null) {
            timeline.push(timelineElement);
        }
    }
    return timeline;
}
