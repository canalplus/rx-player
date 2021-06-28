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
  IRepresentationAttributes,
  IRepresentationChildren,
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
import { parseString } from "../utils";
import { generateBaseUrlAttrParser } from "./BaseURL";
import { generateSchemeAttrParser } from "./Scheme";
import { generateSegmentBaseAttrParser } from "./SegmentBase";
import { generateSegmentListChildrenParser } from "./SegmentList";
import { generateSegmentTemplateAttrParser } from "./SegmentTemplate";

/**
 * Generate a "children parser" once inside a `Representation` node.
 * @param {Object} childrenObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
export function generateRepresentationChildrenParser(
  childrenObj : IRepresentationChildren,
  linearMemory : WebAssembly.Memory,
  parsersStack : ParsersStack
)  : IChildrenParser {
  return function onRootChildren(nodeId : number) {
    switch (nodeId) {

      case TagName.BaseURL: {
        const baseUrl = { value: "", attributes: {} };
        childrenObj.baseURLs.push(baseUrl);
        parsersStack.pushParsers(nodeId,
                                 noop,
                                 generateBaseUrlAttrParser(baseUrl, linearMemory));
        break;
      }

      case TagName.InbandEventStream: {
        const inbandEvent = {};
        if (childrenObj.inbandEventStreams === undefined) {
          childrenObj.inbandEventStreams = [];
        }
        childrenObj.inbandEventStreams.push(inbandEvent);
        parsersStack.pushParsers(nodeId, noop, generateSchemeAttrParser(inbandEvent,
                                                                        linearMemory));
        break;
      }

      case TagName.SegmentBase: {
        const segmentBaseObj = {};
        childrenObj.segmentBase = segmentBaseObj;
        const attributeParser = generateSegmentBaseAttrParser(segmentBaseObj,
                                                              linearMemory);
        parsersStack.pushParsers(nodeId, noop, attributeParser);
        break;
      }

      case TagName.SegmentList: {
        const segmentListObj : ISegmentListIntermediateRepresentation =
          { list: [] };
        childrenObj.segmentList = segmentListObj;
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
        childrenObj.segmentTemplate = stObj;
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
 * @param {Object} representationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateRepresentationAttrParser(
  representationAttrs : IRepresentationAttributes,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onRepresentationAttribute(attr : number, ptr : number, len : number) {
    const dataView = new DataView(linearMemory.buffer);
    switch (attr) {
      case AttributeName.Id:
        representationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.AudioSamplingRate:
        representationAttrs.audioSamplingRate =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Bitrate:
        representationAttrs.bitrate = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.Codecs:
        representationAttrs.codecs =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.CodingDependency:
        representationAttrs.codingDependency =
          new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      case AttributeName.FrameRate:
        representationAttrs.frameRate =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
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
        representationAttrs.mimeType =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.Profiles:
        representationAttrs.profiles =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.QualityRanking:
        representationAttrs.qualityRanking = dataView.getFloat64(ptr, true);
        break;
      case AttributeName.SegmentProfiles:
        representationAttrs.segmentProfiles =
          parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
    }
  };
}
