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

import log from "../../../../log";
import { parseByteRange } from "./utils";

export interface IParsedSegmentURL { media?: string;
                                     mediaRange?: [number, number];
                                     index?: string;
                                     indexRange?: [number, number]; }

/**
 * @param {Element} root
 * @returns {Object}
 */
export default function parseSegmentURL(root : Element) : IParsedSegmentURL {
  const parsedSegmentURL : IParsedSegmentURL = {};
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];
    switch (attribute.name) {
      case "media":
        parsedSegmentURL.media = attribute.value;
        break;
      case "indexRange": {
        const indexRange = parseByteRange(attribute.value);
        if (!Array.isArray(indexRange)) {
          log.warn(`DASH: invalid indexRange ("${attribute.value}")`);
        } else {
          parsedSegmentURL.indexRange = indexRange;
        }
      }
        break;
      case "index":
        parsedSegmentURL.index = attribute.value;
        break;
      case "mediaRange": {
        const mediaRange = parseByteRange(attribute.value);
        if (!Array.isArray(mediaRange)) {
          log.warn(`DASH: invalid mediaRange ("${attribute.value}")`);
        } else {
          parsedSegmentURL.mediaRange = mediaRange;
        }
      }
        break;
    }
  }
  return parsedSegmentURL;
}
