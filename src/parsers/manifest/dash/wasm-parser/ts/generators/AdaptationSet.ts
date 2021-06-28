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
  IAdaptationSetAttributes,
  IAdaptationSetChildren,
  ISegmentListIntermediateRepresentation,
} from "../../../node_parser_types";
import ParsersStack, {
  IAttributeParser,
  IChildrenParser,
} from "../parsers_stack";
import {
  AttributeName,
  TagName,
} from "../types";
import {
  parseFloatOrBool,
  parseString,
} from "../utils";
import { generateBaseUrlAttrParser } from "./BaseURL";
import { generateContentComponentAttrParser } from "./ContentComponent";
import { generateContentProtectionAttrParser } from "./ContentProtection";
import {
  generateRepresentationAttrParser,
  generateRepresentationChildrenParser,
} from "./Representation";
import { generateSchemeAttrParser } from "./Scheme";
import { generateSegmentBaseAttrParser } from "./SegmentBase";
import { generateSegmentListChildrenParser } from "./SegmentList";
import { generateSegmentTemplateAttrParser } from "./SegmentTemplate";

/**
 * Generate a "children parser" once inside a `AdaptationSet` node.
 * @param {Object} adaptationSetChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
export function generateAdaptationSetChildrenParser(
  adaptationSetChildren : IAdaptationSetChildren,
  linearMemory : WebAssembly.Memory,
  parsersStack : ParsersStack
)  : IChildrenParser {
  return function onRootChildren(nodeId : number) {
    switch (nodeId) {

      case TagName.Accessibility: {
        const accessibility = {};
        if (adaptationSetChildren.accessibilities === undefined) {
          adaptationSetChildren.accessibilities = [];
        }
        adaptationSetChildren.accessibilities.push(accessibility);
        const schemeAttrParser = generateSchemeAttrParser(accessibility,
                                                          linearMemory);
        parsersStack.pushParsers(nodeId, noop, schemeAttrParser);
        break;
      }

      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        adaptationSetChildren.baseURLs.push(baseUrl);
        const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.ContentComponent: {
        const contentComponent = {};
        adaptationSetChildren.contentComponent = contentComponent;
        parsersStack.pushParsers(nodeId,
                                 noop,
                                 generateContentComponentAttrParser(contentComponent,
                                                                    linearMemory));
        break;
      }

      case TagName.ContentProtection: {
        const contentProtection = { children: { cencPssh: [] },
                                    attributes: {} };
        if (adaptationSetChildren.contentProtections === undefined) {
          adaptationSetChildren.contentProtections = [];
        }
        adaptationSetChildren.contentProtections.push(contentProtection);
        const contentProtAttrParser =
          generateContentProtectionAttrParser(contentProtection, linearMemory);
        parsersStack.pushParsers(nodeId, noop, contentProtAttrParser);
        break;
      }

      case TagName.EssentialProperty: {
        const essentialProperty = {};
        if (adaptationSetChildren.essentialProperties === undefined) {
          adaptationSetChildren.essentialProperties = [];
        }
        adaptationSetChildren.essentialProperties.push(essentialProperty);

        const childrenParser = noop; // EssentialProperty have no sub-element
        const attributeParser = generateSchemeAttrParser(essentialProperty,
                                                         linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.InbandEventStream: {
        const inbandEvent = {};
        if (adaptationSetChildren.inbandEventStreams === undefined) {
          adaptationSetChildren.inbandEventStreams = [];
        }
        adaptationSetChildren.inbandEventStreams.push(inbandEvent);

        const childrenParser = noop; // InbandEventStream have no sub-element
        const attributeParser = generateSchemeAttrParser(inbandEvent,
                                                         linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.Representation: {
        const representationObj = { children: { baseURLs: [] },
                                    attributes: {} };
        adaptationSetChildren.representations.push(representationObj);
        const childrenParser =
          generateRepresentationChildrenParser(representationObj.children,
                                               linearMemory,
                                               parsersStack);
        const attributeParser =
          generateRepresentationAttrParser(representationObj.attributes, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.Role: {
        const role = {};
        if (adaptationSetChildren.roles === undefined) {
          adaptationSetChildren.roles = [];
        }
        adaptationSetChildren.roles.push(role);
        const attributeParser = generateSchemeAttrParser(role,
                                                         linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.SupplementalProperty: {
        const supplementalProperty = {};
        if (adaptationSetChildren.supplementalProperties === undefined) {
          adaptationSetChildren.supplementalProperties = [];
        }
        adaptationSetChildren.supplementalProperties.push(supplementalProperty);
        const attributeParser = generateSchemeAttrParser(supplementalProperty,
                                                         linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.SegmentBase: {
        const segmentBaseObj = {};
        adaptationSetChildren.segmentBase = segmentBaseObj;
        const attributeParser = generateSegmentBaseAttrParser(segmentBaseObj,
                                                              linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.SegmentList: {
        const segmentListObj : ISegmentListIntermediateRepresentation =
          { list: [] };
        adaptationSetChildren.segmentList = segmentListObj;
        const childrenParser = generateSegmentListChildrenParser(segmentListObj,
                                                                 linearMemory,
                                                                 parsersStack);

        // Re-use SegmentBase attribute parse as we should have the same attributes
        const attributeParser = generateSegmentBaseAttrParser(segmentListObj,
                                                              linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      case TagName.SegmentTemplate: {
        const stObj = {};
        adaptationSetChildren.segmentTemplate = stObj;
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
 * @param {Object} adaptationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateAdaptationSetAttrParser(
  adaptationAttrs : IAdaptationSetAttributes,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onAdaptationSetAttribute(attr : number, ptr : number, len : number) {
    const dataView = new DataView(linearMemory.buffer);
    switch (attr) {
      case AttributeName.Id:
        adaptationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Group:
        adaptationAttrs.group = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Language:
        adaptationAttrs.language =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.ContentType:
        adaptationAttrs.contentType =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Par:
        adaptationAttrs.par = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.MinBandwidth:
        adaptationAttrs.minBitrate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.MaxBandwidth:
        adaptationAttrs.maxBitrate = dataView.getFloat64(ptr, true);
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
        adaptationAttrs.minFrameRate =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.MaxFrameRate:
        adaptationAttrs.maxFrameRate =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.SelectionPriority:
        adaptationAttrs.selectionPriority = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.SegmentAlignment:
        adaptationAttrs.segmentAlignment =
          parseFloatOrBool(dataView.getFloat64(ptr, true));
        break;
      case AttributeName.SubsegmentAlignment:
        adaptationAttrs.subsegmentAlignment =
          parseFloatOrBool(dataView.getFloat64(ptr, true));
        break;
      case AttributeName.BitstreamSwitching:
        adaptationAttrs.bitstreamSwitching = dataView.getFloat64(ptr, true) !== 0;
        break;
      case AttributeName.AudioSamplingRate:
        adaptationAttrs.audioSamplingRate =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Codecs:
        adaptationAttrs.codecs =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Profiles:
        adaptationAttrs.profiles =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.SegmentProfiles:
        adaptationAttrs.segmentProfiles =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.MimeType:
        adaptationAttrs.mimeType =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.CodingDependency:
        adaptationAttrs.codingDependency = dataView.getFloat64(ptr, true) !== 0;
        break;
      case AttributeName.FrameRate:
        adaptationAttrs.frameRate =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
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

      // TODO
      // case AttributeName.StartsWithSap:
      //   adaptationAttrs.startsWithSap = dataView.getFloat64(ptr, true);
    }
  };
}
