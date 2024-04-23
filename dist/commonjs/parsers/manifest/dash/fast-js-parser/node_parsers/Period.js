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
exports.createPeriodIntermediateRepresentation = void 0;
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var starts_with_1 = require("../../../../../utils/starts_with");
var AdaptationSet_1 = require("./AdaptationSet");
var BaseURL_1 = require("./BaseURL");
var EventStream_1 = require("./EventStream");
var SegmentTemplate_1 = require("./SegmentTemplate");
var utils_1 = require("./utils");
/**
 * @param {Array.<Object | string>} periodChildren
 * @param {string} fullMpd
 * @returns {Array}
 */
function parsePeriodChildren(periodChildren, fullMpd) {
    var baseURLs = [];
    var adaptations = [];
    var segmentTemplate;
    var warnings = [];
    var eventStreams = [];
    for (var i = 0; i < periodChildren.length; i++) {
        var currentElement = periodChildren[i];
        if (typeof currentElement === "string") {
            continue;
        }
        switch (currentElement.tagName) {
            case "BaseURL":
                var _a = __read((0, BaseURL_1.default)(currentElement), 2), baseURLObj = _a[0], baseURLWarnings = _a[1];
                if (baseURLObj !== undefined) {
                    baseURLs.push(baseURLObj);
                }
                warnings = warnings.concat(baseURLWarnings);
                break;
            case "AdaptationSet":
                var _b = __read((0, AdaptationSet_1.createAdaptationSetIntermediateRepresentation)(currentElement), 2), adaptation = _b[0], adaptationWarnings = _b[1];
                adaptations.push(adaptation);
                warnings = warnings.concat(adaptationWarnings);
                break;
            case "EventStream":
                var _c = __read((0, EventStream_1.createEventStreamIntermediateRepresentation)(currentElement, fullMpd), 2), eventStream = _c[0], eventStreamWarnings = _c[1];
                eventStreams.push(eventStream);
                warnings = warnings.concat(eventStreamWarnings);
                break;
            case "SegmentTemplate":
                var _d = __read((0, SegmentTemplate_1.default)(currentElement), 2), parsedSegmentTemplate = _d[0], segmentTemplateWarnings = _d[1];
                segmentTemplate = parsedSegmentTemplate;
                if (segmentTemplateWarnings.length > 0) {
                    warnings = warnings.concat(segmentTemplateWarnings);
                }
                break;
        }
    }
    return [{ baseURLs: baseURLs, adaptations: adaptations, eventStreams: eventStreams, segmentTemplate: segmentTemplate }, warnings];
}
/**
 * @param {Object} root
 * @returns {Array}
 */
function parsePeriodAttributes(root) {
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
                case "start":
                    parseValue(attributeVal, {
                        asKey: "start",
                        parser: utils_1.parseDuration,
                        dashName: "start",
                    });
                    break;
                case "duration":
                    parseValue(attributeVal, {
                        asKey: "duration",
                        parser: utils_1.parseDuration,
                        dashName: "duration",
                    });
                    break;
                case "bitstreamSwitching":
                    parseValue(attributeVal, {
                        asKey: "bitstreamSwitching",
                        parser: utils_1.parseBoolean,
                        dashName: "bitstreamSwitching",
                    });
                    break;
                case "xlink:href":
                    res.xlinkHref = attributeVal;
                    break;
                case "xlink:actuate":
                    res.xlinkActuate = attributeVal;
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
 * @param {Object} periodElement
 * @param {string} fullMpd
 * @returns {Array}
 */
function createPeriodIntermediateRepresentation(periodElement, fullMpd) {
    var _a = __read(parsePeriodChildren(periodElement.children, fullMpd), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parsePeriodAttributes(periodElement), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createPeriodIntermediateRepresentation = createPeriodIntermediateRepresentation;
