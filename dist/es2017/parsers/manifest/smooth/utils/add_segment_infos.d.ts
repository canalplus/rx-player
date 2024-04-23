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
export interface IIndexSegment {
    start: number;
    duration: number;
    repeatCount: number;
}
/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Array.<Object>} timeline
 * @param {number} timescale
 * @param {Object} newSegment
 * @param {Object} currentSegment
 * @returns {Boolean} - true if the segment has been added
 */
export default function _addSegmentInfos(timeline: IIndexSegment[], timescale: number, newSegment: {
    time: number;
    duration: number;
    timescale: number;
}, currentSegment: {
    time: number;
    duration: number;
}): boolean;
