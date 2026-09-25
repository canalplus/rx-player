import type { IAdaptationSetChildren } from "../../../node_parser_types.ts";
import type { IAttributeParser } from "../parsers_stack.ts";
import { AttributeName } from "../types.ts";
import { parseString } from "../utils.ts";
import { pushChild } from "./lazy_child_array.ts";

export function generateLabelElementParser(
  adaptationSet: IAdaptationSetChildren,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  return function onMPDAttribute(attr: AttributeName, ptr: number, len: number) {
    if (attr === AttributeName.Text) {
      pushChild(adaptationSet, "Label", {
        value: parseString(linearMemory.buffer, ptr, len),
      });
    }
  };
}
