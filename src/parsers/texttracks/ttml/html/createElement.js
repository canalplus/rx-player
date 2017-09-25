import {
  REGXP_PERCENT_VALUES,
  REGXP_4_HEX_COLOR,
  REGXP_8_HEX_COLOR,
} from "../constants.js";
import getElementToApplyFromCollection from "../getElementToApplyFromCollection.js";

import getLeafNodes from "../getLeafNodes.js";

// TODO
// tts:showBackground (applies to region)
// tts:textOutline (applies to span)
// tts:wrapOption (applies to span)
// tts:zIndex (applies to region)

/**
 * Finds a specified attribute on either the original cue element or its
 * associated region and returns the value if the attribute was found.
 * @param {Element} cueElement
 * @param {Element} region
 * @param {Array.<!Element>} styles
 * @param {string} attribute
 * @returns {string|null}
 */
function getStyleAttribute(cueElement, span, region, styles, attribute) {
  // An attribute can be specified on, in order of importance:
  //   - span level
  //   - style associated with the span
  //   - region level
  //   - style associated with the region
  // TODO There's actually more, do better
  const spanChildren = getLeafNodes(span);
  for (let i = 0; i < spanChildren.length; i++) {
    const attrValue = spanChildren[i].getAttribute(attribute);
    if (attrValue) {
      return attrValue;
    }
  }

  const spanStyle = getElementToApplyFromCollection("style", span, styles);
  if (spanStyle) {
    // TODO hasAttribute?
    const attrValue = spanStyle.getAttribute(attribute);
    if (attrValue) {
      return attrValue;
    }
  }

  const cueChildren = getLeafNodes(cueElement);
  for (let i = 0; i < cueChildren.length; i++) {
    const attrValue = cueChildren[i].getAttribute(attribute);
    if (attrValue) {
      return attrValue;
    }
  }

  const cueStyle = getElementToApplyFromCollection("style", cueElement, styles);
  if (cueStyle) {
    // TODO hasAttribute?
    const attrValue = cueStyle.getAttribute(attribute);
    if (attrValue) {
      return attrValue;
    }
  }

  const regionChildren = getLeafNodes(region);
  for (let i = 0; i < regionChildren.length; i++) {
    const attrValue = regionChildren[i].getAttribute(attribute);
    if (attrValue) {
      return attrValue;
    }
  }

  const regionStyle = getElementToApplyFromCollection("style", region, styles);
  if (regionStyle) {
    // TODO hasAttribute?
    const attrValue = regionStyle.getAttribute(attribute);
    if (attrValue) {
      return attrValue;
    }
  }
  return null;
}

function ttmlColorToCSSColor(color) {
  // TODO check all possible color fomats
  let regRes;
  regRes = REGXP_8_HEX_COLOR.exec(color);
  if (regRes != null) {
    return "rgba(" +
      parseInt(regRes[1], 16) + "," +
      parseInt(regRes[2], 16) + "," +
      parseInt(regRes[3], 16) + "," +
      parseInt(regRes[4], 16) / 255 + ")";
  }
  regRes = REGXP_4_HEX_COLOR.exec(color);

  if (regRes != null) {
    return "rgba(" +
      parseInt(regRes[1] + regRes[1], 16) + "," +
      parseInt(regRes[2] + regRes[2], 16) + "," +
      parseInt(regRes[3] + regRes[3], 16) + "," +
      parseInt(regRes[4] + regRes[4], 16) / 255 + ")";
  }
  return color;
}

function addLineBreak(element) {
  const br = document.createElement("BR");
  element.appendChild(br);
}

function applyPStyle(element, p, region, styles) {
  function getStyleContent(styleName) {
    return getStyleAttribute(p, null, region, styles, "tts:" + styleName);
  }

  // applies to tt, region
  const extent = getStyleContent("extent");
  if (extent) {
    const results = REGXP_PERCENT_VALUES.exec(extent);
    if (results != null) {
      element.style.width = results[1] + "%";
      element.style.height = results[2] + "%";
    }
  }

  // applies to region
  const writingMode = getStyleContent("writingMode");
  if (writingMode) {
    // TODO
  }

  // applies to region
  const overflow = getStyleContent("overflow");
  if (overflow) {
    element.style.overflow = overflow;
  }

  // applies to region
  const padding = getStyleContent("padding");
  if (padding) {
    element.style.padding = padding;
  }

  // applies to region
  const origin = getStyleContent("origin");
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
  const lineHeight = getStyleContent("lineHeight");
  if (lineHeight) {
    element.style.lineHeight = lineHeight;
  }

  // applies to p
  const textAlign = getStyleContent("textAlign");
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
  const displayAlign = getStyleContent("displayAlign");
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
  const opacity = getStyleContent("opacity");
  if (opacity) {
    element.style.opacity = opacity;
  }
}

