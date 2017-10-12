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

import log from "../../../utils/log";
import parseTimestamp from "./parseTimestamp";

export interface IVTTHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
}

interface IStyleElement {
  className? : string;
  isGlobalStyle : boolean;
  styleContent : string;
}

/**
 * Parse WebVTT from text. Returns an array with:
 * - start : start of current cue, in seconds
 * - end : end of current cue, in seconds
 * - content : HTML formatted cue.
 *
 * Global style is parsed and applied to div element.
 * Specific style is parsed and applied to class element.
 *
 * @param {string} text
 * @param {Number} timeOffset
 * @return {Array.<Object>}
 * @throws Error - Throws if the given WebVTT string is invalid.
 */
export default function parseWebVTT(
  text : string,
  timeOffset : number
) : IVTTHTMLCue[] {
  const newLineChar = /\r\n|\n|\r/g;
  const linified = text.split(newLineChar);
  const cuesArray : IVTTHTMLCue[] = [];
  const styleElements : IStyleElement[] = [];
  if (!linified[0].match(/^WEBVTT( |\t|\n|\r|$)/)) {
    throw new Error("Can't parse WebVTT: Invalid File.");
  }

  for (let i = 1; i < linified.length; i++) {
    if (isStartOfStyleBlock(linified[i])) {
      const startOfStyleBlock = i;
      i++;

      // continue incrementing i until either:
      //   - empty line
      //   - end of file
      while (!(linified[i].length === 0)) {
        i++;
      }
      const styleBlock = linified.slice(startOfStyleBlock, i);
      const parsedStyles = parseStyleBlock(styleBlock);
      styleElements.push(...parsedStyles);
    }
  }

  // Parse cues, format and apply style.
  for (let i = 1; i < linified.length; i++) {
    if (!(linified[i].length === 0)) {
      if (isStartOfCueBlock(linified[i])) {
        const startOfCueBlock = i;
        i++;
        // continue incrementing i until either:
        //   - empty line
        //   - end of file
        while (!(linified[i].length === 0)) {
          i++;
        }
        const cueBlock = linified.slice(startOfCueBlock, i);
        const cue = parseCue(cueBlock, timeOffset, styleElements);
        if (cue) {
          cuesArray.push(cue);
        }
      } else {
        while (!(linified[i].length === 0)) {
          i++;
        }
      }
    }
  }
  return cuesArray;
}

/**
 * Returns true if the given line looks like the beginning of a Style block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfStyleBlock(text : string) : boolean {
  return /^STYLE.*?/g.test(text);
}

/**
 * Returns true if the given line looks like the beginning of a comment block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfNoteBlock(text : string) : boolean {
  return /^NOTE.*?/g.test(text);
}

/**
 * Returns true if the given line looks like the beginning of a region block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfRegionBlock(text : string) : boolean {
  return /^REGION.*?/g.test(text);
}

/**
 * Returns true if the given line looks like the beginning of a cue block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfCueBlock(text : string) : boolean {
  return (!isStartOfNoteBlock(text) &&
   !isStartOfStyleBlock(text) &&
   !isStartOfRegionBlock(text)) &&
   text.length !== 0;
}

/**
 *
 * Parse style element from WebVTT.
 * @param {Array.<string>} styleBlock
 * @return {Array.<Object>} styleElements
 */
