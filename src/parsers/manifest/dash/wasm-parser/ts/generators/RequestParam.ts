import noop from "../../../../../../utils/noop.ts";
import type { IRequestParameterIntermediateRepresentation } from "../../../node_parser_types.ts";
import type ParsersStack from "../parsers_stack.ts";
import { generateUrlQueryInfoAttrParser } from "./Descriptor.ts";

export default function pushRequestParamParser(
  destination: IRequestParameterIntermediateRepresentation[],
  nodeId: number,
  linearMemory: WebAssembly.Memory,
  parsersStack: ParsersStack,
): void {
  const requestParam: IRequestParameterIntermediateRepresentation = {
    attributes: {},
  };
  destination.push(requestParam);
  parsersStack.pushParsers(
    nodeId,
    noop,
    generateUrlQueryInfoAttrParser(requestParam.attributes, linearMemory),
  );
}
