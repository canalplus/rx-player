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

import objectAssign = require("object-assign");
import getParameters from "../getParameters";
import {
  getBodyNode,
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
} from "../nodes";
import getParentElementsByTagName from "../getParentElementsByTagName";

import { STYLE_ATTRIBUTES } from "./constants";
import {
  getStylingAttributes,
  getStylingFromElement,
  IStyleObject,
} from "../style";
import parseCue, { ITTMLHTMLCue } from "./parseCue";

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
 *
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
export default function parseTTMLStringToDIV(
  str : string,
  timeOffset : number
) : ITTMLHTMLCue[] {
  const ret : ITTMLHTMLCue[] = [];
  const xml = new DOMParser().parseFromString(str, "text/xml");

  if (xml) {
    const tts = xml.getElementsByTagName("tt");
    const tt = tts[0];
    if (!tt) {
      throw new Error("invalid XML");
    }

    const body = getBodyNode(tt);
    const styleNodes = getStyleNodes(tt);
    const regionNodes = getRegionNodes(tt);
    const textNodes = getTextNodes(tt);
    const params = getParameters(tt);

    // construct styles array based on the xml as an optimization
    const styles : IStyleObject[]  = [];
    for (let i = 0; i <= styleNodes.length - 1; i++) {
      const styleNode = styleNodes[i];
      if (styleNode instanceof Element) {
        const styleID = styleNode.getAttribute("xml:id");
        if (styleID != null) {
          // TODO styles referencing other styles
          styles.push({
            id: styleID,
            style: getStylingFromElement(styleNode),
          });
        }
      }
    }

    // construct regions array based on the xml as an optimization
    const regions : IStyleObject[] = [];
    for (let i = 0; i <= regionNodes.length - 1; i++) {
      const regionNode = regionNodes[i];
      if (regionNode instanceof Element) {
        const regionID = regionNode.getAttribute("xml:id");
        if (regionID != null) {
          let regionStyle =
            getStylingFromElement(regionNode);

          const associatedStyle = regionNode.getAttribute("style");
          if (associatedStyle) {
            const style = styles.find((x) => x.id === associatedStyle);
            if (style) {
              regionStyle = objectAssign({}, style.style, regionStyle);
            }
          }
          regions.push({
            id: regionID,
            style: regionStyle,
          });
        }
      }
    }

    // Computing the style takes a lot of ressources.
    // To avoid too much re-computation, let's compute the body style right
    // now and do the rest progressively.

    // TODO Compute corresponding CSS style here (as soon as we now the TTML
    // style) to speed up the process even
    // more.
    const bodyStyle = body != null ?
      getStylingAttributes(STYLE_ATTRIBUTES, [body], styles, regions) :
      getStylingAttributes(STYLE_ATTRIBUTES, [], styles, regions);

    for (let i = 0; i < textNodes.length; i++) {
      const paragraph = textNodes[i];
      if (paragraph instanceof Element) {
        const divs = getParentElementsByTagName(paragraph , "div");
        const paragraphStyle = objectAssign({}, bodyStyle,
          getStylingAttributes(
            STYLE_ATTRIBUTES, [paragraph, ...divs], styles, regions)
        );

        const cue = parseCue(
          paragraph,
          timeOffset,
          styles,
          regions,
          body,
          paragraphStyle,
          params
        );
        if (cue) {
          ret.push(cue);
        }
      }
    }
  }
  return ret;
}
