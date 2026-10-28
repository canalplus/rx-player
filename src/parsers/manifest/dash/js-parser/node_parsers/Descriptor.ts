import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type { IDescriptorIntermediateRepresentation } from "../../node_parser_types.ts";
import parseUrlQueryInfo from "./UrlQueryInfo.ts";
import { parseScheme } from "./utils.ts";

/**
 * Parse an `<EssentialProperty>` or `<SupplementalProperty>` descriptor.
 */
export default function parseDescriptor(
  root: ITNode,
): [IDescriptorIntermediateRepresentation, Error[]] {
  const children: IDescriptorIntermediateRepresentation["children"] = {
    UrlQueryInfo: [],
    ExtUrlQueryInfo: [],
  };
  const property: IDescriptorIntermediateRepresentation = {
    attributes: parseScheme(root).attributes,
    children,
  };
  if (typeof root.attributes.id === "string") {
    property.attributes.id = root.attributes.id;
  }
  const warnings: Error[] = [];
  for (const child of root.children) {
    if (typeof child === "string") {
      continue;
    }
    // TODO Support other XML prefixes also linked to the `up` namespace.
    if (child.tagName === "up:UrlQueryInfo") {
      const [queryInfo, queryInfoWarnings] = parseUrlQueryInfo(child);
      children.UrlQueryInfo.push(queryInfo);
      warnings.push(...queryInfoWarnings);
    } else if (child.tagName === "up:ExtUrlQueryInfo") {
      const [queryInfo, queryInfoWarnings] = parseUrlQueryInfo(child);
      children.ExtUrlQueryInfo.push(queryInfo);
      warnings.push(...queryInfoWarnings);
    }
  }
  return [property, warnings];
}
