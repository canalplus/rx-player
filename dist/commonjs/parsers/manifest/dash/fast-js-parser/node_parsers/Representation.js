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
exports.createRepresentationIntermediateRepresentation = void 0;
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var BaseURL_1 = require("./BaseURL");
var ContentProtection_1 = require("./ContentProtection");
var SegmentBase_1 = require("./SegmentBase");
var SegmentList_1 = require("./SegmentList");
var SegmentTemplate_1 = require("./SegmentTemplate");
var utils_1 = require("./utils");
/**
 * @param {Array.<Object | string>} representationChildren
 * @returns {Object}
 */
function parseRepresentationChildren(representationChildren) {
    var children = {
        baseURLs: [],
    };
    var contentProtections = [];
    var warnings = [];
    for (var i = 0; i < representationChildren.length; i++) {
        var currentElement = representationChildren[i];
        if (typeof currentElement === "string") {
            continue;
        }
        switch (currentElement.tagName) {
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
    if (contentProtections.length > 0) {
        children.contentProtections = contentProtections;
    }
    return [children, warnings];
}
/**
 * @param {Object} root
 * @returns {Array}
 */
function parseRepresentationAttributes(root) {
    var e_1, _a;
    var attributes = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(attributes, warnings);
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "audioSamplingRate":
                    attributes.audioSamplingRate = attributeVal;
                    break;
                case "bandwidth":
                    parseValue(attributeVal, {
                        asKey: "bitrate",
                        parser: utils_1.parseMPDInteger,
                        dashName: "bandwidth",
                    });
                    break;
                case "codecs":
                    attributes.codecs = attributeVal;
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
                case "id":
                    attributes.id = attributeVal;
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
                    attributes.mimeType = attributeVal;
                    break;
                case "profiles":
                    attributes.profiles = attributeVal;
                    break;
                case "qualityRanking":
                    parseValue(attributeVal, {
                        asKey: "qualityRanking",
                        parser: utils_1.parseMPDInteger,
                        dashName: "qualityRanking",
                    });
                    break;
                case "scte214:supplementalCodecs":
                    attributes.supplementalCodecs = attributeVal;
                    break;
                case "segmentProfiles":
                    attributes.segmentProfiles = attributeVal;
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
    if (attributes.bitrate === undefined) {
        warnings.push(new utils_1.MPDError("No bitrate found on a Representation"));
    }
    return [attributes, warnings];
}
/**
 * @param {Object} representationElement
 * @returns {Array}
 */
function createRepresentationIntermediateRepresentation(representationElement) {
    var _a = __read(parseRepresentationChildren(representationElement.children), 2), children = _a[0], childrenWarnings = _a[1];
    var _b = __read(parseRepresentationAttributes(representationElement), 2), attributes = _b[0], attrsWarnings = _b[1];
    var warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children: children, attributes: attributes }, warnings];
}
exports.createRepresentationIntermediateRepresentation = createRepresentationIntermediateRepresentation;
