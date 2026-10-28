import { describe, expect, it } from "vitest";
import { createPeriodIntermediateRepresentation } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/Period.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

describe("DASH Node Parsers - Period", () => {
  it("parses SupplementalProperty descriptors", () => {
    const element = parseXml(
      `<Period>
        <SupplementalProperty schemeIdUri="urn:mpeg:dash:urlparam:2014">
          <up:UrlQueryInfo queryString="token=1" useMPDUrlQuery="true" />
        </SupplementalProperty>
      </Period>`,
    )[0] as ITNode;

    const [period, warnings] = createPeriodIntermediateRepresentation(element, "");
    expect(period.children.SupplementalProperty).toEqual([
      {
        attributes: { schemeIdUri: "urn:mpeg:dash:urlparam:2014" },
        children: {
          UrlQueryInfo: [
            { attributes: { queryString: "token=1", useMpdUrlQuery: true } },
          ],
          ExtUrlQueryInfo: [],
        },
      },
    ]);
    expect(warnings).toEqual([]);
  });
});
