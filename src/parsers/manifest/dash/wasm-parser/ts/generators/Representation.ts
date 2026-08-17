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
  IRepresentationAttributes,
  IRepresentationChildren,
  ISegmentListIntermediateRepresentation,
} from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { parseString } from "../utils.ts";
import { generateBaseUrlAttrParser } from "./BaseURL.ts";
import { generateContentProtectionAttrParser } from "./ContentProtection.ts";
import { generateDescriptorParsers } from "./Descriptor.ts";
import pushRequestParamParser from "./RequestParam.ts";
import { generateSchemeAttrParser } from "./Scheme.ts";
import {
  generateSegmentBaseAttrParser,
  generateSegmentBaseChildrenParser,
} from "./SegmentBase.ts";
import { generateSegmentListChildrenParser } from "./SegmentList.ts";
import {
  generateSegmentTemplateAttrParser,
  generateSegmentTemplateChildrenParser,
} from "./SegmentTemplate.ts";

/**
 * Generate a "children parser" once inside a `Representation` node.
 * @param {Object} childrenObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
export function generateRepresentationChildrenParser(
  childrenObj: IRepresentationChildren,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): IChildrenParser {
  return function onRootChildren(nodeId: number) {
    switch (nodeId) {
      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        childrenObj.BaseURL.push(baseUrl);
        parsersStack.pushParsers(
          nodeId,
          noop,
          generateBaseUrlAttrParser(baseUrl, linearMemory),
        );
        break;
      }

      case TagName.ContentProtection: {
        const contentProtection = {
          children: { ["cenc:pssh"]: [] },
          attributes: {},
        };
        childrenObj.ContentProtection.push(contentProtection);
        const contentProtAttrParser = generateContentProtectionAttrParser(
          contentProtection,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, noop, contentProtAttrParser);
        break;
      }

      case TagName.InbandEventStream: {
        const inbandEvent = { attributes: {} };
        childrenObj.InbandEventStream.push(inbandEvent);
        parsersStack.pushParsers(
          nodeId,
          noop,
          generateSchemeAttrParser(inbandEvent.attributes, linearMemory),
        );
        break;
      }

      case TagName.EssentialProperty:
      case TagName.SupplementalProperty: {
        const descriptor = {
          attributes: {},
          children: { UrlQueryInfo: [], ExtUrlQueryInfo: [] },
        };
        const destination =
          nodeId === TagName.EssentialProperty
            ? childrenObj.EssentialProperty
            : childrenObj.SupplementalProperty;
        destination.push(descriptor);
        const parsers = generateDescriptorParsers(descriptor, linearMemory, parsersStack);
        parsersStack.pushParsers(nodeId, parsers.children, parsers.attributes);
        break;
      }

      case TagName.RequestParam:
        pushRequestParamParser(
          childrenObj.RequestParam,
          nodeId,
          linearMemory,
          parsersStack,
        );
        break;

      case TagName.SegmentBase: {
        const segmentBaseObj = { children: { Initialization: [] }, attributes: {} };
        childrenObj.SegmentBase.push(segmentBaseObj);
        const attributeParser = generateSegmentBaseAttrParser(
          segmentBaseObj,
          linearMemory,
        );
        const childrenParser = generateSegmentBaseChildrenParser(
          segmentBaseObj.children,
          linearMemory,
          parsersStack,
        );
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.SegmentList: {
        const segmentListObj: ISegmentListIntermediateRepresentation = {
          children: { Initialization: [], SegmentURL: [] },
          attributes: {},
        };
        childrenObj.SegmentList.push(segmentListObj);
        const childrenParser = generateSegmentListChildrenParser(
          segmentListObj,
          linearMemory,
          parsersStack,
        );

        // Re-use SegmentBase attribute parse as we should have the same attributes
        const attributeParser = generateSegmentBaseAttrParser(
          segmentListObj,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.SegmentTemplate: {
        const stObj = { children: { Initialization: [] }, attributes: {} };
        childrenObj.SegmentTemplate.push(stObj);
        parsersStack.pushParsers(
          nodeId,
          generateSegmentTemplateChildrenParser(
            stObj.children,
            linearMemory,
            parsersStack,
          ),
          generateSegmentTemplateAttrParser(stObj, linearMemory),
        );
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
 * @param {Object} representationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateRepresentationAttrParser(
  representationAttrs: IRepresentationAttributes,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onRepresentationAttribute(attr: number, ptr: number, len: number) {
    const dataView = new DataView(linearMemory.buffer);
    switch (attr) {
      case AttributeName.Id:
        representationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.AudioSamplingRate:
        representationAttrs.audioSamplingRate = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.Bitrate:
        representationAttrs.bandwidth = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Codecs:
        representationAttrs.codecs = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.SupplementalCodecs:
        representationAttrs["scte214:supplementalCodecs"] = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.CodingDependency:
        representationAttrs.codingDependency =
          new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      case AttributeName.FrameRate:
        representationAttrs.frameRate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Height:
        representationAttrs.height = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Width:
        representationAttrs.width = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxPlayoutRate:
        representationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxSAPPeriod:
        representationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MimeType:
        representationAttrs.mimeType = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.Profiles:
        representationAttrs.profiles = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.QualityRanking:
        representationAttrs.qualityRanking = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.SegmentProfiles:
        representationAttrs.segmentProfiles = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.AvailabilityTimeOffset:
        representationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.AvailabilityTimeComplete:
        representationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
        break;
    }
  };
}
