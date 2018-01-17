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

export interface IParsedS {
  ts: number; // Time of start, timescaled. TODO Rename
  r: number; // Amount of repetition(s), 0 = no repeat. TODO Rename
  d?: number; // Duration of a segment. TODO Rename
}

/**
 * @param {Node} root
 * @returns {Object}
 */
export default function parseS(
  root : Node,
  previousS : IParsedS|null
) : IParsedS|undefined {
  let ts : number|undefined;
  let d : number|undefined;
  let r : number|undefined;
  for (let j = 0; j < root.attributes.length; j++) {
    const attribute = root.attributes[j];

    switch (attribute.name) {
      case "t":
        ts = parseInt(attribute.value, 10);
        break;
      case "d":
        d = parseInt(attribute.value, 10);
        break;
      case "r":
        r = parseInt(attribute.value, 10);
        break;
    }
  }
  if (ts == null && previousS && previousS.d != null) {
    ts = previousS.ts + (previousS.d * (previousS.r + 1));
  }
  if (
    (ts != null && !isNaN(ts)) &&
    (d == null || !isNaN(d)) &&
    (r == null || !isNaN(r))
  ) {
    return {
      ts,
      d,
      r: r || 0,
    };
  } else {
    log.warn("DASH: A \"S\" Node could not have been parsed.");
  }
}
