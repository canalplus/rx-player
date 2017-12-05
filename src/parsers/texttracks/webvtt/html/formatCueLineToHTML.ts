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
      if (arrayIncludes(webVTTTags, mainTag)) { // If element accepted
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
            const nameClass = arrayIncludes(HTMLTags, mainTag) ? mainTag : "span";
            nodeWithStyle = document.createElement(nameClass);
            nodeWithStyle.setAttributeNode(attr);
          } else { // If style mustn't be applied. Rebuild element with tag name
            const elementTag = !arrayIncludes(HTMLTags, mainTag) ? "span" : mainTag;
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
