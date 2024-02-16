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
export declare function getParentElementsByTagName(element: Element | Node, tagName: string): Element[];
/**
 * Returns the parent elements which have the given tagName, by order of
 * closeness relative to our element.
 * @param {Element|Node} element
 * @returns {Array.<Element>}
 */
export declare function getParentDivElements(element: Element | Node): Element[];
/**
 * Returns the first notion of the attribute encountered in the list of elemnts
 * given.
 * @param {string} attribute
 * @param {Array.<Element>} elements
 * @returns {string|undefined}
 */
export declare function getAttributeInElements(attribute: string, elements: Element[]): string | undefined;
/**
 * @param {Element} tt
 * @returns {Element}
 */
export declare function getBodyNode(tt: Element): Element | null;
/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
export declare function getStyleNodes(tt: Element): HTMLCollectionOf<Element>;
/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
export declare function getRegionNodes(tt: Element): HTMLCollectionOf<Element>;
/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
export declare function getTextNodes(tt: Element): HTMLCollectionOf<Element>;
/**
 * Returns true if the given node corresponds to a TTML line break element.
 * @param {Node} node
 * @returns {boolean}
 */
export declare function isLineBreakElement(node: Node): boolean;
/**
 * Returns true if the given node corresponds to a TTML span element.
 * @param {Node} node
 * @returns {boolean}
 */
export declare function isSpanElement(node: Node): boolean;
