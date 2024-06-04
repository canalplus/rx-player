import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("MediaCapabilitiesProber - getProbedConfiguration", () => {
  it("should return result from filtered configuration", async () => {
    const expectedResult = { key: "test" };
    const mockExtend = vi.fn(() => ({}));
    const mockFilterConfigurationWithCapabilities = vi.fn(() => expectedResult);
    vi.doMock("../utils.ts", () => ({
      extend: mockExtend,
      filterConfigurationWithCapabilities: mockFilterConfigurationWithCapabilities,
    }));
    const getProbedConfiguration = ((await vi.importActual("../capabilities")) as any)
      .default;
    expect(getProbedConfiguration({}, ["Athos", "Portos", "Aramis"])).toEqual(
      expectedResult,
    );
  });
});
