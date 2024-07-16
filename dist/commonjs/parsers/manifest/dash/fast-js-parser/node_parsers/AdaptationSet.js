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
exports.createAdaptationSetIntermediateRepresentation = void 0;
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var BaseURL_1 = require("./BaseURL");
var ContentComponent_1 = require("./ContentComponent");
var ContentProtection_1 = require("./ContentProtection");
var Representation_1 = require("./Representation");
var SegmentBase_1 = require("./SegmentBase");
var SegmentList_1 = require("./SegmentList");
var SegmentTemplate_1 = require("./SegmentTemplate");
var utils_1 = require("./utils");
/**
 * Parse child nodes from an AdaptationSet.
 * @param {Array.<ITNode | string>} adaptationSetChildren - The AdaptationSet child nodes.
 * @returns {Array.<Object>}
 */
function parseAdaptationSetChildren(adaptationSetChildren) {
    var children = {
        baseURLs: [],
        representations: [],
    };
    var contentProtections = [];
    var warnings = [];
    for (var i = 0; i < adaptationSetChildren.length; i++) {
        var currentNode = adaptationSetChildren[i];
        if (typeof currentNode === "string") {
            continue;
        }
        switch (currentNode.tagName) {
            case "Accessibility":
                if (children.accessibilities === undefined) {
                    children.accessibilities = [(0, utils_1.parseScheme)(currentNode)];
                }
                else {
                    children.accessibilities.push((0, utils_1.parseScheme)(currentNode));
                }
                break;
            case "BaseURL":
                var _a = __read((0, BaseURL_1.default)(currentNode), 2), baseURLObj = _a[0], baseURLWarnings = _a[1];
                if (baseURLObj !== undefined) {
                    children.baseURLs.push(baseURLObj);
                }
                if (baseURLWarnings.length > 0) {
                    warnings = warnings.concat(baseURLWarnings);
                }
                break;
            case "ContentComponent":
                children.contentComponent = (0, ContentComponent_1.default)(currentNode);
                break;
            case "EssentialProperty":
                if ((0, is_null_or_undefined_1.default)(children.essentialProperties)) {
                    children.essentialProperties = [(0, utils_1.parseScheme)(currentNode)];
                }
                else {
                    children.essentialProperties.push((0, utils_1.parseScheme)(currentNode));
                }
                break;
            case "InbandEventStream":
                if (children.inbandEventStreams === undefined) {
                    children.inbandEventStreams = [];
                }
                children.inbandEventStreams.push((0, utils_1.parseScheme)(currentNode));
                break;
            case "Label":
                var label = (0, utils_1.textContent)(currentNode.children);
                if (label !== null && label !== undefined) {
                    children.label = label;
                }
                break;
            case "Representation":
                var _b = __read((0, Representation_1.createRepresentationIntermediateRepresentation)(currentNode), 2), representation = _b[0], representationWarnings = _b[1];
                children.representations.push(representation);
                if (representationWarnings.length > 0) {
                    warnings = warnings.concat(representationWarnings);
                }
                break;
            case "Role":
                if ((0, is_null_or_undefined_1.default)(children.roles)) {
                    children.roles = [(0, utils_1.parseScheme)(currentNode)];
                }
                else {
                    children.roles.push((0, utils_1.parseScheme)(currentNode));
                }
                break;
            case "SupplementalProperty":
                if ((0, is_null_or_undefined_1.default)(children.supplementalProperties)) {
                    children.supplementalProperties = [(0, utils_1.parseScheme)(currentNode)];
                }
                else {
                    children.supplementalProperties.push((0, utils_1.parseScheme)(currentNode));
                }
                break;
            case "SegmentBase":
                var _c = __read((0, SegmentBase_1.default)(currentNode), 2), segmentBase = _c[0], segmentBaseWarnings = _c[1];
                children.segmentBase = segmentBase;
                if (segmentBaseWarnings.length > 0) {
                    warnings = warnings.concat(segmentBaseWarnings);
                }
                break;
            case "SegmentList":
                var _d = __read((0, SegmentList_1.default)(currentNode), 2), segmentList = _d[0], segmentListWarnings = _d[1];
                children.segmentList = segmentList;
                if (segmentListWarnings.length > 0) {
                    warnings = warnings.concat(segmentListWarnings);
                }
                break;
            case "SegmentTemplate":
                var _e = __read((0, SegmentTemplate_1.default)(currentNode), 2), segmentTemplate = _e[0], segmentTemplateWarnings = _e[1];
                children.segmentTemplate = segmentTemplate;
                if (segmentTemplateWarnings.length > 0) {
                    warnings = warnings.concat(segmentTemplateWarnings);
                }
                break;
            case "ContentProtection":
                var _f = __read((0, ContentProtection_1.default)(currentNode), 2), contentProtection = _f[0], contentProtectionWarnings = _f[1];
                if (contentProtectionWarnings.length > 0) {
                    warnings = warnings.concat(contentProtectionWarnings);
                }
                if (contentProtection !== undefined) {
                    contentProtections.push(contentProtection);
                }
                break;
            // case "Rating":
            //   children.rating = currentNode;
            //   break;
            // case "Viewpoint":
            //   children.viewpoint = currentNode;
            //   break;
        }
    }
    if (contentProtections.length > 0) {
        children.contentProtections = contentProtections;
    }
    return [children, warnings];
}
/**
 * Parse every attributes from an AdaptationSet root element into a simple JS
 * object.
 * @param {Object} root - The AdaptationSet root element.
 * @returns {Array.<Object>}
 */
