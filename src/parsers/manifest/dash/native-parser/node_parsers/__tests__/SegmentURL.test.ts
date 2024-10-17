import { describe, beforeEach, it, expect, vi } from "vitest";
import type ISegmentUrl from "../SegmentURL";
import type { MPDError as IMPDError } from "../utils";

describe("DASH Node Parsers - SegmentURL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should correctly parse an element with no known attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const element1 = new DOMParser().parseFromString("<Foo />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{}, []]);

    const element2 = new DOMParser().parseFromString('<Foo test="" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{}, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a well-formed `mediaRange` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const element1 = new DOMParser().parseFromString(
      '<Foo mediaRange="10-100" />',
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ mediaRange: [10, 100] }, []]);

    const element2 = new DOMParser().parseFromString(
      '<Foo mediaRange="0-1" />',
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ mediaRange: [0, 1] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `mediaRange` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn").mockImplementation(vi.fn());

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const MPDError = (await vi.importActual("../utils")).MPDError as typeof IMPDError;
    const element1 = new DOMParser().parseFromString('<Foo mediaRange="a" />', "text/xml")
      .childNodes[0] as Element;
    const error1 = new MPDError('`mediaRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = new DOMParser().parseFromString('<Foo mediaRange="" />', "text/xml")
      .childNodes[0] as Element;
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

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const element1 = new DOMParser().parseFromString(
      '<Foo indexRange="0-100" />',
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ indexRange: [0, 100] }, []]);

    const element2 = new DOMParser().parseFromString(
      '<Foo indexRange="72-47" />',
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ indexRange: [72, 47] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `indexRange` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn").mockImplementation(vi.fn());

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const MPDError = (await vi.importActual("../utils")).MPDError as typeof IMPDError;
    const element1 = new DOMParser().parseFromString('<Foo indexRange="a" />', "text/xml")
      .childNodes[0] as Element;
    const error1 = new MPDError('`indexRange` property has an unrecognized format "a"');
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = new DOMParser().parseFromString('<Foo indexRange="" />', "text/xml")
      .childNodes[0] as Element;
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

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const element1 = new DOMParser().parseFromString('<Foo media="a" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ media: "a" }, []]);

    const element2 = new DOMParser().parseFromString('<Foo media="" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ media: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a index attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseSegmentURL = (await vi.importActual("../SegmentURL"))
      .default as typeof ISegmentUrl;
    const element1 = new DOMParser().parseFromString('<Foo index="a" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ index: "a" }, []]);

    const element2 = new DOMParser().parseFromString('<Foo index="" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ index: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });
});
