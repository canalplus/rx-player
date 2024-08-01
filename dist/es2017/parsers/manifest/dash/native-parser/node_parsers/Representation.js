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
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import parseBaseURL from "./BaseURL";
import parseContentProtection from "./ContentProtection";
import parseSegmentBase from "./SegmentBase";
import parseSegmentList from "./SegmentList";
import parseSegmentTemplate from "./SegmentTemplate";
import { MPDError, parseBoolean, parseMaybeDividedNumber, parseMPDFloat, parseMPDInteger, parseScheme, ValueParser, } from "./utils";
/**
 * @param {NodeList} representationChildren
 * @returns {Object}
 */
function parseRepresentationChildren(representationChildren) {
    const children = {
        baseURLs: [],
    };
    const contentProtections = [];
    let warnings = [];
    for (let i = 0; i < representationChildren.length; i++) {
        if (representationChildren[i].nodeType === Node.ELEMENT_NODE) {
            const currentElement = representationChildren[i];
            switch (currentElement.nodeName) {
                case "BaseURL":
                    const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
                    if (baseURLObj !== undefined) {
                        children.baseURLs.push(baseURLObj);
                    }
                    warnings = warnings.concat(baseURLWarnings);
                    break;
                case "InbandEventStream":
                    if (children.inbandEventStreams === undefined) {
                        children.inbandEventStreams = [];
                    }
                    children.inbandEventStreams.push(parseScheme(currentElement));
                    break;
                case "SegmentBase":
                    const [segmentBase, segmentBaseWarnings] = parseSegmentBase(currentElement);
                    children.segmentBase = segmentBase;
                    if (segmentBaseWarnings.length > 0) {
                        warnings = warnings.concat(segmentBaseWarnings);
                    }
                    break;
                case "SegmentList":
                    const [segmentList, segmentListWarnings] = parseSegmentList(currentElement);
                    warnings = warnings.concat(segmentListWarnings);
                    children.segmentList = segmentList;
                    break;
                case "SegmentTemplate":
                    const [segmentTemplate, segmentTemplateWarnings] = parseSegmentTemplate(currentElement);
                    warnings = warnings.concat(segmentTemplateWarnings);
                    children.segmentTemplate = segmentTemplate;
                    break;
                case "ContentProtection":
                    const [contentProtection, contentProtectionWarnings] = parseContentProtection(currentElement);
                    if (contentProtectionWarnings.length > 0) {
                        warnings = warnings.concat(contentProtectionWarnings);
                    }
                    if (contentProtection !== undefined) {
                        contentProtections.push(contentProtection);
                    }
                    break;
                case "SupplementalProperty":
                    if (isNullOrUndefined(children.supplementalProperties)) {
                        children.supplementalProperties = [parseScheme(currentElement)];
                    }
                    else {
                        children.supplementalProperties.push(parseScheme(currentElement));
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
    const attributes = {};
    const warnings = [];
    const parseValue = ValueParser(attributes, warnings);
    for (let i = 0; i < representationElement.attributes.length; i++) {
        const attr = representationElement.attributes[i];
        switch (attr.name) {
            case "audioSamplingRate":
                attributes.audioSamplingRate = attr.value;
                break;
            case "bandwidth":
                parseValue(attr.value, {
                    asKey: "bitrate",
                    parser: parseMPDInteger,
                    dashName: "bandwidth",
                });
                break;
            case "codecs":
                attributes.codecs = attr.value;
                break;
            case "codingDependency":
                parseValue(attr.value, {
                    asKey: "codingDependency",
                    parser: parseBoolean,
                    dashName: "codingDependency",
                });
                break;
            case "frameRate":
                parseValue(attr.value, {
                    asKey: "frameRate",
                    parser: parseMaybeDividedNumber,
                    dashName: "frameRate",
                });
                break;
            case "height":
                parseValue(attr.value, {
                    asKey: "height",
                    parser: parseMPDInteger,
                    dashName: "height",
                });
                break;
            case "id":
                attributes.id = attr.value;
                break;
            case "maxPlayoutRate":
                parseValue(attr.value, {
                    asKey: "maxPlayoutRate",
                    parser: parseMPDFloat,
                    dashName: "maxPlayoutRate",
                });
                break;
            case "maximumSAPPeriod":
                parseValue(attr.value, {
                    asKey: "maximumSAPPeriod",
                    parser: parseMPDFloat,
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
                    parser: parseMPDInteger,
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
                    parser: parseMPDInteger,
                    dashName: "width",
                });
                break;
            case "availabilityTimeOffset":
                parseValue(attr.value, {
                    asKey: "availabilityTimeOffset",
                    parser: parseMPDFloat,
                    dashName: "availabilityTimeOffset",
                });
                break;
            case "availabilityTimeComplete":
                parseValue(attr.value, {
                    asKey: "availabilityTimeComplete",
                    parser: parseBoolean,
                    dashName: "availabilityTimeComplete",
                });
                break;
        }
    }
    if (attributes.bitrate === undefined) {
        warnings.push(new MPDError("No bitrate found on a Representation"));
    }
    return [attributes, warnings];
}
/**
 * @param {Element} representationElement
 * @returns {Array}
 */
export function createRepresentationIntermediateRepresentation(representationElement) {
    const [children, childrenWarnings] = parseRepresentationChildren(representationElement.childNodes);
    const [attributes, attrsWarnings] = parseRepresentationAttributes(representationElement);
    const warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children, attributes }, warnings];
}
