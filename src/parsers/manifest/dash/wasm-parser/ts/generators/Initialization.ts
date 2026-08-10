import type { IInitializationIntermediateRepresentation } from "../../../node_parser_types.ts";
import type { IAttributeParser } from "../parsers_stack.ts";
import { AttributeName } from "../types.ts";
import { parseString } from "../utils.ts";

export default function generateInitializationAttrParser(
  initialization: IInitializationIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onInitializationAttribute(attr, ptr, len) {
    switch (attr) {
      case AttributeName.InitializationRange: {
        const dataView = new DataView(linearMemory.buffer);
        initialization.attributes.range = [
          dataView.getFloat64(ptr, true),
          dataView.getFloat64(ptr + 8, true),
        ];
        break;
      }

      case AttributeName.InitializationMedia:
        initialization.attributes.sourceURL = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
    }
  };
}
