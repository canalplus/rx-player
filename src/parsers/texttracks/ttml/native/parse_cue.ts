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

import {
  ICompatVTTCue,
  isVTTCue,
  makeVTTCue,
} from "../../../../compat";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import {
  IStyleList,
} from "../get_styling";
import getTimeDelimiters from "../get_time_delimiters";
import { IParsedTTMLCue } from "../parse_ttml";
import { REGXP_PERCENT_VALUES } from "../regexps";
import {
  isLineBreakElement,
  isSpanElement,
} from "../xml_utils";

const TEXT_ALIGN_TO_LIGN_ALIGN : Partial<Record<string, string>> = {
  left: "start",
  center: "center",
  right: "end",
  start: "start",
  end: "end",
};

/**
 * @type {Object}
 */
const TEXT_ALIGN_TO_POSITION_ALIGN : Partial<Record<string, string>> = {
  left: "line-left",
  center: "center",
  right: "line-right",
};

/**
 * Parses an Element into a TextTrackCue or VTTCue.
 * /!\ Mutates the given cueElement Element
 * @param {Element} paragraph
 * @param {Number} offset
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @param {Object} paragraphStyle
 * @param {Object} ttParams
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {TextTrackCue|null}
 */
export default function parseCue(
  parsedCue: IParsedTTMLCue
) : ICompatVTTCue|TextTrackCue|null {
  const {
    paragraph,
    timeOffset,
    paragraphStyle,
    ttParams,
    shouldTrimWhiteSpace,
  } = parsedCue;

  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If paragraph has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  if (!paragraph.hasAttribute("begin") && !paragraph.hasAttribute("end") &&
      /^\s*$/.test(paragraph.textContent === null ? "" : paragraph.textContent)
  ) {
    return null;
  }

  const { start, end } = getTimeDelimiters(paragraph, ttParams);
  const text = generateTextContent(paragraph, shouldTrimWhiteSpace);
  const cue = makeVTTCue(start + timeOffset, end + timeOffset, text);
  if (cue === null) {
    return null;
  }
  if (isVTTCue(cue)) {
    addStyle(cue, paragraphStyle);
  }
  return cue;
}

/**
 * Generate text to display for a given paragraph.
 * @param {Element} paragraph - The <p> tag.
 * @param {Boolean} shouldTrimWhiteSpaceForParagraph
 * @returns {string}
 */
function generateTextContent(
  paragraph : Element,
  shouldTrimWhiteSpaceForParagraph : boolean
) : string {
  /**
   * Recursive function, taking a node in argument and returning the
   * corresponding string.
   * @param {Node} node - the node in question
   * @returns {string}
   */
  function loop(
    node : Node,
    shouldTrimWhiteSpaceFromParent : boolean
  ) : string {
    const childNodes = node.childNodes;
    let text = "";
    for (let i = 0; i < childNodes.length; i++) {
      const currentNode = childNodes[i];
      if (currentNode.nodeName === "#text") {
        let textContent = currentNode.textContent;
        if (textContent === null) {
          textContent = "";
        }

        if (shouldTrimWhiteSpaceFromParent) {
          // 1. Trim leading and trailing whitespace.
          // 2. Collapse multiple spaces into one.
          let trimmed = textContent.trim();
          trimmed = trimmed.replace(/\s+/g, " ");
          textContent = trimmed;
        }

        // DOM Parser turns HTML escape caracters into caracters,
        // that may be misinterpreted by VTTCue API (typically, less-than sign
        // and greater-than sign can be interpreted as HTML tags signs).
        // Original escaped caracters must be conserved.
        const escapedTextContent = textContent
          .replace(/&|\u0026/g, "&amp;")
          .replace(/<|\u003C/g, "&lt;")
          .replace(/>|\u2265/g, "&gt;")
          .replace(/\u200E/g, "&lrm;")
          .replace(/\u200F/g, "&rlm;")
          .replace(/\u00A0/g, "&nbsp;");

        text += escapedTextContent;
      } else if (isLineBreakElement(currentNode)) {
        text += "\n";
      } else if (
        isSpanElement(currentNode) &&
        currentNode.nodeType === Node.ELEMENT_NODE &&
        currentNode.childNodes.length > 0
      ) {
        const spaceAttribute = (currentNode as Element).getAttribute("xml:space");
        const shouldTrimWhiteSpaceForSpan = isNonEmptyString(spaceAttribute) ?
          spaceAttribute === "default" :
          shouldTrimWhiteSpaceFromParent;

        text += loop(currentNode, shouldTrimWhiteSpaceForSpan);
      }
    }
    return text;
  }
  return loop(paragraph, shouldTrimWhiteSpaceForParagraph);
}

/**
 * Adds applicable style properties to a cue.
 * /!\ Mutates cue argument.
 * @param {VTTCue} cue
 * @param {Object} style
 */
function addStyle(cue : ICompatVTTCue, style : IStyleList) {
  const extent = style.extent;
  if (isNonEmptyString(extent)) {
    const results = REGXP_PERCENT_VALUES.exec(extent);
    if (results != null) {
      // Use width value of the extent attribute for size.
      // Height value is ignored.
      cue.size = Number(results[1]);
    }
  }

  const writingMode = style.writingMode;
  // let isVerticalText = true;
  switch (writingMode) {
    case "tb":
    case "tblr":
      cue.vertical = "lr";
      break;
    case "tbrl":
      cue.vertical = "rl";
      break;
    default:
      // isVerticalText = false;
      break;
  }

  const origin = style.origin;
  if (isNonEmptyString(origin)) {
    const results = REGXP_PERCENT_VALUES.exec(origin);
    if (results != null) {
      // for vertical text use first coordinate of tts:origin
      // to represent line of the cue and second - for position.
      // Otherwise (horizontal), use them the other way around.
      // if (isVerticalText) {
        // TODO check and uncomment
        // cue.position = Number(results[2]);
        // cue.line = Number(results[1]);
      // } else {
        // TODO check and uncomment
        // cue.position = Number(results[1]);
        // cue.line = Number(results[2]);
      // }
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
  if (isNonEmptyString(align)) {
    cue.align = align;
    if (align === "center") {
      if (cue.align !== "center") {
        // Workaround for a Chrome bug http://crbug.com/663797
        // Chrome does not support align = "center"
        cue.align = "middle";
      }
      cue.position = "auto";
    }

    const positionAlign = TEXT_ALIGN_TO_POSITION_ALIGN[align];
    cue.positionAlign = positionAlign === undefined ? "" :
                                                      positionAlign;

    const lineAlign = TEXT_ALIGN_TO_LIGN_ALIGN[align];
    cue.lineAlign = lineAlign === undefined ? "" :
                                              lineAlign;
  }
}
