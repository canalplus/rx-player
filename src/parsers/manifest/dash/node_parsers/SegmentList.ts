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

import objectAssign from "../../../../utils/object_assign";
import parseSegmentBase, {
  IParsedSegmentBase,
} from "./SegmentBase";
import parseSegmentURL, {
  IParsedSegmentURL,
} from "./SegmentURL";

export interface IParsedSegmentList extends IParsedSegmentBase {
  duration : number;
  list: IParsedSegmentURL[];
}

/**
 * @param {Element} root
 * @returns {Array}
 */
export default function parseSegmentList(
  root: Element
) : [IParsedSegmentList, Error[]] {
  const [base, baseWarnings] = parseSegmentBase(root);
  let warnings : Error[] = baseWarnings;

  const list : IParsedSegmentURL[] = [];

  const segmentListChildren = root.childNodes;
  for (let i = 0; i < segmentListChildren.length; i++) {
    if (segmentListChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = segmentListChildren[i] as Element;
      if (currentNode.nodeName === "SegmentURL") {
        const [segmentURL, segmentURLWarnings] = parseSegmentURL(currentNode);
        list.push(segmentURL);
        warnings = warnings.concat(segmentURLWarnings);
      }
    }
  }

  const baseDuration = base.duration;

  if (baseDuration == null) {
    throw new Error("Invalid SegmentList: no duration");
  }

  const ret = objectAssign(base, { list,
                                   // Ugly but TS is too dumb there
                                   duration: baseDuration });
  return [ret, warnings];
}
