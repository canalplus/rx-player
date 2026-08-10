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
import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type { ISegmentBaseIntermediateRepresentation } from "../../node_parser_types.ts";
import parseInitialization from "./Initialization.ts";
import {
  parseBoolean,
  parseByteRange,
  parseMPDFloat,
  parseMPDInteger,
  ValueParser,
} from "./utils.ts";

/**
 * Parse a SegmentBase element into a SegmentBase intermediate representation.
 * @param {Object} root - The SegmentBase root element.
 * @returns {Array}
 */
export default function parseSegmentBase(
  root: ITNode,
): [ISegmentBaseIntermediateRepresentation, Error[]] {
  const ret: ISegmentBaseIntermediateRepresentation = {
    children: {
      Initialization: [],
    },
    attributes: {},
  };

  let warnings: Error[] = [];
  const parseValue = ValueParser(ret.attributes, warnings);
  const segmentBaseChildren = root.children;
  for (let i = 0; i < segmentBaseChildren.length; i++) {
    const currentNode = segmentBaseChildren[i];
    if (typeof currentNode !== "string") {
      if (currentNode.tagName === "Initialization") {
        const [initialization, initializationWarnings] = parseInitialization(currentNode);
        ret.children.Initialization.push(initialization);
        warnings = warnings.concat(initializationWarnings);
      }
    }
  }

  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "timescale":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "timescale",
        });
        break;

      case "presentationTimeOffset":
        parseValue(attributeVal, {
          parser: parseMPDFloat,
          name: "presentationTimeOffset",
        });
        break;

      case "indexRange":
        parseValue(attributeVal, {
          parser: parseByteRange,
          name: "indexRange",
        });
        break;

      case "indexRangeExact":
        parseValue(attributeVal, {
          parser: parseBoolean,
          name: "indexRangeExact",
        });
        break;

      case "availabilityTimeOffset":
        parseValue(attributeVal, {
          parser: parseMPDFloat,
          name: "availabilityTimeOffset",
        });
        break;

      case "availabilityTimeComplete":
        parseValue(attributeVal, {
          parser: parseBoolean,
          name: "availabilityTimeComplete",
        });
        break;

      case "duration":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "duration",
        });
        break;

      case "startNumber":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "startNumber",
        });
        break;

      case "endNumber":
        parseValue(attributeVal, {
          parser: parseMPDInteger,
          name: "endNumber",
        });
        break;
    }
  }
  return [ret, warnings];
}
