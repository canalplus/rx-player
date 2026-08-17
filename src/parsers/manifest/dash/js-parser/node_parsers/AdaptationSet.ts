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

import isNullOrUndefined from "../../../../../utils/is_null_or_undefined.ts";
import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type {
  IAdaptationSetAttributes,
  IAdaptationSetChildren,
  IAdaptationSetIntermediateRepresentation,
} from "../../node_parser_types.ts";
import parseBaseURL from "./BaseURL.ts";
import parseContentComponent from "./ContentComponent.ts";
import parseContentProtection from "./ContentProtection.ts";
import parseDescriptor from "./Descriptor.ts";
import { createRepresentationIntermediateRepresentation } from "./Representation.ts";
import parseSegmentBase from "./SegmentBase.ts";
import parseSegmentList from "./SegmentList.ts";
import parseSegmentTemplate from "./SegmentTemplate.ts";
import parseRequestParam from "./UrlQueryInfo.ts";
import {
  parseBoolean,
  parseIntOrBoolean,
  parseMaybeDividedNumber,
  parseMPDFloat,
  parseMPDInteger,
  parseScheme,
  textContent,
  ValueParser,
} from "./utils.ts";

/**
 * Parse child nodes from an AdaptationSet.
 * @param {Array.<ITNode | string>} adaptationSetChildren - The AdaptationSet child nodes.
 * @returns {Array.<Object>}
 */
