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
import startsWith from "../../../../../utils/starts_with.ts";
import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type {
  IMPDAttributes,
  IMPDChildren,
  IMPDIntermediateRepresentation,
} from "../../node_parser_types.ts";
import parseBaseURL from "./BaseURL.ts";
import parseContentProtection from "./ContentProtection.ts";
import { createPeriodIntermediateRepresentation } from "./Period.ts";
import {
  parseDateTime,
  parseDuration,
  parseScheme,
  textContent,
  ValueParser,
} from "./utils.ts";

/**
 * Parse children of the MPD's root into a simple object.
 * @param {Array.<Object | string>} mpdChildren
 * @returns {Array.<Object>}
 */
function parseMPDChildren(
  mpdChildren: Array<ITNode | string>,
  fullMpd: string,
): [IMPDChildren, Error[]] {
  const ret: IMPDChildren = {
    BaseURL: [],
    Location: [],
    Period: [],
    UTCTiming: [],
    ContentProtection: [],
    EssentialProperty: [],
    SupplementalProperty: [],
  };

  let warnings: Error[] = [];
  for (let i = 0; i < mpdChildren.length; i++) {
    const currentNode = mpdChildren[i];
    if (typeof currentNode === "string") {
      continue;
    }
    switch (currentNode.tagName) {
      case "BaseURL": {
        const [baseURLObj, baseURLWarnings] = parseBaseURL(currentNode);
        if (baseURLObj !== undefined) {
          ret.BaseURL.push(baseURLObj);
        }
        warnings = warnings.concat(baseURLWarnings);
        break;
      }

      case "Location":
        ret.Location.push({ value: textContent(currentNode.children) });
        break;

      case "Period": {
        const [period, periodWarnings] = createPeriodIntermediateRepresentation(
          currentNode,
          fullMpd,
        );
        ret.Period.push(period);
        warnings = warnings.concat(periodWarnings);
        break;
      }

      case "UTCTiming": {
        const utcTiming = parseScheme(currentNode);
        ret.UTCTiming.push(utcTiming);
        break;
      }

      case "ContentProtection": {
        const [contentProtection, contentProtectionWarnings] =
          parseContentProtection(currentNode);
        if (contentProtectionWarnings.length > 0) {
          warnings = warnings.concat(contentProtectionWarnings);
        }
        if (contentProtection !== undefined) {
          ret.ContentProtection.push(contentProtection);
        }
        break;
      }

      case "EssentialProperty":
        ret.EssentialProperty.push(parseScheme(currentNode));
        break;

      case "SupplementalProperty":
        ret.SupplementalProperty.push(parseScheme(currentNode));
        break;
    }
  }
  return [ret, warnings];
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
          parser: parseDateTime,
          name: "availabilityStartTime",
        });
        break;
      case "availabilityEndTime":
        parseValue(attributeVal, {
          parser: parseDateTime,
          name: "availabilityEndTime",
        });
        break;
      case "publishTime":
        parseValue(attributeVal, {
          parser: parseDateTime,
          name: "publishTime",
        });
        break;
      case "mediaPresentationDuration":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "mediaPresentationDuration",
        });
        break;
      case "minimumUpdatePeriod":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "minimumUpdatePeriod",
        });
        break;
      case "minBufferTime":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "minBufferTime",
        });
        break;
      case "timeShiftBufferDepth":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "timeShiftBufferDepth",
        });
        break;
      case "suggestedPresentationDelay":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "suggestedPresentationDelay",
        });
        break;
      case "maxSegmentDuration":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "maxSegmentDuration",
        });
        break;
      case "maxSubsegmentDuration":
        parseValue(attributeVal, {
          parser: parseDuration,
          name: "maxSubsegmentDuration",
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
