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
  IBaseUrlIntermediateRepresentation,
  IMPDAttributes,
  IMPDChildren,
  IMPDIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
  IScheme,
} from "../../node_parser_types";
import parseBaseURL from "./BaseURL";
import {
  createPeriodIntermediateRepresentation,
} from "./Period";
import {
  parseDateTime,
  parseDuration,
  parseScheme,
  ValueParser,
} from "./utils";

/**
 * Parse children of the MPD's root into a simple object.
 * @param {NodeList} mpdChildren
 * @returns {Array.<Object>}
 */
function parseMPDChildren(
  mpdChildren : NodeList
) : [IMPDChildren, Error[]] {
  const baseURLs : IBaseUrlIntermediateRepresentation[] = [];
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
function parseMPDAttributes(
  root : Element
) : [IMPDAttributes, Error[]] {
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
        parseValue(attribute.value, { asKey: "availabilityStartTime",
                                      parser: parseDateTime,
                                      dashName: "availabilityStartTime" });
        break;
      case "availabilityEndTime":
        parseValue(attribute.value, { asKey: "availabilityEndTime",
                                      parser: parseDateTime,
                                      dashName: "availabilityEndTime" });
        break;
      case "publishTime":
        parseValue(attribute.value, { asKey: "publishTime",
                                      parser: parseDateTime,
                                      dashName: "publishTime" });
        break;
      case "mediaPresentationDuration":
        parseValue(attribute.value, { asKey: "duration",
                                      parser: parseDuration,
                                      dashName: "mediaPresentationDuration" });
        break;
      case "minimumUpdatePeriod":
        parseValue(attribute.value, { asKey: "minimumUpdatePeriod",
                                      parser: parseDuration,
                                      dashName: "minimumUpdatePeriod" });
        break;
      case "minBufferTime":
        parseValue(attribute.value, { asKey: "minBufferTime",
                                      parser: parseDuration,
                                      dashName: "minBufferTime" });
        break;
      case "timeShiftBufferDepth":
        parseValue(attribute.value, { asKey: "timeShiftBufferDepth",
                                      parser: parseDuration,
                                      dashName: "timeShiftBufferDepth" });
        break;
      case "suggestedPresentationDelay":
        parseValue(attribute.value, { asKey: "suggestedPresentationDelay",
                                      parser: parseDuration,
                                      dashName: "suggestedPresentationDelay" });
        break;
      case "maxSegmentDuration":
        parseValue(attribute.value, { asKey: "maxSegmentDuration",
                                      parser: parseDuration,
                                      dashName: "maxSegmentDuration" });
        break;
      case "maxSubsegmentDuration":
        parseValue(attribute.value, { asKey: "maxSubsegmentDuration",
                                      parser: parseDuration,
                                      dashName: "maxSubsegmentDuration" });
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
