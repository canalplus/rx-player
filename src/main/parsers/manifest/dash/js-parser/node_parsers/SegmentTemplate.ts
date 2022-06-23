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

import objectAssign from "../../../../../utils/object_assign";
import {
  ISegmentTemplateIntermediateRepresentation,
  ITimelineParser,
} from "../../node_parser_types";
import parseSegmentBase from "./SegmentBase";
import createSegmentTimelineParser from "./SegmentTimeline";
import {
  parseBoolean,
  parseMPDFloat,
  ValueParser,
} from "./utils";

/**
 * Parse a SegmentTemplate element into a SegmentTemplate intermediate
 * representation.
 * @param {Element} root - The SegmentTemplate root element.
 * @returns {Array}
 */
export default function parseSegmentTemplate(
  root: Element
) : [ISegmentTemplateIntermediateRepresentation, Error[]] {
  const [base, segmentBaseWarnings] = parseSegmentBase(root);
  const warnings : Error[] = segmentBaseWarnings;

  let timelineParser : ITimelineParser|undefined;

  // First look for a possible SegmentTimeline
  for (let i = 0; i < root.childNodes.length; i++) {
    if (root.childNodes[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = root.childNodes[i] as Element;
      if (currentNode.nodeName === "SegmentTimeline") {
        timelineParser = createSegmentTimelineParser(currentNode);
      }
    }
  }

  const ret : ISegmentTemplateIntermediateRepresentation =
    objectAssign({}, base, { duration: base.duration, timelineParser });

  const parseValue = ValueParser(ret, warnings);
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.nodeName) {

      case "initialization":
        if (ret.initialization == null) {
          ret.initialization = { media: attribute.value };
        }
        break;

      case "index":
        ret.index = attribute.value;
        break;

      case "availabilityTimeOffset":
        parseValue(attribute.value, { asKey: "availabilityTimeOffset",
                                      parser: parseMPDFloat,
                                      dashName: "availabilityTimeOffset" });
        break;

      case "availabilityTimeComplete":
        parseValue(attribute.value, { asKey: "availabilityTimeComplete",
                                      parser: parseBoolean,
                                      dashName: "availabilityTimeComplete" });
        break;

      case "media":
        ret.media = attribute.value;
        break;

      case "bitstreamSwitching":
        parseValue(attribute.value, { asKey: "bitstreamSwitching",
                                      parser: parseBoolean,
                                      dashName: "bitstreamSwitching" });
        break;
    }
  }

  return [ret, warnings];
}
