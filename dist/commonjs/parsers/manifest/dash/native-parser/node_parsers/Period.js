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
exports.createPeriodIntermediateRepresentation = void 0;
var AdaptationSet_1 = require("./AdaptationSet");
var BaseURL_1 = require("./BaseURL");
var ContentProtection_1 = require("./ContentProtection");
var EventStream_1 = require("./EventStream");
var SegmentTemplate_1 = require("./SegmentTemplate");
var utils_1 = require("./utils");
/**
 * @param {NodeList} periodChildren
 * @returns {Array}
 */
function parsePeriodChildren(periodChildren) {
    var baseURLs = [];
    var adaptations = [];
    var segmentTemplate;
    var contentProtections = [];
    var warnings = [];
    var eventStreams = [];
    for (var i = 0; i < periodChildren.length; i++) {
        if (periodChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentElement = periodChildren[i];
            switch (currentElement.nodeName) {
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
                    var _c = __read((0, EventStream_1.default)(currentElement), 2), eventStream = _c[0], eventStreamWarnings = _c[1];
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
                case "ContentProtection":
                    var _e = __read((0, ContentProtection_1.default)(currentElement), 2), contentProtection = _e[0], contentProtectionWarnings = _e[1];
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
    return [
        { baseURLs: baseURLs, adaptations: adaptations, eventStreams: eventStreams, segmentTemplate: segmentTemplate, contentProtections: contentProtections },
        warnings,
    ];
}
/**
 * @param {Element} periodElement
 * @returns {Array}
 */
function parsePeriodAttributes(periodElement) {
    var res = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(res, warnings);
    for (var i = 0; i < periodElement.attributes.length; i++) {
        var attr = periodElement.attributes[i];
        switch (attr.name) {
            case "id":
                res.id = attr.value;
                break;
            case "start":
                parseValue(attr.value, {
                    asKey: "start",
                    parser: utils_1.parseDuration,
                    dashName: "start",
                });
                break;
            case "duration":
                parseValue(attr.value, {
                    asKey: "duration",
                    parser: utils_1.parseDuration,
                    dashName: "duration",
                });
                break;
            case "bitstreamSwitching":
                parseValue(attr.value, {
                    asKey: "bitstreamSwitching",
                    parser: utils_1.parseBoolean,
                    dashName: "bitstreamSwitching",
                });
                break;
            case "xlink:href":
                res.xlinkHref = attr.value;
                break;
            case "xlink:actuate":
                res.xlinkActuate = attr.value;
                break;
        }
    }
    return [res, warnings];
}
/**
 * @param {Element} periodElement
 * @returns {Array}
 */
function createPeriodIntermediateRepresentation(periodElement) {
    var _a = __read(parsePeriodChildren(periodElement.childNodes), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parsePeriodAttributes(periodElement), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createPeriodIntermediateRepresentation = createPeriodIntermediateRepresentation;
