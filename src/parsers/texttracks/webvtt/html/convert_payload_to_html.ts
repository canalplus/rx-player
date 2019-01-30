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

import createStyledElement from "./create_styled_element";
import { IStyleElements } from "./parse_style_block";

/**
 * @param {string} text
 * @param {Array.<Object>} styleElements
 * @returns {Array.<HTMLElement>}
 */
export default function convertPayloadToHTML(
  text : string,
  styleElements : IStyleElements
) : HTMLElement[] {
  const filteredText = text
    // Remove timestamp tags
    .replace(/<[0-9]{2}:[0-9]{2}.[0-9]{3}>/, "")
    // Remove tag content or attributes (e.g. <b dfgfdg> => <b>)
    .replace(/<([u,i,b,c])(\..*?)?(?: .*?)?>(.*?)<\/\1>/g,
      "<$1$2>$3</$1$2>");

  const parsedWebVTT = new DOMParser().parseFromString(filteredText, "text/html");
  const nodes = parsedWebVTT.body.childNodes;

  const styledElements : HTMLElement[] = [];
  for (let i = 0; i < nodes.length; i++) {
    styledElements.push(
      createStyledElement(nodes[i], styleElements)
    );
  }
  return styledElements;
}
