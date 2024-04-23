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
exports.getLoggableSegmentId = exports.areSameContent = void 0;
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
/**
 * Check if two contents are the same
 * @param {Object} content1
 * @param {Object} content2
 * @returns {boolean}
 */
function areSameContent(content1, content2) {
    return (content1.segment.id === content2.segment.id &&
        content1.representation.uniqueId === content2.representation.uniqueId);
}
exports.areSameContent = areSameContent;
/**
 * Get string describing a given ISegment, useful for log functions.
 * @param {Object} content
 * @returns {string|null|undefined}
 */
function getLoggableSegmentId(content) {
    if ((0, is_null_or_undefined_1.default)(content)) {
        return "";
    }
    var period = content.period, adaptation = content.adaptation, representation = content.representation, segment = content.segment;
    var segmentString;
    if (segment.isInit) {
        segmentString = "init";
    }
    else if (segment.complete) {
        segmentString = "".concat(segment.time, "-").concat(segment.duration);
    }
    else {
        segmentString = "".concat(segment.time);
    }
    return ("".concat(adaptation.type, " P: ").concat(period.id, " A: ").concat(adaptation.id, " ") +
        "R: ".concat(representation.id, " S: ").concat(segmentString));
}
exports.getLoggableSegmentId = getLoggableSegmentId;
