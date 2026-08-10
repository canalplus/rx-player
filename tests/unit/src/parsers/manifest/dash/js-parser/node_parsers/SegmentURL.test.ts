import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import log from "../../../../../../../../src/log.ts";
import parseSegmentURL from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/SegmentURL.ts";
import { MPDError } from "../../../../../../../../src/parsers/manifest/dash/js-parser/node_parsers/utils.ts";
import type { ITNode } from "../../../../../../../../src/utils/xml-parser.ts";
import { parseXml } from "../../../../../../../../src/utils/xml-parser.ts";

const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {
  /* noop */
});

describe("DASH Node Parsers - SegmentURL", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    logWarn.mockClear();
  });

  it("should correctly parse an element with no known attribute", () => {
    const element1 = parseXml("<Foo />")[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ attributes: {} }, []]);

    const element2 = parseXml('<Foo test="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ attributes: {} }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with a well-formed `mediaRange` attribute", () => {
    const element1 = parseXml('<Foo mediaRange="10-100" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([
      { attributes: { mediaRange: [10, 100] } },
      [],
    ]);

    const element2 = parseXml('<Foo mediaRange="0-1" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([
      { attributes: { mediaRange: [0, 1] } },
      [],
    ]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with an incorrect `mediaRange` attribute", () => {
    const element1 = parseXml('<Foo mediaRange="a" />')[0] as ITNode;
    const error1 = new MPDError('`mediaRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{ attributes: {} }, [error1]]);

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: "mediaRange" },
    );

    const element2 = parseXml('<Foo mediaRange="" />')[0] as ITNode;
    const error2 = new MPDError('`mediaRange` property has an unrecognized format ""');
    expect(parseSegmentURL(element2)).toEqual([{ attributes: {} }, [error2]]);

    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: "mediaRange" },
    );
  });

  it("should correctly parse an element with a well-formed `indexRange` attribute", () => {
    const element1 = parseXml('<Foo indexRange="0-100" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([
      { attributes: { indexRange: [0, 100] } },
      [],
    ]);

    const element2 = parseXml('<Foo indexRange="72-47" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([
      { attributes: { indexRange: [72, 47] } },
      [],
    ]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with an incorrect `indexRange` attribute", () => {
    const element1 = parseXml('<Foo indexRange="a" />')[0] as ITNode;
    const error1 = new MPDError('`indexRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{ attributes: {} }, [error1]]);

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { name: "indexRange" },
    );

    const element2 = parseXml('<Foo indexRange="" />')[0] as ITNode;
    const error2 = new MPDError('`indexRange` property has an unrecognized format ""');
    expect(parseSegmentURL(element2)).toEqual([{ attributes: {} }, [error2]]);

    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { name: "indexRange" },
    );
  });

  it("should correctly parse an element with a media attribute", () => {
    const element1 = parseXml('<Foo media="a" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ attributes: { media: "a" } }, []]);

    const element2 = parseXml('<Foo media="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ attributes: { media: "" } }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with a index attribute", () => {
    const element1 = parseXml('<Foo index="a" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ attributes: { index: "a" } }, []]);

    const element2 = parseXml('<Foo index="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ attributes: { index: "" } }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });
});
