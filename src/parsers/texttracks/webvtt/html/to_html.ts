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

import convertPayloadToHTML from "./convert_payload_to_html";
import { IStyleElements } from "./parse_style_block";

export interface IVTTHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
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
export default function toHTML(
  cueObj : {
    start : number;
    end : number;
    header? : string;
    payload : string[];
  },
  parsedStyleBlock : {
    styleElements: IStyleElements;
    globalStyle?: string;
  }
) : IVTTHTMLCue {
  const { start, end, header, payload } = cueObj;

  const region = document.createElement("div");
  const regionAttr = document.createAttribute("style");
  regionAttr.value =
    "width:100%;" +
    "height:100%;" +
    "display:flex;" +
    "flex-direction:column;" +
    "justify-content:flex-end;" +
    "align-items:center;";
  region.setAttributeNode(regionAttr);

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

  const { globalStyle, styleElements } = parsedStyleBlock;
  const localStyle = header ? styleElements[header] : undefined;
  const styles = [localStyle, globalStyle]
    .filter((s) => !!s)
    .join();

  attr.value += styles;
  spanElement.setAttributeNode(attr);

  convertPayloadToHTML(payload.join("\n"), styleElements)
    .forEach(element => {
      spanElement.appendChild(element);
    });

  region.appendChild(pElement) ;
  pElement.appendChild(spanElement);

  return {
    start,
    end,
    element: region,
  };
}
