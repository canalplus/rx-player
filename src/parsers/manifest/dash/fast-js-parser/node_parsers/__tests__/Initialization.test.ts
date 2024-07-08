import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ITNode } from "../../../../../../utils/xml-parser";
import { parseXml } from "../../../../../../utils/xml-parser";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("DASH Node Parsers - Initialization", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should correctly parse an element with no known attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = ((await vi.importActual("../Initialization")) as any)
      .default;
    const element1 = parseXml("<Foo />")[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{}, []]);

    const element2 = parseXml('<Foo test="" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{}, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a well-formed `range` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = ((await vi.importActual("../Initialization")) as any)
      .default;
    const element1 = parseXml('<Foo range="0-1" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{ range: [0, 1] }, []]);

    const element2 = parseXml('<Foo range="100-1000" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{ range: [100, 1000] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `range` attribute", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn").mockImplementation(vi.fn());

    const parseInitialization = ((await vi.importActual("../Initialization")) as any)
      .default;
    const MPDError = ((await vi.importActual("../utils")) as any).MPDError;
    const element1 = parseXml('<Foo range="a" />')[0] as ITNode;
    const error1 = new MPDError('`range` property has an unrecognized format "a"');
    expect(parseInitialization(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = parseXml('<Foo range="" />')[0] as ITNode;
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

    const parseInitialization = ((await vi.importActual("../Initialization")) as any)
      .default;
    const element1 = parseXml('<Foo sourceURL="a" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{ media: "a" }, []]);

    const element2 = parseXml('<Foo sourceURL="" />')[0] as ITNode;
    expect(parseInitialization(element2)).toEqual([{ media: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with both a sourceURL and range attributes", async () => {
    const log = { default: { warn: () => null } };
    vi.doMock("../../../../../../log", () => log);
    const mockLog = vi.spyOn(log.default, "warn");

    const parseInitialization = ((await vi.importActual("../Initialization")) as any)
      .default;
    const element1 = parseXml('<Foo sourceURL="a" range="4-10" />')[0] as ITNode;
    expect(parseInitialization(element1)).toEqual([{ media: "a", range: [4, 10] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });
});
