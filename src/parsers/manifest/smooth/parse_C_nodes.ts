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

interface IHSSManifestSegment {
  start : number;
  d : number;
  r : number;
}

/**
 * Parse C nodes to build index timeline.
 * @param {Element} nodes
 */
export default function parseCNodes(
  nodes : Element[]
) : IHSSManifestSegment[] {
  return nodes.reduce<IHSSManifestSegment[]>((timeline, node , i) => {
    const dAttr = node.getAttribute("d");
    const tAttr = node.getAttribute("t");
    const rAttr = node.getAttribute("r");

    const r = rAttr ? +rAttr - 1 : 0;
    let start = tAttr ? +tAttr : undefined;
    let d = dAttr ? +dAttr : undefined;

    if (i === 0) { // first node
      start = start || 0;
    } else { // from second node to the end
      const prev = timeline[i - 1];
      if (start == null || isNaN(start)) {
        if (prev.d == null || isNaN(prev.d)) {
          throw new Error("Smooth: Invalid CNodes. Missing timestamp.");
        }
        start = prev.start + prev.d * (prev.r + 1);
      }
    }
    if (d == null || isNaN(d)) {
      const nextNode = nodes[i + 1];
      if (nextNode) {
        const nextTAttr = nextNode.getAttribute("t");
        const nextStart = nextTAttr ? +nextTAttr : null;
        if (nextStart === null) {
          throw new Error(
            "Can't build index timeline from Smooth Manifest.");
        }
        d = nextStart - start;
      } else {
        return timeline;
      }
    }
    timeline.push({ d, start, r });
    return timeline;
  }, []);
}
