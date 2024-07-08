import { describe, it, expect } from "vitest";
import type { ITNode } from "../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../utils/xml-parser";
import parseContentComponent from "../ContentComponent";

function testStringAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse a contentComponent element with a correct ${attributeName} attribute`, () => {
    const element1 = parseXml(
      `<contentComponent ${attributeName}="foobar" />`,
    )[0] as ITNode;
    expect(parseContentComponent(element1)).toEqual({
      [_variableName]: "foobar",
    });

    const element2 = parseXml(`<contentComponent ${attributeName}=\"\" />`)[0] as ITNode;
    expect(parseContentComponent(element2)).toEqual({ [_variableName]: "" });
  });
}

describe("DASH Node Parsers - ContentComponent", () => {
  it("should correctly parse a ContentComponent element without attributes", () => {
    const element = parseXml("<Content />")[0] as ITNode;
    expect(parseContentComponent(element)).toEqual({});
  });
  testStringAttribute("id");
  testStringAttribute("lang", "language");
  testStringAttribute("contentType");
  testStringAttribute("par");

  it("should correctly parse a contentComponent with every attributes", () => {
    const element = parseXml(
      `<contentComponent
        id ="foo"
        lang="bar"
        contentType="audio/mp5"
        par="3/4"
        />`,
    )[0] as ITNode;
    expect(parseContentComponent(element)).toEqual({
      id: "foo",
      language: "bar",
      contentType: "audio/mp5",
      par: "3/4",
    });
  });
});
