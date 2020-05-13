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
  MPDError,
  parseBoolean,
  parseMPDFloat,
  parseMPDInteger,
  ValueParser,
} from "./utils";

export interface IRepresentationIntermediateRepresentation {
  children : IRepresentationChildren;
  attributes : IRepresentationAttributes;
}

export interface IRepresentationChildren {
  // required
  baseURLs : IBaseURL[];

  // optional
  segmentBase? : IParsedSegmentBase;
  segmentList? : IParsedSegmentList;
  segmentTemplate? : IParsedSegmentTemplate|IParsedSegmentTimeline;
}

export interface IRepresentationAttributes {
  // optional
  audioSamplingRate? : string;
  bitrate? : number;
  codecs? : string;
  codingDependency? : boolean;
  frameRate? : string;
  height? : number;
  id? : string;
  maxPlayoutRate? : number;
  maximumSAPPeriod? : number;
  mimeType? : string;
  profiles? : string;
  qualityRanking? : number;
  segmentProfiles? : string;
  width? : number;
}

/**
 * @param {NodeList} representationChildren
 * @returns {Object}
 */
function parseRepresentationChildren(
  representationChildren : NodeList
) : [IRepresentationChildren, Error[]] {
  const children : IRepresentationChildren = {
    baseURLs: [],
  };

  let warnings : Error[] = [];
  for (let i = 0; i < representationChildren.length; i++) {
    if (representationChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = representationChildren[i] as Element;

      switch (currentElement.nodeName) {
        case "BaseURL":
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
          if (baseURLObj !== undefined) {
            children.baseURLs.push(baseURLObj);
          }
          warnings = warnings.concat(baseURLWarnings);
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
          const [ segmentTemplate,
                  segmentTemplateWarnings ] = parseSegmentTemplate(currentElement);
          warnings = warnings.concat(segmentTemplateWarnings);
          children.segmentTemplate = segmentTemplate;
          break;
      }
    }
  }
  return [children, warnings];
}

/**
 * @param {Element} representationElement
 * @returns {Array}
 */
function parseRepresentationAttributes(
  representationElement : Element
) : [IRepresentationAttributes, Error[]] {
  const attributes : IRepresentationAttributes = {};
  const warnings : Error[] = [];
  const parseValue = ValueParser(attributes, warnings);
  for (let i = 0; i < representationElement.attributes.length; i++) {
    const attr = representationElement.attributes[i];

    switch (attr.name) {

      case "audioSamplingRate":
        attributes.audioSamplingRate = attr.value;
        break;

      case "bandwidth":
        parseValue("bitrate", attr.value, parseMPDInteger, "bandwidth");
        break;

      case "codecs":
        attributes.codecs = attr.value;
        break;

      case "codingDependency":
        parseValue("codingDependency",
                   attr.value,
                   parseBoolean,
                   "codingDependency");
        break;

      case "frameRate":
        attributes.frameRate = attr.value;
        break;

      case "height":
        parseValue("height", attr.value, parseMPDInteger, "height");
        break;

      case "id":
        attributes.id = attr.value;
        break;

      case "maxPlayoutRate":
        parseValue("maxPlayoutRate",
                   attr.value,
                   parseMPDFloat,
                   "maxPlayoutRate");
        break;

      case "maximumSAPPeriod":
        parseValue("maximumSAPPeriod",
                   attr.value,
                   parseMPDFloat,
                   "maximumSAPPeriod");
        break;

      case "mimeType":
        attributes.mimeType = attr.value;
        break;

      case "profiles":
        attributes.profiles = attr.value;
        break;

      case "qualityRanking":
        parseValue("qualityRanking",
                   attr.value,
                   parseMPDInteger,
                   "qualityRanking");
        break;

      case "segmentProfiles":
        attributes.segmentProfiles = attr.value;
        break;

      case "width":
        parseValue("width", attr.value, parseMPDInteger, "width");
        break;
    }
  }
  if (attributes.bitrate === undefined) {
    warnings.push(
      new MPDError("No bitrate found on a Representation"));
  }
  return [attributes, warnings];
}

/**
 * @param {Element} representationElement
 * @returns {Array}
 */
export function createRepresentationIntermediateRepresentation(
  representationElement : Element
) : [IRepresentationIntermediateRepresentation, Error[]] {
  const [children, childrenWarnings] =
    parseRepresentationChildren(representationElement.childNodes);
  const [attributes, attrsWarnings] =
    parseRepresentationAttributes(representationElement);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
