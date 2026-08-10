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
import type { IInitializationIntermediateRepresentation } from "../../node_parser_types.ts";
import { parseByteRange, ValueParser } from "./utils.ts";

/**
 * @param {Object} root
 * @returns {Array.<Object>}
 */
export default function parseInitialization(
  root: ITNode,
): [IInitializationIntermediateRepresentation, Error[]] {
  const parsedInitialization: IInitializationIntermediateRepresentation = {
    attributes: {},
  };
  const warnings: Error[] = [];
  const parseValue = ValueParser(parsedInitialization.attributes, warnings);
  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "range":
        parseValue(attributeVal, {
          parser: parseByteRange,
          name: "range",
        });
        break;

      case "sourceURL":
        parsedInitialization.attributes.sourceURL = attributeVal;
        break;
    }
  }
  return [parsedInitialization, warnings];
}
