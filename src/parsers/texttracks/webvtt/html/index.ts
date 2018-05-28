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

import log from "../../../../utils/log";
  import {
    findEndOfCueBlock,
    getFirstLineAfterHeader,
    isStartOfCueBlock,
    isStartOfStyleBlock,
  } from "../utils";
import formatCueLineToHTML from "./formatCueLineToHTML";
import parseStyleBlock, {
  IStyleElement,
} from "./parseStyleBlock";
import parseTimeCode from "./parseTimeCode";

export interface IVTTHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
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

  const firstLineAfterHeader = getFirstLineAfterHeader(linified);

  for (let i = firstLineAfterHeader; i < linified.length; i++) {
    if (isStartOfStyleBlock(linified[i])) {
      const startOfStyleBlock = i;
      i++;

      // continue incrementing i until either:
      //   - empty line
      //   - end of file
      while (linified[i]) {
        i++;
      }
      const styleBlock = linified.slice(startOfStyleBlock, i);
      const parsedStyles = parseStyleBlock(styleBlock);
      styleElements.push(...parsedStyles);
    }
  }

  // Parse cues, format and apply style.
  for (let i = firstLineAfterHeader; i < linified.length; i++) {
    if (!(linified[i].length === 0)) {
      if (isStartOfCueBlock(linified, i)) {
        const startOfCueBlock = i;

        const endOfCue = findEndOfCueBlock(linified, i);
        const cueBlock = linified.slice(startOfCueBlock, endOfCue);
        const cue = parseCue(cueBlock, timeOffset, styleElements);
        if (cue) {
          cuesArray.push(cue);
        }
        i = endOfCue;
      } else {
        while (linified[i]) {
          i++;
        }
      }
    }
  }
  return cuesArray;
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
    "width:100%;" +
    "height:100%;" +
    "display:flex;" +
    "flex-direction:column;" +
    "justify-content:flex-end;" +
    "align-items:center;";
  region.setAttributeNode(regionAttr);

  // Get Header. It may be a class name associated with cue.
  const header = cueBlock[index];
  index++;

  // Get time ranges.
  const timeCodes = cueBlock[index];
  const range = parseTimeCode(timeCodes);
  if (!range || range.start === undefined || range.end === undefined) {
    log.warn("VTT: Invalid cue, the timecode line could not be parsed.");
    return undefined; // cancel if we do not find the start or end of this cue
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
    "background-color:rgba(0,0,0,0.8);" +
    "color:white;";
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

  while (cueBlock[index] !== undefined) {

    if (spanElement.childNodes.length !== 0) {
      spanElement.appendChild(document.createElement("br"));
    }

    formatCueLineToHTML(cueBlock[index], styleElements)
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
