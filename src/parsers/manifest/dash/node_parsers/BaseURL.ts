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
  parseMPDInteger,
  ValueParser,
} from "./utils";

/** BaseURL element once parsed. */
export interface IBaseURL {
  /** The URL itself. */
  value: string;

  /** Attributes assiociated to the BaseURL. */
  attributes: {
    /** availabilityTimeOffset assiociated to that URL. */
    availabilityTimeOffset?: number;
  };
}

/**
 * Parse an BaseURL element into an BaseURL intermediate
 * representation.
 * @param {Element} adaptationSetElement - The BaseURL root element.
 * @returns {Array.<Object|undefined>}
 */
export default function parseBaseURL(
  root: Element
) : [IBaseURL | undefined, Error[]] {
  const attributes : { availabilityTimeOffset?: number } = {};
  const value = root.textContent;

  const warnings : Error[] = [];
  const parseValue = ValueParser(attributes, warnings);
  if (value === null || value.length === 0) {
    return [undefined, warnings];
  }
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "availabilityTimeOffset":
        if (attribute.value === "INF") {
          attributes.availabilityTimeOffset = Infinity;
        } else {
          parseValue("availabilityTimeOffset",
                     attribute.value,
                     parseMPDInteger,
                     "availabilityTimeOffset");
        }
        break;
    }
  }

  return [ { value, attributes },
           warnings ];
}
