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
import isNullOrUndefined from "../../utils/is_null_or_undefined";
/**
 * Check if two contents are the same
 * @param {Object} content1
 * @param {Object} content2
 * @returns {boolean}
 */
export function areSameContent(content1, content2) {
    return (content1.segment.id === content2.segment.id &&
        content1.representation.uniqueId === content2.representation.uniqueId);
}
/**
 * Get string describing a given ISegment, useful for log functions.
 * @param {Object} content
 * @returns {string|null|undefined}
 */
export function getLoggableSegmentId(content) {
    if (isNullOrUndefined(content)) {
        return "";
    }
    const { period, adaptation, representation, segment } = content;
    let segmentString;
    if (segment.isInit) {
        segmentString = "init";
    }
    else if (segment.complete) {
        segmentString = `${segment.time}-${segment.duration}`;
    }
    else {
        segmentString = `${segment.time}`;
    }
    return (`${adaptation.type} P: ${period.id} A: ${adaptation.id} ` +
        `R: ${representation.id} S: ${segmentString}`);
}
