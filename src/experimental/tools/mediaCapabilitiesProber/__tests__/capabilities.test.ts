import { describe, it, expect, vi } from "vitest";
import type IGetProbedConfiguration from "../capabilities";
import type { ICapabilitiesTypes } from "../capabilities";

describe("MediaCapabilitiesProber - getProbedConfiguration", () => {
  it("should return result from filtered configuration", async () => {
    const expectedResult = { key: "test" };
    const mockExtend = vi.fn(() => ({}));
    const mockFilterConfigurationWithCapabilities = vi.fn(() => expectedResult);
    vi.doMock("../utils.ts", () => ({
      extend: mockExtend,
      filterConfigurationWithCapabilities: mockFilterConfigurationWithCapabilities,
    }));
    const getProbedConfiguration = (await vi.importActual("../capabilities"))
      .default as typeof IGetProbedConfiguration;
    expect(
      getProbedConfiguration({}, [
        "Athos",
        "Portos",
        "Aramis",
      ] as unknown as ICapabilitiesTypes[]),
    ).toEqual(expectedResult);
  });
});
