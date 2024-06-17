import { describe, it, expect } from "vitest";
import parseContentComponent from "../ContentComponent";

function testStringAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse a contentComponent element with a correct ${attributeName} attribute`, () => {
    const element1 = new DOMParser().parseFromString(
      `<contentComponent ${attributeName}="foobar" />`,
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseContentComponent(element1)).toEqual({
      [_variableName]: "foobar",
    });

    const element2 = new DOMParser().parseFromString(
      `<contentComponent ${attributeName}=\"\" />`,
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseContentComponent(element2)).toEqual({ [_variableName]: "" });
  });
}

describe("DASH Node Parsers - ContentComponent", () => {
  it("should correctly parse a ContentComponent element without attributes", () => {
    const element = new DOMParser().parseFromString("<Content />", "text/xml")
      .childNodes[0] as Element;
    expect(parseContentComponent(element)).toEqual({});
  });
  testStringAttribute("id");
  testStringAttribute("lang", "language");
  testStringAttribute("contentType");
  testStringAttribute("par");

  it("should correctly parse a contentComponent with every attributes", () => {
    const element = new DOMParser().parseFromString(
      `<contentComponent
        id ="foo"
        lang="bar"
        contentType="audio/mp5"
        par="3/4"
        />`,
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseContentComponent(element)).toEqual({
      id: "foo",
      language: "bar",
      contentType: "audio/mp5",
      par: "3/4",
    });
  });
});
