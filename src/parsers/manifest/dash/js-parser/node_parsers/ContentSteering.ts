import isNullOrUndefined from "../../../../../utils/is_null_or_undefined.ts";
import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type { IContentSteeringIntermediateRepresentation } from "../../node_parser_types.ts";
import { parseBoolean, textContent, ValueParser } from "./utils.ts";

/**
 * Parse an ContentSteering element into an ContentSteering intermediate
 * representation.
 * @param {Object} root - The ContentSteering root element.
 * @returns {Array.<Object|undefined>}
 */
export default function parseContentSteering(
  root: ITNode,
): [IContentSteeringIntermediateRepresentation | undefined, Error[]] {
  const attributes: {
    defaultServiceLocation?: string;
    queryBeforeStart?: boolean;
    proxyServerUrl?: string;
  } = {};
  const value = typeof root === "string" ? root : textContent(root.children);
  const warnings: Error[] = [];
  if (value === null || value.length === 0) {
    return [undefined, warnings];
  }
  const parseValue = ValueParser(attributes, warnings);
  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "defaultServiceLocation":
        attributes.defaultServiceLocation = attributeVal;
        break;

      case "queryBeforeStart":
        parseValue(attributeVal, {
          parser: parseBoolean,
          name: "queryBeforeStart",
        });
        break;

      case "proxyServerUrl":
        attributes.proxyServerUrl = attributeVal;
        break;
    }
  }

  return [{ value, attributes }, warnings];
}
