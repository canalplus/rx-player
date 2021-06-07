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
  ISegmentUrlIntermediateRepresentation,
} from "../../../node_parser_types";
import { IAttributeParser } from "../parsers_stack";
import {
  AttributeName,
} from "../types";
import { parseString } from "../utils";

/**
 * Generate "attribute parser" for an encountered `SegmentURL` opening
 * tag.
 * @param {Object} segmentUrlAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateSegmentUrlAttrParser(
  segmentUrlAttrs : ISegmentUrlIntermediateRepresentation,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onSegmentUrlAttribute(attr, ptr, len) {
    switch (attr) {

      case AttributeName.Index:
        segmentUrlAttrs.index =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;

      case AttributeName.IndexRange: {
        const dataView = new DataView(linearMemory.buffer);
        segmentUrlAttrs.indexRange = [
          dataView.getFloat64(ptr, true),
          dataView.getFloat64(ptr + 8, true),
        ];
        break;
      }

      case AttributeName.Media:
        segmentUrlAttrs.media =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;

      case AttributeName.MediaRange: {
        const dataView = new DataView(linearMemory.buffer);
        segmentUrlAttrs.mediaRange = [
          dataView.getFloat64(ptr, true),
          dataView.getFloat64(ptr + 8, true),
        ];
        break;
      }
    }
  };
}
