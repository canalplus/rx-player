import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import log from "../../../../../../log";
import type { ITNode } from "../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../utils/xml-parser";
import parseSegmentURL from "../SegmentURL";
import { MPDError } from "../utils";

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
    expect(parseSegmentURL(element1)).toEqual([{}, []]);

    const element2 = parseXml('<Foo test="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{}, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with a well-formed `mediaRange` attribute", () => {
    const element1 = parseXml('<Foo mediaRange="10-100" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ mediaRange: [10, 100] }, []]);

    const element2 = parseXml('<Foo mediaRange="0-1" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ mediaRange: [0, 1] }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with an incorrect `mediaRange` attribute", () => {
    const element1 = parseXml('<Foo mediaRange="a" />')[0] as ITNode;
    const error1 = new MPDError('`mediaRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { dashName: "mediaRange" },
    );

    const element2 = parseXml('<Foo mediaRange="" />')[0] as ITNode;
    const error2 = new MPDError('`mediaRange` property has an unrecognized format ""');
    expect(parseSegmentURL(element2)).toEqual([{}, [error2]]);

    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { dashName: "mediaRange" },
    );
  });

  it("should correctly parse an element with a well-formed `indexRange` attribute", () => {
    const element1 = parseXml('<Foo indexRange="0-100" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ indexRange: [0, 100] }, []]);

    const element2 = parseXml('<Foo indexRange="72-47" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ indexRange: [72, 47] }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with an incorrect `indexRange` attribute", () => {
    const element1 = parseXml('<Foo indexRange="a" />')[0] as ITNode;
    const error1 = new MPDError('`indexRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error1.message,
      { dashName: "indexRange" },
    );

    const element2 = parseXml('<Foo indexRange="" />')[0] as ITNode;
    const error2 = new MPDError('`indexRange` property has an unrecognized format ""');
    expect(parseSegmentURL(element2)).toEqual([{}, [error2]]);

    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "failed to parse DASH value:",
      error2.message,
      { dashName: "indexRange" },
    );
  });

  it("should correctly parse an element with a media attribute", () => {
    const element1 = parseXml('<Foo media="a" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ media: "a" }, []]);

    const element2 = parseXml('<Foo media="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ media: "" }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should correctly parse an element with a index attribute", () => {
    const element1 = parseXml('<Foo index="a" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ index: "a" }, []]);

    const element2 = parseXml('<Foo index="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ index: "" }, []]);

    expect(logWarn).not.toHaveBeenCalled();
  });
});
