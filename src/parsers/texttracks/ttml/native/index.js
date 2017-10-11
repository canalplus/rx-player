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

import { makeCue } from "../../../../compat";

import {
  REGXP_PERCENT_VALUES,
} from "../regexps";
import {
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
} from "../nodes";
import getParameters from "../getParameters";
import getParentElementsByTagName from "../getParentElementsByTagName";
import getStyleValue from "../getStyleValue";
import getTimeDelimiters from "../getTimeDelimiters";

/**
 * @type {Object}
 */
const TEXT_ALIGN_TO_LIGN_ALIGN = {
  left: "start",
  center: "center",
  right: "end",
  start: "start",
  end: "end",
};

/**
 * @type {Object}
 */
const TEXT_ALIGN_TO_POSITION_ALIGN = {
  left: "line-left",
  center: "center",
  right: "line-right",
};

function parseTTMLStringToVTT(str) {
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

/**
 * Parses an Element into a TextTrackCue or VTTCue.
 * /!\ Mutates the given cueElement Element
 * @param {Element} cueElement
 * @param {Number} offset
 * @param {Array.<Element>} styles
 * @param {Array.<Element>} regions
 * @param {Object} params
 * @returns {TextTrackCue|null}
 */
function parseCue(cueElement, offset, styles, regions, params) {
  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If cueElement has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  const content = cueElement.textContent || "";
  if (!cueElement.hasAttribute("begin") &&
    !cueElement.hasAttribute("end") && /^\s*$/.test(content)
  ) {
    return null;
  }

  // /!\ Mutates cueElement
  addNewLines(cueElement, params.spaceStyle === "default");

  const { start, end } = getTimeDelimiters(cueElement, params);
  const cue = makeCue(start + offset, end + offset, content);
  if (!cue) {
    return null;
  }

  // Get other properties if available
  const divs = getParentElementsByTagName(cueElement, "div");
  const bodies = getParentElementsByTagName(cueElement, "body");
  addStyle(cue, cueElement, divs, bodies, regions, styles);

  return cue;
}

/**
 * Insert \n where <br> tags are found
 * /!\ Mutates the given element
 * @param {Node} element
 * @param {boolean} whitespaceTrim
 */
function addNewLines(element, whitespaceTrim) {
  const childNodes = element.childNodes;

  for (let i = 0; i < childNodes.length; i++) {
    if (childNodes[i].nodeName === "br" && i > 0) {
      childNodes[i - 1].textContent += "\n";
    } else if (childNodes[i].childNodes.length > 0) {
      addNewLines(childNodes[i], whitespaceTrim);
    } else if (whitespaceTrim) {
      // Trim leading and trailing whitespace.
      let trimmed = (childNodes[i].textContent || "").trim();
      // Collapse multiple spaces into one.
      trimmed = trimmed.replace(/\s+/g, " ");

      childNodes[i].textContent = trimmed;
    }
  }
}

/**
 * Adds applicable style properties to a cue.
 * /!\ Mutates cue argument.
 * @param {TextTrackCue} cue
 * @param {Element} cueElement
 * @param {Array.<Element>} divs
 * @param {Array.<Element>} bodies
 * @param {Array.<Element>} regions
 * @param {Array.<Element>} styles
 */
function addStyle(cue, cueElement, divs, bodies, regions, styles) {
  let results = null;

  const areasToLookForStyle = [cueElement, ...divs, ...bodies];

  const extent = getStyleValue("extent", styles, regions, areasToLookForStyle);
  if (extent) {
    results = REGXP_PERCENT_VALUES.exec(extent);
    if (results != null) {
      // Use width value of the extent attribute for size.
      // Height value is ignored.
      cue.size = Number(results[1]);
    }
  }

  const writingMode =
    getStyleValue("writingMode", styles, regions, areasToLookForStyle);
  let isVerticalText = true;
  if (writingMode === "tb" || writingMode === "tblr") {
    cue.vertical = "lr";
  } else if (writingMode === "tbrl") {
    cue.vertical = "rl";
  } else {
    isVerticalText = false;
  }

  const origin = getStyleValue("origin", styles, regions, areasToLookForStyle);
  if (origin) {
    results = REGXP_PERCENT_VALUES.exec(origin);
    if (results != null) {
      // for vertical text use first coordinate of tts:origin
      // to represent line of the cue and second - for position.
      // Otherwise (horizontal), use them the other way around.
      if (isVerticalText) {
        // TODO check and uncomment
        // cue.position = Number(results[2]);
        // cue.line = Number(results[1]);
      } else {
        // TODO check and uncomment
        // cue.position = Number(results[1]);
        // cue.line = Number(results[2]);
      }
      // A boolean indicating whether the line is an integer
      // number of lines (using the line dimensions of the first
      // line of the cue), or whether it is a percentage of the
      // dimension of the video. The flag is set to true when lines
      // are counted, and false otherwise.
      // TODO check and uncomment
      // cue.snapToLines = false;
    }
  }

  const align = getStyleValue("align", styles, regions, areasToLookForStyle);
  if (align) {
    cue.align = align;
    if (align === "center") {
      if (cue.align !== "center") {
        // Workaround for a Chrome bug http://crbug.com/663797
        // Chrome does not support align = "center"
        cue.align = "middle";
      }
      cue.position = "auto";
    }
    cue.positionAlign = TEXT_ALIGN_TO_POSITION_ALIGN[align] || "";
    cue.lineAlign = TEXT_ALIGN_TO_LIGN_ALIGN[align] || "";
  }
}

export default parseTTMLStringToVTT;
