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

import { IInitializationAttributes } from "../../node_parser_types";
import {
  parseByteRange,
  ValueParser,
} from "./utils";

/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
export default function parseInitialization(
  root: Element
) : [IInitializationAttributes, Error[]] {
  const parsedInitialization : IInitializationAttributes = {};
  const warnings : Error[] = [];
  const parseValue = ValueParser(parsedInitialization, warnings);
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];
    switch (attribute.name) {
      case "range":
        parseValue(attribute.value, { asKey: "range",
                                      parser: parseByteRange,
                                      dashName: "range" });
        break;

      case "sourceURL":
        parsedInitialization.media = attribute.value;
        break;
    }
  }
  return [parsedInitialization, warnings];
}
