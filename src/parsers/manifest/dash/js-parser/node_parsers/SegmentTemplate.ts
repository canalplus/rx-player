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
import objectAssign from "../../../../../utils/object_assign";
import type { ITNode } from "../../../../../utils/xml-parser";
import type {
  ISegmentTemplateIntermediateRepresentation,
  ITimelineParser,
} from "../../node_parser_types";
import parseSegmentBase from "./SegmentBase";
import createSegmentTimelineParser from "./SegmentTimeline";
import { parseBoolean, parseMPDFloat, ValueParser } from "./utils";

/**
 * Parse a SegmentTemplate element into a SegmentTemplate intermediate
 * representation.
 * @param {Object} root - The SegmentTemplate root element.
 * @returns {Array}
 */
export default function parseSegmentTemplate(
  root: ITNode,
): [ISegmentTemplateIntermediateRepresentation, Error[]] {
  const [base, segmentBaseWarnings] = parseSegmentBase(root);
  const warnings: Error[] = segmentBaseWarnings;

  let timelineParser: ITimelineParser | undefined;

  // First look for a possible SegmentTimeline
  for (let i = 0; i < root.children.length; i++) {
    const currentNode = root.children[i];
    if (typeof currentNode !== "string" && currentNode.tagName === "SegmentTimeline") {
      timelineParser = createSegmentTimelineParser(currentNode);
    }
  }

  const ret: ISegmentTemplateIntermediateRepresentation = objectAssign({}, base, {
    duration: base.duration,
    timelineParser,
  });

  const parseValue = ValueParser(ret, warnings);

  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "initialization":
        if (isNullOrUndefined(ret.initialization)) {
          ret.initialization = { media: attributeVal };
        }
        break;

      case "index":
        ret.index = attributeVal;
        break;

      case "availabilityTimeOffset":
        parseValue(attributeVal, {
          asKey: "availabilityTimeOffset",
          parser: parseMPDFloat,
          dashName: "availabilityTimeOffset",
        });
        break;

      case "availabilityTimeComplete":
        parseValue(attributeVal, {
          asKey: "availabilityTimeComplete",
          parser: parseBoolean,
          dashName: "availabilityTimeComplete",
        });
        break;

      case "media":
        ret.media = attributeVal;
        break;

      case "bitstreamSwitching":
        parseValue(attributeVal, {
          asKey: "bitstreamSwitching",
          parser: parseBoolean,
          dashName: "bitstreamSwitching",
        });
        break;
    }
  }

  return [ret, warnings];
}