function parseStyleBlock(styleBlock : string[]) : IStyleElement[] {
  const styleElements : IStyleElement[] = [];
  let index = 1;
  const classNames : Array<{
    isGlobalStyle : boolean,
    className? : string,
  }> = [];
  if (styleBlock[index].match(/::cue {/)) {
    classNames.push({ isGlobalStyle: true });
    index++;
  } else {
    let cueClassLine;
    while (cueClassLine = styleBlock[index].match(/::cue\(\.?(.*?)\)(?:,| {)/)) {
      classNames.push({
        className: cueClassLine[1],
        isGlobalStyle: false,
      });
      index++;
    }
  }

  let styleContent = "";

  while (!(styleBlock[index].match(/}/)
        || styleBlock[index].length === 0)) {
    styleContent +=  styleBlock[index];
    index++;
  }
  classNames.forEach(name => {
    styleElements.push({
      className: name.className,
      isGlobalStyle: name.isGlobalStyle,
      styleContent: styleContent.replace(/\s/g, ""),
    });
  });
  return styleElements;
}

/**
 * Parse cue block into an object with the following properties:
 *   - start {number}: start time at which the cue should be displayed
 *   - end {number}: end time at which the cue should be displayed
 *   - element {HTMLElement}: the cue text, translated into an HTMLElement
 *
 * Returns undefined if the cue block could not be parsed.
 * @param {Array.<string>} cueBlock
 * @param {Number} timeOffset
 * @param {Array.<Object>} styleElements
 * @returns {Object|undefined}
 */
function parseCue(
  cueBlock : string[],
  timeOffset : number,
  styleElements : IStyleElement[]
) : IVTTHTMLCue|undefined {
  const region = document.createElement("div");
  const regionAttr = document.createAttribute("style");
  let index = 0;
  regionAttr.value =
    "width:100%; \
    height:100%; \
    display:flex; \
    flex-direction:column; \
    justify-content:flex-end; \
    align-items:center;";
  region.setAttributeNode(regionAttr);

  // Get Header. It may be a class name associated with cue.
  const header = cueBlock[index];
  index++;

  // Get time ranges.
  const timeCodes = cueBlock[index];
  const range = parseTimeCode(timeCodes);
  if (!range || range.start == null || range.end == null) {
    log.warn("VTT: Invalid cue, the timecode line could not be parsed.");
    return; // cancel if we do not find the start or end of this cue
  }

  index++;

  // Get content, format and apply style.
  const pElement = document.createElement("p");
  const pAttr = document.createAttribute("style");
  pAttr.value = "text-align:center";
  pElement.setAttributeNode(pAttr);

  const spanElement = document.createElement("span");
  const attr = document.createAttribute("style");

  // set color and background-color default values, as indicated in:
  // https://www.w3.org/TR/webvtt1/#applying-css-properties
  attr.value =
    "background-color:rgba(0,0,0,0.8); \
    color:white;";
  spanElement.setAttributeNode(attr);

  const styles = styleElements
    .filter(styleElement =>
      (styleElement.className === header && !styleElement.isGlobalStyle) ||
      styleElement.isGlobalStyle
    ).map(styleElement => styleElement.styleContent);

  if (styles) {
    attr.value += styles.join();
    spanElement.setAttributeNode(attr);
  }

  while (cueBlock[index]) {

    if (spanElement.childNodes.length !== 0) {
      spanElement.appendChild(document.createElement("br"));
    }

    formatWebVTTtoHTML(cueBlock[index], styleElements)
      .forEach(child => {
        spanElement.appendChild(child);
      });

    index++;
  }

  region.appendChild(pElement) ;
  pElement.appendChild(spanElement);

  return {
    start: range.start + timeOffset,
    end: range.end + timeOffset,
    element: region,
  };
}

/**
 * Parse the VTT timecode line given and construct an object with two
 * properties:
 *   - start {Number|undefined}: the corresponding start time in seconds
 *   - end {Number|undefined}: the corresponding end time in seconds
 * @example
 * ```js
 * parseTimeCode("00:02:30 -> 00:03:00");
 * // -> {
 * //      start: 150,
 * //      end: 180,
 * //    }
 * ```
 * @param {string} text
 * @returns {Object|undefined}
 */
function parseTimeCode(
  text : string
) : { start? : number, end? : number }|undefined {
  const tsRegex = "((?:[0-9]{2}\:?)[0-9]{2}:[0-9]{2}.[0-9]{2,3})";
  const startEndRegex = tsRegex + "(?:\ |\t)-->(?:\ |\t)" + tsRegex;
  const ranges = text.match(startEndRegex);

  if (ranges && ranges.length >= 3) {
    const start = parseTimestamp(ranges[1]);
    const end =  parseTimestamp(ranges[2]);
    return { start, end };
  }
}

/**
 * Format WebVTT tags and classes into usual HTML.
 * <b *> => <b>
 * <u *> => <u>
 * <i *> => <i>
 * <c.class *> => <c.class>
 * Style is inserted if associated to tag or class.
 * @param {string} text
 * @param {Array.<Object>} styleElements
 * @returns {Array.<Node>}
 */
function formatWebVTTtoHTML(
  text : string,
  styleElements : IStyleElement[]
) : Array<HTMLElement|Text> {
  const HTMLTags = ["u", "i", "b"];
  const webVTTTags = ["u", "i", "b", "c", "#text"];
  const styleClasses =
    styleElements.map(styleElement => styleElement.className);
  const filtered = text
    // Remove timestamp tags
    .replace(/<[0-9]{2}:[0-9]{2}.[0-9]{3}>/, "")
    // Remove tag content or attributes (e.g. <b dfgfdg> => <b>)
    .replace(/<([u,i,b,c])(\..*?)?(?: .*?)?>(.*?)<\/\1>/g,
      "<$1$2>$3</$1$2>");

  const parser = new DOMParser();
  const parsedWebVTT = parser.parseFromString(filtered, "text/html");
  const nodes = parsedWebVTT.body.childNodes;

  /**
   * Apply styles to specifig tag in children nodes.
   * (e.g. If class "b" has style, then : <b style="content">
   * )
   * Change class tags into span with associated style, or text*
   * First it was: <c.class>...</c>. Then <class></class>.
   * Finally <span style="content"></span> or text.
   * @param {Array.<Node>} childNodes
   * @returns {Array.<Node>}
   */
  function parseNode(nodeToParse : NodeList) : Array<HTMLElement|Text> {
    const parsedNodeArray : Array<HTMLElement|Text> = [];
    for (let i = 0; i < nodeToParse.length; i++) {
      parsedNodeArray[i] = createStyleElement(nodeToParse[i]);
    }

    /**
     * Construct an HTMLElement/TextNode representing the given node and apply
     * the right styling on it.
     * @param {Node} baseNode
     * @returns {Node}
     */
    function createStyleElement(baseNode : Node) : HTMLElement|Text {
      const mainTag = baseNode.nodeName.toLowerCase().split(".")[0];
      let nodeWithStyle;
      if (webVTTTags.includes(mainTag)) { // If element accepted
        if (mainTag === "#text") {
          nodeWithStyle = document.createTextNode((baseNode as Text).wholeText);
        } else {
          const nodeClasses = baseNode.nodeName.toLowerCase().split(".");
          const classIndexes : number[] = [];
          nodeClasses.forEach(nodeClass => {
            if (styleClasses.indexOf(nodeClass) !== -1) {
              classIndexes.push(styleClasses.indexOf(nodeClass));
            }
          });
          if (classIndexes.length !== 0) { // If style must be applied
            const attr = document.createAttribute("style");
            classIndexes.forEach(index => {
              attr.value += styleElements[index].styleContent;
            });
            const nameClass = HTMLTags.includes(mainTag) ? mainTag : "span";
            nodeWithStyle = document.createElement(nameClass);
            nodeWithStyle.setAttributeNode(attr);
          } else { // If style mustn't be applied. Rebuild element with tag name
            const elementTag = (!HTMLTags.includes(mainTag)) ? "span" : mainTag;
            nodeWithStyle = document.createElement(elementTag);
          }
          for (let j = 0; j < baseNode.childNodes.length; j++) {
            nodeWithStyle.appendChild(
              createStyleElement(baseNode.childNodes[j]));
          }
        }
      } else {
        nodeWithStyle = document.createElement("span");
        for (let j = 0; j < baseNode.childNodes.length; j++) {
          nodeWithStyle.appendChild(
            createStyleElement(baseNode.childNodes[j]));
        }
      }

      return nodeWithStyle;
    }

    return parsedNodeArray;
  }

  return parseNode(nodes);
}
