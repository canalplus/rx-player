import { describe, afterEach, it, expect, vi } from "vitest";
import type IProbeHDCPPolicy from "../../probers/HDCPPolicy";

describe("MediaCapabilitiesProber probers - HDCPPolicy", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should throw if no requestMediaKeySystemAccess", async () => {
    vi.doMock("../../../../../compat/eme", () => ({
      default: vi.fn(),
    }));
    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;
    await probeHDCPPolicy("1.1").then(
      () => {
        throw new Error("Should not have succeeded");
      },
      (err: unknown) => {
        expect(err).toBeInstanceOf(Error);
      },
    );
  });

  it("should reject if MediaKeys creation fails", async () => {
    const mockCreateMediaKeys = vi.fn(() => {
      return Promise.reject(new Error("NOPE LOL"));
    });
    const mockRequestMediaKeySystemAcces = vi.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: {
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      },
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;

    await probeHDCPPolicy("1.1").then(
      () => {
        throw new Error("Should not have succeeded");
      },
      (err: unknown) => {
        expect(err).toBeInstanceOf(Error);
      },
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
      default: {
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      },
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;

    await probeHDCPPolicy("1.1").then((res: string) => {
      expect(res).toEqual("Unknown");
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
      default: {
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      },
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;

    await probeHDCPPolicy("1.1").then((res: string) => {
      expect(res).toEqual("Supported");
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
      default: {
        requestMediaKeySystemAccess: mockRequestMediaKeySystemAcces,
      },
    }));

    const probeHDCPPolicy = (await vi.importActual("../../probers/HDCPPolicy"))
      .default as typeof IProbeHDCPPolicy;
    await probeHDCPPolicy("1.1").then((res: string) => {
      expect(res).toEqual("NotSupported");
      expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
    });
  });
});
