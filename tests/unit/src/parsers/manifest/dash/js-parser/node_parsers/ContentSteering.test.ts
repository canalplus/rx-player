import { describe, expect, it } from "vitest";
import parseContentSteering from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/ContentSteering.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

describe("DASH Node Parsers - ContentSteering", () => {
  it("parses its URL and attributes", () => {
    const element = parseXml(
      `<ContentSteering defaultServiceLocation="cdn-a cdn-b"
         queryBeforeStart="true" clientRequirement="false">
         steering.json
       </ContentSteering>`,
    )[0] as ITNode;

    expect(parseContentSteering(element)).toEqual([
      {
        value: "steering.json",
        attributes: {
          defaultServiceLocation: "cdn-a cdn-b",
          queryBeforeStart: true,
          clientRequirement: false,
        },
      },
      [],
    ]);
  });

  it("ignores an empty element", () => {
    const element = parseXml("<ContentSteering />")[0] as ITNode;
    expect(parseContentSteering(element)).toEqual([undefined, []]);
  });
});
