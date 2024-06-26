import { describe, beforeEach, it, expect, vi } from "vitest";
import type IProbeMediaContentType from "../../probers/mediaContentType";
import { ProberStatus } from "../../types";
import type { IMediaConfiguration } from "../../types";

describe("MediaCapabilitiesProber - probers probeMediaContentType", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should throw if no compatible MediaSource API", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: null,
    }));
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(() => probeMediaContentType({})).toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " + "MediaSource API not available",
    );
  });

  it("should throw if no compatible isTypeSupported API", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: false,
      },
    }));
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(() => probeMediaContentType({})).toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " + "isTypeSupported not available",
    );
  });

  it("should throw if no specified contentType in config", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(1);
    expect(() => probeMediaContentType(config)).toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "Not enough arguments for calling isTypeSupported.",
    );
  });

  it("should resolve with `Supported` when video contentType is supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const support = probeMediaContentType(config);
    expect(support).toEqual(ProberStatus.Supported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should resolve with `Supported` when audio contentType is supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const support = probeMediaContentType(config);
    expect(support).toEqual(ProberStatus.Supported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should resolve with `Supported` when both contentTypes are supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const res = probeMediaContentType(config);
    expect(res).toEqual(ProberStatus.Supported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `NotSupported` when audio contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const res = probeMediaContentType(config);
    expect(res).toEqual(ProberStatus.NotSupported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `NotSupported` when video contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const res = probeMediaContentType(config);
    expect(res).toEqual(ProberStatus.NotSupported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should resolve with `NotSupported` when contentTypes are not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const res = probeMediaContentType(config);
    expect(res).toEqual(ProberStatus.NotSupported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `NotSupported` when one contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn((type: string) => {
      return type === "video/mp5";
    });
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      await vi.importActual("../../probers/mediaContentType")
    ).default as typeof IProbeMediaContentType;

    expect.assertions(2);
    const res = probeMediaContentType(config);
    expect(res).toEqual(ProberStatus.NotSupported);
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });
});
