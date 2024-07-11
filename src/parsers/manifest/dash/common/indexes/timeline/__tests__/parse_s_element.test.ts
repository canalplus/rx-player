import { describe, it, expect, vi } from "vitest";
import log from "../../../../../../../log";
import type { ITNode } from "../../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../../utils/xml-parser";
import { parseSElementNode } from "../parse_s_element";

function testNumberAttribute(attributeName: string, variableName?: string): void {
  const _variableName = variableName ?? attributeName;

  it(`should correctly parse a node S element with a correct ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<S ${attributeName}="012" />`)[0] as ITNode;
    expect(parseSElementNode(element1)).toEqual({ [_variableName]: 12 });

    const element2 = parseXml(`<S ${attributeName}="0" />`)[0] as ITNode;
    expect(parseSElementNode(element2)).toEqual({ [_variableName]: 0 });

    const element3 = parseXml(`<S ${attributeName}="-50" />`)[0] as ITNode;
    expect(parseSElementNode(element3)).toEqual({ [_variableName]: -50 });

    expect(spyLog).not.toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it(`should correctly parse a node S element with an incorrect ${attributeName} attribute`, () => {
    const spyLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());
    const element1 = parseXml(`<S ${attributeName}="toto" />`)[0] as ITNode;
    expect(parseSElementNode(element1)).toEqual({});
    expect(spyLog).toHaveBeenCalledTimes(1);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("toto")`);

    const element2 = parseXml(`<S ${attributeName}="PT5M" />`)[0] as ITNode;
    expect(parseSElementNode(element2)).toEqual({});
    expect(spyLog).toHaveBeenCalledTimes(2);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("PT5M")`);

    const element3 = parseXml(`<S ${attributeName}="" />`)[0] as ITNode;

    expect(parseSElementNode(element3)).toEqual({});
    expect(spyLog).toHaveBeenCalledTimes(3);
    expect(spyLog).toHaveBeenCalledWith(`DASH: invalid ${attributeName} ("")`);
    spyLog.mockRestore();
  });
}

describe("DASH Node Parsers - S", () => {
  testNumberAttribute("t", "start");
  testNumberAttribute("r", "repeatCount");
  testNumberAttribute("d", "duration");

  it("should correctly parse a node S Element with every attributes", () => {
    const element1 = parseXml('<S t="0" d="4" r="12" />')[0] as ITNode;
    expect(parseSElementNode(element1)).toEqual({
      start: 0,
      repeatCount: 12,
      duration: 4,
    });

    const element2 = parseXml('<S t="99" d="4" r="0" />')[0] as ITNode;
    expect(parseSElementNode(element2)).toEqual({
      start: 99,
      repeatCount: 0,
      duration: 4,
    });
  });

  it("should correctly parse a node S Element with unknown attributes", () => {
    const element1 = parseXml('<S t="0" d="4" r="12" f="9" />')[0] as ITNode;
    expect(parseSElementNode(element1)).toEqual({
      start: 0,
      repeatCount: 12,
      duration: 4,
    });

    const element2 = parseXml('<S b="7000" />')[0] as ITNode;
    expect(parseSElementNode(element2)).toEqual({});
  });
});
