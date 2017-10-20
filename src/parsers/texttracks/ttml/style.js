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

import arrayFind from "array-find";
import arrayIncludes from "../../../utils/array-includes.js";

/**
 * Retrieve the attributes given in arguments in the given elements and their
 * associated style(s)/region.
 * The first notion of the attribute encountered will be taken (by looping
 * through the given elements in order).
 *
 * TODO manage IDREFS (plural) for styles and regions, that is, multiple one
 * @param {Array.<string>} attributes
 * @param {Array.<Element>} elements
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @returns {Object}
 */
export function getStylingAttributes(
  attributes,
  elements,
  styles,
  regions,
) {
  const currentStyle = {};
  const leftAttributes = attributes.slice();
  for (let i = 0; i <= elements.length - 1; i++) {
    const element = elements[i];
    if (element) {
      let styleID = undefined;
      let regionID = undefined;

      // 1. the style is directly set on a "tts:" attribute
      for (let i = 0; i <= element.attributes.length - 1; i++) {
        const attribute = element.attributes[i];
        const name = attribute.name;
        if (name === "style") {
          styleID = attribute.value;
        } else if (name === "region") {
          regionID = attribute.value;
        } else {
          const nameWithoutTTS = name.substr(4);
          if (arrayIncludes(leftAttributes, nameWithoutTTS)) {
            currentStyle[attribute.name] = attribute.value;
            leftAttributes.splice(i, 1);
            if (!leftAttributes.length) {
              return currentStyle;
            }
          }
        }
      }

      // 2. the style is referenced on a "style" attribute
      if (styleID) {
        const style = arrayFind(styles, x => x.id === styleID);
        if (style) {
          for (let i = 0; i <= leftAttributes.length - 1; i++) {
            const attribute = leftAttributes[i];
            if (!currentStyle[attribute]) {
              if (style.style[attribute]) {
                currentStyle[attribute] = style.style[attribute];
                leftAttributes.splice(i, 1);
                if (!leftAttributes.length) {
                  return currentStyle;
                }
                i--;
              }
            }
          }
        }
      }

      // 3. the element reference a region (which can have a value for the
      //    corresponding style)
      if (regionID) {
        const region = arrayFind(regions, x => x.id === regionID);
        if (region) {
          for (let i = 0; i <= leftAttributes.length - 1; i++) {
            const attribute = leftAttributes[i];
            if (!currentStyle[attribute]) {
              if (region.style[attribute]) {
                currentStyle[attribute] = region.style[attribute];
                leftAttributes.splice(i, 1);
                if (!leftAttributes.length) {
                  return currentStyle;
                }
                i--;
              }
            }
          }
        }
      }
    }
  }
  return currentStyle;
}

/**
 * Returns the styling directly linked to an element.
 * @param {Element} element
 * @returns {Object}
 */
export function getStylingFromElement(element) {
  const currentStyle = {};
  for (let i = 0; i <= element.attributes.length - 1; i++) {
    const styleAttribute = element.attributes[i];
    if (styleAttribute.name.startsWith("tts")) {
      const nameWithoutTTS = styleAttribute.name.substr(4);
      currentStyle[nameWithoutTTS] = styleAttribute.value;
    }
  }
  return currentStyle;
}
