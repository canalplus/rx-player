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
import type { ITNode } from "../../../../../utils/xml-parser";
import type { IBaseUrlIntermediateRepresentation } from "../../node_parser_types";
import { textContent } from "./utils";

/**
 * Parse an BaseURL element into an BaseURL intermediate
 * representation.
 * @param {Object | string} root - The BaseURL root element.
 * @returns {Array.<Object|undefined>}
 */
export default function parseBaseURL(
  root: ITNode,
): [IBaseUrlIntermediateRepresentation | undefined, Error[]] {
  const attributes: { serviceLocation?: string } = {};
  const value = typeof root === "string" ? root : textContent(root.children);
  const warnings: Error[] = [];
  if (value === null || value.length === 0) {
    return [undefined, warnings];
  }

  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    if (attributeName === "serviceLocation") {
      attributes.serviceLocation = attributeVal;
    }
  }
  return [{ value, attributes }, warnings];
}
