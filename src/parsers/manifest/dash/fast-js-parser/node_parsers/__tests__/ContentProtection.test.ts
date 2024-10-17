import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ITNode } from "../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../utils/xml-parser";
import type IContentProtection from "../ContentProtection";

function testStringAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse a ContentProtection element with a correct ${attributeName} attribute`, async () => {
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element1 = parseXml(
      `<ContentProtection ${attributeName}="foobar" />`,
    )[0] as ITNode;
    expect(parseContentProtection(element1)).toEqual([
      { attributes: { [_variableName]: "foobar" }, children: { cencPssh: [] } },
      [],
    ]);

    const element2 = parseXml(`<ContentProtection ${attributeName}=\"\" />`)[0] as ITNode;
    expect(parseContentProtection(element2)).toEqual([
      { attributes: { [_variableName]: "" }, children: { cencPssh: [] } },
      [],
    ]);
  });
}

describe("DASH Node Parsers - ContentProtection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should correctly parse a ContentProtection element without attributes", async () => {
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element = parseXml("<ContentProtection />")[0] as ITNode;
    expect(parseContentProtection(element)).toEqual([
      { attributes: {}, children: { cencPssh: [] } },
      [],
    ]);
  });

  testStringAttribute("schemeIdUri");
  testStringAttribute("value");

  it("should correctly parse a ContentProtection element with a correct cenc:default_KID attribute", async () => {
    const keyId = new Uint8Array([0, 1, 2, 3]);
    const mockHexToBytes = vi.fn().mockImplementation(() => {
      return keyId;
    });
    vi.doMock("../../../../../../utils/string_parsing", () => ({
      hexToBytes: mockHexToBytes,
    }));
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element1 = parseXml(
      '<ContentProtection cenc:default_KID="dead-beef" />',
    )[0] as ITNode;

    expect(parseContentProtection(element1)).toEqual([
      { attributes: { keyId }, children: { cencPssh: [] } },
      [],
    ]);
    expect(mockHexToBytes).toHaveBeenCalledTimes(1);
    expect(mockHexToBytes).toHaveBeenCalledWith("deadbeef");
  });

  it("should correctly parse a ContentProtection with every attributes", async () => {
    const keyId = new Uint8Array([0, 1, 2, 3]);
    const mockHexToBytes = vi.fn().mockImplementation(() => {
      return keyId;
    });
    vi.doMock("../../../../../../utils/string_parsing", () => ({
      hexToBytes: mockHexToBytes,
    }));
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element = parseXml(
      `<ContentProtection
    schemeIdUri="foo"
    value="bar"
    cenc:default_KID="dead-beef"
  />`,
    )[0] as ITNode;
    expect(parseContentProtection(element)).toEqual([
      {
        attributes: { keyId, schemeIdUri: "foo", value: "bar" },
        children: { cencPssh: [] },
      },
      [],
    ]);
  });

  it("should correctly parse a ContentProtection with cenc:pssh children", async () => {
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element = parseXml(
      `<ContentProtection>
    <cenc:pssh>AABBCC</cenc:pssh>
    <cenc:pssh>AAABAC</cenc:pssh>
  </ContentProtection>
</MPD>`,
    )[0] as ITNode;

    expect(parseContentProtection(element)).toEqual([
      {
        attributes: {},
        children: {
          cencPssh: [new Uint8Array([0, 0, 65, 8]), new Uint8Array([0, 0, 1, 0])],
        },
      },
      [],
    ]);
  });

  it("should correctly parse a ContentProtection with both cenc:pssh children and every attributes", async () => {
    const keyId = new Uint8Array([0, 1, 2, 3]);
    const mockHexToBytes = vi.fn().mockImplementation(() => {
      return keyId;
    });
    vi.doMock("../../../../../../utils/string_parsing", () => ({
      hexToBytes: mockHexToBytes,
    }));
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element = parseXml(
      `<ContentProtection
    schemeIdUri="foo"
    value="bar"
    cenc:default_KID="dead-beef"
  >
    <cenc:pssh>AABBCC</cenc:pssh>
    <cenc:pssh>AAABAC</cenc:pssh>
  </ContentProtection>`,
    )[0] as ITNode;
    expect(parseContentProtection(element)).toEqual([
      {
        attributes: { keyId, schemeIdUri: "foo", value: "bar" },
        children: {
          cencPssh: [new Uint8Array([0, 0, 65, 8]), new Uint8Array([0, 0, 1, 0])],
        },
      },
      [],
    ]);
  });

  it("should return a warning if one of the cenc:pssh is invalid base64", async () => {
    const parseContentProtection = (await vi.importActual("../ContentProtection"))
      .default as typeof IContentProtection;
    const element = parseXml(
      `<ContentProtection>
    <cenc:pssh>AA!BCC</cenc:pssh>
    <cenc:pssh>AAABAC</cenc:pssh>
  </ContentProtection>`,
    )[0] as ITNode;
    const parsed = parseContentProtection(element);
    expect(parsed[0]).toEqual({
      attributes: {},
      children: { cencPssh: [new Uint8Array([0, 0, 1, 0])] },
    });
    expect(parsed[1]).not.toBe(null);
    expect(parsed[1]).toHaveLength(1);
    expect(parsed[1][0]).toBeInstanceOf(Error);
    expect(parsed[1][0].message).toEqual(
      '`cenc:pssh` is not a valid base64 string: "AA!BCC"',
    );
  });
});
