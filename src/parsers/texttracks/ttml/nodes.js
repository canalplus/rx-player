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

import assert from "../../../utils/assert.js";

/**
 * Gets leaf nodes of the xml node tree. Ignores the text, br elements
 * and the spans positioned inside paragraphs
 *
 * @param {Element} element
 * @throws Error - Throws if one of the childNode is not an element instance.
 * @throws Error - Throws if a children Element has no leaf.
 * @returns {Array.<Element>}
 * TODO Refacto that one
 */
function getLeafNodes(element) {
  let result = [];
  if (!element) {
    return result;
  }

  const childNodes = element.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    // <span> elements are pushed with their corresponding <p> elements
    const isSpanChildOfP = childNodes[i].nodeName === "span" &&
      element.nodeName === "p";

    if (childNodes[i].nodeType === Node.ELEMENT_NODE &&
      childNodes[i].nodeName !== "br" && !isSpanChildOfP) {
      // Get the leafs the child might contain
      assert(childNodes[i] instanceof Element,
        "Node should be Element!");
      const leafChildren = getLeafNodes(childNodes[i]);
      assert(leafChildren.length > 0,
        "Only a null Element should return no leaves");
      result = result.concat(leafChildren);
    }
  }

  // if no result at this point, the element itself must be a leaf
  if (!result.length) {
    result.push(element);
  }
  return result;
}

/**
 * @param {Element} tt
 * @returns {Array.<Element>}
 */
function getBodyNode(tt) {
  return tt.getElementsByTagName("body")[0];
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getStyleNodes(tt) {
  return getLeafNodes(tt.getElementsByTagName("styling")[0]);
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getRegionNodes(tt) {
  return getLeafNodes(tt.getElementsByTagName("layout")[0]);
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getTextNodes(tt) {
  return getLeafNodes(tt.getElementsByTagName("body")[0]);
}

export {
  getBodyNode,
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
};
