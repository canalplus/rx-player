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

import parseS, {
  IParsedS,
} from "./S";

export type IParsedSegmentTimeline = IParsedS[];

/**
 * @param {Node} root
 * @returns {Array.<Object>}
 */
export default function parseSegmentTimeline(root: Node): IParsedSegmentTimeline {
  const timeline : IParsedS[] = [];
  const timelineChildren = root.childNodes;
  for (let i = 0; i < timelineChildren.length; i++) {
    const currentNode = timelineChildren[i];

    switch (currentNode.nodeName) {
      case "S":
        const s = parseS(currentNode, timeline[timeline.length - 1] || null);
        if (s) {
          timeline.push(s);
        }
        break;
    }
  }
  return timeline;
}
