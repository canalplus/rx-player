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
  ISegmentTemplateChildren,
  ISegmentTemplateIntermediateRepresentation,
} from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { parseString } from "../utils.ts";
import generateInitializationAttrParser from "./Initialization.ts";

export function generateSegmentTemplateChildrenParser(
  segmentTemplateChildren: ISegmentTemplateChildren,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): IChildrenParser {
  return function onSegmentTemplateChildren(nodeId: number) {
    if (nodeId === TagName.Initialization) {
      const initialization = { attributes: {} };
      segmentTemplateChildren.Initialization.push(initialization);
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

export function generateSegmentTemplateAttrParser(
  segmentTemplateAttrs: ISegmentTemplateIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onSegmentTemplateAttribute(attr, ptr, len) {
    switch (attr) {
      case AttributeName.SegmentTimeline: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.children.timeline = [];
        let base = ptr;
        for (let i = 0; i < len / 24; i++) {
          segmentTemplateAttrs.children.timeline.push({
            start: dataView.getFloat64(base, true),
            duration: dataView.getFloat64(base + 8, true),
            repeatCount: dataView.getFloat64(base + 16, true),
          });
          base += 24;
        }
        break;
      }

      case AttributeName.InitializationMedia:
        segmentTemplateAttrs.attributes.initialization = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;

      case AttributeName.Index:
        segmentTemplateAttrs.attributes.index = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;

      case AttributeName.AvailabilityTimeOffset: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.availabilityTimeOffset = dataView.getFloat64(
          ptr,
          true,
        );
        break;
      }

      case AttributeName.AvailabilityTimeComplete: {
        segmentTemplateAttrs.attributes.availabilityTimeComplete =
          new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      }

      case AttributeName.PresentationTimeOffset: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.presentationTimeOffset = dataView.getFloat64(
          ptr,
          true,
        );
        break;
      }

      case AttributeName.TimeScale: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.timescale = dataView.getFloat64(ptr, true);
        break;
      }

      case AttributeName.IndexRange: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.indexRange = [
          dataView.getFloat64(ptr, true),
          dataView.getFloat64(ptr + 8, true),
        ];
        break;
      }

      case AttributeName.IndexRangeExact: {
        segmentTemplateAttrs.attributes.indexRangeExact =
          new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      }

      case AttributeName.Media:
        segmentTemplateAttrs.attributes.media = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;

      case AttributeName.BitstreamSwitching: {
        segmentTemplateAttrs.attributes.bitstreamSwitching =
          new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      }

      case AttributeName.Duration: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.duration = dataView.getFloat64(ptr, true);
        break;
      }

      case AttributeName.StartNumber: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.startNumber = dataView.getFloat64(ptr, true);
        break;
      }

      case AttributeName.EndNumber: {
        const dataView = new DataView(linearMemory.buffer);
        segmentTemplateAttrs.attributes.endNumber = dataView.getFloat64(ptr, true);
        break;
      }
    }
  };
}
