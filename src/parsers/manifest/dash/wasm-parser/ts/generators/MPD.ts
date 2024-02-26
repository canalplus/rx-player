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
  IContentProtectionIntermediateRepresentation,
  ILocationIntermediateRepresentation,
  IMPDAttributes,
  IMPDChildren,
  IPeriodIntermediateRepresentation,
} from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { parseString } from "../utils.ts";
import { generateBaseUrlAttrParser } from "./BaseURL.ts";
import { generateContentProtectionAttrParser } from "./ContentProtection.ts";
import { generateContentSteeringAttrParser } from "./ContentSteering.ts";
import { generateLocationAttrParser } from "./Location.ts";
import { generatePeriodAttrParser, generatePeriodChildrenParser } from "./Period.ts";
import { generateSchemeAttrParser } from "./Scheme.ts";

/**
 * Generate a "children parser" once inside an `MPD` node.
 * @param {Object} mpdChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export function generateMPDChildrenParser(
  mpdChildren: IMPDChildren,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
  fullMpd: ArrayBufferLike,
): IChildrenParser {
  return function onRootChildren(nodeId: number) {
    switch (nodeId) {
      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        mpdChildren.BaseURL.push(baseUrl);

        const childrenParser = noop; // BaseURL have no sub-element
        const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.ContentSteering: {
        const contentSteering = { value: "", attributes: {} };
        mpdChildren.ContentSteering.push(contentSteering);
        parsersStack.pushParsers(
          nodeId,
          noop,
          generateContentSteeringAttrParser(contentSteering, linearMemory),
        );
        break;
      }

      case TagName.Location: {
        const location: ILocationIntermediateRepresentation = {
          value: "",
          attributes: {},
        };
        mpdChildren.Location.push(location);
        parsersStack.pushParsers(
          nodeId,
          noop,
          generateLocationAttrParser(location, linearMemory),
        );
        break;
      }

      case TagName.Period: {
        const period: IPeriodIntermediateRepresentation = {
          children: {
            AdaptationSet: [],
            BaseURL: [],
            SegmentTemplate: [],
            EventStream: [],
            ContentProtection: [],
          },
          attributes: {},
        };
        mpdChildren.Period.push(period);
        const childrenParser = generatePeriodChildrenParser(
          period.children,
          linearMemory,
          parsersStack,
          fullMpd,
        );
        const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.UtcTiming: {
        const utcTiming = { attributes: {} };
        mpdChildren.UTCTiming.push(utcTiming);

        const childrenParser = noop; // UTCTiming have no sub-element
        const attributeParser = generateSchemeAttrParser(
          utcTiming.attributes,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.ContentProtection: {
        const contentProtection: IContentProtectionIntermediateRepresentation = {
          children: { ["cenc:pssh"]: [] },
          attributes: {},
        };
        mpdChildren.ContentProtection.push(contentProtection);
        const contentProtAttrParser = generateContentProtectionAttrParser(
          contentProtection,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, noop, contentProtAttrParser);
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
  mpdAttrs: IMPDAttributes,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  let dataView;
  const textDecoder = new TextDecoder();
  return function onMPDAttribute(attr: number, ptr: number, len: number) {
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
      case AttributeName.AvailabilityStartTime: {
        const startTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdAttrs.availabilityStartTime = new Date(startTime).getTime() / 1000;
        break;
      }
      case AttributeName.AvailabilityEndTime: {
        const endTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdAttrs.availabilityEndTime = new Date(endTime).getTime() / 1000;
        break;
      }
      case AttributeName.PublishTime: {
        const publishTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
        mpdAttrs.publishTime = new Date(publishTime).getTime() / 1000;
        break;
      }
      case AttributeName.MediaPresentationDuration:
        dataView = new DataView(linearMemory.buffer);
        mpdAttrs.mediaPresentationDuration = dataView.getFloat64(ptr, true);
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

      case AttributeName.Namespace: {
        const xmlNs = { key: "", value: "" };
        dataView = new DataView(linearMemory.buffer);
        let offset = ptr;
        const keySize = dataView.getUint32(offset);
        offset += 4;

        xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
        offset += keySize;

        const valSize = dataView.getUint32(offset);
        offset += 4;
        xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);

        if (mpdAttrs.namespaces === undefined) {
          mpdAttrs.namespaces = [xmlNs];
        } else {
          mpdAttrs.namespaces.push(xmlNs);
        }
        break;
      }
    }
  };
}
