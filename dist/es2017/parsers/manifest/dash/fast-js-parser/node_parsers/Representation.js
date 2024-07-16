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
 * @param {Array.<Object | string>} representationChildren
 * @returns {Object}
 */
function parseRepresentationChildren(representationChildren) {
    const children = {
        baseURLs: [],
    };
    const contentProtections = [];
    let warnings = [];
    for (let i = 0; i < representationChildren.length; i++) {
        const currentElement = representationChildren[i];
        if (typeof currentElement === "string") {
            continue;
        }
        switch (currentElement.tagName) {
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
    const attributes = {};
    const warnings = [];
    const parseValue = ValueParser(attributes, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
        const attributeVal = root.attributes[attributeName];
        if (isNullOrUndefined(attributeVal)) {
            continue;
        }
        switch (attributeName) {
            case "audioSamplingRate":
                attributes.audioSamplingRate = attributeVal;
                break;
            case "bandwidth":
                parseValue(attributeVal, {
                    asKey: "bitrate",
                    parser: parseMPDInteger,
                    dashName: "bandwidth",
                });
                break;
            case "codecs":
                attributes.codecs = attributeVal;
                break;
            case "codingDependency":
                parseValue(attributeVal, {
                    asKey: "codingDependency",
                    parser: parseBoolean,
                    dashName: "codingDependency",
                });
                break;
            case "frameRate":
                parseValue(attributeVal, {
                    asKey: "frameRate",
                    parser: parseMaybeDividedNumber,
                    dashName: "frameRate",
                });
                break;
            case "height":
                parseValue(attributeVal, {
                    asKey: "height",
                    parser: parseMPDInteger,
                    dashName: "height",
                });
                break;
            case "id":
                attributes.id = attributeVal;
                break;
            case "maxPlayoutRate":
                parseValue(attributeVal, {
                    asKey: "maxPlayoutRate",
                    parser: parseMPDFloat,
                    dashName: "maxPlayoutRate",
                });
                break;
            case "maximumSAPPeriod":
                parseValue(attributeVal, {
                    asKey: "maximumSAPPeriod",
                    parser: parseMPDFloat,
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
                    parser: parseMPDInteger,
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
                    parser: parseMPDInteger,
                    dashName: "width",
                });
                break;
            case "availabilityTimeOffset":
                parseValue(attributeVal, {
                    asKey: "availabilityTimeOffset",
                    parser: parseMPDFloat,
                    dashName: "availabilityTimeOffset",
                });
                break;
            case "availabilityTimeComplete":
                parseValue(attributeVal, {
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
 * @param {Object} representationElement
 * @returns {Array}
 */
export function createRepresentationIntermediateRepresentation(representationElement) {
    const [children, childrenWarnings] = parseRepresentationChildren(representationElement.children);
    const [attributes, attrsWarnings] = parseRepresentationAttributes(representationElement);
    const warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children, attributes }, warnings];
}
