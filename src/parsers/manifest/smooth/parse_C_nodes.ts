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

import arrayFind from "../../../utils/array_find";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import type { ITNode } from "../../../utils/xml-parser";

interface IHSSManifestSegment {
  start: number;
  duration: number;
  repeatCount: number;
}

/**
 * Parse C nodes to build index timeline.
 * @param {Element} nodes
 */
export default function parseCNodes(
  nodes: Array<ITNode | string>,
): IHSSManifestSegment[] {
  return nodes.reduce<IHSSManifestSegment[]>((timeline, node, i) => {
    if (typeof node === "string") {
      return timeline;
    }
    const dAttr = node.attributes.d ?? null;
    const tAttr = node.attributes.t ?? null;
    const rAttr = node.attributes.r ?? null;

    const repeatCount = rAttr !== null ? +rAttr - 1 : 0;
    let start = tAttr !== null ? +tAttr : undefined;
    let duration = dAttr !== null ? +dAttr : undefined;

    if (i === 0) {
      // first node
      start = start === undefined || isNaN(start) ? 0 : start;
    } else {
      // from second node to the end
      const prev = timeline[i - 1];
      if (start === undefined || isNaN(start)) {
        if (prev.duration === undefined || isNaN(prev.duration)) {
          throw new Error("Smooth: Invalid CNodes. Missing timestamp.");
        }
        start = prev.start + prev.duration * (prev.repeatCount + 1);
      }
    }
    if (duration === undefined || isNaN(duration)) {
      const nextNode = arrayFind(nodes, (n): n is ITNode => typeof n !== "string") as
        | ITNode
        | undefined;
      if (nextNode !== undefined) {
        const nextTAttr = nextNode.attributes.t ?? null;
        const nextStart = isNonEmptyString(nextTAttr) ? +nextTAttr : null;
        if (nextStart === null) {
          throw new Error("Can't build index timeline from Smooth Manifest.");
        }
        duration = nextStart - start;
      } else {
        return timeline;
      }
    }
    timeline.push({ duration, start, repeatCount });
    return timeline;
  }, []);
}
