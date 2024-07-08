import { describe, afterEach, it, expect, vi } from "vitest";
import { ProberStatus } from "../../types";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */

describe("MediaCapabilitiesProber probers - DRMInfos", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should throw if no keySystem provided", async () => {
    const configuration = {};
    const probeDRMInfos = ((await vi.importActual("../../probers/DRMInfos")) as any)
      .default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDRMInfos(configuration)).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "Missing a type argument to request a media key system access.",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should throw if no type of keySystem provided", async () => {
    const configuration = {
      keySystem: {},
    };
    const probeDRMInfos = ((await vi.importActual("../../probers/DRMInfos")) as any)
      .default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDRMInfos(configuration)).rejects.toEqual(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "Missing a type argument to request a media key system access.",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should resolve with `NotSupported` if no requestMediaKeySystemAccess", async () => {
    const configuration = {
      keySystem: {
        type: "clearkick",
      },
    };
    vi.doMock("../../../../../compat/eme", () => ({
      default: {},
    }));
    const probeDRMInfos = ((await vi.importActual("../../probers/DRMInfos")) as any)
      .default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDRMInfos(configuration)).resolves.toEqual(
      [ProberStatus.NotSupported, { configuration: {}, type: "clearkick" }],
      /* eslint-enable @typescript-eslint/no-floating-promises */
    );
  });

  it("should resolve with `Supported` if config is supported", async () => {
    const configuration = {
      keySystem: {
        type: "clearkick",
      },
    };
    const mockRequestMediaKeySystemAccess = vi.fn(() => {
      return Promise.resolve({
        getConfiguration: () => ({}),
      });
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: { requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess },
    }));
    const probeDRMInfos = ((await vi.importActual("../../probers/DRMInfos")) as any)
      .default;
    await probeDRMInfos(configuration)
      .then((res: unknown) => {
        expect(res).toEqual([
          ProberStatus.Supported,
          { compatibleConfiguration: {}, configuration: {}, type: "clearkick" },
        ]);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should resolve with `NotSupported` if config is not supported", async () => {
    const configuration = {
      keySystem: {
        type: "clearkick",
      },
    };
    const mockRequestMediaKeySystemAccess = vi.fn(() => {
      return Promise.reject(new Error());
    });
    vi.doMock("../../../../../compat/eme", () => ({
      default: { requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess },
    }));

    const probeDRMInfos = ((await vi.importActual("../../probers/DRMInfos")) as any)
      .default;
    await probeDRMInfos(configuration)
      .then((res: unknown) => {
        expect(res).toEqual([
          ProberStatus.NotSupported,
          { configuration: {}, type: "clearkick" },
        ]);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // done
      });
  });
});
