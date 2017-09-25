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

import { makeCue } from "../../../compat";
import assert from "../../../utils/assert.js";
import {
  REGXP_PERCENT_VALUES,
  TEXT_ALIGN_TO_LIGN_ALIGN,
  TEXT_ALIGN_TO_POSITION_ALIGN,
} from "./constants.js";
import parseTime from "./time_parsing.js";

/**
 * XXX Delete
 */
const arr = [];
window.arr = arr;

function parseTTMLStringToVTT(str) {
  arr.push(str);
  const ret = [];
  const parser = new DOMParser();
  let xml = null;

  try {
    xml = parser.parseFromString(str, "text/xml");
  } catch (exception) {
    throw exception;
    // throw new shaka.util.Error(
    //   shaka.util.Error.Severity.CRITICAL,
    //   shaka.util.Error.Category.TEXT,
    //   shaka.util.Error.Code.INVALID_XML);
  }

  if (xml) {
    // Try to get the framerate, subFrameRate and frameRateMultiplier
    // if applicable
    let frameRate = null;
    let subFrameRate = null;
    let frameRateMultiplier = null;
    let tickRate = null;
    let spaceStyle = null;
    const tts = xml.getElementsByTagName("tt");
    const tt = tts[0];
    // TTML should always have tt element
    if (!tt) {
      throw new Error("invalid XML");
      // throw new shaka.util.Error(
      //   shaka.util.Error.Severity.CRITICAL,
      //   shaka.util.Error.Category.TEXT,
      //   shaka.util.Error.Code.INVALID_XML);
    } else {
      frameRate = tt.getAttribute("ttp:frameRate");
      subFrameRate = tt.getAttribute("ttp:subFrameRate");
      frameRateMultiplier = tt.getAttribute("ttp:frameRateMultiplier");
      tickRate = tt.getAttribute("ttp:tickRate");
      spaceStyle = tt.getAttribute("xml:space") || "default";
    }

    if (spaceStyle != "default" && spaceStyle != "preserve") {
      throw new Error("invalid XML");
      // throw new shaka.util.Error(
      //   shaka.util.Error.Severity.CRITICAL,
      //   shaka.util.Error.Category.TEXT,
      //   shaka.util.Error.Code.INVALID_XML);
    }
    const whitespaceTrim = spaceStyle == "default";

    const rateInfo = getRateInfos(
      frameRate, subFrameRate, frameRateMultiplier, tickRate);

    const styles = getLeafNodes(tt.getElementsByTagName("styling")[0]);
    const regions = getLeafNodes(tt.getElementsByTagName("layout")[0]);
    const textNodes = getLeafNodes(tt.getElementsByTagName("body")[0]);

    for (let i = 0; i < textNodes.length; i++) {
      const cue = parseCue(
        textNodes[i], // cueElement
        0 /* time.periodStart */, // offset
        rateInfo,
        styles,
        regions,
        whitespaceTrim
      );
      if (cue) {
        ret.push(cue);
      }
    }
  }

  return ret;
}

/**
 * Gets leaf nodes of the xml node tree. Ignores the text, br elements
 * and the spans positioned inside paragraphs
 *
 * @param {Element} element
 * @throws Error - Throws if one of the childNode is not an element instance.
 * @throws Error - Throws if a children Element has no leaf.
 * @returns {Array.<Element>}
 */
function getLeafNodes(element) {
  let result = [];
  if (!element) {
    return result;
  }

  const childNodes = element.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    // TODO Currently we don't support styles applicable to span
    // elements, so they are ignored
    const isSpanChildOfP = childNodes[i].nodeName == "span" &&
      element.nodeName == "p";

    if (childNodes[i].nodeType == Node.ELEMENT_NODE &&
      childNodes[i].nodeName != "br" && !isSpanChildOfP) {
      // Get the leafs the child might contain
      assert(childNodes[i] instanceof Element,
        "Node should be Element!");
      const leafChildren = getLeafNodes(childNodes[i]);
      assert(leafChildren.length > 0,
        "Only a null Element should return no leaves");
      result = result.concat(leafChildren);
    }
  }

  // if no result at this point, the element itself must be a leaf
  if (!result.length) {
    result.push(element);
  }
  return result;
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
  const region = getElementFromCollection(cueElement, "region", regions);
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

  const style = getElementFromCollection(region, "style", styles) ||
    getElementFromCollection(cueElement, "style", styles);
  if (style) {
    return style.getAttribute(attribute);
  }
  return null;
}

/**
 * Selects an item from |collection| whose id matches |attributeName|
 * from |element|.
 * @param {Element} element
 * @param {string} attributeName
 * @param {Array.<Element>} collection
 * @returns {Element|null}
 */
function getElementFromCollection(element, attributeName, collection) {
  if (!element || collection.length < 1) {
    return null;
  }
  let item = null;
  const itemName = getInheritedAttribute(element, attributeName);
  if (itemName) {
    for (let i = 0; i < collection.length; i++) {
      if (collection[i].getAttribute("xml:id") == itemName) {
        item = collection[i];
        break;
      }
    }
  }

  return item;
}

/**
 * Traverses upwards from a given node until a given attribute is found.
 * @param {Element} element
 * @param {string} attributeName
 * @returns {string|null}
 */
function getInheritedAttribute(element, attributeName) {
  let ret = null;
  while (element) {
    ret = element.getAttribute(attributeName);
    if (ret) {
      break;
    }

    // Element.parentNode can lead to XMLDocument, which is not an Element and
    // has no getAttribute().
    const parentNode = element.parentNode;
    if (parentNode instanceof Element) {
      element = parentNode;
    } else {
      break;
    }
  }
  return ret;
}

/**
 * Returns information about frame/subframe rate and frame rate multiplier for
 * time in frame format.
 * ex. 01:02:03:04(4 frames) or 01:02:03:04.1(4 frames, 1 subframe)
 *
 * The returned variable is an object with the following properties:
 *   - frameRate {Number}
 *   - subFrameRate {Number}
 *   - tickRate {Number}
 * @param {string} [frameRate]
 * @param {string} [subFrameRate]
 * @param {string} [frameRateMultiplier]
 * @param {string} [tickRate]
 * @returns {Object}
 */
function getRateInfos(frameRate, subFrameRate, frameRateMultiplier, tickRate) {
  const nbFrameRate = Number(frameRate) || 30;
  const nbSubFrameRate = Number(subFrameRate) || 1;
  const nbTickRate = Number(tickRate);

  const ret = {
    subFrameRate: nbSubFrameRate,
  };

  if (nbTickRate == 0) {
    ret.tickRate === nbFrameRate ? nbFrameRate * nbSubFrameRate : 1;
  }

  if (frameRateMultiplier) {
    const multiplierResults = /^(\d+) (\d+)$/g.exec(frameRateMultiplier);
    if (multiplierResults) {
      const numerator = multiplierResults[1];
      const denominator = multiplierResults[2];
      const multiplierNum = numerator / denominator;
      ret.frameRate = nbFrameRate * multiplierNum;
    } else {
      ret.frameRate = nbFrameRate;
    }
  } else {
    ret.frameRate = nbFrameRate;
  }

  return ret;
}

export default parseTTMLStringToVTT;
