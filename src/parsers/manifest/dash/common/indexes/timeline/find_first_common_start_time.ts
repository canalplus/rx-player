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

import isNullOrUndefined from "../../../../../../utils/is_null_or_undefined";
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
export default function findFirstCommonStartTime(
  prevTimeline: IIndexSegment[],
  newElements: ITNode[],
): {
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
} | null {
  if (prevTimeline.length === 0 || newElements.length === 0) {
    return null;
  }
  const prevInitialStart = prevTimeline[0].start;
  const newFirstTAttr = newElements[0].attributes.t;
  const newInitialStart = isNullOrUndefined(newFirstTAttr)
    ? null
    : parseInt(newFirstTAttr, 10);
  if (newInitialStart === null || Number.isNaN(newInitialStart)) {
    return null;
  }

  if (prevInitialStart === newInitialStart) {
    return {
      prevSegmentsIdx: 0,
      newElementsIdx: 0,
      repeatNumberInPrevSegments: 0,
      repeatNumberInNewElements: 0,
    };
  } else if (prevInitialStart < newInitialStart) {
    let prevElt = prevTimeline[0];
    let prevElementIndex = 0;
    while (true) {
      if (prevElt.repeatCount > 0) {
        const diff = newInitialStart - prevElt.start;
        if (
          diff % prevElt.duration === 0 &&
          diff / prevElt.duration <= prevElt.repeatCount
        ) {
          const repeatNumberInPrevSegments = diff / prevElt.duration;
          return {
            repeatNumberInPrevSegments,
            prevSegmentsIdx: prevElementIndex,
            newElementsIdx: 0,
            repeatNumberInNewElements: 0,
          };
        }
      }
      prevElementIndex++;
      if (prevElementIndex >= prevTimeline.length) {
        return null;
      }
      prevElt = prevTimeline[prevElementIndex];
      if (prevElt.start === newInitialStart) {
        return {
          prevSegmentsIdx: prevElementIndex,
          newElementsIdx: 0,
          repeatNumberInPrevSegments: 0,
          repeatNumberInNewElements: 0,
        };
      } else if (prevElt.start > newInitialStart) {
        return null;
      }
    }
  } else {
    let newElementsIdx = 0;
    let newNodeElt: ITNode | null = newElements[0];
    let currentTimeOffset = newInitialStart;
    while (true) {
      const dAttr = newNodeElt.attributes.d;
      const duration = isNullOrUndefined(dAttr) ? null : parseInt(dAttr, 10);
      if (duration === null || Number.isNaN(duration)) {
        return null;
      }
      const rAttr = newNodeElt.attributes.r;
      const repeatCount = isNullOrUndefined(rAttr) ? null : parseInt(rAttr, 10);

      if (repeatCount !== null) {
        if (Number.isNaN(repeatCount) || repeatCount < 0) {
          return null;
        }
        if (repeatCount > 0) {
          const diff = prevInitialStart - currentTimeOffset;
          if (diff % duration === 0 && diff / duration <= repeatCount) {
            const repeatNumberInNewElements = diff / duration;
            return {
              repeatNumberInPrevSegments: 0,
              repeatNumberInNewElements,
              prevSegmentsIdx: 0,
              newElementsIdx,
            };
          }
        }
        currentTimeOffset += duration * (repeatCount + 1);
      } else {
        currentTimeOffset += duration;
      }
      newElementsIdx++;
      if (newElementsIdx >= newElements.length) {
        return null;
      }
      newNodeElt = newElements[newElementsIdx];
      const tAttr = newNodeElt.attributes.t;
      const time = isNullOrUndefined(tAttr) ? null : parseInt(tAttr, 10);
      if (time !== null) {
        if (Number.isNaN(time)) {
          return null;
        }
        currentTimeOffset = time;
      }
      if (currentTimeOffset === prevInitialStart) {
        return {
          newElementsIdx,
          prevSegmentsIdx: 0,
          repeatNumberInPrevSegments: 0,
          repeatNumberInNewElements: 0,
        };
      } else if (currentTimeOffset > newInitialStart) {
        return null;
      }
    }
  }
}
