import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */

import type { IMediaKeySystemAccess } from "../../../../compat/browser_compatibility_types";
import {
  defaultKSConfig,
  defaultPRRecommendationKSConfig,
  defaultWidevineConfig,
  mockCompat,
  testContentDecryptorError,
} from "./utils";

export function requestMediaKeySystemAccessNoMediaKeys(
  keySystem: string,
  config: MediaKeySystemConfiguration[],
): Promise<IMediaKeySystemAccess> {
  if (config.length === 0) {
    throw new Error("requestMediaKeySystemAccessNoMediaKeys: no config given");
  }
  return Promise.resolve({
    keySystem,
    getConfiguration() {
      return config[0];
    },
    createMediaKeys() {
      return new Promise(() => {
        /* noop */
      });
    },
  });
}

const incompatibleMKSAErrorMessage =
  "INCOMPATIBLE_KEYSYSTEMS: No key system compatible " +
  "with your wanted configuration has been found in the current browser.";

/**
 * Check that the given `keySystemsConfigs` lead to an
 * `INCOMPATIBLE_KEYSYSTEMS` error.
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Promise}
 */
async function checkIncompatibleKeySystemsErrorMessage(
  keySystemsConfigs: unknown[],
): Promise<void> {
  const mediaElement = document.createElement("video");
  const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
    .default;
  const getEmeApiImplementation = (await import("../../../../compat/eme")).default;

  const eme = getEmeApiImplementation("auto");
  const error: any = await testContentDecryptorError(
    eme,
    ContentDecryptor,
    mediaElement,
    keySystemsConfigs,
  );
  expect(error).not.toBe(null);
  expect(error.message).toEqual(incompatibleMKSAErrorMessage);
  expect(error.name).toEqual("EncryptedMediaError");
  expect(error.code).toEqual("INCOMPATIBLE_KEYSYSTEMS");
}

