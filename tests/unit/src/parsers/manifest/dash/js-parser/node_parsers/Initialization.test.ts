import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import log from "../../../../../../../../src/log.ts";
import parseInitialization from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/Initialization.ts";
import { MPDError } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/utils.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

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
    expect(parseInitialization(element1)).toEqual([{ attributes: {} }, []]);

    const element2 = parseXml('<Foo test="" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{ attributes: {} }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with a well-formed `range` attribute", () => {
    const element1 = parseXml('<Foo range="0-1" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([
      { attributes: { range: [0, 1] } },
      [],
    ]);

    const element2 = parseXml('<Foo range="100-1000" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([
      { attributes: { range: [100, 1000] } },
      [],
    ]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with an incorrect `range` attribute", () => {
    const element1 = parseXml('<Foo range="a" />')[0] as ITNode;
    const error1 = new MPDError('`range` property has an unrecognized format "a"');
    expect(parseInitialization(element1)).toEqual([{ attributes: {} }, [error1]]);

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: "range" },
    );

    const element2 = parseXml('<Foo range="" />')[0] as ITNode;
    const error2 = new MPDError('`range` property has an unrecognized format ""');
    expect(parseInitialization(element2)).toEqual([{ attributes: {} }, [error2]]);

    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: "range" },
    );
  });

  it("should correctly parse an element with a sourceURL attribute", () => {
    const element1 = parseXml('<Foo sourceURL="a" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([
      { attributes: { sourceURL: "a" } },
      [],
    ]);

    const element2 = parseXml('<Foo sourceURL="" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([
      { attributes: { sourceURL: "" } },
      [],
    ]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with both a sourceURL and range attributes", () => {
    const element1 = parseXml('<Foo sourceURL="a" range="4-10" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([
      { attributes: { sourceURL: "a", range: [4, 10] } },
      [],
    ]);

    expect(logWarn).not.toHaveBeenCalled();
  });
});
