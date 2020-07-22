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
  availabilityTimeComplete? : boolean;
  availabilityTimeOffset?: number;
  bitstreamSwitching? : boolean;
  duration? : number;
  index? : string;
  indexRange?: [number, number];
  indexRangeExact? : boolean;
  initialization?: IParsedInitialization;
  media? : string;
  presentationTimeOffset? : number;
  startNumber? : number;
  timelineParser? : ITimelineParser;
  timescale? : number;
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
) : [IParsedSegmentTemplate, Error[]] {
  const [base, segmentBaseWarnings] = parseSegmentBase(root);
  const warnings : Error[] = segmentBaseWarnings;

  let ret : IParsedSegmentTemplate;
  let timelineParser : ITimelineParser|undefined;

  // First look for a possible SegmentTimeline
  for (let i = 0; i < root.childNodes.length; i++) {
    if (root.childNodes[i].nodeType === Node.ELEMENT_NODE) {
      const currentNode = root.childNodes[i] as Element;
      if (currentNode.nodeName === "SegmentTimeline") {
        timelineParser = createSegmentTimelineParser(currentNode);
      }
    }
  }

  ret = objectAssign({}, base, { duration: base.duration,
                                 timelineParser });

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
        parseValue(attribute.value, { asKey: "availabilityTimeOffset",
                                      parser: parseMPDInteger,
                                      dashName: "availabilityTimeOffset" });
        break;

      case "media":
        ret.media = attribute.value;
        break;

      case "bitstreamSwitching":
        parseValue(attribute.value, { asKey: "bitstreamSwitching",
                                      parser: parseBoolean,
                                      dashName: "bitstreamSwitching" });
        break;
    }
  }

  return [ret, warnings];
}
