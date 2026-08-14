import type { ILocationIntermediateRepresentation } from "../../../node_parser_types.ts";
import type { IAttributeParser } from "../parsers_stack.ts";
import { AttributeName } from "../types.ts";
import { parseString } from "../utils.ts";

/** Generate the attribute parser for a root-level `<Location>` element. */
export function generateLocationAttrParser(
  location: ILocationIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  return (attribute, ptr, len) => {
    switch (attribute) {
      case AttributeName.Text:
        location.value = parseString(linearMemory.buffer, ptr, len);
        break;
      case AttributeName.ServiceLocation:
        location.attributes.serviceLocation = parseString(
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
    }
  };
}
