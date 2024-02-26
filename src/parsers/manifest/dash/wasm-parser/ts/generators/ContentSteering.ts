import type { IContentSteeringIntermediateRepresentation } from "../../../node_parser_types.ts";
import type { IAttributeParser } from "../parsers_stack.ts";
import { AttributeName } from "../types.ts";
import { parseString } from "../utils.ts";

/**
 * Generate an "attribute parser" once inside a `ContentSteering` node.
 * @param {Object} contentSteeringAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateContentSteeringAttrParser(
  contentSteeringAttrs: IContentSteeringIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  return function onMPDAttribute(attr: number, ptr: number, len: number) {
    switch (attr) {
      case AttributeName.Text:
        contentSteeringAttrs.value = parseString(linearMemory.buffer, ptr, len);
        break;

      case AttributeName.DefaultServiceLocation: {
        contentSteeringAttrs.attributes.defaultServiceLocation = parseString(
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      }

      case AttributeName.QueryBeforeStart: {
        contentSteeringAttrs.attributes.queryBeforeStart =
          new DataView(linearMemory.buffer).getUint8(ptr) !== 0;
        break;
      }

      case AttributeName.ProxyServerUrl: {
        contentSteeringAttrs.attributes.proxyServerUrl = parseString(
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      }
    }
  };
}
