import reduceChildren from "../../reduce_children";
import { parseNonPrimaryEvent } from "./non_primary";
import { parsePrimaryEvent } from "./primary";

/**
 * Parse the part of schedule elements associated
 * with editorial informations about content.
 * @param {Element} node
 */
export function parseContentData(node) {
  return reduceChildren(node, (res, name, node) => {
    if(name.toLowerCase() === "ns1:genre" && node.attributes[0].value === "SchType"){
      res.type = node.textContent;
    }

    const childrens = node.childNodes;
    if (childrens) {
      for (let i = 0; i < childrens.length; i++) {
        const child = childrens[i];
        if (child.nodeName.toLowerCase() === "ns1:alternateid") {
          if (child.attributes[0].value === "Prod") {
            res.prod = child.textContent;
          } else if (child.attributes[0].value === "Prgm") {
            res.pgrm = child.textContent;
          }
        }
      }
    }
    return res;
  }, {});
}

/**
 * Parse data about event (video, logo, etc.).
 * @param {Element} node
 */
export function parseEventData(node) {
  const type = node.attributes[0].value;

  switch (type) {
    case "Primary":
      return { video: parsePrimaryEvent(node) };
    case "NonPrimary":
      const nonPrimaryEvent = parseNonPrimaryEvent(node);
      return { overlay: nonPrimaryEvent };
  }
}