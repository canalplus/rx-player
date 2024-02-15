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
  IAdaptationSetIntermediateRepresentation,
  IBaseUrlIntermediateRepresentation,
  IEventStreamIntermediateRepresentation,
  IPeriodAttributes,
  IPeriodChildren,
  IPeriodIntermediateRepresentation,
  ISegmentTemplateIntermediateRepresentation,
} from "../../node_parser_types";
import { createAdaptationSetIntermediateRepresentation } from "./AdaptationSet";
import parseBaseURL from "./BaseURL";
import { createEventStreamIntermediateRepresentation } from "./EventStream";
import parseSegmentTemplate from "./SegmentTemplate";
import { parseBoolean, parseDuration, ValueParser } from "./utils";

/**
 * @param {Array.<Object | string>} periodChildren
 * @param {string} fullMpd
 * @returns {Array}
 */
function parsePeriodChildren(
  periodChildren: Array<ITNode | string>,
  fullMpd: string,
): [IPeriodChildren, Error[]] {
  const baseURLs: IBaseUrlIntermediateRepresentation[] = [];
  const adaptations: IAdaptationSetIntermediateRepresentation[] = [];
  let segmentTemplate: ISegmentTemplateIntermediateRepresentation | undefined;

  let warnings: Error[] = [];
  const eventStreams: IEventStreamIntermediateRepresentation[] = [];
  for (let i = 0; i < periodChildren.length; i++) {
    const currentElement = periodChildren[i];
    if (typeof currentElement === "string") {
      continue;
    }
    switch (currentElement.tagName) {
      case "BaseURL":
        const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
        if (baseURLObj !== undefined) {
          baseURLs.push(baseURLObj);
        }
        warnings = warnings.concat(baseURLWarnings);
        break;

      case "AdaptationSet":
        const [adaptation, adaptationWarnings] =
          createAdaptationSetIntermediateRepresentation(currentElement);
        adaptations.push(adaptation);
        warnings = warnings.concat(adaptationWarnings);
        break;

      case "EventStream":
        const [eventStream, eventStreamWarnings] =
          createEventStreamIntermediateRepresentation(currentElement, fullMpd);
        eventStreams.push(eventStream);
        warnings = warnings.concat(eventStreamWarnings);
        break;

      case "SegmentTemplate":
        const [parsedSegmentTemplate, segmentTemplateWarnings] =
          parseSegmentTemplate(currentElement);
        segmentTemplate = parsedSegmentTemplate;
        if (segmentTemplateWarnings.length > 0) {
          warnings = warnings.concat(segmentTemplateWarnings);
        }
        break;
    }
  }

  return [{ baseURLs, adaptations, eventStreams, segmentTemplate }, warnings];
}

/**
 * @param {Object} root
 * @returns {Array}
 */
function parsePeriodAttributes(root: ITNode): [IPeriodAttributes, Error[]] {
  const res: IPeriodAttributes = {};
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

      case "start":
        parseValue(attributeVal, {
          asKey: "start",
          parser: parseDuration,
          dashName: "start",
        });
        break;

      case "duration":
        parseValue(attributeVal, {
          asKey: "duration",
          parser: parseDuration,
          dashName: "duration",
        });
        break;

      case "bitstreamSwitching":
        parseValue(attributeVal, {
          asKey: "bitstreamSwitching",
          parser: parseBoolean,
          dashName: "bitstreamSwitching",
        });
        break;

      case "xlink:href":
        res.xlinkHref = attributeVal;
        break;

      case "xlink:actuate":
        res.xlinkActuate = attributeVal;
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
 * @param {Object} periodElement
 * @param {string} fullMpd
 * @returns {Array}
 */
export function createPeriodIntermediateRepresentation(
  periodElement: ITNode,
  fullMpd: string,
): [IPeriodIntermediateRepresentation, Error[]] {
  const [children, childrenWarnings] = parsePeriodChildren(
    periodElement.children,
    fullMpd,
  );
  const [attributes, attrsWarnings] = parsePeriodAttributes(periodElement);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