function parseAdaptationSetChildren(
  adaptationSetChildren: Array<ITNode | string>,
): [IAdaptationSetChildren, Error[]] {
  const children: IAdaptationSetChildren = {
    BaseURL: [],
    Representation: [],
    Accessibility: [],
    ContentComponent: [],
    ContentProtection: [],
    EssentialProperty: [],
    InbandEventStream: [],
    Role: [],
    SupplementalProperty: [],
    RequestParam: [],
    SegmentBase: [],
    SegmentList: [],
    SegmentTemplate: [],
    Label: [],
  };
  let warnings: Error[] = [];
  for (let i = 0; i < adaptationSetChildren.length; i++) {
    const currentNode = adaptationSetChildren[i];
    if (typeof currentNode === "string") {
      continue;
    }
    switch (currentNode.tagName) {
      case "Accessibility":
        children.Accessibility.push(parseScheme(currentNode));
        break;

      case "BaseURL": {
        const [baseURLObj, baseURLWarnings] = parseBaseURL(currentNode);
        if (baseURLObj !== undefined) {
          children.BaseURL.push(baseURLObj);
        }
        if (baseURLWarnings.length > 0) {
          warnings = warnings.concat(baseURLWarnings);
        }
        break;
      }

      case "ContentComponent":
        children.ContentComponent.push(parseContentComponent(currentNode));
        break;

      case "EssentialProperty": {
        const [descriptor, descriptorWarnings] = parseDescriptor(currentNode);
        children.EssentialProperty.push(descriptor);
        warnings.push(...descriptorWarnings);
        break;
      }

      case "InbandEventStream":
        children.InbandEventStream.push(parseScheme(currentNode));
        break;

      case "Label": {
        const label = textContent(currentNode.children);
        if (label !== null && label !== undefined) {
          children.Label.push({ value: label });
        }
        break;
      }

      case "Representation": {
        const [representation, representationWarnings] =
          createRepresentationIntermediateRepresentation(currentNode);
        children.Representation.push(representation);
        if (representationWarnings.length > 0) {
          warnings = warnings.concat(representationWarnings);
        }
        break;
      }

      case "Role":
        children.Role.push(parseScheme(currentNode));
        break;

      case "SupplementalProperty": {
        const [descriptor, descriptorWarnings] = parseDescriptor(currentNode);
        children.SupplementalProperty.push(descriptor);
        warnings.push(...descriptorWarnings);
        break;
      }

      case "RequestParam": {
        const [requestParam, requestParamWarnings] = parseRequestParam(currentNode);
        children.RequestParam.push(requestParam);
        warnings.push(...requestParamWarnings);
        break;
      }

      case "SegmentBase": {
        const [segmentBase, segmentBaseWarnings] = parseSegmentBase(currentNode);
        children.SegmentBase.push(segmentBase);
        if (segmentBaseWarnings.length > 0) {
          warnings = warnings.concat(segmentBaseWarnings);
        }
        break;
      }

      case "SegmentList": {
        const [segmentList, segmentListWarnings] = parseSegmentList(currentNode);
        children.SegmentList.push(segmentList);
        if (segmentListWarnings.length > 0) {
          warnings = warnings.concat(segmentListWarnings);
        }
        break;
      }

      case "SegmentTemplate": {
        const [segmentTemplate, segmentTemplateWarnings] =
          parseSegmentTemplate(currentNode);
        children.SegmentTemplate.push(segmentTemplate);
        if (segmentTemplateWarnings.length > 0) {
          warnings = warnings.concat(segmentTemplateWarnings);
        }
        break;
      }

      case "ContentProtection": {
        const [contentProtection, contentProtectionWarnings] =
          parseContentProtection(currentNode);
        if (contentProtectionWarnings.length > 0) {
          warnings = warnings.concat(contentProtectionWarnings);
        }
        if (contentProtection !== undefined) {
          children.ContentProtection.push(contentProtection);
        }
        break;
      }

      // case "Rating":
      //   children.Rating.push(currentNode);
      //   break;

      // case "Viewpoint":
      //   children.Viewpoint.push(currentNode);
      //   break;
    }
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
          parser: parseMPDInteger,
          name: "group",
        });
        break;

      case "lang":
        parsedAdaptation.lang = attributeVal;
        break;

      case "contentType":
        parsedAdaptation.contentType = attributeVal;
        break;

      case "par":
        parsedAdaptation.par = attributeVal;
        break;

      case "minBandwidth":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "minBandwidth",
        });
        break;

      case "maxBandwidth":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "maxBandwidth",
        });
        break;

      case "minWidth":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "minWidth",
        });
        break;

      case "maxWidth":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "maxWidth",
        });
        break;

      case "minHeight":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "minHeight",
        });
        break;

      case "maxHeight":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "maxHeight",
        });
        break;

      case "minFrameRate":
        parseValue(attributeVal, {
          parser: parseMaybeDividedNumber,
          name: "minFrameRate",
        });
        break;

      case "maxFrameRate":
        parseValue(attributeVal, {
          parser: parseMaybeDividedNumber,
          name: "maxFrameRate",
        });
        break;

      case "selectionPriority":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "selectionPriority",
        });
        break;

      case "subsegmentAlignment":
        parseValue(attributeVal, {
          parser: parseIntOrBoolean,
          name: "subsegmentAlignment",
        });
        break;

      case "segmentAlignment":
        parseValue(attributeVal, {
          parser: parseIntOrBoolean,
          name: "segmentAlignment",
        });
        break;

      case "bitstreamSwitching":
        parseValue(attributeVal, {
          parser: parseBoolean,
          name: "bitstreamSwitching",
        });
        break;

      case "audioSamplingRate":
        parsedAdaptation.audioSamplingRate = attributeVal;
        break;

      case "codecs":
        parsedAdaptation.codecs = attributeVal;
        break;

      case "scte214:supplementalCodecs":
        parsedAdaptation["scte214:supplementalCodecs"] = attributeVal;
        break;

      case "codingDependency":
        parseValue(attributeVal, {
          parser: parseBoolean,
          name: "codingDependency",
        });
        break;

      case "frameRate":
        parseValue(attributeVal, {
          parser: parseMaybeDividedNumber,
          name: "frameRate",
        });
        break;

      case "height":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "height",
        });
        break;

      case "maxPlayoutRate":
        parseValue(attributeVal, {
          parser: parseMPDFloat,
          name: "maxPlayoutRate",
        });
        break;

      case "maximumSAPPeriod":
        parseValue(attributeVal, {
          parser: parseMPDFloat,
          name: "maximumSAPPeriod",
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
          parser: parseMPDInteger,
          name: "width",
        });
        break;

      case "availabilityTimeOffset":
        parseValue(attributeVal, {
          parser: parseMPDFloat,
          name: "availabilityTimeOffset",
        });
        break;

      case "availabilityTimeComplete":
        parseValue(attributeVal, {
          parser: parseBoolean,
          name: "availabilityTimeComplete",
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
