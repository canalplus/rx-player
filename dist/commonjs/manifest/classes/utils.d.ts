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
import type Adaptation from "./adaptation";
import type Period from "./period";
import type Representation from "./representation";
import type { ISegment } from "./representation_index";
/** All information needed to identify a given segment. */
export interface IBufferedChunkInfos {
    adaptation: Adaptation;
    period: Period;
    representation: Representation;
    segment: ISegment;
}
/**
 * Check if two contents are the same
 * @param {Object} content1
 * @param {Object} content2
 * @returns {boolean}
 */
export declare function areSameContent(content1: IBufferedChunkInfos, content2: IBufferedChunkInfos): boolean;
/**
 * Get string describing a given ISegment, useful for log functions.
 * @param {Object} content
 * @returns {string|null|undefined}
 */
export declare function getLoggableSegmentId(content: IBufferedChunkInfos | null | undefined): string;
//# sourceMappingURL=utils.d.ts.map