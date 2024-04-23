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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMPDIntermediateRepresentation = void 0;
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var starts_with_1 = require("../../../../../utils/starts_with");
var BaseURL_1 = require("./BaseURL");
var Period_1 = require("./Period");
var utils_1 = require("./utils");
/**
 * Parse children of the MPD's root into a simple object.
 * @param {Array.<Object | string>} mpdChildren
 * @returns {Array.<Object>}
 */
function parseMPDChildren(mpdChildren, fullMpd) {
    var baseURLs = [];
    var locations = [];
    var periods = [];
    var utcTimings = [];
    var warnings = [];
    for (var i = 0; i < mpdChildren.length; i++) {
        var currentNode = mpdChildren[i];
        if (typeof currentNode === "string") {
            continue;
        }
        switch (currentNode.tagName) {
            case "BaseURL":
                var _a = __read((0, BaseURL_1.default)(currentNode), 2), baseURLObj = _a[0], baseURLWarnings = _a[1];
                if (baseURLObj !== undefined) {
                    baseURLs.push(baseURLObj);
                }
                warnings = warnings.concat(baseURLWarnings);
                break;
            case "Location":
                locations.push((0, utils_1.textContent)(currentNode.children));
                break;
            case "Period":
                var _b = __read((0, Period_1.createPeriodIntermediateRepresentation)(currentNode, fullMpd), 2), period = _b[0], periodWarnings = _b[1];
                periods.push(period);
                warnings = warnings.concat(periodWarnings);
                break;
            case "UTCTiming":
                var utcTiming = (0, utils_1.parseScheme)(currentNode);
                utcTimings.push(utcTiming);
                break;
        }
    }
    return [{ baseURLs: baseURLs, locations: locations, periods: periods, utcTimings: utcTimings }, warnings];
}
/**
 * @param {Object} root
 * @returns {Array.<Object>}
 */
function parseMPDAttributes(root) {
    var e_1, _a;
    var res = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(res, warnings);
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "id":
                    res.id = attributeVal;
                    break;
                case "profiles":
                    res.profiles = attributeVal;
                    break;
                case "type":
                    res.type = attributeVal;
                    break;
                case "availabilityStartTime":
                    parseValue(attributeVal, {
                        asKey: "availabilityStartTime",
                        parser: utils_1.parseDateTime,
                        dashName: "availabilityStartTime",
                    });
                    break;
                case "availabilityEndTime":
                    parseValue(attributeVal, {
                        asKey: "availabilityEndTime",
                        parser: utils_1.parseDateTime,
                        dashName: "availabilityEndTime",
                    });
                    break;
                case "publishTime":
                    parseValue(attributeVal, {
                        asKey: "publishTime",
                        parser: utils_1.parseDateTime,
                        dashName: "publishTime",
                    });
                    break;
                case "mediaPresentationDuration":
                    parseValue(attributeVal, {
                        asKey: "duration",
                        parser: utils_1.parseDuration,
                        dashName: "mediaPresentationDuration",
                    });
                    break;
                case "minimumUpdatePeriod":
                    parseValue(attributeVal, {
                        asKey: "minimumUpdatePeriod",
                        parser: utils_1.parseDuration,
                        dashName: "minimumUpdatePeriod",
                    });
                    break;
                case "minBufferTime":
                    parseValue(attributeVal, {
                        asKey: "minBufferTime",
                        parser: utils_1.parseDuration,
                        dashName: "minBufferTime",
                    });
                    break;
                case "timeShiftBufferDepth":
                    parseValue(attributeVal, {
                        asKey: "timeShiftBufferDepth",
                        parser: utils_1.parseDuration,
                        dashName: "timeShiftBufferDepth",
                    });
                    break;
                case "suggestedPresentationDelay":
                    parseValue(attributeVal, {
                        asKey: "suggestedPresentationDelay",
                        parser: utils_1.parseDuration,
                        dashName: "suggestedPresentationDelay",
                    });
                    break;
                case "maxSegmentDuration":
                    parseValue(attributeVal, {
                        asKey: "maxSegmentDuration",
                        parser: utils_1.parseDuration,
                        dashName: "maxSegmentDuration",
                    });
                    break;
                case "maxSubsegmentDuration":
                    parseValue(attributeVal, {
                        asKey: "maxSubsegmentDuration",
                        parser: utils_1.parseDuration,
                        dashName: "maxSubsegmentDuration",
                    });
                    break;
                default:
                    if ((0, starts_with_1.default)(attributeName, "xmlns:")) {
                        if (res.namespaces === undefined) {
                            res.namespaces = [];
                        }
                        res.namespaces.push({
                            key: attributeName.substring(6),
                            value: attributeVal,
                        });
                    }
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return [res, warnings];
}
/**
 * @param {Object} root
 * @param {string} fullMpd
 * @returns {Array.<Object>}
 */
function createMPDIntermediateRepresentation(root, fullMpd) {
    var _a = __read(parseMPDChildren(root.children, fullMpd), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parseMPDAttributes(root), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createMPDIntermediateRepresentation = createMPDIntermediateRepresentation;
