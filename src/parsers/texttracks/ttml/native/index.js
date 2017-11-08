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

import objectAssign from "object-assign";
import { makeCue } from "../../../../compat";

import {
  REGXP_PERCENT_VALUES,
} from "../regexps";
import {
  getBodyNode,
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
} from "../nodes";
import getParameters from "../getParameters";
import { getStylingAttributes, getStylingFromElement } from "../style";
import getParentElementsByTagName from "../getParentElementsByTagName";
import getTimeDelimiters from "../getTimeDelimiters";

/**
 * Style attributes currently used.
 */
const WANTED_STYLE_ATTRIBUTES = [
  "extent",
  "writingMode",
  "origin",
  "align",
];

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

/**
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<VTTCue>}
 */
function parseTTMLStringToVTT(str, timeOffset) {
  const ret = [];
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
    const styles = [];
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
    const regions = [];
    for (let i = 0; i <= regionNodes.length - 1; i++) {
      const regionNode = regionNodes[i];
      if (regionNode instanceof Element) {
        const regionID = regionNode.getAttribute("xml:id");
        if (regionID != null) {
          let regionStyle = getStylingFromElement(regionNode);

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
    const bodyStyle = body ?
      getStylingAttributes(WANTED_STYLE_ATTRIBUTES, [body], styles, regions) :
      getStylingAttributes(WANTED_STYLE_ATTRIBUTES, [], styles, regions);

    for (let i = 0; i < textNodes.length; i++) {
      const paragraph = textNodes[i];
      if (paragraph instanceof Element) {
        const divs = getParentElementsByTagName(paragraph , "div");
        const paragraphStyle = objectAssign({}, bodyStyle,
          getStylingAttributes(
            WANTED_STYLE_ATTRIBUTES, [paragraph, ...divs], styles, regions)
        );

        const cue = parseCue(
          paragraph,
          timeOffset,
          styles,
          regions,
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

/**
 * Parses an Element into a TextTrackCue or VTTCue.
 * /!\ Mutates the given cueElement Element
 * @param {Element} paragraph
 * @param {Number} offset
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @param {Object} paragraphStyle
 * @param {Object} params
 * @returns {TextTrackCue|null}
 */
function parseCue(paragraph, offset, styles, regions, paragraphStyle, params) {
  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If paragraph has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  if (!paragraph.hasAttribute("begin") && !paragraph.hasAttribute("end") &&
    /^\s*$/.test(paragraph.textContent || "")
  ) {
    return null;
  }

  const { start, end } = getTimeDelimiters(paragraph, params);
  const text = generateTextContent(paragraph, params.spaceStyle === "default");
  const cue = makeCue(start + offset, end + offset, text);
  if (!cue) {
    return null;
  }
  if (cue instanceof VTTCue) {
    addStyle(cue, paragraphStyle);
  }
  return cue;
}

/**
 * Generate text to display for a given paragraph.
 * @param {Element} paragraph - The <p> tag.
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {string}
 */
function generateTextContent(paragraph, shouldTrimWhiteSpace) {
  /**
   * Recursive function, taking a node in argument and returning the
   * corresponding string.
   * @param {Node} node - the node in question
   * @returns {string}
   */
  function loop(node) {
    const childNodes = node.childNodes;
    let text = "";
    for (let i = 0; i < childNodes.length; i++) {
      const currentNode = childNodes[i];
      if (currentNode.nodeName === "#text") {
        let textContent = currentNode.textContent || "";

        // TODO Also parse it from parent elements
        // const spaceAttr = getAttribute("xml:space", [
        //   ...spans, p, ...divs, body,
        // ]);
        // const shouldTrimWhiteSpace = spaceAttr ?
        //   spaceAttr === "default" : shouldTrimWhiteSpaceParam;
        if (shouldTrimWhiteSpace) {
          // 1. Trim leading and trailing whitespace.
          // 2. Collapse multiple spaces into one.
          let trimmed = textContent.trim();
          trimmed = trimmed.replace(/\s+/g, " ");
          textContent = trimmed;
        }
        text += textContent;
      } else if (currentNode.nodeName === "br") {
        text += "\n";
      } else if (
        currentNode.nodeName === "span" &&
        currentNode.childNodes.length > 0
      ) {
        text += loop(currentNode);
      }
    }
    return text;
  }
  return loop(paragraph);
}

/**
 * Adds applicable style properties to a cue.
 * /!\ Mutates cue argument.
 * @param {VTTCue} cue
 * @param {Object} style
 */
function addStyle(cue, style) {
  const extent = style.extent;
  if (extent) {
    const results = REGXP_PERCENT_VALUES.exec(extent);
    if (results != null) {
      // Use width value of the extent attribute for size.
      // Height value is ignored.
      cue.size = Number(results[1]);
    }
  }

  const writingMode = style.writingMode;
  let isVerticalText = true;
  if (writingMode === "tb" || writingMode === "tblr") {
    cue.vertical = "lr";
  } else if (writingMode === "tbrl") {
    cue.vertical = "rl";
  } else {
    isVerticalText = false;
  }

  const origin = style.origin;
  if (origin) {
    const results = REGXP_PERCENT_VALUES.exec(origin);
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

  const align = style.align;
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
