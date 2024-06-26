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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(probeMediaDisplayInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: matchMedia not available",
    );
    (
      globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
    ).matchMedia = origMatchMedia;
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

    expect.assertions(1);
    return probeMediaDisplayInfos(config)
      .then(() => {
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling matchMedia.",
        );
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      });
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

    expect.assertions(1);
    return probeMediaDisplayInfos(config)
      .then(() => {
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling matchMedia.",
        );
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      });
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

    expect.assertions(2);
    return probeMediaDisplayInfos(config)
      .then(() => {
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Bad arguments for calling matchMedia.",
        );
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      });
  });

  it("should resolves with `Supported` if color space is supported", async () => {
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

    expect.assertions(2);
    return probeMediaDisplayInfos(config)
      .then((res: string) => {
        expect(res).toEqual("Supported");
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      })
      .catch(() => {
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      });
  });

  it("should resolves with `NotSupported` if color space is not supported", async () => {
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

    expect.assertions(2);
    return probeMediaDisplayInfos(config)
      .then((res: string) => {
        expect(res).toEqual("NotSupported");
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      })
      .catch(() => {
        (
          globalScope as { matchMedia: typeof globalScope.matchMedia | undefined }
        ).matchMedia = origMatchMedia;
      });
  });
});
