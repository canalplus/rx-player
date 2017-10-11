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
 * @param {Element} baseElement
 * @param {string} wantedElementName
 * @param {Array.<Element>} regions
 * @returns {Element|null}
 */
function getReferencedElement(
  baseElement, wantedElementName, collection) {
  const idWantedElement = baseElement.getAttribute(wantedElementName);
  if (idWantedElement) {
    const wantedElement = findElementFromIDREF(collection, idWantedElement);
    return wantedElement || null;
  }
  return null;
}

/**
 * @param {Element} element
 * @param {Array.<Element>} regions
 * @returns {Element|null}
 */
function getReferencedRegion(element, regions) {
  return getReferencedElement(element, "region", regions);
}

/**
 * @param {Element} element
 * @param {Array.<Element>} regions
 * @returns {Element|null}
 */
function getReferencedStyle(element, styles) {
  return getReferencedElement(element, "style", styles);
}

/**
 * @example simple case:
 * ```jsx
 * const collection = [
 *   <div xml:id="foo" />,
 *   <div xml:id="bar" />,
 *   <div xml:id="baz" />
 * ];
 *
 * findElementFromIDREF(collection, "bar");
 * // => <div xml:id="bar" />
 * ```
 *
 * @param {Array<Element>} collection
 * @param {string} element
 * @returns {Element|undefined}
 */
function findElementFromIDREF(collection, idref) {
  for (let i = 0; i < collection.length; i++) {
    if (collection[i].getAttribute("xml:id") === idref) {
      return collection[i];
    }
  }
}

/**
 * TODO nesting style references?
 * TODO avoid circular references?
 * @param {string} attribute - The style attribute for which the value is
 * wanted, e.g. "color"
 * @param {Array.<Elements>} styles - All the styles elements from which the
 * style could be inherited.
 * @param {Array.<Elements>} regions - All the regions elements from which the
 * style could be inherited.
 * @param {Array.<Elements|null>} elements - All the elements from which the
 * style could be inherited (either through direct style reference or through
 * regions and/or styles referencing). In order of importance.
 * @returns {string|null}
 */
export default function getStyleValue(
  attribute,
  styles,
  regions,
  elements
) {
  for (let i = 0; i <= elements.length - 1; i++) {
    const element = elements[i];
    if (element) {
      // 1. the style is directly set on a "tts:" attribute
      const directAttrValue = element.getAttribute("tts:" + attribute);
      if (directAttrValue != null) {
        return directAttrValue;
      }

      // 2. the style is referenced on a "style" attribute
      const style = getReferencedStyle(element, styles);
      if (style && style != element) {
        // TODO hasAttribute?
        const attrValue = style.getAttribute("tts:" + attribute);
        if (attrValue != null) {
          return attrValue;
        }
      }

      // 3. the element reference a region (which can have a value for the
      //    corresponding style)
      const region = getReferencedRegion(element, regions);
      if (region && region !== element) {
        const attrValue = getStyleValue(attribute, styles, regions, [region]);
        if (attrValue != null) {
          return attrValue;
        }
      }
    }
  }
  return null;
}
