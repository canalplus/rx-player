import { describe, afterEach, it, expect, vi, beforeEach } from "vitest";
import probeHDCPPolicy from "../../../../../../../src/experimental/tools/mediaCapabilitiesProber/probers/HDCPPolicy.ts";

type IRequestMediaKeySystemAccess =
  | ((...args: unknown[]) => Promise<unknown>)
  | undefined;

const compatEmeMock: {
  default: { requestMediaKeySystemAccess: IRequestMediaKeySystemAccess };
} = vi.hoisted(() => {
  return {
    default: {
      requestMediaKeySystemAccess: undefined,
    },
  };
});
vi.mock("../../../../../../../src/compat/eme", () => ({
  default: () => compatEmeMock.default,
}));

describe("MediaCapabilitiesProber probers - HDCPPolicy", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    compatEmeMock.default.requestMediaKeySystemAccess = undefined;
  });

  it("should throw if no requestMediaKeySystemAccess", async () => {
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
    compatEmeMock.default.requestMediaKeySystemAccess = mockRequestMediaKeySystemAcces;
    await probeHDCPPolicy("1.1").then(
      () => {
        throw new Error("Should not have succeeded");
      },
      (err: unknown) => {
        expect(err).toBeInstanceOf(Error);
      },
    );
  });

  it("should reject if no getStatusForPolicy API", async () => {
    const mockCreateMediaKeys = vi.fn(() => {
      return Promise.resolve({});
    });
    const mockRequestMediaKeySystemAcces = vi.fn(() => {
      return Promise.resolve({
        createMediaKeys: mockCreateMediaKeys,
      });
    });
    compatEmeMock.default.requestMediaKeySystemAccess = mockRequestMediaKeySystemAcces;
    await probeHDCPPolicy("1.1").then(
      () => {
        throw new Error("Should not have succeeded");
      },
      (err: unknown) => {
        expect(err).toBeInstanceOf(Error);
        expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
      },
    );
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
    compatEmeMock.default.requestMediaKeySystemAccess = mockRequestMediaKeySystemAcces;
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
    compatEmeMock.default.requestMediaKeySystemAccess = mockRequestMediaKeySystemAcces;

    await probeHDCPPolicy("1.1").then((res: string) => {
      expect(res).toEqual("NotSupported");
      expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockRequestMediaKeySystemAcces).toHaveBeenCalledTimes(1);
    });
  });
});
