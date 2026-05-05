import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import log from "../../../../../../log.ts";
import type { ITNode } from "../../../../../../utils/xml-parser.ts";
import { parseXml } from "../../../../../../utils/xml-parser.ts";
import parseInitialization from "../Initialization.ts";
import { MPDError } from "../utils.ts";

const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {
  /* noop */
});

describe("DASH Node Parsers - Initialization", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    logWarn.mockClear();
  });

  it("should correctly parse an element with no known attribute", () => {
    const element1 = parseXml("<Foo />")[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{}, []]);

    const element2 = parseXml('<Foo test="" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{}, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with a well-formed `range` attribute", () => {
    const element1 = parseXml('<Foo range="0-1" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{ range: [0, 1] }, []]);

    const element2 = parseXml('<Foo range="100-1000" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{ range: [100, 1000] }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with an incorrect `range` attribute", () => {
    const element1 = parseXml('<Foo range="a" />')[0] as ITNode;
    const error1 = new MPDError('`range` property has an unrecognized format "a"');
    expect(parseInitialization(element1)).toEqual([{}, [error1]]);

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { dashName: "range" },
    );

    const element2 = parseXml('<Foo range="" />')[0] as ITNode;
    const error2 = new MPDError('`range` property has an unrecognized format ""');
    expect(parseInitialization(element2)).toEqual([{}, [error2]]);

    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { dashName: "range" },
    );
  });

  it("should correctly parse an element with a sourceURL attribute", () => {
    const element1 = parseXml('<Foo sourceURL="a" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{ media: "a" }, []]);

    const element2 = parseXml('<Foo sourceURL="" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{ media: "" }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with both a sourceURL and range attributes", () => {
    const element1 = parseXml('<Foo sourceURL="a" range="4-10" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{ media: "a", range: [4, 10] }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });
});
