import isNullOrUndefined from "../../../../../utils/is_null_or_undefined.ts";
import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type { IUrlQueryInfoIntermediateRepresentation } from "../../node_parser_types.ts";
import { parseBoolean, ValueParser } from "./utils.ts";

/** Parse a `<UrlQueryInfo>` or `<ExtUrlQueryInfo>` element. */
export default function parseUrlQueryInfo(
  root: ITNode,
): [IUrlQueryInfoIntermediateRepresentation, Error[]] {
  const attributes: IUrlQueryInfoIntermediateRepresentation["attributes"] = {};
  const warnings: Error[] = [];
  const parseValue = ValueParser(attributes, warnings);
  for (const attributeName of Object.keys(root.attributes)) {
    const attributeValue = root.attributes[attributeName];
    if (isNullOrUndefined(attributeValue)) {
      continue;
    }
    switch (attributeName) {
      case "queryString":
        attributes.queryString = attributeValue;
        break;
      case "queryTemplate":
        attributes.queryTemplate = attributeValue;
        break;
      case "includeInRequests":
        attributes.includeInRequests = attributeValue;
        break;
      case "useMPDUrlQuery":
        parseValue(attributeValue, {
          parser: parseBoolean,
          name: "useMpdUrlQuery",
        });
        break;
    }
  }
  return [{ attributes }, warnings];
}
