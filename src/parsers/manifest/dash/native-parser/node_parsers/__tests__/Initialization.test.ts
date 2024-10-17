import { describe, beforeEach, it, expect, vi } from "vitest";
import type IInitialization from "../Initialization";
import type { MPDError as IMPDError } from "../utils";

describe("DASH Node Parsers - Initialization", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should correctly parse an element with no known attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = (await vi.importActual("../Initialization"))
      .default as typeof IInitialization;
    const element1 = new DOMParser().parseFromString("<Foo />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{}, []]);

    const element2 = new DOMParser().parseFromString('<Foo test="" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual([{}, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a well-formed `range` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = (await vi.importActual("../Initialization"))
      .default as typeof IInitialization;
    const element1 = new DOMParser().parseFromString('<Foo range="0-1" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{ range: [0, 1] }, []]);

    const element2 = new DOMParser().parseFromString(
      '<Foo range="100-1000" />',
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual([{ range: [100, 1000] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `range` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn").mockImplementation(vi.fn());

    const parseInitialization = (await vi.importActual("../Initialization"))
      .default as typeof IInitialization;
    const MPDError = (await vi.importActual("../utils")).MPDError as typeof IMPDError;
    const element1 = new DOMParser().parseFromString('<Foo range="a" />', "text/xml")
      .childNodes[0] as Element;
    const error1 = new MPDError('`range` property has an unrecognized format "a"');
    expect(parseInitialization(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = new DOMParser().parseFromString('<Foo range="" />', "text/xml")
      .childNodes[0] as Element;
    const error2 = new MPDError('`range` property has an unrecognized format ""');
    expect(parseInitialization(element2)).toEqual([{}, [error2]]);

    expect(mockLog).toHaveBeenCalledTimes(2);
    expect(mockLog).toHaveBeenCalledWith(error2.message);

    mockLog.mockRestore();
  });

  it("should correctly parse an element with a sourceURL attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = (await vi.importActual("../Initialization"))
      .default as typeof IInitialization;
    const element1 = new DOMParser().parseFromString('<Foo sourceURL="a" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{ media: "a" }, []]);

    const element2 = new DOMParser().parseFromString('<Foo sourceURL="" />', "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual([{ media: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with both a sourceURL and range attributes", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = (await vi.importActual("../Initialization"))
      .default as typeof IInitialization;
    const element1 = new DOMParser().parseFromString(
      '<Foo sourceURL="a" range="4-10" />',
      "text/xml",
    ).childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{ media: "a", range: [4, 10] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });
});
