import { describe, it, expect, vi } from "vitest";
import globalScope from "../../../../../utils/global_scope";
import { ProberStatus } from "../../types";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("MediaCapabilitiesProber probers probeMediaDisplayInfos", () => {
  it("should throw if matchMedia is undefined", async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    (globalScope as any).matchMedia = undefined;
    const probeMediaDisplayInfos = (
      (await vi.importActual("../../probers/mediaDisplayInfos")) as any
    ).default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeMediaDisplayInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: matchMedia not available",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
    (globalScope as any).matchMedia = origMatchMedia;
  });

  it("should throw if no colorSpace in display configuration", async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = vi.fn(() => true);
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {},
    };

    const probeMediaDisplayInfos = (
      (await vi.importActual("../../probers/mediaDisplayInfos")) as any
    ).default;

    expect.assertions(1);
    return probeMediaDisplayInfos(config)
      .then(() => {
        (globalScope as any).matchMedia = origMatchMedia;
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling matchMedia.",
        );
        (globalScope as any).matchMedia = origMatchMedia;
      });
  });

  it("should throw if no display in configuration", async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = vi.fn(() => true);
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {};

    const probeMediaDisplayInfos = (
      (await vi.importActual("../../probers/mediaDisplayInfos")) as any
    ).default;

    expect.assertions(1);
    return probeMediaDisplayInfos(config)
      .then(() => {
        (globalScope as any).matchMedia = origMatchMedia;
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling matchMedia.",
        );
        (globalScope as any).matchMedia = origMatchMedia;
      });
  });

  it("should throw if mediaMatch called with bad arguments", async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = vi.fn(() => ({
      media: "not all",
    }));
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos = (
      (await vi.importActual("../../probers/mediaDisplayInfos")) as any
    ).default;

    expect.assertions(2);
    return probeMediaDisplayInfos(config)
      .then(() => {
        (globalScope as any).matchMedia = origMatchMedia;
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toBe(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Bad arguments for calling matchMedia.",
        );
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (globalScope as any).matchMedia = origMatchMedia;
      });
  });

  it("should resolves with `Supported` if color space is supported", async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = vi.fn(() => ({
      matches: true,
    }));
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "srgb",
      },
    };

    const probeMediaDisplayInfos = (
      (await vi.importActual("../../probers/mediaDisplayInfos")) as any
    ).default;

    expect.assertions(2);
    return probeMediaDisplayInfos(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (globalScope as any).matchMedia = origMatchMedia;
      })
      .catch(() => {
        (globalScope as any).matchMedia = origMatchMedia;
      });
  });

  it("should resolves with `NotSupported` if color space is not supported", async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const origMatchMedia = globalScope.matchMedia;
    /* eslint-enable @typescript-eslint/unbound-method */
    const mockMatchMedia = vi.fn(() => ({
      matches: false,
    }));
    (globalScope as any).matchMedia = mockMatchMedia;
    const config = {
      display: {
        colorSpace: "p5",
      },
    };

    const probeMediaDisplayInfos = (
      (await vi.importActual("../../probers/mediaDisplayInfos")) as any
    ).default;

    expect.assertions(2);
    return probeMediaDisplayInfos(config)
      .then(([res]: [any]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockMatchMedia).toHaveBeenCalledTimes(1);
        (globalScope as any).matchMedia = origMatchMedia;
      })
      .catch(() => {
        (globalScope as any).matchMedia = origMatchMedia;
      });
  });
});