function parseAdaptationSetAttributes(root) {
    var e_1, _a;
    var parsedAdaptation = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(parsedAdaptation, warnings);
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "id":
                    parsedAdaptation.id = attributeVal;
                    break;
                case "group":
                    parseValue(attributeVal, {
                        asKey: "group",
                        parser: utils_1.parseMPDInteger,
                        dashName: "group",
                    });
                    break;
                case "lang":
                    parsedAdaptation.language = attributeVal;
                    break;
                case "contentType":
                    parsedAdaptation.contentType = attributeVal;
                    break;
                case "par":
                    parsedAdaptation.par = attributeVal;
                    break;
                case "minBandwidth":
                    parseValue(attributeVal, {
                        asKey: "minBitrate",
                        parser: utils_1.parseMPDInteger,
                        dashName: "minBandwidth",
                    });
                    break;
                case "maxBandwidth":
                    parseValue(attributeVal, {
                        asKey: "maxBitrate",
                        parser: utils_1.parseMPDInteger,
                        dashName: "maxBandwidth",
                    });
                    break;
                case "minWidth":
                    parseValue(attributeVal, {
                        asKey: "minWidth",
                        parser: utils_1.parseMPDInteger,
                        dashName: "minWidth",
                    });
                    break;
                case "maxWidth":
                    parseValue(attributeVal, {
                        asKey: "maxWidth",
                        parser: utils_1.parseMPDInteger,
                        dashName: "maxWidth",
                    });
                    break;
                case "minHeight":
                    parseValue(attributeVal, {
                        asKey: "minHeight",
                        parser: utils_1.parseMPDInteger,
                        dashName: "minHeight",
                    });
                    break;
                case "maxHeight":
                    parseValue(attributeVal, {
                        asKey: "maxHeight",
                        parser: utils_1.parseMPDInteger,
                        dashName: "maxHeight",
                    });
                    break;
                case "minFrameRate":
                    parseValue(attributeVal, {
                        asKey: "minFrameRate",
                        parser: utils_1.parseMaybeDividedNumber,
                        dashName: "minFrameRate",
                    });
                    break;
                case "maxFrameRate":
                    parseValue(attributeVal, {
                        asKey: "maxFrameRate",
                        parser: utils_1.parseMaybeDividedNumber,
                        dashName: "maxFrameRate",
                    });
                    break;
                case "selectionPriority":
                    parseValue(attributeVal, {
                        asKey: "selectionPriority",
                        parser: utils_1.parseMPDInteger,
                        dashName: "selectionPriority",
                    });
                    break;
                case "segmentAlignment":
                    parseValue(attributeVal, {
                        asKey: "segmentAlignment",
                        parser: utils_1.parseIntOrBoolean,
                        dashName: "segmentAlignment",
                    });
                    break;
                case "subsegmentAlignment":
                    parseValue(attributeVal, {
                        asKey: "subsegmentAlignment",
                        parser: utils_1.parseIntOrBoolean,
                        dashName: "subsegmentAlignment",
                    });
                    break;
                case "bitstreamSwitching":
                    parseValue(attributeVal, {
                        asKey: "bitstreamSwitching",
                        parser: utils_1.parseBoolean,
                        dashName: "bitstreamSwitching",
                    });
                    break;
                case "audioSamplingRate":
                    parsedAdaptation.audioSamplingRate = attributeVal;
                    break;
                case "codecs":
                    parsedAdaptation.codecs = attributeVal;
                    break;
                case "scte214:supplementalCodecs":
                    parsedAdaptation.supplementalCodecs = attributeVal;
                    break;
                case "codingDependency":
                    parseValue(attributeVal, {
                        asKey: "codingDependency",
                        parser: utils_1.parseBoolean,
                        dashName: "codingDependency",
                    });
                    break;
                case "frameRate":
                    parseValue(attributeVal, {
                        asKey: "frameRate",
                        parser: utils_1.parseMaybeDividedNumber,
                        dashName: "frameRate",
                    });
                    break;
                case "height":
                    parseValue(attributeVal, {
                        asKey: "height",
                        parser: utils_1.parseMPDInteger,
                        dashName: "height",
                    });
                    break;
                case "maxPlayoutRate":
                    parseValue(attributeVal, {
                        asKey: "maxPlayoutRate",
                        parser: utils_1.parseMPDFloat,
                        dashName: "maxPlayoutRate",
                    });
                    break;
                case "maximumSAPPeriod":
                    parseValue(attributeVal, {
                        asKey: "maximumSAPPeriod",
                        parser: utils_1.parseMPDFloat,
                        dashName: "maximumSAPPeriod",
                    });
                    break;
                case "mimeType":
                    parsedAdaptation.mimeType = attributeVal;
                    break;
                case "profiles":
                    parsedAdaptation.profiles = attributeVal;
                    break;
                case "segmentProfiles":
                    parsedAdaptation.segmentProfiles = attributeVal;
                    break;
                case "width":
                    parseValue(attributeVal, {
                        asKey: "width",
                        parser: utils_1.parseMPDInteger,
                        dashName: "width",
                    });
                    break;
                case "availabilityTimeOffset":
                    parseValue(attributeVal, {
                        asKey: "availabilityTimeOffset",
                        parser: utils_1.parseMPDFloat,
                        dashName: "availabilityTimeOffset",
                    });
                    break;
                case "availabilityTimeComplete":
                    parseValue(attributeVal, {
                        asKey: "availabilityTimeComplete",
                        parser: utils_1.parseBoolean,
                        dashName: "availabilityTimeComplete",
                    });
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
    return [parsedAdaptation, warnings];
}
/**
 * Parse an AdaptationSet element into an AdaptationSet intermediate
 * representation.
 * @param {Object} adaptationSetElement - The AdaptationSet root element.
 * @returns {Array.<Object>}
 */
function createAdaptationSetIntermediateRepresentation(adaptationSetElement) {
    var childNodes = adaptationSetElement.children;
    var _a = __read(parseAdaptationSetChildren(childNodes), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parseAdaptationSetAttributes(adaptationSetElement), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createAdaptationSetIntermediateRepresentation = createAdaptationSetIntermediateRepresentation;
