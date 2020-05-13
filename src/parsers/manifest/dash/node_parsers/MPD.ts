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
import {
  createPeriodIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "./Period";
import {
  IScheme,
  parseDateTime,
  parseDuration,
  parseScheme,
  ValueParser,
} from "./utils";

export interface IMPDIntermediateRepresentation { children : IMPDChildren;
                                                  attributes : IMPDAttributes; }

// intermediate representation for the root's children
export interface IMPDChildren {
  // required
  baseURLs : IBaseURL[];
  locations : string[]; // Location(s) at which the Manifest can be refreshed
  periods : IPeriodIntermediateRepresentation[];
  utcTimings : IScheme[];
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

/**
 * Parse children of the MPD's root into a simple object.
 * @param {NodeList} mpdChildren
 * @returns {Array.<Object>}
 */
function parseMPDChildren(
  mpdChildren : NodeList
) : [IMPDChildren, Error[]] {
  const baseURLs : IBaseURL[] = [];
  const locations : string[] = [];
  const periods : IPeriodIntermediateRepresentation[] = [];
  const utcTimings : IScheme[] = [];

  let warnings : Error[] = [];
  for (let i = 0; i < mpdChildren.length; i++) {
    if (mpdChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = mpdChildren[i] as Element;
      switch (currentNode.nodeName) {

        case "BaseURL":
          const [ baseURLObj,
                  baseURLWarnings ] = parseBaseURL(currentNode);
          if (baseURLObj !== undefined) {
            baseURLs.push(baseURLObj);
          }
          warnings = warnings.concat(baseURLWarnings);
          break;

        case "Location":
          locations.push(currentNode.textContent === null ?
                           "" :
                           currentNode.textContent);
          break;

        case "Period":
          const [period, periodWarnings] =
            createPeriodIntermediateRepresentation(currentNode);
          periods.push(period);
          warnings = warnings.concat(periodWarnings);
          break;

        case "UTCTiming":
          const utcTiming = parseScheme(currentNode);
          utcTimings.push(utcTiming);
          break;
      }
    }
  }

  return [ { baseURLs, locations, periods, utcTimings },
           warnings ];
}

/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
function parseMPDAttributes(root : Element) : [IMPDAttributes, Error[]] {
  const res : IMPDAttributes = {};
  const warnings : Error[] = [];
  const parseValue = ValueParser(res, warnings);

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
        parseValue("availabilityStartTime",
                   attribute.value,
                   parseDateTime,
                   "availabilityStartTime");
        break;
      case "availabilityEndTime":
        parseValue("availabilityEndTime",
                   attribute.value,
                   parseDateTime,
                   "availabilityEndTime");
        break;
      case "publishTime":
        parseValue("publishTime",
                   attribute.value,
                   parseDateTime,
                   "publishTime");
        break;
      case "mediaPresentationDuration":
        parseValue("duration",
                   attribute.value,
                   parseDuration,
                   "mediaPresentationDuration");
        break;
      case "minimumUpdatePeriod":
        parseValue("minimumUpdatePeriod",
                   attribute.value,
                   parseDuration,
                   "minimumUpdatePeriod");
        break;
      case "minBufferTime":
        parseValue("minBufferTime",
                   attribute.value,
                   parseDuration,
                   "minBufferTime");
        break;
      case "timeShiftBufferDepth":
        parseValue("timeShiftBufferDepth",
                   attribute.value,
                   parseDuration,
                   "timeShiftBufferDepth");
        break;
      case "suggestedPresentationDelay":
        parseValue("suggestedPresentationDelay",
                   attribute.value,
                   parseDuration,
                   "suggestedPresentationDelay");
        break;
      case "maxSegmentDuration":
        parseValue("maxSegmentDuration",
                   attribute.value,
                   parseDuration,
                   "maxSegmentDuration");
        break;
      case "maxSubsegmentDuration":
        parseValue("maxSubsegmentDuration",
                   attribute.value,
                   parseDuration,
                   "maxSubsegmentDuration");
        break;
    }
  }
  return [res, warnings];
}

/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
export function createMPDIntermediateRepresentation(
  root : Element
) : [IMPDIntermediateRepresentation, Error[]] {
  const [ children, childrenWarnings ] = parseMPDChildren(root.childNodes);
  const [ attributes, attrsWarnings ] = parseMPDAttributes(root);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
