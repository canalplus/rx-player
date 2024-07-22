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
exports.createMPDIntermediateRepresentation = void 0;
var BaseURL_1 = require("./BaseURL");
var ContentProtection_1 = require("./ContentProtection");
var Period_1 = require("./Period");
var utils_1 = require("./utils");
/**
 * Parse children of the MPD's root into a simple object.
 * @param {NodeList} mpdChildren
 * @returns {Array.<Object>}
 */
function parseMPDChildren(mpdChildren) {
    var baseURLs = [];
    var locations = [];
    var periods = [];
    var utcTimings = [];
    var contentProtections = [];
    var warnings = [];
    for (var i = 0; i < mpdChildren.length; i++) {
        if (mpdChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentNode = mpdChildren[i];
            switch (currentNode.nodeName) {
                case "BaseURL":
                    var _a = __read((0, BaseURL_1.default)(currentNode), 2), baseURLObj = _a[0], baseURLWarnings = _a[1];
                    if (baseURLObj !== undefined) {
                        baseURLs.push(baseURLObj);
                    }
                    warnings = warnings.concat(baseURLWarnings);
                    break;
                case "Location":
                    locations.push(currentNode.textContent === null ? "" : currentNode.textContent);
                    break;
                case "Period":
                    var _b = __read((0, Period_1.createPeriodIntermediateRepresentation)(currentNode), 2), period = _b[0], periodWarnings = _b[1];
                    periods.push(period);
                    warnings = warnings.concat(periodWarnings);
                    break;
                case "UTCTiming":
                    var utcTiming = (0, utils_1.parseScheme)(currentNode);
                    utcTimings.push(utcTiming);
                    break;
                case "ContentProtection":
                    var _c = __read((0, ContentProtection_1.default)(currentNode), 2), contentProtection = _c[0], contentProtectionWarnings = _c[1];
                    if (contentProtectionWarnings.length > 0) {
                        warnings = warnings.concat(contentProtectionWarnings);
                    }
                    if (contentProtection !== undefined) {
                        contentProtections.push(contentProtection);
                    }
                    break;
            }
        }
    }
    return [{ baseURLs: baseURLs, locations: locations, periods: periods, utcTimings: utcTimings, contentProtections: contentProtections }, warnings];
}
/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
function parseMPDAttributes(root) {
    var res = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(res, warnings);
    for (var i = 0; i < root.attributes.length; i++) {
        var attribute = root.attributes[i];
        switch (attribute.name) {
            case "id":
                res.id = attribute.value;
                break;
            case "profiles":
                res.profiles = attribute.value;
                break;
            case "type":
                res.type = attribute.value;
                break;
            case "availabilityStartTime":
                parseValue(attribute.value, {
                    asKey: "availabilityStartTime",
                    parser: utils_1.parseDateTime,
                    dashName: "availabilityStartTime",
                });
                break;
            case "availabilityEndTime":
                parseValue(attribute.value, {
                    asKey: "availabilityEndTime",
                    parser: utils_1.parseDateTime,
                    dashName: "availabilityEndTime",
                });
                break;
            case "publishTime":
                parseValue(attribute.value, {
                    asKey: "publishTime",
                    parser: utils_1.parseDateTime,
                    dashName: "publishTime",
                });
                break;
            case "mediaPresentationDuration":
                parseValue(attribute.value, {
                    asKey: "duration",
                    parser: utils_1.parseDuration,
                    dashName: "mediaPresentationDuration",
                });
                break;
            case "minimumUpdatePeriod":
                parseValue(attribute.value, {
                    asKey: "minimumUpdatePeriod",
                    parser: utils_1.parseDuration,
                    dashName: "minimumUpdatePeriod",
                });
                break;
            case "minBufferTime":
                parseValue(attribute.value, {
                    asKey: "minBufferTime",
                    parser: utils_1.parseDuration,
                    dashName: "minBufferTime",
                });
                break;
            case "timeShiftBufferDepth":
                parseValue(attribute.value, {
                    asKey: "timeShiftBufferDepth",
                    parser: utils_1.parseDuration,
                    dashName: "timeShiftBufferDepth",
                });
                break;
            case "suggestedPresentationDelay":
                parseValue(attribute.value, {
                    asKey: "suggestedPresentationDelay",
                    parser: utils_1.parseDuration,
                    dashName: "suggestedPresentationDelay",
                });
                break;
            case "maxSegmentDuration":
                parseValue(attribute.value, {
                    asKey: "maxSegmentDuration",
                    parser: utils_1.parseDuration,
                    dashName: "maxSegmentDuration",
                });
                break;
            case "maxSubsegmentDuration":
                parseValue(attribute.value, {
                    asKey: "maxSubsegmentDuration",
                    parser: utils_1.parseDuration,
                    dashName: "maxSubsegmentDuration",
                });
                break;
        }
    }
    return [res, warnings];
}
/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
function createMPDIntermediateRepresentation(root) {
    var _a = __read(parseMPDChildren(root.childNodes), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parseMPDAttributes(root), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createMPDIntermediateRepresentation = createMPDIntermediateRepresentation;
