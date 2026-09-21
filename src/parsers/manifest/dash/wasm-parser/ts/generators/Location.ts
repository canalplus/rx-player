import type { ILocationIntermediateRepresentation } from "../../../node_parser_types.ts";
import type { IAttributeParser } from "../parsers_stack.ts";
import { AttributeName } from "../types.ts";
import { parseString } from "../utils.ts";

/** Generate the attribute parser for a root-level `<Location>` element. */
export function generateLocationAttrParser(
  location: ILocationIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return (attribute, ptr, len) => {
    switch (attribute) {
      case AttributeName.Text:
        location.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.ServiceLocation:
        location.attributes.serviceLocation = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
    }
  };
}
