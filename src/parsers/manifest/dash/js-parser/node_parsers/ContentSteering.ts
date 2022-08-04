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

import { IContentSteeringIntermediateRepresentation } from "../../node_parser_types";
import {
  parseBoolean,
  ValueParser,
} from "./utils";

/**
 * Parse an ContentSteering element into an ContentSteering intermediate
 * representation.
 * @param {Element} root - The ContentSteering root element.
 * @returns {Array.<Object|undefined>}
 */
export default function parseContentSteering(
  root: Element
) : [IContentSteeringIntermediateRepresentation | undefined, Error[]] {
  const attributes : { defaultServiceLocation? : string;
                       queryBeforeStart? : boolean;
                       proxyServerUrl? : string; } = {};
  const value = root.textContent;
  const warnings : Error[] = [];
  if (value === null || value.length === 0) {
    return [undefined, warnings];
  }
  const parseValue = ValueParser(attributes, warnings);
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "defaultServiceLocation":
        attributes.defaultServiceLocation = attribute.value;
        break;

      case "queryBeforeStart":
        parseValue(attribute.value, { asKey: "queryBeforeStart",
                                      parser: parseBoolean,
                                      dashName: "queryBeforeStart" });
        break;

      case "proxyServerUrl":
        attributes.proxyServerUrl = attribute.value;
        break;
    }
  }

  return [ { value, attributes },
           warnings ];
}
