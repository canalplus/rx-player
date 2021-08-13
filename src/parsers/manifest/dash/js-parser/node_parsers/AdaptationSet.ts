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

import {
  IAdaptationSetAttributes,
  IAdaptationSetChildren,
  IAdaptationSetIntermediateRepresentation,
} from "../../node_parser_types";
import parseBaseURL from "./BaseURL";
import parseContentComponent from "./ContentComponent";
import parseContentProtection from "./ContentProtection";
import {
  createRepresentationIntermediateRepresentation,
} from "./Representation";
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
  ValueParser,
} from "./utils";

/**
 * Parse child nodes from an AdaptationSet.
 * @param {NodeList} adaptationSetChildren - The AdaptationSet child nodes.
 * @returns {Array.<Object>}
 */
function parseAdaptationSetChildren(
  adaptationSetChildren : NodeList
) : [IAdaptationSetChildren, Error[]] {
  const children : IAdaptationSetChildren = {
    baseURLs: [],
    representations: [],
  };
  const contentProtections = [];
  let warnings : Error[] = [];
  for (let i = 0; i < adaptationSetChildren.length; i++) {
    if (adaptationSetChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = adaptationSetChildren[i] as Element;

      switch (currentElement.nodeName) {

        case "Accessibility":
          if (children.accessibilities === undefined) {
            children.accessibilities = [parseScheme(currentElement)];
          } else {
            children.accessibilities.push(parseScheme(currentElement));
          }
          break;

        case "BaseURL":
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
          if (baseURLObj !== undefined) {
            children.baseURLs.push(baseURLObj);
          }
          if (baseURLWarnings.length > 0) {
            warnings = warnings.concat(baseURLWarnings);
          }
          break;

        case "ContentComponent":
          children.contentComponent = parseContentComponent(currentElement);
          break;

        case "EssentialProperty":
          if (children.essentialProperties == null) {
            children.essentialProperties = [parseScheme(currentElement)];
          } else {
            children.essentialProperties.push(parseScheme(currentElement));
          }
          break;

        case "InbandEventStream":
          if (children.inbandEventStreams === undefined) {
            children.inbandEventStreams = [];
          }
          children.inbandEventStreams.push(parseScheme(currentElement));
          break;

        case "Representation":
          const [representation, representationWarnings] =
            createRepresentationIntermediateRepresentation(currentElement);
          children.representations.push(representation);
          if (representationWarnings.length > 0) {
            warnings = warnings.concat(representationWarnings);
          }
          break;

        case "Role":
          if (children.roles == null) {
            children.roles = [parseScheme(currentElement)];
          } else {
            children.roles.push(parseScheme(currentElement));
          }
          break;

        case "SupplementalProperty":
          if (children.supplementalProperties == null) {
            children.supplementalProperties = [parseScheme(currentElement)];
          } else {
            children.supplementalProperties.push(parseScheme(currentElement));
          }
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
          children.segmentList = segmentList;
          if (segmentListWarnings.length > 0) {
            warnings = warnings.concat(segmentListWarnings);
          }
          break;

        case "SegmentTemplate":
          const [segmentTemplate, segmentTemplateWarnings] =
            parseSegmentTemplate(currentElement);
          children.segmentTemplate = segmentTemplate;
          if (segmentTemplateWarnings.length > 0) {
            warnings = warnings.concat(segmentTemplateWarnings);
          }
          break;

        case "ContentProtection":
          const [ contentProtection,
                  contentProtectionWarnings ] = parseContentProtection(currentElement);
          if (contentProtectionWarnings.length > 0) {
            warnings = warnings.concat(contentProtectionWarnings);
          }
          if (contentProtection !== undefined) {
            contentProtections.push(contentProtection);
          }
          break;

          // case "Rating":
          //   children.rating = currentElement;
          //   break;

          // case "Viewpoint":
          //   children.viewpoint = currentElement;
          //   break;
      }
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
 * @param {Element} root - The AdaptationSet root element.
 * @returns {Array.<Object>}
 */
function parseAdaptationSetAttributes(
  root : Element
) : [IAdaptationSetAttributes, Error[]] {
  const parsedAdaptation : IAdaptationSetAttributes = {};
  const warnings : Error[] = [];
  const parseValue = ValueParser(parsedAdaptation, warnings);

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {

      case "id":
        parsedAdaptation.id = attribute.value;
        break;

      case "group":
        parseValue(attribute.value, { asKey: "group",
                                      parser: parseMPDInteger,
                                      dashName: "group" });
        break;

      case "lang":
        parsedAdaptation.language = attribute.value;
        break;

      case "contentType":
        parsedAdaptation.contentType = attribute.value;
        break;

      case "par":
        parsedAdaptation.par = attribute.value;
        break;

      case "minBandwidth":
        parseValue(attribute.value, { asKey: "minBitrate",
                                      parser: parseMPDInteger,
                                      dashName: "minBandwidth" });
        break;

      case "maxBandwidth":
        parseValue(attribute.value, { asKey: "maxBitrate",
                                      parser: parseMPDInteger,
                                      dashName: "maxBandwidth" });
        break;

      case "minWidth":
        parseValue(attribute.value, { asKey: "minWidth",
                                      parser: parseMPDInteger,
                                      dashName: "minWidth" });
        break;

      case "maxWidth":
        parseValue(attribute.value, { asKey: "maxWidth",
                                      parser: parseMPDInteger,
                                      dashName: "maxWidth" });
        break;

      case "minHeight":
        parseValue(attribute.value, { asKey: "minHeight",
                                      parser: parseMPDInteger,
                                      dashName: "minHeight" });
        break;

      case "maxHeight":
        parseValue(attribute.value, { asKey: "maxHeight",
                                      parser: parseMPDInteger,
                                      dashName: "maxHeight" });
        break;

      case "minFrameRate":
        parseValue(attribute.value, { asKey: "minFrameRate",
                                      parser: parseMaybeDividedNumber,
                                      dashName: "minFrameRate" });
        break;

      case "maxFrameRate":
        parseValue(attribute.value, { asKey: "maxFrameRate",
                                      parser: parseMaybeDividedNumber,
                                      dashName: "maxFrameRate" });
        break;

      case "selectionPriority":
        parseValue(attribute.value, { asKey: "selectionPriority",
                                      parser: parseMPDInteger,
                                      dashName: "selectionPriority" });
        break;

      case "segmentAlignment":
        parseValue(attribute.value, { asKey: "segmentAlignment",
                                      parser: parseIntOrBoolean,
                                      dashName: "segmentAlignment" });
        break;

      case "subsegmentAlignment":
        parseValue(attribute.value, { asKey: "subsegmentAlignment",
                                      parser: parseIntOrBoolean,
                                      dashName: "subsegmentAlignment" });
        break;

      case "bitstreamSwitching":
        parseValue(attribute.value, { asKey: "bitstreamSwitching",
                                      parser: parseBoolean,
                                      dashName: "bitstreamSwitching" });
        break;

      case "audioSamplingRate":
        parsedAdaptation.audioSamplingRate = attribute.value;
        break;

      case "codecs":
        parsedAdaptation.codecs = attribute.value;
        break;

      case "codingDependency":
        parseValue(attribute.value, { asKey: "codingDependency",
                                      parser: parseBoolean,
                                      dashName: "codingDependency" });
        break;

      case "frameRate":
        parseValue(attribute.value, { asKey: "frameRate",
                                      parser: parseMaybeDividedNumber,
                                      dashName: "frameRate" });
        break;

      case "height":
        parseValue(attribute.value, { asKey: "height",
                                      parser: parseMPDInteger,
                                      dashName: "height" });
        break;

      case "maxPlayoutRate":
        parseValue(attribute.value, { asKey: "maxPlayoutRate",
                                      parser: parseMPDFloat,
                                      dashName: "maxPlayoutRate" });
        break;

      case "maximumSAPPeriod":
        parseValue(attribute.value, { asKey: "maximumSAPPeriod",
                                      parser: parseMPDFloat,
                                      dashName: "maximumSAPPeriod" });
        break;

      case "mimeType":
        parsedAdaptation.mimeType = attribute.value;
        break;

      case "profiles":
        parsedAdaptation.profiles = attribute.value;
        break;

      case "segmentProfiles":
        parsedAdaptation.segmentProfiles = attribute.value;
        break;

      case "width":
        parseValue(attribute.value, { asKey: "width",
                                      parser: parseMPDInteger,
                                      dashName: "width" });
        break;
    }
  }

  return [parsedAdaptation, warnings];
}

/**
 * Parse an AdaptationSet element into an AdaptationSet intermediate
 * representation.
 * @param {Element} adaptationSetElement - The AdaptationSet root element.
 * @returns {Array.<Object>}
 */
export function createAdaptationSetIntermediateRepresentation(
  adaptationSetElement : Element
) : [IAdaptationSetIntermediateRepresentation, Error[]] {
  const childNodes = adaptationSetElement.childNodes;
  const [ children, childrenWarnings ] = parseAdaptationSetChildren(childNodes);
  const [ attributes, attrsWarnings ] =
    parseAdaptationSetAttributes(adaptationSetElement);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
