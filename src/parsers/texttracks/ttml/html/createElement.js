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
  REGXP_PERCENT_VALUES,
} from "../regexps.js";
import getParentElementsByTagName from "../getParentElementsByTagName.js";
import getStyleValue from "../getStyleValue.js";

import ttmlColorToCSSColor from "./ttmlColorToCSSColor.js";

// TODO
// tts:showBackground (applies to region)
//
// tts:textOutline (applies to span)
// // use text-shadow?
// text-shadow: -1px -1px 0 #000,
//              1px -1px 0 #000,
//              -1px 1px 0 #000,
//              1px 1px 0 #000;
//
// tts:wrapOption (applies to span)
//
// tts:zIndex (applies to region)

/**
 * Apply style set for a singular text span of the current cue.
 * @param {Element} element - The text span
 * @param {Array.<Element>} elementsToInherit - The various elements our text
 * span can inherit styling from, in order of importance.
 * @param {Array.<Element>} regions - <region> tags our element can depend on
 * @param {Array.<Element>} styles - <style> tags our element can depend on
 */
function applyTextStyle(element, elementsToInherit, styles, regions) {
  function getInheritedStyle(styleName) {
    return getStyleValue(styleName, styles, regions, elementsToInherit);
  }

  // applies to span
  const color = getInheritedStyle("color");
  if (color) {
    element.style.color = ttmlColorToCSSColor(color);
  }

  // applies to span
  const textDecoration = getInheritedStyle("textDecoration");
  if (textDecoration) {
    if (
      textDecoration === "noUnderline" || textDecoration === "noLineThrough" ||
      textDecoration === "noOverline"
    ) {
      element.style.textDecoration = "none";
    } else if (textDecoration === "lineThrough") {
      element.style.textDecoration = "line-through";
    } else {
      element.style.textDecoration = textDecoration;
    }
  }

  // applies to span
  const fontFamily = getInheritedStyle("fontFamily");
  if (fontFamily) {
    switch (fontFamily) {

    case "proportionalSansSerif":
      element.style.fontFamily =
          "Arial, Helvetica, Liberation Sans, sans-serif";
      break;

    // TODO monospace or sans-serif or font with both?
    case "monospaceSansSerif":
    case "sansSerif":
      element.style.fontFamily = "sans-serif";
      break;

    case "monospaceSerif":
    case "default":
      element.style.fontFamily = "Courier New, Liberation Mono, monospace";
      break;

    // TODO font with both?
    case "proportionalSerif":
      element.style.fontFamily = "serif";
      break;

    default:
      element.style.fontFamily = fontFamily;
    }
  }

  // applies to span
  const fontStyle = getInheritedStyle("fontStyle");
  if (fontStyle) {
    element.style.fontStyle = fontStyle;
  }

  // applies to span
  const fontWeight = getInheritedStyle("fontWeight");
  if (fontWeight) {
    element.style.fontWeight = fontWeight;
  }

  // applies to span
  const fontSize = getInheritedStyle("fontSize");
  if (fontSize) {
    // TODO Check if formats are always really 1:1
    element.style.fontSize = fontSize;
  }

  // applies to p, span
  const direction = getInheritedStyle("direction");
  if (direction) {
    element.style.direction = direction;
  }

  // applies to p, span
  const unicodeBidi = getInheritedStyle("unicodeBidi");
  if (unicodeBidi) {
    switch (unicodeBidi) {
    case "bidiOverride":
      element.style.unicodeBidi = "bidi-override";
      break;
    case "embed":
      element.style.unicodeBidi = "embed";
      break;
    default:
      element.style.unicodeBidi = "normal";
    }
  }

  // applies to body, div, p, region, span
  const visibility = getInheritedStyle("visibility");
  if (visibility) {
    element.style.visibility = visibility;
  }

  // applies to body, div, p, region, span
  const display = getInheritedStyle("display");
  if (display === "none") {
    element.style.display = "none";
  }
}

