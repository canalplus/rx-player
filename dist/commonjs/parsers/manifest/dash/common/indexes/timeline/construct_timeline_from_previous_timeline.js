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
var log_1 = require("../../../../../../log");
var construct_timeline_from_elements_1 = require("./construct_timeline_from_elements");
var convert_element_to_index_segment_1 = require("./convert_element_to_index_segment");
var find_first_common_start_time_1 = require("./find_first_common_start_time");
var parse_s_element_1 = require("./parse_s_element");
function constructTimelineFromPreviousTimeline(newElements, prevTimeline) {
    var _a;
    // Find first index in both timeline where a common segment is found.
    var commonStartInfo = (0, find_first_common_start_time_1.default)(prevTimeline, newElements);
    if (commonStartInfo === null) {
        log_1.default.warn('DASH: Cannot perform "based" update. Common segment not found.');
        return (0, construct_timeline_from_elements_1.default)(newElements);
    }
    var prevSegmentsIdx = commonStartInfo.prevSegmentsIdx, newElementsIdx = commonStartInfo.newElementsIdx, repeatNumberInPrevSegments = commonStartInfo.repeatNumberInPrevSegments, repeatNumberInNewElements = commonStartInfo.repeatNumberInNewElements;
    /** Guess of the number of elements in common. */
    var numberCommonEltGuess = prevTimeline.length - prevSegmentsIdx;
    var lastCommonEltNewEltsIdx = numberCommonEltGuess + newElementsIdx - 1;
    if (lastCommonEltNewEltsIdx >= newElements.length) {
        log_1.default.info('DASH: Cannot perform "based" update. New timeline too short');
        return (0, construct_timeline_from_elements_1.default)(newElements);
    }
    // Remove elements which are not available anymore
    var newTimeline = prevTimeline.slice(prevSegmentsIdx);
    if (repeatNumberInPrevSegments > 0) {
        var commonEltInOldTimeline = newTimeline[0];
        commonEltInOldTimeline.start +=
            commonEltInOldTimeline.duration * repeatNumberInPrevSegments;
        newTimeline[0].repeatCount -= repeatNumberInPrevSegments;
    }
    if (repeatNumberInNewElements > 0 && newElementsIdx !== 0) {
        log_1.default.info('DASH: Cannot perform "based" update. ' + "The new timeline has a different form.");
        return (0, construct_timeline_from_elements_1.default)(newElements);
    }
    var prevLastElement = newTimeline[newTimeline.length - 1];
    var newCommonElt = Array.isArray(newElements)
        ? (0, parse_s_element_1.parseSElementNode)(newElements[lastCommonEltNewEltsIdx])
        : (0, parse_s_element_1.parseSHTMLElement)(newElements[lastCommonEltNewEltsIdx]);
    var newRepeatCountOffseted = ((_a = newCommonElt.repeatCount) !== null && _a !== void 0 ? _a : 0) - repeatNumberInNewElements;
    if (newCommonElt.duration !== prevLastElement.duration ||
        prevLastElement.repeatCount > newRepeatCountOffseted) {
        log_1.default.info('DASH: Cannot perform "based" update. ' +
            "The new timeline has a different form at the beginning.");
        return (0, construct_timeline_from_elements_1.default)(newElements);
    }
    if (newCommonElt.repeatCount !== undefined &&
        newCommonElt.repeatCount > prevLastElement.repeatCount) {
        prevLastElement.repeatCount = newCommonElt.repeatCount;
    }
    var newEltsToPush = [];
    var items = [];
    if (Array.isArray(newElements)) {
        for (var i = lastCommonEltNewEltsIdx + 1; i < newElements.length; i++) {
            items.push((0, parse_s_element_1.parseSElementNode)(newElements[i]));
        }
    }
    else {
        for (var i = lastCommonEltNewEltsIdx + 1; i < newElements.length; i++) {
            items.push((0, parse_s_element_1.parseSHTMLElement)(newElements[i]));
        }
    }
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var previousItem = newEltsToPush[newEltsToPush.length - 1] === undefined
            ? prevLastElement
            : newEltsToPush[newEltsToPush.length - 1];
        var nextItem = items[i + 1] === undefined ? null : items[i + 1];
        var timelineElement = (0, convert_element_to_index_segment_1.default)(item, previousItem, nextItem);
        if (timelineElement !== null) {
            newEltsToPush.push(timelineElement);
        }
    }
    return newTimeline.concat(newEltsToPush);
}
exports.default = constructTimelineFromPreviousTimeline;
