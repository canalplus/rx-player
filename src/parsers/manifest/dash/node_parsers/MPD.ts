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
  createPeriodIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "./Period";
import {
  parseDateTime,
  parseDuration,
} from "./utils";

export interface IMPDIntermediateRepresentation {
  children : IMPDChildren;
  attributes : IMPDAttributes;
}

// intermediate representation for the root's children
export interface IMPDChildren {
  // required
  baseURL : string; // BaseURL for the contents. Empty string if not defined
  locations : string[]; // Location(s) at which the Manifest can be refreshed
  periods : IPeriodIntermediateRepresentation[];
}

// intermediate representation for the root's attributes
export interface IMPDAttributes {
  // optional
  id? : string;
  profiles? : string;
  type? : string;
  availabilityStartTime? : number;
  availabilityEndTime? : number;
  publishTime? : number;
  duration? : number; // mediaPresentationDuration
  minimumUpdatePeriod? : number;
  minBufferTime? : number;
  timeShiftBufferDepth? : number;
  suggestedPresentationDelay? : number;
  maxSegmentDuration? : number;
  maxSubsegmentDuration? : number;
}

export interface IParsedMPD {
  // required
  availabilityStartTime : number;
  duration : number;
  id : string;
  periods : IPeriodIntermediateRepresentation[];
  transportType : string;
  type : string;
  uris : string[];

  // optional
  profiles? : string;
  availabilityEndTime? : number;
  publishTime? : number;
  minimumUpdatePeriod? : number;
  minBufferTime? : number;
  timeShiftBufferDepth? : number;
  suggestedPresentationDelay? : number;
  maxSegmentDuration? : number;
  maxSubsegmentDuration? : number;
}

/**
 * Parse children of the MPD's root into a simple object.
 * @param {NodeList} mpdChildren
 * @returns {Object}
 */
function parseMPDChildren(mpdChildren : NodeList) : IMPDChildren {
  let baseURL = "";
  const locations : string[] = [];
  const periods : IPeriodIntermediateRepresentation[] = [];

  for (let i = 0; i < mpdChildren.length; i++) {
    if (mpdChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = mpdChildren[i] as Element;
      switch (currentNode.nodeName) {

        case "BaseURL":
          baseURL = currentNode.textContent || "";
          break;

        case "Location":
          locations.push(currentNode.textContent || "");
          break;

        case "Period":
          const period =
            createPeriodIntermediateRepresentation(currentNode);
          periods.push(period);
          break;
      }
    }
  }

  return { baseURL, locations, periods };
}

/**
 * @param {Element} root
 * @returns {Object}
 */
function parseMPDAttributes(root : Element) : IMPDAttributes {
  const res : IMPDAttributes = {};
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "id":
        res.id = attribute.value;
        break;
      case "profiles":
        res.profiles = attribute.value;
        break;
      case "type":
        res.type = attribute.value;
        break;
      case "availabilityStartTime":
        res.availabilityStartTime = +parseDateTime(attribute.value);
        break;
      case "availabilityEndTime":
        res.availabilityEndTime = +parseDateTime(attribute.value);
        break;
      case "publishTime":
        res.publishTime = +parseDateTime(attribute.value);
        break;
      case "mediaPresentationDuration":
        res.duration = parseDuration(attribute.value);
        break;
      case "minimumUpdatePeriod":
        res.minimumUpdatePeriod = parseDuration(attribute.value);
        break;
      case "minBufferTime":
        res.minBufferTime = parseDuration(attribute.value);
        break;
      case "timeShiftBufferDepth":
        res.timeShiftBufferDepth = parseDuration(attribute.value);
        break;
      case "suggestedPresentationDelay":
        res.suggestedPresentationDelay = parseDuration(attribute.value);
        break;
      case "maxSegmentDuration":
        res.maxSegmentDuration = parseDuration(attribute.value);
        break;
      case "maxSubsegmentDuration":
        res.maxSubsegmentDuration = parseDuration(attribute.value);
        break;
    }
  }
  return res;
}

export function createMPDIntermediateRepresentation(
  root : Element
) : IMPDIntermediateRepresentation {
  return {
    children: parseMPDChildren(root.childNodes),
    attributes: parseMPDAttributes(root),
  };
}
