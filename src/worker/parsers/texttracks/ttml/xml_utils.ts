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
export function getParentElementsByTagName(
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

/**
 * Returns the parent elements which have the given tagName, by order of
 * closeness relative to our element.
 * @param {Element|Node} element
 * @returns {Array.<Element>}
 */
export function getParentDivElements(element: Element | Node) : Element[] {
  let divs = getParentElementsByTagName(element, "div");
  if (divs.length === 0) {
    const ttDivs = getParentElementsByTagName(element, "tt:div");
    if (ttDivs.length > 0) {
      divs = ttDivs;
    }
  }
  return divs;
}

/**
 * Returns the first notion of the attribute encountered in the list of elemnts
 * given.
 * @param {string} attribute
 * @param {Array.<Element>} elements
 * @returns {string|undefined}
 */
export function getAttributeInElements(
  attribute : string, elements : Element[]
) : string|undefined {
  for (let i = 0; i <= elements.length - 1; i++) {
    const element = elements[i];
    if (element !== undefined) {
      const directAttrValue = element.getAttribute(attribute);
      if (directAttrValue != null) {
        return directAttrValue;
      }
    }
  }
}

/**
 * @param {Element} tt
 * @returns {Element}
 */
export function getBodyNode(tt : Element) : Element|null {
  const bodyNodes = tt.getElementsByTagName("body");
  if (bodyNodes.length > 0) {
    return bodyNodes[0];
  }
  const namespacedBodyNodes = tt.getElementsByTagName("tt:body");
  if (namespacedBodyNodes.length > 0) {
    return namespacedBodyNodes[0];
  }
  return null;
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
export function getStyleNodes(tt : Element) : HTMLCollectionOf<Element> {
  const styleNodes = tt.getElementsByTagName("style");
  if (styleNodes.length > 0) {
    return styleNodes;
  }
  const namespacedStyleNodes = tt.getElementsByTagName("tt:style");
  if (namespacedStyleNodes.length > 0) {
    return namespacedStyleNodes;
  }
  return styleNodes;
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
export function getRegionNodes(tt : Element) : HTMLCollectionOf<Element> {
  const regionNodes = tt.getElementsByTagName("region");
  if (regionNodes.length > 0) {
    return regionNodes;
  }
  const namespacedRegionNodes = tt.getElementsByTagName("tt:region");
  if (namespacedRegionNodes.length > 0) {
    return namespacedRegionNodes;
  }
  return regionNodes;
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
export function getTextNodes(tt : Element) : HTMLCollectionOf<Element> {
  const pNodes = tt.getElementsByTagName("p");
  if (pNodes.length > 0) {
    return pNodes;
  }
  const namespacedPNodes = tt.getElementsByTagName("tt:p");
  if (namespacedPNodes.length > 0) {
    return namespacedPNodes;
  }
  return pNodes;
}

/**
 * Returns true if the given node corresponds to a TTML line break element.
 * @param {Node} node
 * @returns {boolean}
 */
export function isLineBreakElement(node : Node) : boolean {
  return node.nodeName === "br" || node.nodeName === "tt:br";
}

/**
 * Returns true if the given node corresponds to a TTML span element.
 * @param {Node} node
 * @returns {boolean}
 */
export function isSpanElement(node : Node) : boolean {
  return node.nodeName === "span" || node.nodeName === "tt:span";
}
