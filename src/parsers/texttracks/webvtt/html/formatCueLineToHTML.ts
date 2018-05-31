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

import arrayIncludes from "../../../../utils/array-includes";
import { IStyleElement } from "./parseStyleBlock";

/**
 * Construct an HTMLElement/TextNode representing the given node and apply
 * the right styling on it.
 * @param {Node} baseNode
 * @param {Array.<Object>} styleElements
 * @param {Array.<string>} styleClasses
 * @returns {Node}
 */
function createStyledElement(
  baseNode : Node,
  styleElements : IStyleElement[],
  styleClasses : string[]
) : HTMLElement|Text {
  const HTMLTags = ["u", "i", "b"];
  const authorizedNodeNames = ["u", "i", "b", "c", "#text"];

  const mainNodeName = baseNode.nodeName.toLowerCase().split(".")[0];
  let nodeWithStyle;
  if (arrayIncludes(authorizedNodeNames, mainNodeName)) {
    if (mainNodeName === "#text") {
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
          if (styleElements[index]) {
            attr.value += styleElements[index].styleContent;
          }
        });
        const nameClass = arrayIncludes(HTMLTags, mainNodeName) ?
          mainNodeName : "span";
        nodeWithStyle = document.createElement(nameClass);
        nodeWithStyle.setAttributeNode(attr);
      } else { // If style mustn't be applied. Rebuild element with tag name
        const elementTag = !arrayIncludes(HTMLTags, mainNodeName) ?
          "span" : mainNodeName;
        nodeWithStyle = document.createElement(elementTag);
      }
      for (let j = 0; j < baseNode.childNodes.length; j++) {
        const child = createStyledElement(
          baseNode.childNodes[j],
          styleElements,
          styleClasses
        );
        nodeWithStyle.appendChild(child);
      }
    }
  } else {
    nodeWithStyle = document.createElement("span");
    for (let j = 0; j < baseNode.childNodes.length; j++) {
      const child = createStyledElement(
        baseNode.childNodes[j],
        styleElements,
        styleClasses
      );
      nodeWithStyle.appendChild(child);
    }
  }

  return nodeWithStyle;
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
export default function formatCueLineToHTML(
  text : string,
  styleElements : IStyleElement[]
) : Array<HTMLElement|Text> {

  const styleClasses = styleElements
    .map(styleElement => styleElement.className)
    .filter((className) : className is string => className != null);

  const filteredText = text
    // Remove timestamp tags
    .replace(/<[0-9]{2}:[0-9]{2}.[0-9]{3}>/, "")
    // Remove tag content or attributes (e.g. <b dfgfdg> => <b>)
    .replace(/<([u,i,b,c])(\..*?)?(?: .*?)?>(.*?)<\/\1>/g,
      "<$1$2>$3</$1$2>");

  const parsedWebVTT = new DOMParser().parseFromString(filteredText, "text/html");
  const nodes = parsedWebVTT.body.childNodes;

  const parsedNodeArray : Array<HTMLElement|Text> = [];
  for (let i = 0; i < nodes.length; i++) {
    parsedNodeArray[i] = createStyledElement(nodes[i], styleElements, styleClasses);
  }

  return parsedNodeArray;
}