/**
 * Apply style for the general text track div.
 * @param {Element} element - The <div> the style will be applied on.
 * @param {Array.<Element>} elementsToInherit - The different elements the style
 * can be inherited from. In order of importance.
 * @param {Array.<Element>} regions - <region> tags our element can depend on
 * @param {Array.<Element>} styles - <style> tags our element can depend on
 */
function applyGeneralStyle(element, elementsToInherit, regions, styles) {
  function getInheritedStyle(styleName) {
    return getStyleValue(styleName, styles, regions, elementsToInherit);
  }

  // applies to tt, region
  const extent = getInheritedStyle("extent");
  if (extent) {
    const results = REGXP_PERCENT_VALUES.exec(extent);
    if (results != null) {
      element.style.width = results[1] + "%";
      element.style.height = results[2] + "%";
    }
  }

  // applies to region
  const writingMode = getInheritedStyle("writingMode");
  if (writingMode) {
    // TODO
  }

  // applies to region
  const overflow = getInheritedStyle("overflow");
  if (overflow) {
    element.style.overflow = overflow;
  }

  // applies to region
  const padding = getInheritedStyle("padding");
  if (padding) {
    element.style.padding = padding;
  }

  // applies to region
  const origin = getInheritedStyle("origin");
  if (origin) {
    const resultsPercent = REGXP_PERCENT_VALUES.exec(origin);
    if (resultsPercent != null) {
      element.style.position = "relative";
      element.style.left = resultsPercent[1] + "%";
      element.style.top = resultsPercent[2] + "%";
    } else {
      // TODO also px
    }
  }

  // applies to p
  const lineHeight = getInheritedStyle("lineHeight");
  if (lineHeight) {
    element.style.lineHeight = lineHeight;
  }

  // applies to p
  const textAlign = getInheritedStyle("textAlign");
  if (textAlign) {
    if (textAlign === "center") {
      element.style.textAlign = "center";
    } else if (textAlign === "left" || textAlign === "start") {
      // TODO check what start means (difference with left, writing direction?)
      element.style.textAlign = "left";
    } else if (textAlign === "right" || textAlign === "end") {
      // TODO check what end means (difference with right, writing direction?)
      element.style.textAlign = "right";
    }
  }

  // applies to region
  const displayAlign = getInheritedStyle("displayAlign");
  element.style.display = "flex";
  element.style.flexDirection = "column";
  if (displayAlign) {
    // TODO:
    //   Before: at the top of the bloc vertically
    //   center: at the center of the bloc vertically
    //   after: at the end of the bloc vertically
    switch (displayAlign) {
    case "before":
      element.style.justifyContent = "flex-start";
      break;
    case "center":
      element.style.justifyContent = "center";
      break;
    case "after":
      element.style.justifyContent = "flex-end";
      break;
    }
  }

  // applies to region
  const opacity = getInheritedStyle("opacity");
  if (opacity) {
    element.style.opacity = opacity;
  }

  // applies to body, div, p, region, span
  const visibility = getInheritedStyle("visibility");
  if (visibility) {
    element.style.visibility = visibility;
  }

  // applies to body, div, p, region, span
  const display = getInheritedStyle("display");
  if (display === "none") {
    element.style.display = "none";
  }
}

/**
 * Creates span of text for the given #text element, with the right style.
 * @param {Element} el - the #text element, which text content should be
 * displayed
 * @param {Array.<Element>} spans - <span> tags which contain the element. In
 * order of closeness (from the closest to the least one)
 * @param {Element|null} p - <p> tag which contain the element.
 * @param {Array.<Element>} divs - <div> tags which contain the element. In
 * order of closeness (from the closest to the least one)
 * @param {Element|null} body - <body> tag which contain the element.
 * @param {Array.<Element>} regions - Every <region> tag which can apply to
 * this element.
 * @param {Array.<Element>} styles - Every <style> tag which can apply to
 * this element.
 * @returns {HTMLElement}
 */
