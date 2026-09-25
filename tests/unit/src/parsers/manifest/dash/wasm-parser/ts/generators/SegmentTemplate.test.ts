import { describe, expect, it } from "vitest";
import type { ISegmentTemplateIntermediateRepresentation } from "../../../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";
import { generateSegmentTemplateAttrParser } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentTemplate.ts";
import { AttributeName } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/types.ts";

describe("DASH WASM SegmentTemplate attribute parser", () => {
  it("parses boolean attributes from their direct value", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const segmentTemplate: ISegmentTemplateIntermediateRepresentation = {
      attributes: {},
      children: { Initialization: [] },
    };
    const parser = generateSegmentTemplateAttrParser(segmentTemplate, memory);
    const checkBooleanAttribute = createBooleanAttributeChecker(parser);

    checkBooleanAttribute(AttributeName.AvailabilityTimeComplete, () => {
      return segmentTemplate.attributes.availabilityTimeComplete;
    });
    checkBooleanAttribute(AttributeName.IndexRangeExact, () => {
      return segmentTemplate.attributes.indexRangeExact;
    });
    checkBooleanAttribute(AttributeName.BitstreamSwitching, () => {
      return segmentTemplate.attributes.bitstreamSwitching;
    });
  });
});

function createBooleanAttributeChecker(
  parser: ReturnType<typeof generateSegmentTemplateAttrParser>,
) {
  return (attribute: AttributeName, readValue: () => boolean | undefined): void => {
    parser(attribute, 0, 0, 0);
    expect(readValue()).toBe(false);
    parser(attribute, 0, 0, 1);
    expect(readValue()).toBe(true);
  };
}
