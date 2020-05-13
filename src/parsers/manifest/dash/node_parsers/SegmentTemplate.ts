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
  parseMPDInteger,
  ValueParser,
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
 * Parse initialization attribute found in SegmentTemplateTemplate to
 * correspond to the initialization found in a regular segmentBase.
 * @param {string} attrValue
 * @returns {Object}
 */
function parseInitializationAttribute(attrValue : string) : IParsedInitialization  {
  return { media: attrValue };
}

/**
 * Parse a SegmentTemplate element into a SegmentTemplate intermediate
 * representation.
 * @param {Element} root - The SegmentTemplate root element.
 * @returns {Array}
 */
export default function parseSegmentTemplate(
  root: Element
) : [IParsedSegmentTemplate | IParsedSegmentTimeline, Error[]] {
  const [base, segmentBaseWarnings] = parseSegmentBase(root);
  const warnings : Error[] = segmentBaseWarnings;

  let ret : IParsedSegmentTemplate|IParsedSegmentTimeline;
  let parseTimeline : ITimelineParser|undefined;

  // First look for a possible SegmentTimeline
  for (let i = 0; i < root.childNodes.length; i++) {
    if (root.childNodes[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = root.childNodes[i] as Element;
      if (currentNode.nodeName === "SegmentTimeline") {
        parseTimeline = createSegmentTimelineParser(currentNode);
      }
    }
  }

  if (parseTimeline != null) {
    ret = objectAssign({}, base, { indexType: "timeline" as "timeline",
                                   parseTimeline });
  } else {
    const segmentDuration = base.duration;

    if (segmentDuration === undefined) {
      throw new Error("Invalid SegmentTemplate: no duration");
    }
    ret = objectAssign({}, base, { indexType: "template" as "template",
                                   duration: segmentDuration });
  }

  const parseValue = ValueParser(ret, warnings);
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.nodeName) {

      case "initialization":
        if (ret.initialization == null) {
          ret.initialization = parseInitializationAttribute(attribute.value);
        }
        break;

      case "index":
        ret.index = attribute.value;
        break;

      case "availabilityTimeOffset":
        if (attribute.value === "INF") {
          ret.availabilityTimeOffset = Infinity;
        }
        parseValue("availabilityTimeOffset",
                   attribute.value,
                   parseMPDInteger,
                   "availabilityTimeOffset");
        break;

      case "media":
        ret.media = attribute.value;
        break;

      case "bitstreamSwitching":
        parseValue("bitstreamSwitching",
                   attribute.value,
                   parseBoolean,
                   "bitstreamSwitching");
        break;
    }
  }

  return [ret, warnings];
}
