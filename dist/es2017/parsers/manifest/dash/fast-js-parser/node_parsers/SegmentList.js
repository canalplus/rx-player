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
import objectAssign from "../../../../../utils/object_assign";
import parseSegmentBase from "./SegmentBase";
import parseSegmentURL from "./SegmentURL";
/**
 * @param {Object} root
 * @returns {Array}
 */
export default function parseSegmentList(root) {
    const [base, baseWarnings] = parseSegmentBase(root);
    let warnings = baseWarnings;
    const list = [];
    const segmentListChildren = root.children;
    for (let i = 0; i < segmentListChildren.length; i++) {
        const currentNode = segmentListChildren[i];
        if (typeof currentNode === "string") {
            continue;
        }
        if (currentNode.tagName === "SegmentURL") {
            const [segmentURL, segmentURLWarnings] = parseSegmentURL(currentNode);
            list.push(segmentURL);
            warnings = warnings.concat(segmentURLWarnings);
        }
    }
    const ret = objectAssign(base, { list });
    return [ret, warnings];
}
