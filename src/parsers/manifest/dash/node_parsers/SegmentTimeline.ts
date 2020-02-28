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

export type ITimelineParser = () => IParsedS[];

/**
 * @param {Element} root
 * @returns {Function}
 */
export default function createSegmentTimelineParser(root: Element) : ITimelineParser {
  let result : IParsedS[] | null = null;
  return function() {
    if (result === null) {
      const parsedS : IParsedS[] = [];
      const timelineChildren = root.getElementsByTagName("S");
      const timelineChildrenLength = timelineChildren.length;
      for (let i = 0; i < timelineChildrenLength; i++) {
        const currentElement = timelineChildren[i];
        const s = parseS(currentElement);
        parsedS.push(s);
      }
      result = parsedS;
    }
    return result;
  };
}
