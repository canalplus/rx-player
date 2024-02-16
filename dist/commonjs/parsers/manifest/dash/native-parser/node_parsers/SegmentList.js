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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var object_assign_1 = require("../../../../../utils/object_assign");
var SegmentBase_1 = require("./SegmentBase");
var SegmentURL_1 = require("./SegmentURL");
/**
 * @param {Element} root
 * @returns {Array}
 */
function parseSegmentList(root) {
    var _a = __read((0, SegmentBase_1.default)(root), 2), base = _a[0], baseWarnings = _a[1];
    var warnings = baseWarnings;
    var list = [];
    var segmentListChildren = root.childNodes;
    for (var i = 0; i < segmentListChildren.length; i++) {
        if (segmentListChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentNode = segmentListChildren[i];
            if (currentNode.nodeName === "SegmentURL") {
                var _b = __read((0, SegmentURL_1.default)(currentNode), 2), segmentURL = _b[0], segmentURLWarnings = _b[1];
                list.push(segmentURL);
                warnings = warnings.concat(segmentURLWarnings);
            }
        }
    }
    var ret = (0, object_assign_1.default)(base, { list: list });
    return [ret, warnings];
}
exports.default = parseSegmentList;
