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

import { ISegmentBaseIntermediateRepresentation } from "../../node_parser_types";
import parseInitialization from "./Initialization";
import {
  parseBoolean,
  parseByteRange,
  parseMPDFloat,
  parseMPDInteger,
  ValueParser,
} from "./utils";

/**
 * Parse a SegmentBase element into a SegmentBase intermediate representation.
 * @param {Element} root - The SegmentBase root element.
 * @returns {Array}
 */
export default function parseSegmentBase(
  root: Element
) : [ISegmentBaseIntermediateRepresentation, Error[]] {
  const attributes : ISegmentBaseIntermediateRepresentation = {};

  let warnings : Error[] = [];
  const parseValue = ValueParser(attributes, warnings);
  const segmentBaseChildren = root.childNodes;
  for (let i = 0; i < segmentBaseChildren.length; i++) {
    if (segmentBaseChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = segmentBaseChildren[i] as Element;
      if (currentNode.nodeName === "Initialization") {
        const [initialization, initializationWarnings] =
          parseInitialization(currentNode);
        attributes.initialization = initialization;
        warnings = warnings.concat(initializationWarnings);
      }
    }
  }

  for (let i = 0; i < root.attributes.length; i++) {
    const attr = root.attributes[i];
    switch (attr.name) {
      case "timescale":
        parseValue(attr.value, { asKey: "timescale",
                                 parser: parseMPDInteger,
                                 dashName: "timescale" });
        break;

      case "presentationTimeOffset":
        parseValue(attr.value, { asKey: "presentationTimeOffset",
                                 parser: parseMPDFloat,
                                 dashName: "presentationTimeOffset" });
        break;

      case "indexRange":
        parseValue(attr.value, { asKey: "indexRange",
                                 parser: parseByteRange,
                                 dashName: "indexRange" });
        break;

      case "indexRangeExact":
        parseValue(attr.value, { asKey: "indexRangeExact",
                                 parser: parseBoolean,
                                 dashName: "indexRangeExact" });
        break;

      case "availabilityTimeOffset":
        parseValue(attr.value, { asKey: "availabilityTimeOffset",
                                 parser: parseMPDFloat,
                                 dashName: "availabilityTimeOffset" });
        break;

      case "availabilityTimeComplete":
        parseValue(attr.value, { asKey: "availabilityTimeComplete",
                                 parser: parseBoolean,
                                 dashName: "availabilityTimeComplete" });
        break;

      case "duration":
        parseValue(attr.value, { asKey: "duration",
                                 parser: parseMPDInteger,
                                 dashName: "duration" });
        break;

      case "startNumber":
        parseValue(attr.value, { asKey: "startNumber",
                                 parser: parseMPDInteger,
                                 dashName: "startNumber" });
        break;
    }
  }

  return [attributes, warnings];
}
