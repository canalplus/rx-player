import type { IAdaptationSetChildren } from "../../../node_parser_types.ts";
import type { IAttributeParser } from "../parsers_stack.ts";
import { AttributeName } from "../types.ts";
import { parseString } from "../utils.ts";

export function generateLabelElementParser(
  adaptationSet: IAdaptationSetChildren,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return function onMPDAttribute(attr: AttributeName, ptr: number, len: number) {
    if (attr === AttributeName.Text) {
      adaptationSet.label = parseString(textDecoder, linearMemory.buffer, ptr, len);
    }
  };
}
