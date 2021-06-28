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

import noop from "../../../../../../utils/noop";
import {
  IEventStreamIntermediateRepresentation,
  IPeriodAttributes,
  IPeriodChildren,
} from "../../../node_parser_types";
import ParsersStack, {
  IAttributeParser,
  IChildrenParser,
} from "../parsers_stack";
import {
  AttributeName,
  TagName,
} from "../types";
import { parseString } from "../utils";
import {
  generateAdaptationSetAttrParser,
  generateAdaptationSetChildrenParser,
} from "./AdaptationSet";
import { generateBaseUrlAttrParser } from "./BaseURL";
import {
  generateEventStreamAttrParser,
  generateEventStreamChildrenParser,
} from "./EventStream";
import { generateSegmentTemplateAttrParser } from "./SegmentTemplate";

/**
 * Generate a "children parser" once inside a `Perod` node.
 * @param {Object} periodChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export function generatePeriodChildrenParser(
  periodChildren : IPeriodChildren,
  linearMemory : WebAssembly.Memory,
  parsersStack : ParsersStack,
  fullMpd : ArrayBuffer
)  : IChildrenParser {
  return function onRootChildren(nodeId : number) {
    switch (nodeId) {

      case TagName.AdaptationSet: {
        const adaptationObj = { children: { baseURLs: [],
                                            representations: [] },
                                attributes: {} };
        periodChildren.adaptations.push(adaptationObj);
        const childrenParser =
          generateAdaptationSetChildrenParser(adaptationObj.children,
                                              linearMemory,
                                              parsersStack);
        const attributeParser = generateAdaptationSetAttrParser(adaptationObj.attributes,
                                                                linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        periodChildren.baseURLs.push(baseUrl);
        const childrenParser = noop;
        const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.EventStream: {
        const eventStream : IEventStreamIntermediateRepresentation =
          { children: { events: [] }, attributes: {} };
        periodChildren.eventStreams.push(eventStream);
        const childrenParser = generateEventStreamChildrenParser(eventStream.children,
                                                                 linearMemory,
                                                                 parsersStack,
                                                                 fullMpd);
        const attrParser = generateEventStreamAttrParser(eventStream.attributes,
                                                         linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attrParser);
        break;
      }

      case TagName.SegmentTemplate: {
        const stObj = {};
        periodChildren.segmentTemplate = stObj;
        parsersStack.pushParsers(nodeId,
                                 noop, // SegmentTimeline as treated like an attribute
                                 generateSegmentTemplateAttrParser(stObj, linearMemory));
        break;
      }

      default:
        // Allows to make sure we're not mistakenly closing a re-opened
        // tag.
        parsersStack.pushParsers(nodeId, noop, noop);
        break;
    }
  };
}

/**
 * @param {Object} periodAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generatePeriodAttrParser(
  periodAttrs : IPeriodAttributes,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onPeriodAttribute(attr, ptr, len) {
    switch (attr) {
      case AttributeName.Id:
        periodAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Start:
        periodAttrs.start = new DataView(linearMemory.buffer).getFloat64(ptr, true);
        break;
      case AttributeName.Duration:
        periodAttrs.duration = new DataView(linearMemory.buffer).getFloat64(ptr, true);
        break;
      case AttributeName.BitstreamSwitching:
        periodAttrs.bitstreamSwitching =
          new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      case AttributeName.XLinkHref:
        periodAttrs.xlinkHref = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.XLinkActuate:
        periodAttrs.xlinkActuate = parseString(textDecoder,
                                               linearMemory.buffer,
                                               ptr,
                                               len);
        break;
    }
  };
}
