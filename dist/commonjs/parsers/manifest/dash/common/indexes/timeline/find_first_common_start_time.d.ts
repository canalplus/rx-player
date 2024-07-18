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
import type { ITNode } from "../../../../../../utils/xml-parser";
import type { IIndexSegment } from "../../../../utils/index_helpers";
/**
 * By comparing two timelines for the same content at different points in time,
 * retrieve the index in both timelines of the first segment having the same
 * starting time.
 * Returns `null` if not found.
 * @param {Array.<Object>} prevTimeline
 * @param {Array.<Object>} newElements
 * @returns {Object|null}
 */
export default function findFirstCommonStartTime(prevTimeline: IIndexSegment[], newElements: ITNode[] | HTMLCollection): {
    /** Index in `prevSegments` where the first common segment start is found. */
    prevSegmentsIdx: number;
    /** Index in `newElements` where the first common segment start is found. */
    newElementsIdx: number;
    /**
     * Value to set `repeatCount` to at `prevSegments[prevSegmentsIdx]` to
     * retrieve the segment with the first common start time
     */
    repeatNumberInPrevSegments: number;
    /**
     * Value to set `repeatCount` to at `newElements[newElementsIdx]` to
     * retrieve the segment with the first common start time
     */
    repeatNumberInNewElements: number;
} | null;
//# sourceMappingURL=find_first_common_start_time.d.ts.map