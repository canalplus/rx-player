import { describe, expect, it } from "vitest";
import { createMPDIntermediateRepresentation } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/MPD.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

describe("DASH Node Parsers - MPD", () => {
  it("parses EssentialProperty and SupplementalProperty descriptors", () => {
    const element = parseXml(
      `<MPD>
        <EssentialProperty id="foo" schemeIdUri="urn:example:essential" value="1" />
        <SupplementalProperty id="bar" schemeIdUri="urn:example:supplemental" value="2" />
      </MPD>`,
    )[0] as ITNode;

    const [mpd, warnings] = createMPDIntermediateRepresentation(element, "");
    expect(mpd.children.EssentialProperty).toEqual([
      {
        attributes: {
          id: "foo",
          schemeIdUri: "urn:example:essential",
          value: "1",
        },
        children: { UrlQueryInfo: [], ExtUrlQueryInfo: [] },
      },
    ]);
    expect(mpd.children.SupplementalProperty).toEqual([
      {
        attributes: {
          id: "bar",
          schemeIdUri: "urn:example:supplemental",
          value: "2",
        },
        children: { UrlQueryInfo: [], ExtUrlQueryInfo: [] },
      },
    ]);
    expect(warnings).toEqual([]);
  });
});
