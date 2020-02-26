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
import arrayFind from "../../../../utils/array_find";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import objectAssign from "../../../../utils/object_assign";
import getParameters, {
  ITTParameters,
} from "../get_parameters";
import getParentElementsByTagName from "../get_parent_elements_by_tag_name";
import {
  getStylingAttributes,
  getStylingFromElement,
  IStyleList,
  IStyleObject,
} from "../get_styling";
import getTimeDelimiters from "../get_time_delimiters";
import {
  getBodyNode,
  getRegionNodes,
  getStyleNodes,
  getTextNodes,
} from "../nodes";
import { REGXP_PERCENT_VALUES, } from "../regexps";
import resolveStylesInheritance from "../resolve_styles_inheritance";

/**
 * Style attributes currently used.
 */
const WANTED_STYLE_ATTRIBUTES = [
  "extent",
  "writingMode",
  "origin",
  "align",
];

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
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
function parseTTMLStringToVTT(
  str : string,
  timeOffset : number
) : Array<ICompatVTTCue|TextTrackCue> {
  const ret : Array<ICompatVTTCue|TextTrackCue> = [];
  const xml = new DOMParser().parseFromString(str, "text/xml");

  if (xml !== null && xml !== undefined) {
    const tts = xml.getElementsByTagName("tt");
    const tt = tts[0];
    if (tt === undefined) {
      throw new Error("invalid XML");
    }

    const body = getBodyNode(tt);
    const styleNodes = getStyleNodes(tt);
    const regionNodes = getRegionNodes(tt);
    const paragraphNodes = getTextNodes(tt);
    const params = getParameters(tt);

    // construct styles array based on the xml as an optimization
    const styles : IStyleObject[] = [];
    for (let i = 0; i <= styleNodes.length - 1; i++) {
      // TODO styles referencing other styles
      const styleNode = styleNodes[i];
      if (styleNode instanceof Element) {
        const styleID = styleNode.getAttribute("xml:id");
        if (styleID != null) {
          const subStyles = styleNode.getAttribute("style");
          const extendsStyles = subStyles === null ? [] :
                                                     subStyles.split(" ");
          styles.push({ id: styleID,
                        style: getStylingFromElement(styleNode),
                        extendsStyles });
        }
      }
    }

    resolveStylesInheritance(styles);

    // construct regions array based on the xml as an optimization
    const regions : IStyleObject[] = [];
    for (let i = 0; i <= regionNodes.length - 1; i++) {
      const regionNode = regionNodes[i];
      if (regionNode instanceof Element) {
        const regionID = regionNode.getAttribute("xml:id");
        if (regionID != null) {
          let regionStyle = getStylingFromElement(regionNode);

          const associatedStyle = regionNode.getAttribute("style");
          if (isNonEmptyString(associatedStyle)) {
            const style = arrayFind(styles, (x) => x.id === associatedStyle);
            if (style !== undefined) {
              regionStyle = objectAssign({}, style.style, regionStyle);
            }
          }
          regions.push({ id: regionID,
                         style: regionStyle,

                         // already handled
                         extendsStyles: [] });
        }
      }
    }

    // Computing the style takes a lot of ressources.
    // To avoid too much re-computation, let's compute the body style right
    // now and do the rest progressively.
    const bodyStyle = body !== null ?
      getStylingAttributes(WANTED_STYLE_ATTRIBUTES, [body], styles, regions) :
      getStylingAttributes(WANTED_STYLE_ATTRIBUTES, [], styles, regions);

    const bodySpaceAttribute = body !== null ? body.getAttribute("xml:space") :
                                               undefined;
    const shouldTrimWhiteSpaceOnBody =
      bodySpaceAttribute === "default" || params.spaceStyle === "default";

    for (let i = 0; i < paragraphNodes.length; i++) {
      const paragraph = paragraphNodes[i];
      if (paragraph instanceof Element) {
        const divs = getParentElementsByTagName(paragraph , "div");
        const paragraphStyle = objectAssign({}, bodyStyle,
          getStylingAttributes(
            WANTED_STYLE_ATTRIBUTES, [paragraph, ...divs], styles, regions)
        );

        const paragraphSpaceAttribute = paragraph.getAttribute("xml:space");
        const shouldTrimWhiteSpaceOnParagraph =
          isNonEmptyString(paragraphSpaceAttribute) ? paragraphSpaceAttribute === "default" :
                                                      shouldTrimWhiteSpaceOnBody;

        const cue = parseCue(paragraph,
                             timeOffset,
                             styles,
                             regions,
                             paragraphStyle,
                             params,
                             shouldTrimWhiteSpaceOnParagraph);
        if (cue !== null) {
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
 * @param {Boolean} shouldTrimWhiteSpaceOnParagraph
 * @returns {TextTrackCue|null}
 */
function parseCue(
  paragraph : Element,
  offset : number,
  _styles : IStyleObject[],
  _regions : IStyleObject[],
  paragraphStyle : IStyleList,
  params : ITTParameters,
  shouldTrimWhiteSpace : boolean
) : ICompatVTTCue|TextTrackCue|null {
  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If paragraph has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  if (!paragraph.hasAttribute("begin") && !paragraph.hasAttribute("end") &&
      /^\s*$/.test(paragraph.textContent === null ? "" : paragraph.textContent)
  ) {
    return null;
  }

  const { start, end } = getTimeDelimiters(paragraph, params);
  const text = generateTextContent(paragraph, shouldTrimWhiteSpace);
  const cue = makeVTTCue(start + offset, end + offset, text);
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
      } else if (currentNode.nodeName === "br") {
        text += "\n";
      } else if (
        currentNode.nodeName === "span" &&
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

export default parseTTMLStringToVTT;
