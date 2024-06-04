import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ITNode } from "../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../utils/xml-parser";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("DASH Node Parsers - SegmentURL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should correctly parse an element with no known attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const element1 = parseXml("<Foo />")[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{}, []]);

    const element2 = parseXml('<Foo test="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{}, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a well-formed `mediaRange` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const element1 = parseXml('<Foo mediaRange="10-100" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ mediaRange: [10, 100] }, []]);

    const element2 = parseXml('<Foo mediaRange="0-1" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ mediaRange: [0, 1] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `mediaRange` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn").mockImplementation(vi.fn());

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const MPDError = ((await vi.importActual("../utils")) as any).MPDError;
    const element1 = parseXml('<Foo mediaRange="a" />')[0] as ITNode;
    const error1 = new MPDError('`mediaRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = parseXml('<Foo mediaRange="" />')[0] as ITNode;
    const error2 = new MPDError('`mediaRange` property has an unrecognized format ""');
    expect(parseSegmentURL(element2)).toEqual([{}, [error2]]);

    expect(mockLog).toHaveBeenCalledTimes(2);
    expect(mockLog).toHaveBeenCalledWith(error2.message);

    mockLog.mockRestore();
  });

  it("should correctly parse an element with a well-formed `indexRange` attribute", async () => {
    const log = {
      default: { warn: () => null },
    };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const element1 = parseXml('<Foo indexRange="0-100" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ indexRange: [0, 100] }, []]);

    const element2 = parseXml('<Foo indexRange="72-47" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ indexRange: [72, 47] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `indexRange` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn").mockImplementation(vi.fn());

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const MPDError = ((await vi.importActual("../utils")) as any).MPDError;
    const element1 = parseXml('<Foo indexRange="a" />')[0] as ITNode;
    const error1 = new MPDError('`indexRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = parseXml('<Foo indexRange="" />')[0] as ITNode;
    const error2 = new MPDError('`indexRange` property has an unrecognized format ""');
    expect(parseSegmentURL(element2)).toEqual([{}, [error2]]);

    expect(mockLog).toHaveBeenCalledTimes(2);
    expect(mockLog).toHaveBeenCalledWith(error2.message);

    mockLog.mockRestore();
  });

  it("should correctly parse an element with a media attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const element1 = parseXml('<Foo media="a" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ media: "a" }, []]);

    const element2 = parseXml('<Foo media="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ media: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a index attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = ((await vi.importActual("../SegmentURL")) as any).default;
    const element1 = parseXml('<Foo index="a" />')[0] as ITNode;
    expect(parseSegmentURL(element1)).toEqual([{ index: "a" }, []]);

    const element2 = parseXml('<Foo index="" />')[0] as ITNode;
    expect(parseSegmentURL(element2)).toEqual([{ index: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });
});
