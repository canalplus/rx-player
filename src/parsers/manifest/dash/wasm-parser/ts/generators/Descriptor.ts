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

/** Generate parsers for an EssentialProperty/SupplementalProperty descriptor. */
export function generateDescriptorParsers(
  property: IDescriptorIntermediateRepresentation,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): { children: IChildrenParser; attributes: IAttributeParser } {
  const childrenParser: IChildrenParser = (childId) => {
    if (childId === TagName.UrlQueryInfo || childId === TagName.ExtUrlQueryInfo) {
      const queryInfo: IUrlQueryInfoIntermediateRepresentation = {
        attributes: {},
      };
      const queryDestination =
        childId === TagName.UrlQueryInfo
          ? property.children.UrlQueryInfo
          : property.children.ExtUrlQueryInfo;
      queryDestination.push(queryInfo);
      parsersStack.pushParsers(
        childId,
        noop,
        generateUrlQueryInfoAttrParser(queryInfo.attributes, linearMemory),
      );
    } else {
      parsersStack.pushParsers(childId, noop, noop);
    }
  };
  return {
    children: childrenParser,
    attributes: generateDescriptorAttrParser(property.attributes, linearMemory),
  };
}

function generateDescriptorAttrParser(
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
  queryInfo: IUrlQueryInfoIntermediateRepresentation["attributes"],
  linearMemory: WebAssembly.Memory,
): IAttributeParser {
  const textDecoder = new TextDecoder();
  return (attribute, ptr, len) => {
    switch (attribute) {
      case AttributeName.QueryString:
        queryInfo.queryString = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.QueryTemplate:
        queryInfo.queryTemplate = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.IncludeInRequests:
        queryInfo.includeInRequests = parseString(
          textDecoder,
          linearMemory.buffer,
          ptr,
          len,
        );
        break;
      case AttributeName.UseMpdUrlQuery:
        queryInfo.useMpdUrlQuery = new DataView(linearMemory.buffer).getUint8(0) === 0;
        break;
    }
  };
}
