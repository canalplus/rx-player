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

import log from "../../../../utils/log";
import {
  parseBoolean,
  parseFrameRate,
} from "../helpers";
import parseSegmentBase, {
  IParsedSegmentBase,
} from "./SegmentBase";
import parseSegmentList, {
  IParsedSegmentList,
} from "./SegmentList";
import parseSegmentTemplate, {
  IParsedSegmentTemplate,
  IParsedSegmentTimeline,
} from "./SegmentTemplate";

export interface IRepresentationIntermediateRepresentation {
  children : IRepresentationChildren;
  attributes : IRepresentationAttributes;
}

export interface IRepresentationChildren {
  // required
  baseURL : string;

  // optional
  segmentBase? : IParsedSegmentBase;
  segmentList? : IParsedSegmentList;
  segmentTemplate? : IParsedSegmentTemplate|IParsedSegmentTimeline;
}

export interface IRepresentationAttributes {
  // optional
  audioSamplingRate? : string;
  bitrate? : number;
  codecs? : string;
  codingDependency? : boolean;
  frameRate? : number;
  height? : number;
  id? : string;
  maxPlayoutRate? : number;
  maximumSAPPeriod? : number;
  mimeType? : string;
  profiles? : string;
  qualityRanking? : number;
  segmentProfiles? : string;
  width? : number;
}

/**
 * @param {NodeList} representationChildren
 * @returns {Object}
 */
function parseRepresentationChildren(
  representationChildren : NodeList
) : IRepresentationChildren {
  const children : IRepresentationChildren = {
    baseURL: "",
  };

  for (let i = 0; i < representationChildren.length; i++) {
    const currentNode = representationChildren[i];

    switch (currentNode.nodeName) {
      case "BaseURL":
        children.baseURL = currentNode.textContent || "";
        break;
      case "SegmentBase":
        children.segmentBase = parseSegmentBase(currentNode);
        break;
      case "SegmentList":
        children.segmentList = parseSegmentList(currentNode);
        break;
      case "SegmentTemplate":
        children.segmentTemplate = parseSegmentTemplate(currentNode);
        break;
    }
  }
  return children;
}

/**
 * @param {Node} representationNode
 * @returns {Object}
 */
function parseRepresentationAttributes(
  representationNode : Node
) : IRepresentationAttributes {
  const attributes : IRepresentationAttributes = {};
  for (let i = 0; i < representationNode.attributes.length; i++) {
    const attribute = representationNode.attributes[i];

    switch (attribute.name) {

      case "audioSamplingRate":
        attributes.audioSamplingRate = attribute.value;
        break;

      case "bandwidth": {
        const bitrate = parseInt(attribute.value, 10);
        if (isNaN(bitrate)) {
          log.warn(`DASH: invalid bandwidth ("${attribute.value}")`);
        } else {
          attributes.bitrate = bitrate;
        }
      }
        break;

      case "codecs":
        attributes.codecs = attribute.value;
        break;

      case "codingDependency":
        attributes.codingDependency = parseBoolean(attribute.value);
        break;

      case "frameRate": {
        const frameRate = parseFrameRate(attribute.value);
        if (isNaN(frameRate)) {
          log.warn(`DASH: invalid frameRate ("${attribute.value}")`);
        } else {
          attributes.frameRate = frameRate;
        }
      }
        break;

      case "height": {
        const height = parseInt(attribute.value, 10);
        if (isNaN(height)) {
          log.warn(`DASH: invalid height ("${attribute.value}")`);
        } else {
          attributes.height = height;
        }
      }
        break;

      case "id":
        attributes.id = attribute.value;
        break;

      case "maxPlayoutRate": {
        const maxPlayoutRate = parseFloat(attribute.value);
        if (isNaN(maxPlayoutRate)) {
          log.warn(`DASH: invalid maxPlayoutRate ("${attribute.value}")`);
        } else {
          attributes.maxPlayoutRate = maxPlayoutRate;
        }
      }
        break;

      case "maximumSAPPeriod": {
        const maximumSAPPeriod = parseFloat(attribute.value);
        if (isNaN(maximumSAPPeriod)) {
          log.warn(`DASH: invalid maximumSAPPeriod ("${attribute.value}")`);
        } else {
          attributes.maximumSAPPeriod = maximumSAPPeriod;
        }
      }
        break;

      case "mimeType":
        attributes.mimeType = attribute.value;
        break;

      case "profiles":
        attributes.profiles = attribute.value;
        break;

      case "qualityRanking": {
        const qualityRanking = parseInt(attribute.value, 10);
        if (isNaN(qualityRanking)) {
          log.warn(`DASH: invalid qualityRanking ("${attribute.value}")`);
        } else {
          attributes.qualityRanking = qualityRanking;
        }
      }
        break;

      case "segmentProfiles":
        attributes.segmentProfiles = attribute.value;
        break;

      case "width": {
        const width = parseInt(attribute.value, 10);
        if (isNaN(width)) {
          log.warn(`DASH: invalid width ("${attribute.value}")`);
        } else {
          attributes.width = width;
        }
      }
        break;
    }
  }
  return attributes;
}

export function createRepresentationIntermediateRepresentation(
  representationNode : Node
) : IRepresentationIntermediateRepresentation {
  return {
    children: parseRepresentationChildren(representationNode.childNodes),
    attributes: parseRepresentationAttributes(representationNode),
  };
}
