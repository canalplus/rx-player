import assert from "../../../utils/assert.js";

/**
 * Gets leaf nodes of the xml node tree. Ignores the text, br elements
 * and the spans positioned inside paragraphs
 *
 * @param {Element} element
 * @throws Error - Throws if one of the childNode is not an element instance.
 * @throws Error - Throws if a children Element has no leaf.
 * @returns {Array.<Element>}
 */
export default function getLeafNodes(element) {
  let result = [];
  if (!element) {
    return result;
  }

  const childNodes = element.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    // <span> elements are pushed with their corresponding <p> elements
    const isSpanChildOfP = childNodes[i].nodeName == "span" &&
      element.nodeName == "p";

    if (childNodes[i].nodeType == Node.ELEMENT_NODE &&
      childNodes[i].nodeName != "br" && !isSpanChildOfP) {
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

