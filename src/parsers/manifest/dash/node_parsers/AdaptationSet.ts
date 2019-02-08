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

import log from "../../../../log";
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
  parseScheme,
} from "./utils";

export interface IAdaptationSetIntermediateRepresentation {
  children : IAdaptationSetChildren;
  attributes : IAdaptationSetAttributes;
}

export interface IAdaptationSetChildren {
  // required
  baseURL : string; // BaseURL for the contents. Empty string if not defined
  representations : IRepresentationIntermediateRepresentation[];

  // optional
  accessibility? : IScheme;
  contentComponent? : IParsedContentComponent;
  contentProtections? : IParsedContentProtection[];
  roles? : IScheme[];
  essentialProperties? : IScheme[];
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

function parseAdaptationSetChildren(
  adaptationSetChildren : NodeList
) : IAdaptationSetChildren {
  const children : IAdaptationSetChildren = {
    baseURL: "",
    representations: [],
  };
  const contentProtections = [];
  for (let i = 0; i < adaptationSetChildren.length; i++) {
    if (adaptationSetChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = adaptationSetChildren[i] as Element;

      switch (currentElement.nodeName) {

        case "Accessibility":
          children.accessibility = parseScheme(currentElement);
          break;

        case "BaseURL":
          children.baseURL = currentElement.textContent || "";
          break;

        case "ContentComponent":
          children.contentComponent = parseContentComponent(currentElement);
          break;

        case "Representation":
          const representation =
            createRepresentationIntermediateRepresentation(currentElement);
          children.representations.push(representation);
          break;

        case "Role":
          if (children.roles == null) {
            children.roles = [parseScheme(currentElement)];
          } else {
            children.roles.push(parseScheme(currentElement));
          }
          break;

        case "EssentialProperty":
          if (children.essentialProperties == null) {
            children.essentialProperties = [parseScheme(currentElement)];
          } else {
            children.essentialProperties.push(parseScheme(currentElement));
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
          children.segmentBase = parseSegmentBase(currentElement);
          break;

        case "SegmentList":
          children.segmentList = parseSegmentList(currentElement);
          break;

        case "SegmentTemplate":
          children.segmentTemplate = parseSegmentTemplate(currentElement);
          break;

        case "ContentProtection":
          const contentProtection = parseContentProtection(currentElement);
          if (contentProtection) {
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
  if (contentProtections.length) {
    children.contentProtections = contentProtections;
  }
  return children;
}

function parseAdaptationSetAttributes(
  root : Element
) : IAdaptationSetAttributes {
  const parsedAdaptation : IAdaptationSetAttributes = {};

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {

      case "id":
        parsedAdaptation.id = attribute.value;
        break;

      case "group": {
        const group = parseInt(attribute.value, 10);
        if (isNaN(group)) {
          log.warn(`DASH: invalid group ("${attribute.value}")`);
        } else {
          parsedAdaptation.group = group;
        }
      }
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

      case "minBandwidth": {
        const minBitrate = parseInt(attribute.value, 10);
        if (isNaN(minBitrate)) {
          log.warn(`DASH: invalid minBandwidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.minBitrate = minBitrate;
        }
      }
        break;

      case "maxBandwidth": {
        const maxBitrate = parseInt(attribute.value, 10);
        if (isNaN(maxBitrate)) {
          log.warn(`DASH: invalid maxBandwidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxBitrate = maxBitrate;
        }
      }
        break;

      case "minWidth": {
        const minWidth = parseInt(attribute.value, 10);
        if (isNaN(minWidth)) {
          log.warn(`DASH: invalid minWidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.minWidth = minWidth;
        }
      }
        break;

      case "maxWidth": {
        const maxWidth = parseInt(attribute.value, 10);
        if (isNaN(maxWidth)) {
          log.warn(`DASH: invalid maxWidth ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxWidth = maxWidth;
        }
      }
        break;

      case "minHeight": {
        const minHeight = parseInt(attribute.value, 10);
        if (isNaN(minHeight)) {
          log.warn(`DASH: invalid minHeight ("${attribute.value}")`);
        } else {
          parsedAdaptation.minHeight = minHeight;
        }
      }
        break;

      case "maxHeight": {
        const maxHeight = parseInt(attribute.value, 10);
        if (isNaN(maxHeight)) {
          log.warn(`DASH: invalid maxHeight ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxHeight = maxHeight;
        }
      }
        break;

      case "minFrameRate": {
        parsedAdaptation.minFrameRate = attribute.value;
      }
        break;

      case "maxFrameRate":
        parsedAdaptation.maxFrameRate = attribute.value;
        break;

      case "segmentAlignment": {
        const segmentAlignment = parseIntOrBoolean(attribute.value);
        if (typeof segmentAlignment === "number" && isNaN(segmentAlignment)) {
          log.warn(`DASH: invalid segmentAlignment ("${attribute.value}")`);
        } else {
          parsedAdaptation.segmentAlignment = segmentAlignment;
        }
      }
        break;

      case "subsegmentAlignment": {
        const subsegmentAlignment = parseIntOrBoolean(attribute.value);
        if (typeof subsegmentAlignment === "number" && isNaN(subsegmentAlignment)) {
          log.warn(`DASH: invalid subsegmentAlignment ("${attribute.value}")`);
        } else {
          parsedAdaptation.subsegmentAlignment = subsegmentAlignment;
        }
      }
        break;

      case "bitstreamSwitching":
        parsedAdaptation.bitstreamSwitching = parseBoolean(attribute.value);
        break;

      case "audioSamplingRate":
        parsedAdaptation.audioSamplingRate = attribute.value;
        break;

      case "codecs":
        parsedAdaptation.codecs = attribute.value;
        break;

      case "codingDependency":
        parsedAdaptation.codingDependency = parseBoolean(attribute.value);
        break;

      case "frameRate":
        parsedAdaptation.frameRate = attribute.value;
        break;

      case "height": {
        const height = parseInt(attribute.value, 10);
        if (isNaN(height)) {
          log.warn(`DASH: invalid height ("${attribute.value}")`);
        } else {
          parsedAdaptation.height = height;
        }
      }
        break;

      case "maxPlayoutRate": {
        const maxPlayoutRate = parseFloat(attribute.value);
        if (isNaN(maxPlayoutRate)) {
          log.warn(`DASH: invalid maxPlayoutRate ("${attribute.value}")`);
        } else {
          parsedAdaptation.maxPlayoutRate = maxPlayoutRate;
        }
      }
        break;

      case "maximumSAPPeriod": {
        const maximumSAPPeriod = parseFloat(attribute.value);
        if (isNaN(maximumSAPPeriod)) {
          log.warn(`DASH: invalid maximumSAPPeriod ("${attribute.value}")`);
        } else {
          parsedAdaptation.maximumSAPPeriod = maximumSAPPeriod;
        }
      }
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

      case "width": {
        const width = parseInt(attribute.value, 10);
        if (isNaN(width)) {
          log.warn(`DASH: invalid width ("${attribute.value}")`);
        } else {
          parsedAdaptation.width = width;
        }
      }
        break;
    }
  }

  return parsedAdaptation;
}

export function createAdaptationSetIntermediateRepresentation(
  adaptationSetElement : Element
) : IAdaptationSetIntermediateRepresentation {
  return {
    children: parseAdaptationSetChildren(adaptationSetElement.childNodes),
    attributes: parseAdaptationSetAttributes(adaptationSetElement),
  };
}
