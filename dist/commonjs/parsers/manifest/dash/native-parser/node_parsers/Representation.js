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
exports.createRepresentationIntermediateRepresentation = void 0;
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var BaseURL_1 = require("./BaseURL");
var ContentProtection_1 = require("./ContentProtection");
var SegmentBase_1 = require("./SegmentBase");
var SegmentList_1 = require("./SegmentList");
var SegmentTemplate_1 = require("./SegmentTemplate");
var utils_1 = require("./utils");
/**
 * @param {NodeList} representationChildren
 * @returns {Object}
 */
function parseRepresentationChildren(representationChildren) {
    var children = {
        baseURLs: [],
    };
    var contentProtections = [];
    var warnings = [];
    for (var i = 0; i < representationChildren.length; i++) {
        if (representationChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentElement = representationChildren[i];
            switch (currentElement.nodeName) {
                case "BaseURL":
                    var _a = __read((0, BaseURL_1.default)(currentElement), 2), baseURLObj = _a[0], baseURLWarnings = _a[1];
                    if (baseURLObj !== undefined) {
                        children.baseURLs.push(baseURLObj);
                    }
                    warnings = warnings.concat(baseURLWarnings);
                    break;
                case "InbandEventStream":
                    if (children.inbandEventStreams === undefined) {
                        children.inbandEventStreams = [];
                    }
                    children.inbandEventStreams.push((0, utils_1.parseScheme)(currentElement));
                    break;
                case "SegmentBase":
                    var _b = __read((0, SegmentBase_1.default)(currentElement), 2), segmentBase = _b[0], segmentBaseWarnings = _b[1];
                    children.segmentBase = segmentBase;
                    if (segmentBaseWarnings.length > 0) {
                        warnings = warnings.concat(segmentBaseWarnings);
                    }
                    break;
                case "SegmentList":
                    var _c = __read((0, SegmentList_1.default)(currentElement), 2), segmentList = _c[0], segmentListWarnings = _c[1];
                    warnings = warnings.concat(segmentListWarnings);
                    children.segmentList = segmentList;
                    break;
                case "SegmentTemplate":
                    var _d = __read((0, SegmentTemplate_1.default)(currentElement), 2), segmentTemplate = _d[0], segmentTemplateWarnings = _d[1];
                    warnings = warnings.concat(segmentTemplateWarnings);
                    children.segmentTemplate = segmentTemplate;
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
                case "SupplementalProperty":
                    if ((0, is_null_or_undefined_1.default)(children.supplementalProperties)) {
                        children.supplementalProperties = [(0, utils_1.parseScheme)(currentElement)];
                    }
                    else {
                        children.supplementalProperties.push((0, utils_1.parseScheme)(currentElement));
                    }
                    break;
            }
        }
    }
    if (contentProtections.length > 0) {
        children.contentProtections = contentProtections;
    }
    return [children, warnings];
}
/**
 * @param {Element} representationElement
 * @returns {Array}
 */
function parseRepresentationAttributes(representationElement) {
    var attributes = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(attributes, warnings);
    for (var i = 0; i < representationElement.attributes.length; i++) {
        var attr = representationElement.attributes[i];
        switch (attr.name) {
            case "audioSamplingRate":
                attributes.audioSamplingRate = attr.value;
                break;
            case "bandwidth":
                parseValue(attr.value, {
                    asKey: "bitrate",
                    parser: utils_1.parseMPDInteger,
                    dashName: "bandwidth",
                });
                break;
            case "codecs":
                attributes.codecs = attr.value;
                break;
            case "codingDependency":
                parseValue(attr.value, {
                    asKey: "codingDependency",
                    parser: utils_1.parseBoolean,
                    dashName: "codingDependency",
                });
                break;
            case "frameRate":
                parseValue(attr.value, {
                    asKey: "frameRate",
                    parser: utils_1.parseMaybeDividedNumber,
                    dashName: "frameRate",
                });
                break;
            case "height":
                parseValue(attr.value, {
                    asKey: "height",
                    parser: utils_1.parseMPDInteger,
                    dashName: "height",
                });
                break;
            case "id":
                attributes.id = attr.value;
                break;
            case "maxPlayoutRate":
                parseValue(attr.value, {
                    asKey: "maxPlayoutRate",
                    parser: utils_1.parseMPDFloat,
                    dashName: "maxPlayoutRate",
                });
                break;
            case "maximumSAPPeriod":
                parseValue(attr.value, {
                    asKey: "maximumSAPPeriod",
                    parser: utils_1.parseMPDFloat,
                    dashName: "maximumSAPPeriod",
                });
                break;
            case "mimeType":
                attributes.mimeType = attr.value;
                break;
            case "profiles":
                attributes.profiles = attr.value;
                break;
            case "qualityRanking":
                parseValue(attr.value, {
                    asKey: "qualityRanking",
                    parser: utils_1.parseMPDInteger,
                    dashName: "qualityRanking",
                });
                break;
            case "scte214:supplementalCodecs":
                attributes.supplementalCodecs = attr.value;
                break;
            case "segmentProfiles":
                attributes.segmentProfiles = attr.value;
                break;
            case "width":
                parseValue(attr.value, {
                    asKey: "width",
                    parser: utils_1.parseMPDInteger,
                    dashName: "width",
                });
                break;
            case "availabilityTimeOffset":
                parseValue(attr.value, {
                    asKey: "availabilityTimeOffset",
                    parser: utils_1.parseMPDFloat,
                    dashName: "availabilityTimeOffset",
                });
                break;
            case "availabilityTimeComplete":
                parseValue(attr.value, {
                    asKey: "availabilityTimeComplete",
                    parser: utils_1.parseBoolean,
                    dashName: "availabilityTimeComplete",
                });
                break;
        }
    }
    if (attributes.bitrate === undefined) {
        warnings.push(new utils_1.MPDError("No bitrate found on a Representation"));
    }
    return [attributes, warnings];
}
/**
 * @param {Element} representationElement
 * @returns {Array}
 */
function createRepresentationIntermediateRepresentation(representationElement) {
    var _a = __read(parseRepresentationChildren(representationElement.childNodes), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parseRepresentationAttributes(representationElement), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createRepresentationIntermediateRepresentation = createRepresentationIntermediateRepresentation;
