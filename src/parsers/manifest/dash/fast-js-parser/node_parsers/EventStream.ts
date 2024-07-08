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
  IEventStreamAttributes,
  IEventStreamEventIntermediateRepresentation,
  IEventStreamIntermediateRepresentation,
} from "../../node_parser_types";
import { parseMPDInteger, ValueParser } from "./utils";

/**
 * @param {Object} root
 * @returns {Array}
 */
function parseEventStreamAttributes(root: ITNode): [IEventStreamAttributes, Error[]] {
  const res: IEventStreamAttributes = {};
  const warnings: Error[] = [];
  const parseValue = ValueParser(res, warnings);
  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "schemeIdUri":
        res.schemeIdUri = attributeVal;
        break;

      case "value":
        res.value = attributeVal;
        break;

      case "timescale":
        parseValue(attributeVal, {
          asKey: "timescale",
          parser: parseMPDInteger,
          dashName: "timescale",
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
 * @returns {Array}
 */
export function createEventStreamIntermediateRepresentation(
  root: ITNode,
  fullMpd: string,
): [IEventStreamIntermediateRepresentation, Error[]] {
  const [attributes, warnings] = parseEventStreamAttributes(root);
  const events: IEventStreamEventIntermediateRepresentation[] = [];
  for (const child of root.children) {
    if (typeof child !== "string" && child.tagName === "Event") {
      const data: IEventStreamEventIntermediateRepresentation = {};
      if (!isNullOrUndefined(child.attributes.id)) {
        data.id = child.attributes.id;
      }
      if (!isNullOrUndefined(child.attributes.presentationTime)) {
        const [val, parsedWarning] = parseMPDInteger(
          child.attributes.presentationTime,
          "presentationTime",
        );
        if (parsedWarning !== null) {
          warnings.push(parsedWarning);
        }
        if (val !== null) {
          data.presentationTime = val;
        }
      }
      if (!isNullOrUndefined(child.attributes.duration)) {
        const [val, parsedWarning] = parseMPDInteger(
          child.attributes.duration,
          "duration",
        );
        if (parsedWarning !== null) {
          warnings.push(parsedWarning);
        }
        if (val !== null) {
          data.duration = val;
        }
      }
      if (child.posStart < child.posEnd) {
        const eventStr = fullMpd.substring(child.posStart, child.posEnd);
        data.eventStreamData = eventStr;
      }
      events.push(data);
    }
  }

  return [{ children: { events }, attributes }, warnings];
}
