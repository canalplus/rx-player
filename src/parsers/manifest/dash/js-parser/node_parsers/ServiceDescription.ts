import isNullOrUndefined from "../../../../../utils/is_null_or_undefined.ts";
import type { ITNode } from "../../../../../utils/xml-parser.ts";
import type { IServiceDescriptionIntermediateRepresentation } from "../../node_parser_types.ts";
import parseContentSteering from "./ContentSteering.ts";

/** Parse a root-level `<ServiceDescription>` element. */
export default function parseServiceDescription(
  root: ITNode,
): [IServiceDescriptionIntermediateRepresentation, Error[]] {
  const serviceDescription: IServiceDescriptionIntermediateRepresentation = {
    attributes: {},
    children: { ContentSteering: [] },
  };
  if (!isNullOrUndefined(root.attributes.id)) {
    serviceDescription.attributes.id = root.attributes.id;
  }
  const warnings: Error[] = [];
  for (const child of root.children) {
    if (typeof child === "string" || child.tagName !== "ContentSteering") {
      continue;
    }
    const [contentSteering, contentSteeringWarnings] = parseContentSteering(child);
    if (contentSteering !== undefined) {
      serviceDescription.children.ContentSteering.push(contentSteering);
    }
    warnings.push(...contentSteeringWarnings);
  }
  return [serviceDescription, warnings];
}
