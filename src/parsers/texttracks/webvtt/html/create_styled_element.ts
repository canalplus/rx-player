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

import arrayIncludes from "../../../../utils/array_includes";
import { IStyleElements } from "./parse_style_block";

/**
 * Construct an HTMLElement/TextNode representing the given node and apply
 * the right styling on it.
 * @param {Node} baseNode
 * @param {Array.<Object>} styleElements
 * @param {Array.<string>} styleClasses
 * @returns {Node}
 */
export default function createStyledElement(
  baseNode : Node,
  styleElements : IStyleElements
) : HTMLElement {
  const HTMLTags = ["u", "i", "b"];
  const authorizedNodeNames = ["u", "i", "b", "c", "#text"];

  const mainNodeName = baseNode.nodeName.toLowerCase().split(".")[0];
  let nodeWithStyle;
  if (arrayIncludes(authorizedNodeNames, mainNodeName)) {
    if (mainNodeName === "#text") {
      const linifiedText = (baseNode as Text).wholeText
        .split("\n");

      nodeWithStyle = document.createElement("span");
      for (let i = 0; i < linifiedText.length; i++) {
        if (i) {
          nodeWithStyle.appendChild(document.createElement("br"));
        }
        if (linifiedText[i].length > 0) {
          const textNode = document.createTextNode(linifiedText[i]);
          nodeWithStyle.appendChild(textNode);
        }
      }
    } else {
      const nodeClasses = baseNode.nodeName.toLowerCase().split(".");
      const classes : Array<{ styleContent: string }> = [];
      nodeClasses.forEach(nodeClass => {
        if (styleElements[nodeClass]) {
          classes.push(styleElements[nodeClass]);
        }
      });
      if (classes.length !== 0) { // If style must be applied
        const attr = document.createAttribute("style");
        classes.forEach(({ styleContent }) => {
          attr.value += styleContent;
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
          styleElements
        );
        nodeWithStyle.appendChild(child);
      }
    }
  } else {
    nodeWithStyle = document.createElement("span");
    for (let j = 0; j < baseNode.childNodes.length; j++) {
      const child = createStyledElement(
        baseNode.childNodes[j],
        styleElements
      );
      nodeWithStyle.appendChild(child);
    }
  }

  return nodeWithStyle;
}
