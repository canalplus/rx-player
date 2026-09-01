import noop from "../../../../../../utils/noop.ts";
import type {
  IDescriptorAttributes,
  IDescriptorIntermediateRepresentation,
  IUrlQueryInfoIntermediateRepresentation,
} from "../../../node_parser_types.ts";
import type { IAttributeParser, IChildrenParser } from "../parsers_stack.ts";
import type ParsersStack from "../parsers_stack.ts";
import { AttributeName, TagName } from "../types.ts";
import { parseString } from "../utils.ts";
import { generateSchemeAttrParser } from "./Scheme.ts";

export function generateDescriptorParsers(
  property: IDescriptorIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): { children: IChildrenParser; attributes: IAttributeParser } {
  const childrenParser: IChildrenParser = (childId) => {
    if (childId !== TagName.UrlQueryInfo && childId !== TagName.ExtUrlQueryInfo) {
      parsersStack.pushParsers(childId, noop, noop);
      return;
    }
    const queryInfo: IUrlQueryInfoIntermediateRepresentation = { attributes: {} };
    const destination =
      childId === TagName.UrlQueryInfo
        ? property.children.UrlQueryInfo
        : property.children.ExtUrlQueryInfo;
    destination.push(queryInfo);
    parsersStack.pushParsers(
      childId,
      noop,
      generateUrlQueryInfoAttrParser(queryInfo.attributes, linearMemory),
    );
  };
  return {
    children: childrenParser,
    attributes: generateDescriptorAttrParser(property.attributes, linearMemory),
  };
}

/** Generate parsers for an EssentialProperty/SupplementalProperty descriptor. */
export function generateDescriptorAttrParser(
  attributes: IDescriptorAttributes,
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  const parseSchemeAttribute = generateSchemeAttrParser(attributes, linearMemory);
  return (attribute, ptr, len) => {
    if (attribute === AttributeName.Id) {
      attributes.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
    } else {
      parseSchemeAttribute(attribute, ptr, len);
    }
  };
}

function generateUrlQueryInfoAttrParser(
  attributes: IUrlQueryInfoIntermediateRepresentation["attributes"],
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return (attribute, ptr, len) => {
    switch (attribute) {
      case AttributeName.QueryString:
        attributes.queryString = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.QueryTemplate:
        attributes.queryTemplate = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.IncludeInRequests:
        attributes.includeInRequests = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.UseMpdUrlQuery:
        attributes.useMpdUrlQuery = new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
      case AttributeName.SameOriginOnly:
        attributes.sameOriginOnly = new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
    }
  };
}
