import { describe, expect, it } from "vitest";
import type { IAdaptationSetAttributes } from "../../../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";
import { generateAdaptationSetAttrParser } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/generators/AdaptationSet.ts";
import { AttributeName } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/types.ts";

describe("DASH WASM AdaptationSet attribute parser", () => {
  it("parses boolean attributes at the supplied pointer", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const attributes: IAdaptationSetAttributes = {};
    const parser = generateAdaptationSetAttrParser(attributes, memory);
    const checkBooleanAttribute = createBooleanAttributeChecker(memory, parser);

    checkBooleanAttribute(AttributeName.BitstreamSwitching, () => {
      return attributes.bitstreamSwitching;
    });
    checkBooleanAttribute(AttributeName.CodingDependency, () => {
      return attributes.codingDependency;
    });
    checkBooleanAttribute(AttributeName.AvailabilityTimeComplete, () => {
      return attributes.availabilityTimeComplete;
    });
  });
});

function createBooleanAttributeChecker(
  memory: WebAssembly.Memory,
  parser: ReturnType<typeof generateAdaptationSetAttrParser>,
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
