import { describe, expect, it } from "vitest";
import type { IRepresentationAttributes } from "../../../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";
import { generateRepresentationAttrParser } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/generators/Representation.ts";
import { AttributeName } from "../../../../../../../../../src/parsers/manifest/dash/wasm-parser/ts/types.ts";

describe("DASH WASM Representation attribute parser", () => {
  it("parses boolean attributes from their direct value", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const attributes: IRepresentationAttributes = {};
    const parser = generateRepresentationAttrParser(attributes, memory);
    const checkBooleanAttribute = createBooleanAttributeChecker(parser);

    checkBooleanAttribute(AttributeName.CodingDependency, () => {
      return attributes.codingDependency;
    });
    checkBooleanAttribute(AttributeName.AvailabilityTimeComplete, () => {
      return attributes.availabilityTimeComplete;
    });
  });
});

function createBooleanAttributeChecker(
  parser: ReturnType<typeof generateRepresentationAttrParser>,
) {
  return (attribute: AttributeName, readValue: () => boolean | undefined): void => {
    parser(attribute, 0, 0, 0);
    expect(readValue()).toBe(false);
    parser(attribute, 0, 0, 1);
    expect(readValue()).toBe(true);
  };
}