function createTextElement(el, spans, p, divs, body, regions, styles) {
  const wrapperElement = document.createElement("span");
  const textElement = document.createElement("span");
  textElement.innerHTML = el.textContent;
  wrapperElement.appendChild(textElement);

  // Styles at span levels (which only apply to the given span)
  if (spans.length) {
    // applies to body, div, p, region, span
    const backgroundColor =
      getStyleValue("backgroundColor", styles, regions, spans);
    if (backgroundColor) {
      textElement.style.backgroundColor = ttmlColorToCSSColor(backgroundColor);
    }
  }

  const elementsToInherit = [...spans];
  if (p) {
    elementsToInherit.push(p);
  }
  elementsToInherit.push(...divs);
  if (body) {
    elementsToInherit.push(body);
  }
  applyTextStyle(wrapperElement, elementsToInherit, styles, regions);
  return wrapperElement;
}

/**
 * Generate every text elements to display in a given paragraph.
 * @param {Element} paragraph - The <p> tag.
 * @param {Array.<Element>} divs - <div> tags which contain the paragraph. In
 * order of closeness (from the closest to the least one)
 * @param {Element|null} body - <body> tag which contain the paragraph.
 * @param {Array.<Element>} regions
 * @param {Array.<Element>} styles
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {Array.<HTMLElement>}
 */
function generateTextContent(
  paragraph,
  divs,
  body,
  regions,
  styles,
  shouldTrimWhiteSpace
) {
  function loop(_paragraph) {
    const childNodes = _paragraph.childNodes;
    const elements = [];
    for (let i = 0; i < childNodes.length; i++) {
      if (childNodes[i].nodeName === "#text") {
        const textEl = childNodes[i];
        const spans = getParentElementsByTagName(textEl, "span");
        const p = getParentElementsByTagName(textEl, "p")[0];
        const el = createTextElement(
          textEl, spans, p, divs, body, regions, styles);
        elements.push(el);
      } else if (childNodes[i].nodeName === "br") {
        const br = document.createElement("BR");
        elements.push(br);
      } else if (shouldTrimWhiteSpace) {
        // 1. Trim leading and trailing whitespace.
        // 2. Collapse multiple spaces into one.
        let trimmed = childNodes[i].textContent.trim();
        trimmed = trimmed.replace(/\s+/g, " ");
        childNodes[i].textContent = trimmed;
      }

      if (childNodes[i].childNodes.length > 0) {
        elements.push(...loop(childNodes[i]));
      }
    }
    return elements;
  }
  return loop(paragraph);
}

/**
 * @param {Element} paragraph
 * @param {Array.<Element>} regions
 * @param {Array.<Element>} styles
 * @param {Object} [options]
 * @param {Boolean} [options.shouldTrimWhiteSpace=true]
 * @returns {HTMLElement}
 */
export default function createElement(
  paragraph,
  regions,
  styles,
   { shouldTrimWhiteSpace = true } = {}
) {
  const body = getParentElementsByTagName(paragraph, "body")[0];
  const divs = getParentElementsByTagName(paragraph, "div");

  const parentElement = document.createElement("DIV");
  const elementsToInherit = [paragraph, ...divs, body];
  applyGeneralStyle(parentElement, elementsToInherit, regions, styles);
  if (body) {
    const bodyBackgroundColor =
      getStyleValue("backgroundColor", styles, regions, [...divs, body]);
    if (bodyBackgroundColor) {
      parentElement.style.backgroundColor =
        ttmlColorToCSSColor(bodyBackgroundColor);
    }
  }

  // flexbox - we need to add a parent
  const flexElement = document.createElement("DIV");

  // TODO Manage backgroundColor applied to a <p> or a <div>

  generateTextContent(
    paragraph, divs, body, regions, styles, shouldTrimWhiteSpace)
    .forEach((contentElement) => {
      flexElement.appendChild(contentElement);
    });
  parentElement.appendChild(flexElement);
  return parentElement;
}
