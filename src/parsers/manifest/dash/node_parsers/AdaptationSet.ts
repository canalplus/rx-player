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

import parseBaseURL, {
  IBaseURL
} from "./BaseURL";
import parseContentComponent, {
  IParsedContentComponent
} from "./ContentComponent";
import parseContentProtection, {
  IParsedContentProtection
} from "./ContentProtection";
import {
  createRepresentationIntermediateRepresentation,
  IRepresentationIntermediateRepresentation,
} from "./Representation";
import parseSegmentBase, {
  IParsedSegmentBase,
} from "./SegmentBase";
import parseSegmentList, {
  IParsedSegmentList,
} from "./SegmentList";
import parseSegmentTemplate, {
  IParsedSegmentTemplate,
  IParsedSegmentTimeline,
} from "./SegmentTemplate";
import {
  IScheme,
  parseBoolean,
  parseIntOrBoolean,
  parseMPDFloat,
  parseMPDInteger,
  parseScheme,
  ValueParser,
} from "./utils";

/** AdaptationSet once parsed into its intermediate representation. */
export interface IAdaptationSetIntermediateRepresentation {
  children : IAdaptationSetChildren;
  attributes : IAdaptationSetAttributes;
}

export interface IAdaptationSetChildren {
  // required
  baseURLs : IBaseURL[];
  representations : IRepresentationIntermediateRepresentation[];

  // optional
  accessibility? : IScheme;
  contentComponent? : IParsedContentComponent;
  contentProtections? : IParsedContentProtection[];
  essentialProperties? : IScheme[];
  roles? : IScheme[];
  supplementalProperties? : IScheme[];

  segmentBase? : IParsedSegmentBase;
  segmentList? : IParsedSegmentList;
  segmentTemplate? : IParsedSegmentTemplate|IParsedSegmentTimeline;
}

export interface IAdaptationSetAttributes {
  // optional
  audioSamplingRate? : string;
  bitstreamSwitching? : boolean;
  codecs? : string;
  codingDependency? : boolean;
  contentType? : string;
  frameRate? : string;
  group? : number;
  height? : number;
  id? : string;
  language? : string;
  maxBitrate? : number;
  maxFrameRate? : string;
  maxHeight? : number;
  maxPlayoutRate? : number;
  maxWidth? : number;
  maximumSAPPeriod? : number;
  mimeType? : string;
  minBitrate? : number;
  minFrameRate? : string;
  minHeight? : number;
  minWidth? : number;
  par? : string;
  profiles? : string;
  segmentAlignment? : number|boolean;
  segmentProfiles? : string;
  subsegmentAlignment? : number|boolean;
  width? : number;
}

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
          children.accessibility = parseScheme(currentElement);
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
          const contentProtection = parseContentProtection(currentElement);
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
        parseValue("group", attribute.value, parseMPDInteger, "group");
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
        parseValue("minBitrate", attribute.value, parseMPDInteger, "minBandwidth");
        break;

      case "maxBandwidth":
        parseValue("maxBitrate", attribute.value, parseMPDInteger, "maxBandwidth");
        break;

      case "minWidth":
        parseValue("minWidth", attribute.value, parseMPDInteger, "minWidth");
        break;

      case "maxWidth":
        parseValue("maxWidth", attribute.value, parseMPDInteger, "maxWidth");
        break;

      case "minHeight":
        parseValue("minHeight", attribute.value, parseMPDInteger, "minHeight");
        break;

      case "maxHeight":
        parseValue("maxHeight", attribute.value, parseMPDInteger, "maxHeight");
        break;

      case "minFrameRate": {
        parsedAdaptation.minFrameRate = attribute.value;
      }
        break;

      case "maxFrameRate":
        parsedAdaptation.maxFrameRate = attribute.value;
        break;

      case "segmentAlignment":
        parseValue("segmentAlignment",
                   attribute.value,
                   parseIntOrBoolean,
                   "segmentAlignment");
        break;

      case "subsegmentAlignment":
        parseValue("subsegmentAlignment",
                   attribute.value,
                   parseIntOrBoolean,
                   "subsegmentAlignment");
        break;

      case "bitstreamSwitching":
        parseValue("bitstreamSwitching",
                   attribute.value,
                   parseBoolean,
                   "bitstreamSwitching");
        break;

      case "audioSamplingRate":
        parsedAdaptation.audioSamplingRate = attribute.value;
        break;

      case "codecs":
        parsedAdaptation.codecs = attribute.value;
        break;

      case "codingDependency":
        parseValue("codingDependency", attribute.value, parseBoolean, "codingDependency");
        break;

      case "frameRate":
        parsedAdaptation.frameRate = attribute.value;
        break;

      case "height":
        parseValue("height", attribute.value, parseMPDInteger, "height");
        break;

      case "maxPlayoutRate":
        parseValue("maxPlayoutRate",
                   attribute.value,
                   parseMPDFloat,
                   "maxPlayoutRate");
        break;

      case "maximumSAPPeriod":
        parseValue("maximumSAPPeriod",
                   attribute.value,
                   parseMPDFloat,
                   "maximumSAPPeriod");
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
        parseValue("width", attribute.value, parseMPDInteger, "width");
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
