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

import getRateInfos from "../getRateInfos.js";
import getElementToApplyFromCollection from "../getElementToApplyFromCollection.js";
import {
  REGXP_PERCENT_VALUES,
  TEXT_ALIGN_TO_LIGN_ALIGN,
  TEXT_ALIGN_TO_POSITION_ALIGN,
} from "../constants.js";
import parseTime from "../time_parsing.js";
import getLeafNodes from "../getLeafNodes.js";
import getParameters from "../getParameters.js";
import {
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
} from "../nodes.js";

function parseTTMLStringToVTT(str) {
  const ret = [];
  const xml = new DOMParser().parseFromString(str, "text/xml");

  if (xml) {
    const tts = xml.getElementsByTagName("tt");
    const tt = tts[0];
    if (!tt) {
      throw new Error("invalid XML");
    }

    const params = getParameters(tt);
    const shouldTrimWhiteSpace = params.spaceStyle == "default";
    const rateInfo = getRateInfos(params);

    const styles = getStyleNodes(tt);
    const regions = getRegionNodes(tt);
    const textNodes = getTextNodes(tt);

    for (let i = 0; i < textNodes.length; i++) {
      const cue = parseCue(
        textNodes[i],
        0, // offset
        rateInfo,
        styles,
        regions,
        shouldTrimWhiteSpace
      );
      if (cue) {
        ret.push(cue);
      }
    }
  }

  return ret;
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
    if (childNodes[i].nodeName == "br" && i > 0) {
      childNodes[i - 1].textContent += "\n";
    } else if (childNodes[i].childNodes.length > 0) {
      addNewLines(childNodes[i], whitespaceTrim);
    } else if (whitespaceTrim) {
      // Trim leading and trailing whitespace.
      let trimmed = childNodes[i].textContent.trim();
      // Collapse multiple spaces into one.
      trimmed = trimmed.replace(/\s+/g, " ");

      childNodes[i].textContent = trimmed;
    }
  }
}

/**
 * Parses an Element into a TextTrackCue or VTTCue.
 * /!\ Mutates the given cueElement Element
 * @param {Element} cueElement
 * @param {Number} offset
 * @param {Object} rateInfo
 * @param {Array.<Element>} styles
 * @param {Array.<Element>} regions
 * @param {Boolean} whitespaceTrim
 * @returns {TextTrackCue|null}
 */
function parseCue(
  cueElement,
  offset,
  rateInfo,
  styles,
  regions,
  whitespaceTrim
) {
  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If cueElement has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  if (!cueElement.hasAttribute("begin") &&
    !cueElement.hasAttribute("end") &&
    /^\s*$/.test(cueElement.textContent)) {
    return null;
  }

  // /!\ Mutates cueElement
  addNewLines(cueElement, whitespaceTrim);

  // Get time
  let start = parseTime(cueElement.getAttribute("begin"), rateInfo);
  let end = parseTime(cueElement.getAttribute("end"), rateInfo);
  const duration = parseTime(cueElement.getAttribute("dur"), rateInfo);
  const payload = cueElement.textContent;

  if (end == null && duration != null) {
    end = start + duration;
  }

  if (start == null || end == null) {
    throw new Error("Invalid text cue");
    // throw new shaka.util.Error(
    //   shaka.util.Error.Severity.CRITICAL,
    //   shaka.util.Error.Category.TEXT,
    //   shaka.util.Error.Code.INVALID_TEXT_CUE);
  }

  start += offset;
  end += offset;

  const cue = makeCue(start, end, payload);
  if (!cue) {
    return null;
  }

  // Get other properties if available
  const region = getElementToApplyFromCollection("region", cueElement, regions);
  addStyle(cue, cueElement, region, styles);

  return cue;
}

/**
 * Adds applicable style properties to a cue.
 * /!\ Mutates cue argument.
 * @param {TextTrackCue} cue
 * @param {Element} cueElement
 * @param {Element} region
 * @param {Array.<!Element>} styles
 */
function addStyle(cue, cueElement, region, styles) {
  let results = null;
  const extent = getStyleAttribute(cueElement, region, styles, "tts:extent");
  if (extent) {
    results = REGXP_PERCENT_VALUES.exec(extent);
    if (results != null) {
      // Use width value of the extent attribute for size.
      // Height value is ignored.
      cue.size = Number(results[1]);
    }
  }

  const writingMode = getStyleAttribute(
    cueElement, region, styles, "tts:writingMode");
  let isVerticalText = true;
  if (writingMode == "tb" || writingMode == "tblr") {
    cue.vertical = "lr";
  } else if (writingMode == "tbrl") {
    cue.vertical = "rl";
  } else {
    isVerticalText = false;
  }

  const origin = getStyleAttribute(cueElement, region, styles, "tts:origin");
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

  const align = getStyleAttribute(cueElement, region, styles, "tts:textAlign");
  if (align) {
    cue.align = align;
    if (align == "center") {
      if (cue.align != "center") {
        // Workaround for a Chrome bug http://crbug.com/663797
        // Chrome does not support align = "center"
        cue.align = "middle";
      }
      cue.position = "auto";
    }
    cue.positionAlign = TEXT_ALIGN_TO_POSITION_ALIGN[align];
    cue.lineAlign = TEXT_ALIGN_TO_LIGN_ALIGN[align];
  }
}

/**
 * Finds a specified attribute on either the original cue element or its
 * associated region and returns the value if the attribute was found.
 * @param {Element} cueElement
 * @param {Element} region
 * @param {Array.<!Element>} styles
 * @param {string} attribute
 * @returns {string|null}
 */
function getStyleAttribute(cueElement, region, styles, attribute) {
  // An attribute can be specified on region level or in a styling block
  // associated with the region or original element.
  const regionChildren = getLeafNodes(region);
  for (let i = 0; i < regionChildren.length; i++) {
    const attr = regionChildren[i].getAttribute(attribute);
    if (attr) {
      return attr;
    }
  }

  const style = getElementToApplyFromCollection("style", region, styles) ||
    getElementToApplyFromCollection("style", cueElement, styles);
  if (style) {
    return style.getAttribute(attribute);
  }
  return null;
}

export default parseTTMLStringToVTT;
