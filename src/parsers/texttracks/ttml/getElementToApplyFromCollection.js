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
 * Traverses upwards from a given node until a given attribute is found.
 * @param {Element} element
 * @param {string} attributeName
 * @returns {string|null}
 */
function getInheritedAttribute(element, attributeName) {
  let ret = null;
  while (element) {
    ret = element.getAttribute(attributeName);
    if (ret) {
      break;
    }

    // Element.parentNode can lead to XMLDocument, which is not an Element and
    // has no getAttribute().
    const parentNode = element.parentNode;
    if (parentNode instanceof Element) {
      element = parentNode;
    } else {
      break;
    }
  }
  return ret;
}

/**
 * Retrieve the right element from the collection, depending if an IDREF is
 * found in the attribute (defined by attributeName) present either in the
 * element or in one of its parent
 *
 * @example simple case:
 * const collection = [
 *   <div xml:id="foo" />
 *   <div xml:id="bar" />
 *   <div xml:id="baz" />
 * ];
 * const element = <span someAttr="bar" someOtherAttr="smthg" />;
 * getElementsToApply(element, "someAttr", collection);
 *   => <div xml:id="bar" />
 *
 * @example attribute found in parent:
 * const collection = [
 *   <div xml:id="foo" />
 *   <div xml:id="bar" />
 *   <div xml:id="baz" />
 * ];
 * const element = <div someAttr="foo">
 *                   <span someOtherAttr="smthg" />
 *                 </div>;
 * getElementsToApply(element, "someAttr", collection);
 *   => <div xml:id="foo" />
 *
 * TODO IDREFS (IDREF separated by space)
 *
 * @param {Element} element - Element linked to the attributeName.
 * (The attributeName will be search on it and then on the parents).
 * @param {string} attributeName - attribute name which should contain the IDREF
 * to an element of the given collection.
 * @param {Array.<Element>} collection - collection of all possible elements to
 * apply.
 * @returns {Element|null} - If an element containing the IDREF defined by
 * attributeName has been found in element or in one of its parent, the element.
 * In any other case, null.
 */
export default function getElementToApplyFromCollection(
 attributeName, element, collection
) {
  if (!element || collection.length < 1) {
    return null;
  }
  let item = null;
  const itemName = getInheritedAttribute(element, attributeName);
  if (itemName) {
    for (let i = 0; i < collection.length; i++) {
      if (collection[i].getAttribute("xml:id") == itemName) {
        item = collection[i];
        break;
      }
    }
  }

  return item;
}
