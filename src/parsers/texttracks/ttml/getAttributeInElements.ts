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
 * Returns the first notion of the attribute encountered in the list of elemnts
 * given.
 * @param {string} attribute
 * @param {Array.<Element>} elements
 * @returns {string|undefined}
 */
export default function getAttributeInElements(
  attribute : string, elements : Element[]
) : string|undefined {
  for (let i = 0; i <= elements.length - 1; i++) {
    const element = elements[i];
    if (element) {
      const directAttrValue = element.getAttribute(attribute);
      if (directAttrValue != null) {
        return directAttrValue;
      }
    }
  }
}
