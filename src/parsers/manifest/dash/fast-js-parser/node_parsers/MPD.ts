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
import startsWith from "../../../../../utils/starts_with";
import type { ITNode } from "../../../../../utils/xml-parser";
import type {
  IBaseUrlIntermediateRepresentation,
  IContentProtectionIntermediateRepresentation,
  IMPDAttributes,
  IMPDChildren,
  IMPDIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
  IScheme,
} from "../../node_parser_types";
import parseBaseURL from "./BaseURL";
import parseContentProtection from "./ContentProtection";
import { createPeriodIntermediateRepresentation } from "./Period";
import {
  parseDateTime,
  parseDuration,
  parseScheme,
  textContent,
  ValueParser,
} from "./utils";

/**
 * Parse children of the MPD's root into a simple object.
 * @param {Array.<Object | string>} mpdChildren
 * @returns {Array.<Object>}
 */
function parseMPDChildren(
  mpdChildren: Array<ITNode | string>,
  fullMpd: string,
): [IMPDChildren, Error[]] {
  const baseURLs: IBaseUrlIntermediateRepresentation[] = [];
  const locations: string[] = [];
  const periods: IPeriodIntermediateRepresentation[] = [];
  const utcTimings: IScheme[] = [];
  const contentProtections: IContentProtectionIntermediateRepresentation[] = [];

  let warnings: Error[] = [];
  for (let i = 0; i < mpdChildren.length; i++) {
    const currentNode = mpdChildren[i];
    if (typeof currentNode === "string") {
      continue;
    }
    switch (currentNode.tagName) {
      case "BaseURL":
        const [baseURLObj, baseURLWarnings] = parseBaseURL(currentNode);
        if (baseURLObj !== undefined) {
          baseURLs.push(baseURLObj);
        }
        warnings = warnings.concat(baseURLWarnings);
        break;

      case "Location":
        locations.push(textContent(currentNode.children));
        break;

      case "Period":
        const [period, periodWarnings] = createPeriodIntermediateRepresentation(
          currentNode,
          fullMpd,
        );
        periods.push(period);
        warnings = warnings.concat(periodWarnings);
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
    }
  }
  return [{ baseURLs, locations, periods, utcTimings, contentProtections }, warnings];
}

/**
 * @param {Object} root
 * @returns {Array.<Object>}
 */
function parseMPDAttributes(root: ITNode): [IMPDAttributes, Error[]] {
  const res: IMPDAttributes = {};
  const warnings: Error[] = [];
  const parseValue = ValueParser(res, warnings);

  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "id":
        res.id = attributeVal;
        break;
      case "profiles":
        res.profiles = attributeVal;
        break;
      case "type":
        res.type = attributeVal;
        break;

      case "availabilityStartTime":
        parseValue(attributeVal, {
          asKey: "availabilityStartTime",
          parser: parseDateTime,
          dashName: "availabilityStartTime",
        });
        break;
      case "availabilityEndTime":
        parseValue(attributeVal, {
          asKey: "availabilityEndTime",
          parser: parseDateTime,
          dashName: "availabilityEndTime",
        });
        break;
      case "publishTime":
        parseValue(attributeVal, {
          asKey: "publishTime",
          parser: parseDateTime,
          dashName: "publishTime",
        });
        break;
      case "mediaPresentationDuration":
        parseValue(attributeVal, {
          asKey: "duration",
          parser: parseDuration,
          dashName: "mediaPresentationDuration",
        });
        break;
      case "minimumUpdatePeriod":
        parseValue(attributeVal, {
          asKey: "minimumUpdatePeriod",
          parser: parseDuration,
          dashName: "minimumUpdatePeriod",
        });
        break;
      case "minBufferTime":
        parseValue(attributeVal, {
          asKey: "minBufferTime",
          parser: parseDuration,
          dashName: "minBufferTime",
        });
        break;
      case "timeShiftBufferDepth":
        parseValue(attributeVal, {
          asKey: "timeShiftBufferDepth",
          parser: parseDuration,
          dashName: "timeShiftBufferDepth",
        });
        break;
      case "suggestedPresentationDelay":
        parseValue(attributeVal, {
          asKey: "suggestedPresentationDelay",
          parser: parseDuration,
          dashName: "suggestedPresentationDelay",
        });
        break;
      case "maxSegmentDuration":
        parseValue(attributeVal, {
          asKey: "maxSegmentDuration",
          parser: parseDuration,
          dashName: "maxSegmentDuration",
        });
        break;
      case "maxSubsegmentDuration":
        parseValue(attributeVal, {
          asKey: "maxSubsegmentDuration",
          parser: parseDuration,
          dashName: "maxSubsegmentDuration",
        });
        break;

      default:
        if (startsWith(attributeName, "xmlns:")) {
          if (res.namespaces === undefined) {
            res.namespaces = [];
          }
          res.namespaces.push({
            key: attributeName.substring(6),
            value: attributeVal,
          });
        }
        break;
    }
  }
  return [res, warnings];
}

/**
 * @param {Object} root
 * @param {string} fullMpd
 * @returns {Array.<Object>}
 */
export function createMPDIntermediateRepresentation(
  root: ITNode,
  fullMpd: string,
): [IMPDIntermediateRepresentation, Error[]] {
  const [children, childrenWarnings] = parseMPDChildren(root.children, fullMpd);
  const [attributes, attrsWarnings] = parseMPDAttributes(root);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
