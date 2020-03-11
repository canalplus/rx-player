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

import objectAssign from "../../../../utils/object_assign";
import { IParsedInitialization } from "./Initialization";
import parseSegmentBase, {
  IParsedSegmentBase
} from "./SegmentBase";
import createSegmentTimelineParser, {
  ITimelineParser,
} from "./SegmentTimeline";
import {
  parseBoolean,
} from "./utils";

export interface IParsedSegmentTemplate extends IParsedSegmentBase {
  indexType: "template";
  duration : number;
  availabilityTimeComplete : boolean;
  indexRangeExact : boolean;
  timescale : number;

  presentationTimeOffset? : number;
  availabilityTimeOffset?: number;
  indexRange?: [number, number];
  initialization?: IParsedInitialization;
  startNumber? : number;

  media? : string;
  index? : string;
  bitstreamSwitching? : boolean;
}

export interface IParsedSegmentTimeline {
  indexType: "timeline";
  parseTimeline : ITimelineParser;
  availabilityTimeComplete : boolean;
  indexRangeExact : boolean;
  timescale : number;

  presentationTimeOffset? : number;
  availabilityTimeOffset?: number;
  duration? : number;
  indexRange?: [number, number];
  initialization?: IParsedInitialization;
  startNumber? : number;
  media? : string;
  index? : string;
  bitstreamSwitching? : boolean;
}

/**
 * Parse initialization attribute found in segment Template to
 * correspond to the initialization found in a regular segmentBase.
 * @param {string} attrValue
 * @returns {Object}
 */
function parseInitializationAttribute(attrValue : string) : IParsedInitialization  {
  return { media: attrValue };
}

/**
 * @param {Element} root
 * @returns {Object}
 */
export default function parseSegmentTemplate(
  root: Element
) : IParsedSegmentTemplate|IParsedSegmentTimeline {

  const base = parseSegmentBase(root);
  let ret : IParsedSegmentTemplate|IParsedSegmentTimeline;

  let index : string|undefined;
  let availabilityTimeOffset : string|undefined;
  let media : string|undefined;
  let bitstreamSwitching : boolean|undefined;
  let parseTimeline : ITimelineParser|undefined;

  for (let i = 0; i < root.childNodes.length; i++) {
    if (root.childNodes[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = root.childNodes[i] as Element;
      if (currentNode.nodeName === "SegmentTimeline") {
        parseTimeline = createSegmentTimelineParser(currentNode);
      }
    }
  }

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.nodeName) {

      case "initialization":
        if (base.initialization == null) {
          base.initialization = parseInitializationAttribute(attribute.value);
        }
        break;

      case "index":
        index = attribute.value;
        break;

      case "availabilityTimeOffset":
        availabilityTimeOffset = attribute.value;
        break;

      case "media":
        media = attribute.value;
        break;

      case "bitstreamSwitching":
        bitstreamSwitching = parseBoolean(attribute.value);
        break;
    }
  }

  if (parseTimeline != null) {
    ret = objectAssign({}, base, {
      indexType: "timeline" as "timeline",
      parseTimeline,
    });
  } else {
    const segmentDuration = base.duration;

    if (segmentDuration == null) {
      throw new Error("Invalid SegmentTemplate: no duration");
    }
    ret = objectAssign({}, base, {
      indexType: "template" as "template",
      duration: segmentDuration,
    });
  }

  if (index != null) {
    ret.index = index;
  }

  if (media != null) {
    ret.media = media;
  }

  if (bitstreamSwitching != null) {
    ret.bitstreamSwitching = bitstreamSwitching;
  }

  if (availabilityTimeOffset != null) {
    ret.availabilityTimeOffset =
      availabilityTimeOffset === "INF" ? Infinity :
                                         parseInt(availabilityTimeOffset, 10);
  }

  return ret;
}
