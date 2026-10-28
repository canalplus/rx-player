import { describe, expect, it } from "vitest";
import parseDescriptor from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/Descriptor.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

describe("DASH Node Parsers - Descriptor", () => {
  it("parses the common descriptor attributes", () => {
    const element = parseXml(
      '<EssentialProperty id="property-id" schemeIdUri="urn:example" value="yes" />',
    )[0] as ITNode;

    expect(parseDescriptor(element)).toEqual([
      {
        attributes: {
          id: "property-id",
          schemeIdUri: "urn:example",
          value: "yes",
        },
        children: { UrlQueryInfo: [], ExtUrlQueryInfo: [] },
      },
      [],
    ]);
  });

  it("ignores unknown attributes and children", () => {
    const element = parseXml(
      '<SupplementalProperty unknown="value"><Unknown /></SupplementalProperty>',
    )[0] as ITNode;

    expect(parseDescriptor(element)).toEqual([
      {
        attributes: {},
        children: { UrlQueryInfo: [], ExtUrlQueryInfo: [] },
      },
      [],
    ]);
  });

  it("parses Annex I URL query information children", () => {
    const element = parseXml(
      `<EssentialProperty>
        <up:UrlQueryInfo queryString="token=1" useMPDUrlQuery="true" />
        <up:ExtUrlQueryInfo queryTemplate="$querypart$" includeInRequests="mpd segment" />
      </EssentialProperty>`,
    )[0] as ITNode;

    const [descriptor, warnings] = parseDescriptor(element);
    expect(descriptor.children).toEqual({
      UrlQueryInfo: [{ attributes: { queryString: "token=1", useMpdUrlQuery: true } }],
      ExtUrlQueryInfo: [
        {
          attributes: {
            queryTemplate: "$querypart$",
            includeInRequests: "mpd segment",
          },
        },
      ],
    });
    expect(warnings).toEqual([]);
  });

  it("forwards warnings from Annex I children", () => {
    const element = parseXml(
      '<EssentialProperty><up:UrlQueryInfo useMPDUrlQuery="invalid" /></EssentialProperty>',
    )[0] as ITNode;

    const [, warnings] = parseDescriptor(element);
    expect(warnings).toHaveLength(1);
  });
});
