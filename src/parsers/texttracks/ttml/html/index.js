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

import getParameters from "../getParameters.js";
import {
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
} from "../nodes.js";

import parseCue from "./parseCue.js";

/**
 * Create array of objects which should represent the given TTML text track.
 * These objects have the following structure
 *   - start {Number}: start time, in seconds, at which the cue should
 *     be displayed
 *   - end {Number}: end time, in seconds, at which the cue should
 *     be displayed
 *   - element {HTMLElement}: <div> element representing the cue, with the
 *     right style. This div should then be appended to an element having
 *     the exact size of the wanted region the text track provide cues for.
 * @param {string} str
 * @returns {Array.<Object>}
 */
export default function parseTTMLStringToDIV(str) {
  const ret = [];
  const xml = new DOMParser().parseFromString(str, "text/xml");

  if (xml) {
    const tts = xml.getElementsByTagName("tt");
    const tt = tts[0];
    if (!tt) {
      throw new Error("invalid XML");
    }

    const styles = getStyleNodes(tt);
    const regions = getRegionNodes(tt);
    const textNodes = getTextNodes(tt);
    const params = getParameters(tt);

    for (let i = 0; i < textNodes.length; i++) {
      const cue = parseCue(
        textNodes[i],
        0, // offset
        styles,
        regions,
        params
      );
      if (cue) {
        ret.push(cue);
      }
    }
  }
  return ret;
}
