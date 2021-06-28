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
  IMPDAttributes,
  IMPDChildren,
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
import { generateBaseUrlAttrParser } from "./BaseURL";
import {
  generatePeriodAttrParser,
  generatePeriodChildrenParser,
} from "./Period";
import { generateSchemeAttrParser } from "./Scheme";

/**
 * Generate a "children parser" once inside an `MPD` node.
 * @param {Object} mpdChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export function generateMPDChildrenParser(
  mpdChildren : IMPDChildren,
  linearMemory : WebAssembly.Memory,
  parsersStack : ParsersStack,
  fullMpd : ArrayBuffer
)  : IChildrenParser {
  return function onRootChildren(nodeId : number) {
    switch (nodeId) {

      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        mpdChildren.baseURLs.push(baseUrl);

        const childrenParser = noop; // BaseURL have no sub-element
        const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.Period: {
        const period = { children: { adaptations: [],
                                     baseURLs: [],
                                     eventStreams: [] },
                         attributes: {} };
        mpdChildren.periods.push(period);
        const childrenParser = generatePeriodChildrenParser(period.children,
                                                            linearMemory,
                                                            parsersStack,
                                                            fullMpd);
        const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.UtcTiming: {
        const utcTiming = {};
        mpdChildren.utcTimings.push(utcTiming);

        const childrenParser = noop; // UTCTiming have no sub-element
        const attributeParser = generateSchemeAttrParser(utcTiming, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
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

export function generateMPDAttrParser(
  mpdChildren : IMPDChildren,
  mpdAttrs : IMPDAttributes,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  let dataView;
  const textDecoder = new TextDecoder();
  return function onMPDAttribute(attr : number, ptr : number, len : number) {
    switch (attr) {
      case AttributeName.Id:
        mpdAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Profiles:
        mpdAttrs.profiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Type:
        mpdAttrs.type = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.AvailabilityStartTime:
        const startTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdAttrs.availabilityStartTime = new Date(startTime).getTime() / 1000;
        break;
      case AttributeName.AvailabilityEndTime:
        const endTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdAttrs.availabilityEndTime = new Date(endTime).getTime() / 1000;
        break;
      case AttributeName.PublishTime:
        const publishTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdAttrs.publishTime = new Date(publishTime).getTime() / 1000;
        break;
      case AttributeName.MediaPresentationDuration:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.duration = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MinimumUpdatePeriod:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.minimumUpdatePeriod = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MinBufferTime:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.minBufferTime = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.TimeShiftBufferDepth:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.timeShiftBufferDepth = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.SuggestedPresentationDelay:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.suggestedPresentationDelay = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxSegmentDuration:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.maxSegmentDuration = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxSubsegmentDuration:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.maxSubsegmentDuration = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Location:
        const location = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdChildren.locations.push(location);
        break;
    }
  };
}