function addToElement(parentElement, el, span, region, styles) {
  const wrapperElement = document.createElement("span");
  const textElement = document.createElement("span");
  textElement.innerHTML = el.textContent;
  wrapperElement.appendChild(textElement);

  function getStyleContent(styleName) {
    return getStyleAttribute(el.parentElement, span, region, styles, "tts:" + styleName);
  }

  // applies to span
  const color = getStyleContent("color");
  if (color) {
    wrapperElement.style.color = ttmlColorToCSSColor(color);
  }

  // applies to body, div, p, region, span
  const backgroundColor = getStyleContent("backgroundColor");
  if (backgroundColor) {
    textElement.style.backgroundColor = ttmlColorToCSSColor(backgroundColor);
  }

  // applies to span
  const textDecoration = getStyleContent("textDecoration");
  if (textDecoration) {
    if (
      textDecoration === "noUnderline" || textDecoration === "noLineThrough" ||
      textDecoration === "noOverline"
    ) {
      wrapperElement.style.textDecoration = "none";
    } else if (textDecoration === "lineThrough") {
      wrapperElement.style.textDecoration = "line-through";
    } else {
      wrapperElement.style.textDecoration = textDecoration;
    }
  }

  // applies to span
  const fontFamily = getStyleContent("fontFamily");
  if (fontFamily) {
    switch (fontFamily) {

    case "proportionalSansSerif":
      wrapperElement.style.fontFamily =
          "Arial, Helvetica, Liberation Sans, sans-serif";
      break;

    // TODO monospace or sans-serif or font with both?
    case "monospaceSansSerif":
    case "sansSerif":
      wrapperElement.style.fontFamily = "sans-serif";
      break;

    case "monospaceSerif":
    case "default":
      wrapperElement.style.fontFamily = "Courier New, Liberation Mono, monospace";
      break;

    // TODO font with both?
    case "proportionalSerif":
      wrapperElement.style.fontFamily = "serif";
      break;

    default:
      wrapperElement.style.fontFamily = fontFamily;
    }
  }

  // applies to span
  const fontStyle = getStyleContent("fontStyle");
  if (fontStyle) {
    wrapperElement.style.fontStyle = fontStyle;
  }

  // applies to span
  const fontWeight = getStyleContent("fontWeight");
  if (fontWeight) {
    wrapperElement.style.fontWeight = fontWeight;
  }

  // applies to span
  const fontSize = getStyleContent("fontSize");
  if (fontSize) {
    // TODO Check if formats are always really 1:1
    wrapperElement.style.fontSize = fontSize;
  }

  // applies to body, div, p, region, span
  const visibility = getStyleContent("visibility");
  if (visibility) {
    wrapperElement.style.visibility = visibility;
  }

  // applies to p, span
  const direction = getStyleContent("direction");
  if (direction) {
    wrapperElement.style.direction = direction;
  }

  // applies to p, span
  const unicodeBidi = getStyleContent("unicodeBidi");
  if (unicodeBidi) {
    switch (unicodeBidi) {
    case "bidiOverride":
      wrapperElement.style.unicodeBidi = "bidi-override";
      break;
    case "embed":
      wrapperElement.style.unicodeBidi = "embed";
      break;
    default:
      wrapperElement.style.unicodeBidi = "normal";
    }
  }

  // applies to body, div, p, region, span
  const display = getStyleContent("display");
  if (display === "none") {
    wrapperElement.style.display = "none";
  }

  parentElement.appendChild(wrapperElement);
}

export default function createElement(
  element, region, styles, shouldTrimWhiteSpace
) {
  const rootElement = document.createElement("DIV");
  applyPStyle(rootElement, element, region, styles);

  // flexbox - we need to add a parent again
  const parentElement = document.createElement("DIV");

  function addNodes(childNodes, span) {
    for (let i = 0; i < childNodes.length; i++) {
      // TODO That (spanTMP) is ugly
      let spanTMP = null;
      if (childNodes[i].nodeName === "#text") {
        addToElement(parentElement, childNodes[i], span, region, styles);
      } else if (childNodes[i].nodeName === "span") {
        spanTMP = childNodes[i];
      } else if (childNodes[i].nodeName === "br") {
        addLineBreak(parentElement);
      } else if (shouldTrimWhiteSpace) {
        // Trim leading and trailing whitespace.
        let trimmed = childNodes[i].textContent.trim();
        // Collapse multiple spaces into one.
        trimmed = trimmed.replace(/\s+/g, " ");

        childNodes[i].textContent = trimmed;
      }

      if (childNodes[i].childNodes.length > 0) {
        addNodes(childNodes[i].childNodes, spanTMP);
      }
    }
  }

  const childNodes = element.childNodes;
  addNodes(childNodes);

  rootElement.appendChild(parentElement);
  return rootElement;
}
