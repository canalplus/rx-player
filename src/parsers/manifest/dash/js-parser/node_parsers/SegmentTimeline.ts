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

import type { ITNode } from "../../../../../utils/xml-parser";
import type { ITimelineParser } from "../../node_parser_types";

/**
 * @param {Object} root
 * @returns {Function}
 */
export default function createSegmentTimelineParser(root: ITNode): ITimelineParser {
  const result: Array<ITNode | string> = root.children;
  return function (): ITNode[] {
    // In the great majority of cases, there's only `S` elements inside.
    // However still clean-up just in rare occasions when that's not the case.
    for (let i = result.length - 1; i >= 0; i--) {
      const item = result[i];
      if (typeof item === "string" || item.tagName !== "S") {
        result.splice(i, 1);
      }
    }
    return result as ITNode[];
  };
}
