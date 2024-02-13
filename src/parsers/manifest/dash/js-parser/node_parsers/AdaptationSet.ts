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
import type { ITNode } from "../../../../../utils/xml-parser";
import type {
  IAdaptationSetAttributes,
  IAdaptationSetChildren,
  IAdaptationSetIntermediateRepresentation,
} from "../../node_parser_types";
import parseBaseURL from "./BaseURL";
import parseContentComponent from "./ContentComponent";
import parseContentProtection from "./ContentProtection";
import { createRepresentationIntermediateRepresentation } from "./Representation";
import parseSegmentBase from "./SegmentBase";
import parseSegmentList from "./SegmentList";
import parseSegmentTemplate from "./SegmentTemplate";
import {
  parseBoolean,
  parseIntOrBoolean,
  parseMaybeDividedNumber,
  parseMPDFloat,
  parseMPDInteger,
  parseScheme,
  textContent,
  ValueParser,
} from "./utils";

/**
 * Parse child nodes from an AdaptationSet.
 * @param {Array.<ITNode | string>} adaptationSetChildren - The AdaptationSet child nodes.
 * @returns {Array.<Object>}
 */
function parseAdaptationSetChildren(
  adaptationSetChildren: Array<ITNode | string>,
): [IAdaptationSetChildren, Error[]] {
  const children: IAdaptationSetChildren = {
    baseURLs: [],
    representations: [],
  };
  const contentProtections = [];
  let warnings: Error[] = [];
  for (let i = 0; i < adaptationSetChildren.length; i++) {
    const currentNode = adaptationSetChildren[i];
    if (typeof currentNode === "string") {
      continue;
    }
    switch (currentNode.tagName) {
      case "Accessibility":
        if (children.accessibilities === undefined) {
          children.accessibilities = [parseScheme(currentNode)];
        } else {
          children.accessibilities.push(parseScheme(currentNode));
        }
        break;

      case "BaseURL":
        const [baseURLObj, baseURLWarnings] = parseBaseURL(currentNode);
        if (baseURLObj !== undefined) {
          children.baseURLs.push(baseURLObj);
        }
        if (baseURLWarnings.length > 0) {
          warnings = warnings.concat(baseURLWarnings);
        }
        break;

      case "ContentComponent":
        children.contentComponent = parseContentComponent(currentNode);
        break;

      case "EssentialProperty":
        if (isNullOrUndefined(children.essentialProperties)) {
          children.essentialProperties = [parseScheme(currentNode)];
        } else {
          children.essentialProperties.push(parseScheme(currentNode));
        }
        break;

      case "InbandEventStream":
        if (children.inbandEventStreams === undefined) {
          children.inbandEventStreams = [];
        }
        children.inbandEventStreams.push(parseScheme(currentNode));
        break;

      case "Label":
        const label = textContent(currentNode.children);

        if (label !== null && label !== undefined) {
          children.label = label;
        }
        break;

      case "Representation":
        const [representation, representationWarnings] =
          createRepresentationIntermediateRepresentation(currentNode);
        children.representations.push(representation);
        if (representationWarnings.length > 0) {
          warnings = warnings.concat(representationWarnings);
        }
        break;

      case "Role":
        if (isNullOrUndefined(children.roles)) {
          children.roles = [parseScheme(currentNode)];
        } else {
          children.roles.push(parseScheme(currentNode));
        }
        break;

      case "SupplementalProperty":
        if (isNullOrUndefined(children.supplementalProperties)) {
          children.supplementalProperties = [parseScheme(currentNode)];
        } else {
          children.supplementalProperties.push(parseScheme(currentNode));
        }
        break;

      case "SegmentBase":
        const [segmentBase, segmentBaseWarnings] = parseSegmentBase(currentNode);
        children.segmentBase = segmentBase;
        if (segmentBaseWarnings.length > 0) {
          warnings = warnings.concat(segmentBaseWarnings);
        }
        break;

      case "SegmentList":
        const [segmentList, segmentListWarnings] = parseSegmentList(currentNode);
        children.segmentList = segmentList;
        if (segmentListWarnings.length > 0) {
          warnings = warnings.concat(segmentListWarnings);
        }
        break;

      case "SegmentTemplate":
        const [segmentTemplate, segmentTemplateWarnings] =
          parseSegmentTemplate(currentNode);
        children.segmentTemplate = segmentTemplate;
        if (segmentTemplateWarnings.length > 0) {
          warnings = warnings.concat(segmentTemplateWarnings);
        }
        break;

      case "ContentProtection":
        const [contentProtection, contentProtectionWarnings] =
          parseContentProtection(currentNode);
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
function parseAdaptationSetAttributes(root: ITNode): [IAdaptationSetAttributes, Error[]] {
  const parsedAdaptation: IAdaptationSetAttributes = {};
  const warnings: Error[] = [];
  const parseValue = ValueParser(parsedAdaptation, warnings);

  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "id":
        parsedAdaptation.id = attributeVal;
        break;

      case "group":
        parseValue(attributeVal, {
          asKey: "group",
          parser: parseMPDInteger,
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
          parser: parseMPDInteger,
          dashName: "minBandwidth",
        });
        break;

      case "maxBandwidth":
        parseValue(attributeVal, {
          asKey: "maxBitrate",
          parser: parseMPDInteger,
          dashName: "maxBandwidth",
        });
        break;

      case "minWidth":
        parseValue(attributeVal, {
          asKey: "minWidth",
          parser: parseMPDInteger,
          dashName: "minWidth",
        });
        break;

      case "maxWidth":
        parseValue(attributeVal, {
          asKey: "maxWidth",
          parser: parseMPDInteger,
          dashName: "maxWidth",
        });
        break;

      case "minHeight":
        parseValue(attributeVal, {
          asKey: "minHeight",
          parser: parseMPDInteger,
          dashName: "minHeight",
        });
        break;

      case "maxHeight":
        parseValue(attributeVal, {
          asKey: "maxHeight",
          parser: parseMPDInteger,
          dashName: "maxHeight",
        });
        break;

      case "minFrameRate":
        parseValue(attributeVal, {
          asKey: "minFrameRate",
          parser: parseMaybeDividedNumber,
          dashName: "minFrameRate",
        });
        break;

      case "maxFrameRate":
        parseValue(attributeVal, {
          asKey: "maxFrameRate",
          parser: parseMaybeDividedNumber,
          dashName: "maxFrameRate",
        });
        break;

      case "selectionPriority":
        parseValue(attributeVal, {
          asKey: "selectionPriority",
          parser: parseMPDInteger,
          dashName: "selectionPriority",
        });
        break;

      case "segmentAlignment":
        parseValue(attributeVal, {
          asKey: "segmentAlignment",
          parser: parseIntOrBoolean,
          dashName: "segmentAlignment",
        });
        break;

      case "subsegmentAlignment":
        parseValue(attributeVal, {
          asKey: "subsegmentAlignment",
          parser: parseIntOrBoolean,
          dashName: "subsegmentAlignment",
        });
        break;

      case "bitstreamSwitching":
        parseValue(attributeVal, {
          asKey: "bitstreamSwitching",
          parser: parseBoolean,
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

  return [parsedAdaptation, warnings];
}

/**
 * Parse an AdaptationSet element into an AdaptationSet intermediate
 * representation.
 * @param {Object} adaptationSetElement - The AdaptationSet root element.
 * @returns {Array.<Object>}
 */
export function createAdaptationSetIntermediateRepresentation(
  adaptationSetElement: ITNode,
): [IAdaptationSetIntermediateRepresentation, Error[]] {
  const childNodes = adaptationSetElement.children;
  const [children, childrenWarnings] = parseAdaptationSetChildren(childNodes);
  const [attributes, attrsWarnings] = parseAdaptationSetAttributes(adaptationSetElement);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
