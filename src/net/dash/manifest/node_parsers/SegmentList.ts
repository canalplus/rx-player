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

import objectAssign = require("object-assign");
import {
  IMultipleSegmentBase,
  parseMultipleSegmentBase,
} from "./SegmentBase";
import parseSegmentURL, {
  IParsedSegmentURL,
} from "./SegmentURL";

export type IParsedSegmentList = IMultipleSegmentBase;

/**
 * @param {Node} root
 * @returns {Object}
 */
export default function parseSegmentList(root: Node): IParsedSegmentList {
  const base = parseMultipleSegmentBase(root);
  const list : IParsedSegmentURL[] = [];

  const segmentListChildren = root.childNodes;
  for (let i = 0; i < segmentListChildren.length; i++) {
    const currentNode = segmentListChildren[i];
    if (currentNode.nodeName === "SegmentURL") {
      const segmentURL = parseSegmentURL(currentNode);
      list.push(segmentURL);
    }
  }

  return objectAssign(base, {
    indexType: "list",
    list,
  });
}
