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

import log from "../../../../log";
import parseS, {
  IParsedS,
} from "./S";

export type IParsedTimeline = ITimelineElement[];

export interface ITimelineElement {
  start: number; // Time of start, timescaled. TODO Rename
  r: number; // Amount of repetition(s), 0 = no repeat. TODO Rename
  d: number; // Duration of a segment. TODO Rename
}

function fromParsedSToTimelineElement(
  parsedS : IParsedS,
  previousS : ITimelineElement|null,
  nextS : IParsedS|null
) : ITimelineElement|null {
  let start = parsedS.start;
  let d = parsedS.d;
  const r = parsedS.r;
  if (start == null && previousS && previousS.d != null) {
    start = previousS.start + (previousS.d * (previousS.r + 1));
  }
  if (
    (d == null || isNaN(d)) &&
    nextS && nextS.start != null && !isNaN(nextS.start) &&
    start != null && !isNaN(start)
  ) {
    d = nextS.start - start;
  }
  if (
    (start != null && !isNaN(start)) &&
    (d != null && !isNaN(d)) &&
    (r == null || !isNaN(r))
  ) {
    return {
      start,
      d,
      r: r || 0,
    };
  }
  log.warn("DASH: A \"S\" Element could not have been parsed.");
  return null;
}

/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
export default function parseSegmentTimeline(root: Element) : IParsedTimeline {
  const timeline : ITimelineElement[] = [];
  const parsedS : IParsedS[] = [];
  const timelineChildren = root.childNodes;
  for (let i = 0; i < timelineChildren.length; i++) {
    if (timelineChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = timelineChildren[i] as Element;

      if (currentElement.nodeName === "S") {
        const s = parseS(currentElement);
        if (s) {
          parsedS.push(s);
        }
      }
    }
  }
  for (let i = 0; i < parsedS.length; i++) {
    const s = parsedS[i];
    const timelineElement = fromParsedSToTimelineElement(
      s,
      timeline[timeline.length - 1] || null,
      parsedS[i + 1] || null
    );
    if (timelineElement) {
      timeline.push(timelineElement);
    }
  }
  return timeline;
}
