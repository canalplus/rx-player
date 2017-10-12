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
 * @param {Element|Node} element
 * @param {string} tagName
 * @returns {Array.<Element>}
 */
export default function getParentElementsByTagName(
  element : Element|Node,
  tagName : string
) : Element[] {
  if (!(element.parentNode instanceof Element)) {
    return [];
  }

  function constructArray(_element : Element) : Element[] {
    const elements : Element[] = [];
    if (_element.tagName.toLowerCase() === tagName.toLowerCase()) {
      elements.push(_element);
    }

    const parentNode = _element.parentNode;
    if (parentNode instanceof Element) {
      elements.push(...constructArray(parentNode));
    }

    return elements;
  }
  return constructArray(element.parentNode);
}
