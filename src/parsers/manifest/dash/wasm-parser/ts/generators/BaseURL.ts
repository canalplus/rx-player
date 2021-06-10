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

import { IBaseUrlIntermediateRepresentation } from "../../../node_parser_types";
import { IAttributeParser } from "../parsers_stack";
import { AttributeName } from "../types";
import { parseString } from "../utils";

/**
 * Generate an "attribute parser" once inside a `BaseURL` node.
 * @param {Object} baseUrlAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateBaseUrlAttrParser(
  baseUrlAttrs : IBaseUrlIntermediateRepresentation,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  const textDecoder = new TextDecoder();
  let dataView;
  return function onMPDAttribute(attr : number, ptr : number, len : number) {
    switch (attr) {
      case AttributeName.Text:
        baseUrlAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;

      case AttributeName.AvailabilityTimeOffset:
        dataView = new DataView(linearMemory.buffer);
        baseUrlAttrs.attributes.availabilityTimeOffset = dataView.getFloat64(ptr, true);
        break;
    }
  };
}
