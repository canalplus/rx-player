import { describe, expect, it } from "vitest";
import type { ISegmentBaseIntermediateRepresentation } from "../../../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";
import { generateSegmentBaseAttrParser } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentBase.ts";
import { AttributeName } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/types.ts";

describe("DASH WASM SegmentBase attribute parser", () => {
  it("parses boolean attributes from their direct value", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const segmentBase: ISegmentBaseIntermediateRepresentation = {
      attributes: {},
      children: { Initialization: [] },
    };
    const parser = generateSegmentBaseAttrParser(segmentBase, memory);
    const checkBooleanAttribute = createBooleanAttributeChecker(parser);

    checkBooleanAttribute(AttributeName.AvailabilityTimeComplete, () => {
      return segmentBase.attributes.availabilityTimeComplete;
    });
    checkBooleanAttribute(AttributeName.IndexRangeExact, () => {
      return segmentBase.attributes.indexRangeExact;
    });
  });
});

function createBooleanAttributeChecker(
  parser: ReturnType<typeof generateSegmentBaseAttrParser>,
) {
  return (attribute: AttributeName, readValue: () => boolean | undefined): void => {
    parser(attribute, 0, 0, 0);
    expect(readValue()).toBe(false);
    parser(attribute, 0, 0, 1);
    expect(readValue()).toBe(true);
  };
}
