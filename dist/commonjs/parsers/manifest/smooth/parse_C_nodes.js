"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
/**
 * Parse C nodes to build index timeline.
 * @param {Element} nodes
 */
function parseCNodes(nodes) {
    return nodes.reduce(function (timeline, node, i) {
        var dAttr = node.getAttribute("d");
        var tAttr = node.getAttribute("t");
        var rAttr = node.getAttribute("r");
        var repeatCount = rAttr !== null ? +rAttr - 1 : 0;
        var start = tAttr !== null ? +tAttr : undefined;
        var duration = dAttr !== null ? +dAttr : undefined;
        if (i === 0) {
            // first node
            start = start === undefined || isNaN(start) ? 0 : start;
        }
        else {
            // from second node to the end
            var prev = timeline[i - 1];
            if (start === undefined || isNaN(start)) {
                if (prev.duration === undefined || isNaN(prev.duration)) {
                    throw new Error("Smooth: Invalid CNodes. Missing timestamp.");
                }
                start = prev.start + prev.duration * (prev.repeatCount + 1);
            }
        }
        if (duration === undefined || isNaN(duration)) {
            var nextNode = nodes[i + 1];
            if (nextNode !== undefined) {
                var nextTAttr = nextNode.getAttribute("t");
                var nextStart = (0, is_non_empty_string_1.default)(nextTAttr) ? +nextTAttr : null;
                if (nextStart === null) {
                    throw new Error("Can't build index timeline from Smooth Manifest.");
                }
                duration = nextStart - start;
            }
            else {
                return timeline;
            }
        }
        timeline.push({ duration: duration, start: start, repeatCount: repeatCount });
        return timeline;
    }, []);
}
exports.default = parseCNodes;
