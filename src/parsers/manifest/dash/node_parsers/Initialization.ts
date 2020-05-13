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

import {
  parseByteRange,
  ValueParser,
} from "./utils";

export interface IParsedInitialization {
  range?: [number, number];
  media?: string;
  indexRange?: [number, number];
}

/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
export default function parseInitialization(
  root: Element
) : [IParsedInitialization, Error[]] {
  const parsedInitialization : IParsedInitialization = {};
  const warnings : Error[] = [];
  const parseValue = ValueParser(parsedInitialization, warnings);
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];
    switch (attribute.name) {
      case "range":
        parseValue("range", attribute.value, parseByteRange, "range");
        break;

      case "sourceURL":
        parsedInitialization.media = attribute.value;
        break;
    }
  }
  return [parsedInitialization, warnings];
}