describe("decrypt - global tests - media key system access", () => {
  // Used to implement every functions that should never be called.
  const neverCalledFn = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doMock("../../set_server_certificate", () => ({
      default: neverCalledFn,
    }));
  });

  afterEach(() => {
    expect(neverCalledFn).not.toHaveBeenCalled();
  });

  it("should throw if an empty keySystemsConfigs is given", async () => {
    mockCompat();
    await checkIncompatibleKeySystemsErrorMessage([]);
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const getLicenseFn = neverCalledFn;
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: getLicenseFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should throw if given multiple incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const config = [
      { type: "foo", getLicense: neverCalledFn },
      { type: "bar", getLicense: neverCalledFn },
      { type: "baz", getLicense: neverCalledFn },
    ];
    await checkIncompatibleKeySystemsErrorMessage(config);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(3);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "bar",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "baz",
      defaultKSConfig,
    );
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it('should set persistentState value if persistentState is set to "required"', async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn, persistentState: "required" },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it('should set persistentState value if persistentState is set to "not-allowed"', async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        persistentState: "not-allowed",
      },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "not-allowed" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it('should set persistentState value if persistentState is set to "optional"', async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn, persistentState: "optional" },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "optional" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it('should set distinctiveIdentifier value if distinctiveIdentifier is set to "required"', async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        distinctiveIdentifier: "required",
      },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it('should set distinctiveIdentifier value if distinctiveIdentifier is set to "not-allowed"', async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        distinctiveIdentifier: "not-allowed",
      },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "not-allowed" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it('should set distinctiveIdentifier value if distinctiveIdentifier is set to "optional"', async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        distinctiveIdentifier: "optional",
      },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "optional" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it("should want persistent sessions if persistentLicenseConfig is set", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const persistentLicenseConfig = {
      save() {
        throw new Error("Should not save.");
      },
      load() {
        throw new Error("Should not load.");
      },
    };
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn, persistentLicenseConfig },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it("should do nothing if persistentLicenseConfig is set to null", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn, persistentLicenseConfig: null },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should do nothing if persistentLicenseConfig is set to undefined", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        persistentLicenseConfig: undefined,
      },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should translate a `clearkey` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "clearkey", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "org.w3.clearkey",
      defaultKSConfig,
    );
  });

  it("should translate a `widevine` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "widevine", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith(
      "com.widevine.alpha",
      defaultWidevineConfig,
    );
  });

  it("should translate a `playready` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "playready", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(4);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      defaultPRRecommendationKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.youtube.playready",
      defaultKSConfig,
    );
  });

  it("should translate a `fairplay` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "fairplay", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith(
      "com.apple.fps.1_0",
      defaultKSConfig,
    );
  });

  it("should translate a multiple keySystems at the same time", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "playready", getLicense: neverCalledFn },
      { type: "clearkey", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      defaultPRRecommendationKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.youtube.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "org.w3.clearkey",
      defaultKSConfig,
    );
  });

  it("should translate a multiple keySystems at the same time with different configs", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "playready",
        persistentLicenseConfig: {
          load() {
            return [];
          },
          save() {
            return [];
          },
        },
        getLicense: neverCalledFn,
      },
      {
        type: "clearkey",
        distinctiveIdentifier: "required",
        getLicense: neverCalledFn,
      },
    ]);
    const expectedPRRecommendationPersistentConfig = defaultPRRecommendationKSConfig.map(
      (conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      },
    );
    const expectedPersistentConfig = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    const expectedIdentifierConfig = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedPRRecommendationPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
  });

  it("should set widevine robustnesses for a `com.widevine.alpha` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "com.widevine.alpha",
        persistentLicenseConfig: {
          load() {
            return [];
          },
          save() {
            return [];
          },
        },
        getLicense: neverCalledFn,
      },
    ]);
    const expectedPersistentConfig = defaultWidevineConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.widevine.alpha",
      expectedPersistentConfig,
    );
  });

  it("should set playready robustnesses for a `playready` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "playready",
        persistentLicenseConfig: {
          load() {
            return [];
          },
          save() {
            return [];
          },
        },
        getLicense: neverCalledFn,
      },
      {
        type: "clearkey",
        distinctiveIdentifier: "required",
        getLicense: neverCalledFn,
      },
    ]);
    const expectedPersistentConfig = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    const expectedRecoPersistentConfig = defaultPRRecommendationKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    const expectedIdentifierConfig = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedRecoPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
  });

  it("should set playready robustnesses for a `com.microsoft.playready.recommendation` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "com.microsoft.playready.recommendation",
        persistentLicenseConfig: {
          load() {
            return [];
          },
          save() {
            return [];
          },
        },
        getLicense: neverCalledFn,
      },
    ]);
    const expectedRecoPersistentConfig = defaultPRRecommendationKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedRecoPersistentConfig,
    );
  });

  it("should successfully create a MediaKeySystemAccess if given the right configuration", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation((keyType, conf) => {
        return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
      });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    return new Promise<void>((res, rej) => {
      const config = [{ type: "com.widevine.alpha", getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const eme = getEmeApiImplementation("auto");
      const contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith(
          "com.widevine.alpha",
          defaultWidevineConfig,
        );
        res();
      }, 10);
    });
  });

  it("should successfully create a MediaKeySystemAccess if given multiple configurations where one works", async () => {
    let callNb = 0;
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation((keyType, conf) => {
        if (++callNb === 2) {
          return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
        }
        return Promise.reject("nope");
      });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    return new Promise<void>((res, rej) => {
      const config = [
        { type: "com.widevine.alpha", getLicense: neverCalledFn },
        { type: "some-other-working-key-system", getLicense: neverCalledFn },
      ];

      const mediaElement = document.createElement("video");
      const eme = getEmeApiImplementation("auto");
      const contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          1,
          "com.widevine.alpha",
          defaultWidevineConfig,
        );
        expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          2,
          "some-other-working-key-system",
          defaultKSConfig,
        );
        res();
      }, 10);
    });
  });

  it("should not continue to check if the ContentDecryptor is disposed from", async () => {
    let contentDecryptor: any = null;
    let rmksHasBeenCalled = false;
    const mockRequestMediaKeySystemAccess = vi.fn().mockImplementation(() => {
      return Promise.resolve().then(() => {
        rmksHasBeenCalled = true;
        contentDecryptor.dispose();
        return Promise.reject("nope");
      });
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [
        { type: "foo", getLicense: neverCalledFn },
        { type: "bar", getLicense: neverCalledFn },
        { type: "baz", getLicense: neverCalledFn },
      ];
      const eme = getEmeApiImplementation("auto");
      contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
        rej(error);
      });
      setTimeout(() => {
        expect(rmksHasBeenCalled).toEqual(true);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          1,
          "foo",
          defaultKSConfig,
        );
        res();
      }, 10);
    });
  });

  it("should trigger error even if requestMediaKeySystemAccess throws", async () => {
    let rmksHasBeenCalled = false;
    const mockRequestMediaKeySystemAccess = vi.fn().mockImplementation(() => {
      rmksHasBeenCalled = true;
      throw new Error("nope");
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [{ type: "foo", getLicense: neverCalledFn }];
      const eme = getEmeApiImplementation("auto");
      const contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", () => {
        expect(rmksHasBeenCalled).toEqual(true);
        res();
      });
      setTimeout(() => {
        rej(new Error("timeout exceeded"));
      }, 10);
    });
  });
});
