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

import log from "../../../../../log";

/** SegmentTimeline `S` element once parsed. */
export interface IParsedS {
  /** Start time in a previously-given timescaled unit. */
  start? : number;
  /**
   * Amount of repetition(s).
   * 0 = no repeat.
   * negative number = max possible repeat.
   */
  repeatCount? : number;
  /** Duration of the content in a previously-given timescaled unit. */
  duration? : number;
}

/**
 * Parse a given <S> element in the MPD into a JS Object.
 * @param {Element} root
 * @returns {Object}
 */
export default function parseSElement(root : Element) : IParsedS {
  const parsedS : IParsedS = {};

  for (let j = 0; j < root.attributes.length; j++) {
    const attribute = root.attributes[j];

    switch (attribute.name) {
      case "t":
        const start = parseInt(attribute.value, 10);
        if (isNaN(start)) {
          log.warn(`DASH: invalid t ("${attribute.value}")`);
        } else {
          parsedS.start = start;
        }
        break;
      case "d":
        const duration = parseInt(attribute.value, 10);
        if (isNaN(duration)) {
          log.warn(`DASH: invalid d ("${attribute.value}")`);
        } else {
          parsedS.duration = duration;
        }
        break;
      case "r":
        const repeatCount = parseInt(attribute.value, 10);
        if (isNaN(repeatCount)) {
          log.warn(`DASH: invalid r ("${attribute.value}")`);
        } else {
          parsedS.repeatCount = repeatCount;
        }
        break;
    }
  }
  return parsedS;
}
