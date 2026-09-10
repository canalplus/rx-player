import { describe, expect, it } from "vitest";
import type { ISegmentTemplateIntermediateRepresentation } from "../../../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";
import { generateSegmentTemplateAttrParser } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentTemplate.ts";
import { AttributeName } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/types.ts";

describe("DASH WASM SegmentTemplate attribute parser", () => {
  it("parses boolean attributes at the supplied pointer", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const segmentTemplate: ISegmentTemplateIntermediateRepresentation = {
      attributes: {},
      children: { Initialization: [] },
    };
    const parser = generateSegmentTemplateAttrParser(segmentTemplate, memory);
    const checkBooleanAttribute = createBooleanAttributeChecker(memory, parser);

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
  memory: WebAssembly.Memory,
  parser: ReturnType<typeof generateSegmentTemplateAttrParser>,
) {
  return (attribute: AttributeName, readValue: () => boolean | undefined): void => {
    const bytes = new Uint8Array(memory.buffer);
    bytes[0] = 1;
    bytes[32] = 0;
    parser(attribute, 32, 1);
    expect(readValue()).toBe(false);
    bytes[0] = 0;
    bytes[32] = 1;
    parser(attribute, 32, 1);
    expect(readValue()).toBe(true);
  };
}
