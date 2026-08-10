import noop from "../../../../../../utils/noop.ts";
import type { IServiceDescriptionIntermediateRepresentation } from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { parseString } from "../utils.ts";
import { generateContentSteeringAttrParser } from "./ContentSteering.ts";

/** Generate parsers for a `<ServiceDescription>` element. */
export function generateServiceDescriptionParsers(
  serviceDescription: IServiceDescriptionIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): { children: IChildrenParser; attributes: IAttributeParser } {
  const childrenParser: IChildrenParser = (childId) => {
    if (childId === TagName.ContentSteering) {
      const contentSteering = { value: "", attributes: {} };
      serviceDescription.children.ContentSteering.push(contentSteering);
      parsersStack.pushParsers(
        childId,
        noop,
        generateContentSteeringAttrParser(contentSteering, linearMemory),
      );
    } else {
      parsersStack.pushParsers(childId, noop, noop);
    }
  };
  const textDecoder = new TextDecoder();
  const attributeParser: IAttributeParser = (attribute, ptr, len) => {
    if (attribute === AttributeName.Id) {
      serviceDescription.attributes.id = parseString(
        textDecoder,
        linearMemory.buffer,
        ptr,
        len,
      );
    }
  };
  return { children: childrenParser, attributes: attributeParser };
}
