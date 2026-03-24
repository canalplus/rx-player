import { describe, it, expect, vi } from "vitest";
import globalScope from "../../../../../utils/global_scope";
import probeMediaDisplayInfos from "../../probers/mediaDisplayInfos";

describe("MediaCapabilitiesProber probers probeMediaDisplayInfos", () => {
  it("should throw if matchMedia is undefined", async () => {
    const origMatchMedia = globalScope.matchMedia;
    (
      globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
    ).matchMedia = undefined;

    expect(() => probeMediaDisplayInfos({})).toThrowError("matchMedia API not available");
    (
      globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
    ).matchMedia = origMatchMedia;
  });

  it("should throw if no colorSpace in display configuration", async () => {
    const mockMatchMedia = vi.fn(() => true);
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {},
    };

    let err: Error | undefined;
    try {
      probeMediaDisplayInfos(config);
    } catch (error) {
      err = error as Error;
    }
    expect(err).not.toBe(undefined);
    const { message } = err as Error;
    expect(message).toBe("Not enough arguments for calling matchMedia.");
  });

  it("should throw if no display in configuration", async () => {
    const mockMatchMedia = vi.fn(() => true);
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {};

    let err: Error | undefined;
    try {
      probeMediaDisplayInfos(config);
    } catch (error) {
      err = error as Error;
    }
    expect(err).not.toBe(undefined);
    const { message } = err as Error;
    expect(message).toBe("Not enough arguments for calling matchMedia.");
  });

  it("should throw if mediaMatch called with bad arguments", async () => {
    const mockMatchMedia = vi.fn(() => ({
      media: "not all",
    }));
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    let err: Error | undefined;
    try {
      probeMediaDisplayInfos(config);
    } catch (error) {
      err = error as Error;
    }
    expect(err).not.toBe(undefined);
    const { message } = err as Error;
    expect(message).toBe("Bad arguments for calling matchMedia.");
    expect(mockMatchMedia).toHaveBeenCalledTimes(1);
  });

  it("should resolves with `Supported` if color space is supported", async () => {
    const mockMatchMedia = vi.fn(() => ({
      matches: true,
    }));
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const res = probeMediaDisplayInfos(config);
    expect(res).toEqual("Supported");
    expect(mockMatchMedia).toHaveBeenCalledTimes(1);
  });

  it("should resolves with `NotSupported` if color space is not supported", async () => {
    const mockMatchMedia = vi.fn(() => ({
      matches: false,
    }));
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {
        colorSpace: "p5",
      },
    };

    const res = probeMediaDisplayInfos(config);
    expect(res).toEqual("NotSupported");
    expect(mockMatchMedia).toHaveBeenCalledTimes(1);
  });
});
