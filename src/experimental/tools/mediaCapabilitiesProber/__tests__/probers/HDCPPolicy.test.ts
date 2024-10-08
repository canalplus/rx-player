import { describe, afterEach, it, expect, vi } from "vitest";
import type IProbeHDCPPolicy from "../../probers/HDCPPolicy";
import { ProberStatus } from "../../types";

describe("MediaCapabilitiesProber probers - HDCPPolicy", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should throw if no requestMediaKeySystemAccess", async () => {
    vi.doMock("../../../../../compat/eme", () => ({
      default: () => null,
    }));
    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(probeHDCPPolicy({})).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: API not available",
    );
  });

  it("should throw if no hdcp attribute in config", async () => {
    const mockRequestMediaKeySystemAccess = vi.fn(() => {
      return Promise.resolve({
        getConfiguration: () => ({}),
      });
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: () => ({
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
      }),
    }));
    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(probeHDCPPolicy({})).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "Missing policy argument for calling getStatusForPolicy.",
    );
  });

  it("should resolve with `Unknown` if no getStatusForPolicy API", async () => {
    const mockCreateMediaKeys = vi.fn(() => {
      return Promise.resolve({});
    });
    const mockRequestMediaKeySystemAcces = vi.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: () => ({
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      }),
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;

    await probeHDCPPolicy({ hdcp: "1.1" }).then(([res]: [unknown]) => {
      expect(res).toEqual(ProberStatus.Unknown);
      expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
    });
  });

  it("should resolve with `Supported` if policy is supported", async () => {
    const mockCreateMediaKeys = vi.fn(() => {
      return Promise.resolve({
        getStatusForPolicy: () => Promise.resolve("usable"),
      });
    });
    const mockRequestMediaKeySystemAcces = vi.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: () => ({
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      }),
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;

    await probeHDCPPolicy({ hdcp: "1.1" }).then(([res]: [unknown]) => {
      expect(res).toEqual(ProberStatus.Supported);
      expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
    });
  });

  it("should resolve with `NotSupported` if policy is not supported", async () => {
    const mockCreateMediaKeys = vi.fn(() => {
      return Promise.resolve({
        getStatusForPolicy: () => Promise.resolve("not-usable"),
      });
    });
    const mockRequestMediaKeySystemAcces = vi.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: () => ({
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      }),
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;
    await probeHDCPPolicy({ hdcp: "1.1" }).then(([res]: [unknown]) => {
      expect(res).toEqual(ProberStatus.NotSupported);
      expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
    });
  });
});
