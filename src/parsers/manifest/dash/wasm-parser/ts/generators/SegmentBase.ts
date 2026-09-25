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

import noop from "../../../../../../utils/noop.ts";
import type {
  ISegmentBaseChildren,
  ISegmentBaseIntermediateRepresentation,
} from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { readBoolean, readFloat } from "../utils.ts";
import generateInitializationAttrParser from "./Initialization.ts";

export function generateSegmentBaseChildrenParser(
  segmentBaseChildren: ISegmentBaseChildren,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): IChildrenParser {
  return function onSegmentBaseChildren(nodeId: number) {
    if (nodeId === TagName.Initialization) {
      const initialization = { attributes: {} };
      segmentBaseChildren.Initialization.push(initialization);
      parsersStack.pushParsers(
        nodeId,
        noop,
        generateInitializationAttrParser(initialization, linearMemory),
      );
    } else {
      parsersStack.pushParsers(nodeId, noop, noop);
    }
  };
}

export function generateSegmentBaseAttrParser(
  segmentBaseAttrs: ISegmentBaseIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  return function onSegmentBaseAttribute(attr, ptr, _len, value) {
    switch (attr) {
      case AttributeName.AvailabilityTimeOffset: {
        segmentBaseAttrs.attributes.availabilityTimeOffset = readFloat(value);
        break;
      }

      case AttributeName.AvailabilityTimeComplete: {
        segmentBaseAttrs.attributes.availabilityTimeComplete = readBoolean(value);
        break;
      }

      case AttributeName.PresentationTimeOffset: {
        segmentBaseAttrs.attributes.presentationTimeOffset = readFloat(value);
        break;
      }

      case AttributeName.TimeScale: {
        segmentBaseAttrs.attributes.timescale = readFloat(value);
        break;
      }

      case AttributeName.IndexRange: {
        const dataView = new DataView(linearMemory.buffer);
        segmentBaseAttrs.attributes.indexRange = [
          dataView.getFloat64(ptr, true),
          dataView.getFloat64(ptr + 8, true),
        ];
        break;
      }

      case AttributeName.IndexRangeExact: {
        segmentBaseAttrs.attributes.indexRangeExact = readBoolean(value);
        break;
      }

      case AttributeName.Duration: {
        segmentBaseAttrs.attributes.duration = readFloat(value);
        break;
      }

      case AttributeName.StartNumber: {
        segmentBaseAttrs.attributes.startNumber = readFloat(value);
        break;
      }

      case AttributeName.EndNumber: {
        segmentBaseAttrs.attributes.endNumber = readFloat(value);
        break;
      }
    }
  };
}
