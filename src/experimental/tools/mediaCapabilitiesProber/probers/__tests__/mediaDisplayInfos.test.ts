import { describe, it, expect, vi } from "vitest";
import globalScope from "../../../../../utils/global_scope";
import type IProbeMediaDisplayInfos from "../../probers/mediaDisplayInfos";

describe("MediaCapabilitiesProber probers probeMediaDisplayInfos", () => {
  it("should throw if matchMedia is undefined", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origMatchMedia = globalScope.matchMedia;
    (
      globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
    ).matchMedia = undefined;

    const probeMediaDisplayInfos = (
      await vi.importActual("../../probers/mediaDisplayInfos")
    ).default as typeof IProbeMediaDisplayInfos;
    expect(() => probeMediaDisplayInfos({})).toThrowError("matchMedia API not available");
    globalScope.matchMedia = origMatchMedia;
  });

  it("should throw if no colorSpace in display configuration", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origMatchMedia = globalScope.matchMedia;
    const mockMatchMedia = vi.fn(() => true);
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {},
    };

    const probeMediaDisplayInfos = (
      await vi.importActual("../../probers/mediaDisplayInfos")
    ).default as typeof IProbeMediaDisplayInfos;

    expect(() => probeMediaDisplayInfos(config)).toThrowError(
      "Not enough arguments for calling matchMedia.",
    );
    globalScope.matchMedia = origMatchMedia;
  });

  it("should throw if no display in configuration", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origMatchMedia = globalScope.matchMedia;
    const mockMatchMedia = vi.fn(() => true);
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {};

    const probeMediaDisplayInfos = (
      await vi.importActual("../../probers/mediaDisplayInfos")
    ).default as typeof IProbeMediaDisplayInfos;

    expect(() => probeMediaDisplayInfos(config)).toThrowError(
      "Not enough arguments for calling matchMedia.",
    );
    globalScope.matchMedia = origMatchMedia;
  });

  it("should throw if mediaMatch called with bad arguments", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origMatchMedia = globalScope.matchMedia;
    const mockMatchMedia = vi.fn(() => ({
      media: "not all",
    }));
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos = (
      await vi.importActual("../../probers/mediaDisplayInfos")
    ).default as typeof IProbeMediaDisplayInfos;

    expect(() => probeMediaDisplayInfos(config)).toThrowError(
      "Bad arguments for calling matchMedia.",
    );
    globalScope.matchMedia = origMatchMedia;
  });

  it("should return `Supported` if color space is supported", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origMatchMedia = globalScope.matchMedia;
    const mockMatchMedia = vi.fn(() => ({
      matches: true,
    }));
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos = (
      await vi.importActual("../../probers/mediaDisplayInfos")
    ).default as typeof IProbeMediaDisplayInfos;

    expect(probeMediaDisplayInfos(config)).toEqual("Supported");
    expect(mockMatchMedia).toHaveBeenCalledTimes(1);
    globalScope.matchMedia = origMatchMedia;
  });

  it("should return `NotSupported` if color space is not supported", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origMatchMedia = globalScope.matchMedia;
    const mockMatchMedia = vi.fn(() => ({
      matches: false,
    }));
    globalScope.matchMedia = mockMatchMedia as unknown as typeof globalScope.matchMedia;
    const config = {
      display: {
        colorSpace: "p5",
      },
    };

    const probeMediaDisplayInfos = (
      await vi.importActual("../../probers/mediaDisplayInfos")
    ).default as typeof IProbeMediaDisplayInfos;

    expect(probeMediaDisplayInfos(config)).toEqual("NotSupported");
    expect(mockMatchMedia).toHaveBeenCalledTimes(1);
    globalScope.matchMedia = origMatchMedia;
  });
});
