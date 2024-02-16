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
var is_null_or_undefined_1 = require("../../../../../../utils/is_null_or_undefined");
/**
 * By comparing two timelines for the same content at different points in time,
 * retrieve the index in both timelines of the first segment having the same
 * starting time.
 * Returns `null` if not found.
 * @param {Array.<Object>} prevTimeline
 * @param {Array.<Object>} newElements
 * @returns {Object|null}
 */
function findFirstCommonStartTime(prevTimeline, newElements) {
    if (prevTimeline.length === 0 || newElements.length === 0) {
        return null;
    }
    var prevInitialStart = prevTimeline[0].start;
    var newFirstTAttr = Array.isArray(newElements)
        ? newElements[0].attributes.t
        : newElements[0].getAttribute("t");
    var newInitialStart = (0, is_null_or_undefined_1.default)(newFirstTAttr)
        ? null
        : parseInt(newFirstTAttr, 10);
    if (newInitialStart === null || Number.isNaN(newInitialStart)) {
        return null;
    }
    if (prevInitialStart === newInitialStart) {
        return {
            prevSegmentsIdx: 0,
            newElementsIdx: 0,
            repeatNumberInPrevSegments: 0,
            repeatNumberInNewElements: 0,
        };
    }
    else if (prevInitialStart < newInitialStart) {
        var prevElt = prevTimeline[0];
        var prevElementIndex = 0;
        while (true) {
            if (prevElt.repeatCount > 0) {
                var diff = newInitialStart - prevElt.start;
                if (diff % prevElt.duration === 0 &&
                    diff / prevElt.duration <= prevElt.repeatCount) {
                    var repeatNumberInPrevSegments = diff / prevElt.duration;
                    return {
                        repeatNumberInPrevSegments: repeatNumberInPrevSegments,
                        prevSegmentsIdx: prevElementIndex,
                        newElementsIdx: 0,
                        repeatNumberInNewElements: 0,
                    };
                }
            }
            prevElementIndex++;
            if (prevElementIndex >= prevTimeline.length) {
                return null;
            }
            prevElt = prevTimeline[prevElementIndex];
            if (prevElt.start === newInitialStart) {
                return {
                    prevSegmentsIdx: prevElementIndex,
                    newElementsIdx: 0,
                    repeatNumberInPrevSegments: 0,
                    repeatNumberInNewElements: 0,
                };
            }
            else if (prevElt.start > newInitialStart) {
                return null;
            }
        }
    }
    else {
        var newElementsIdx = 0;
        var newNodeElt = Array.isArray(newElements) ? newElements[0] : null;
        var newDomElt = Array.isArray(newElements) ? null : newElements[0];
        var currentTimeOffset = newInitialStart;
        while (true) {
            var dAttr = newNodeElt !== null ? newNodeElt.attributes.d : newDomElt === null || newDomElt === void 0 ? void 0 : newDomElt.getAttribute("d");
            var duration = (0, is_null_or_undefined_1.default)(dAttr) ? null : parseInt(dAttr, 10);
            if (duration === null || Number.isNaN(duration)) {
                return null;
            }
            var rAttr = newNodeElt !== null ? newNodeElt.attributes.r : newDomElt === null || newDomElt === void 0 ? void 0 : newDomElt.getAttribute("r");
            var repeatCount = (0, is_null_or_undefined_1.default)(rAttr) ? null : parseInt(rAttr, 10);
            if (repeatCount !== null) {
                if (Number.isNaN(repeatCount) || repeatCount < 0) {
                    return null;
                }
                if (repeatCount > 0) {
                    var diff = prevInitialStart - currentTimeOffset;
                    if (diff % duration === 0 && diff / duration <= repeatCount) {
                        var repeatNumberInNewElements = diff / duration;
                        return {
                            repeatNumberInPrevSegments: 0,
                            repeatNumberInNewElements: repeatNumberInNewElements,
                            prevSegmentsIdx: 0,
                            newElementsIdx: newElementsIdx,
                        };
                    }
                }
                currentTimeOffset += duration * (repeatCount + 1);
            }
            else {
                currentTimeOffset += duration;
            }
            newElementsIdx++;
            if (newElementsIdx >= newElements.length) {
                return null;
            }
            if (Array.isArray(newElements)) {
                newNodeElt = newElements[newElementsIdx];
            }
            else {
                newDomElt = newElements[newElementsIdx];
            }
            var tAttr = newNodeElt !== null ? newNodeElt.attributes.t : newDomElt === null || newDomElt === void 0 ? void 0 : newDomElt.getAttribute("t");
            var time = (0, is_null_or_undefined_1.default)(tAttr) ? null : parseInt(tAttr, 10);
            if (time !== null) {
                if (Number.isNaN(time)) {
                    return null;
                }
                currentTimeOffset = time;
            }
            if (currentTimeOffset === prevInitialStart) {
                return {
                    newElementsIdx: newElementsIdx,
                    prevSegmentsIdx: 0,
                    repeatNumberInPrevSegments: 0,
                    repeatNumberInNewElements: 0,
                };
            }
            else if (currentTimeOffset > newInitialStart) {
                return null;
            }
        }
    }
}
exports.default = findFirstCommonStartTime;
