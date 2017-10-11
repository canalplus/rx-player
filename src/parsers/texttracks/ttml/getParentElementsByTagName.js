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

/**
 * Returns the parent elements which have the given tagName, by order of
 * closeness relative to our element.
 * @param {Element} element
 * @param {string} tagName
 * @returns {Array.<Element>}
 */
export default function getParentElementsByTagName(element, tagName) {
  const elements = [];
  let parentElement = element.parentNode;
  while (parentElement) {
    if (parentElement.tagName.toLowerCase() === tagName.toLowerCase()) {
      elements.push(parentElement);
    }

    // Element.parentNode can lead to XMLDocument, which is not an Element and
    // has no getAttribute().
    const parentNode = parentElement.parentNode;
    if (parentNode instanceof Element) {
      parentElement = parentNode;
    } else {
      break;
    }
  }
  return elements;
}
