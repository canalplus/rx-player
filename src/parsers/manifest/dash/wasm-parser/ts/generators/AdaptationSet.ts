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
  IAdaptationSetAttributes,
  IAdaptationSetChildren,
  ISegmentListIntermediateRepresentation,
} from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { parseFloatOrBool, parseString } from "../utils.ts";
import { generateBaseUrlAttrParser } from "./BaseURL.ts";
import { generateContentComponentAttrParser } from "./ContentComponent.ts";
import { generateContentProtectionAttrParser } from "./ContentProtection.ts";
import { generateDescriptorParsers } from "./Descriptor.ts";
import { generateLabelElementParser } from "./Label.ts";
import {
  generateRepresentationAttrParser,
  generateRepresentationChildrenParser,
} from "./Representation.ts";
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
 * Generate a "children parser" once inside a `AdaptationSet` node.
 * @param {Object} adaptationSetChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
export function generateAdaptationSetChildrenParser(
  adaptationSetChildren: IAdaptationSetChildren,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): IChildrenParser {
  return function onRootChildren(nodeId: number) {
    switch (nodeId) {
      case TagName.Accessibility: {
        const accessibility = { attributes: {} };
        adaptationSetChildren.Accessibility.push(accessibility);
        const schemeAttrParser = generateSchemeAttrParser(
          accessibility.attributes,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, noop, schemeAttrParser);
        break;
      }

      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        adaptationSetChildren.BaseURL.push(baseUrl);
        const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.ContentComponent: {
        const contentComponent = { attributes: {} };
        adaptationSetChildren.ContentComponent.push(contentComponent);
        parsersStack.pushParsers(
          nodeId,
          noop,
          generateContentComponentAttrParser(contentComponent.attributes, linearMemory),
        );
        break;
      }

      case TagName.ContentProtection: {
        const contentProtection = {
          children: { ["cenc:pssh"]: [] },
          attributes: {},
        };
        adaptationSetChildren.ContentProtection.push(contentProtection);
        const contentProtAttrParser = generateContentProtectionAttrParser(
          contentProtection,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, noop, contentProtAttrParser);
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
            ? adaptationSetChildren.EssentialProperty
            : adaptationSetChildren.SupplementalProperty;
        destination.push(descriptor);
        const parsers = generateDescriptorParsers(descriptor, linearMemory, parsersStack);
        parsersStack.pushParsers(nodeId, parsers.children, parsers.attributes);
        break;
      }

      case TagName.RequestParam:
        pushRequestParamParser(
          adaptationSetChildren.RequestParam,
          nodeId,
          linearMemory,
          parsersStack,
        );
        break;

      case TagName.InbandEventStream: {
        const inbandEvent = { attributes: {} };
        adaptationSetChildren.InbandEventStream.push(inbandEvent);

        const childrenParser = noop; // InbandEventStream have no sub-element
        const attributeParser = generateSchemeAttrParser(
          inbandEvent.attributes,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.Representation: {
        const representationObj = {
          children: {
            BaseURL: [],
            ContentProtection: [],
            InbandEventStream: [],
            SegmentBase: [],
            SegmentList: [],
            SegmentTemplate: [],
            SupplementalProperty: [],
            EssentialProperty: [],
            RequestParam: [],
          },
          attributes: {},
        };
        adaptationSetChildren.Representation.push(representationObj);
        const childrenParser = generateRepresentationChildrenParser(
          representationObj.children,
          linearMemory,
          parsersStack,
        );
        const attributeParser = generateRepresentationAttrParser(
          representationObj.attributes,
          linearMemory,
        );
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.Role: {
        const role = { attributes: {} };
        adaptationSetChildren.Role.push(role);
        const attributeParser = generateSchemeAttrParser(role.attributes, linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.SegmentBase: {
        const segmentBaseObj = { children: { Initialization: [] }, attributes: {} };
        adaptationSetChildren.SegmentBase.push(segmentBaseObj);
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
          children: {
            Initialization: [],
            SegmentURL: [],
          },
          attributes: {},
        };
        adaptationSetChildren.SegmentList.push(segmentListObj);
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
        adaptationSetChildren.SegmentTemplate.push(stObj);
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

      case TagName.Label: {
        parsersStack.pushParsers(
          nodeId,
          noop, // Label as treated like an attribute
          generateLabelElementParser(adaptationSetChildren, linearMemory),
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
 * @param {Object} adaptationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateAdaptationSetAttrParser(
  adaptationAttrs: IAdaptationSetAttributes,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onAdaptationSetAttribute(attr: number, ptr: number, len: number) {
    const dataView = new DataView(linearMemory.buffer);
    switch (attr) {
      case AttributeName.Id:
        adaptationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Group:
        adaptationAttrs.group = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Language:
        adaptationAttrs.lang = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.ContentType:
        adaptationAttrs.contentType = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.Par:
        adaptationAttrs.par = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.MinBandwidth:
        adaptationAttrs.minBandwidth = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxBandwidth:
        adaptationAttrs.maxBandwidth = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MinWidth:
        adaptationAttrs.minWidth = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxWidth:
        adaptationAttrs.maxWidth = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MinHeight:
        adaptationAttrs.minHeight = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxHeight:
        adaptationAttrs.maxHeight = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MinFrameRate:
        adaptationAttrs.minFrameRate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxFrameRate:
        adaptationAttrs.maxFrameRate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.SelectionPriority:
        adaptationAttrs.selectionPriority = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.SegmentAlignment:
        adaptationAttrs.segmentAlignment = parseFloatOrBool(
          dataView.getFloat64(ptr, true),
        );
        break;
      case AttributeName.SubsegmentAlignment:
        adaptationAttrs.subsegmentAlignment = parseFloatOrBool(
          dataView.getFloat64(ptr, true),
        );
        break;
      case AttributeName.BitstreamSwitching:
        adaptationAttrs.bitstreamSwitching = dataView.getFloat64(ptr, true) !== 0;
        break;
      case AttributeName.AudioSamplingRate:
        adaptationAttrs.audioSamplingRate = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.Codecs:
        adaptationAttrs.codecs = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.SupplementalCodecs:
        adaptationAttrs["scte214:supplementalCodecs"] = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.Profiles:
        adaptationAttrs.profiles = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.SegmentProfiles:
        adaptationAttrs.segmentProfiles = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.MimeType:
        adaptationAttrs.mimeType = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.CodingDependency:
        adaptationAttrs.codingDependency = dataView.getFloat64(ptr, true) !== 0;
        break;
      case AttributeName.FrameRate:
        adaptationAttrs.frameRate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Height:
        adaptationAttrs.height = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Width:
        adaptationAttrs.width = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxPlayoutRate:
        adaptationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxSAPPeriod:
        adaptationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.AvailabilityTimeOffset:
        adaptationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.AvailabilityTimeComplete:
        adaptationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
        break;
    }
  };
}
