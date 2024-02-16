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
export type IStyleList = Partial<Record<string, string>>;
export interface IStyleObject {
    id: string;
    style: IStyleList;
    extendsStyles: string[];
}
/**
 * Retrieve the attributes given in arguments in the given nodes and their
 * associated style(s)/region.
 * The first notion of the attribute encountered will be taken (by looping
 * through the given nodes in order).
 *
 * TODO manage IDREFS (plural) for styles and regions, that is, multiple one
 * @param {Array.<string>} attributes
 * @param {Array.<Node>} nodes
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @returns {Object}
 */
export declare function getStylingAttributes(attributes: string[], nodes: Node[], styles: IStyleObject[], regions: IStyleObject[]): IStyleList;
/**
 * Returns the styling directly linked to an element.
 * @param {Node} node
 * @returns {Object}
 */
export declare function getStylingFromElement(node: Node): IStyleList;
