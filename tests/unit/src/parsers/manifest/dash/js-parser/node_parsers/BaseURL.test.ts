import { describe, expect, it } from "vitest";
import parseBaseURL from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/BaseURL.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

describe("DASH Node Parsers - BaseURL", () => {
  it("should correctly parse a BaseURL and its serviceLocation", () => {
    const element = parseXml(
      '<BaseURL serviceLocation="cdn-a" ignored="value">https://cdn.example/</BaseURL>',
    )[0] as ITNode;

    expect(parseBaseURL(element)).toEqual([
      {
        value: "https://cdn.example/",
        attributes: { serviceLocation: "cdn-a" },
      },
      [],
    ]);
  });
});
