import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import type { ICustomMediaKeySystemAccess } from "../../../../compat/eme";
import type { IKeySystemOption } from "../../../../public_types";
import type IContentDecryptor from "../../content_decryptor";
import {
  defaultKSConfig,
  defaultPRRecommendationKSConfig,
  defaultWidevineConfig,
  mockCompat,
  testContentDecryptorError,
} from "./utils";

function requestMediaKeySystemAccessNoMediaKeys(
  keySystem: string,
  config: MediaKeySystemConfiguration[],
): Promise<ICustomMediaKeySystemAccess> {
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

function removeCapabiltiesFromConfig(
  baseConfig: MediaKeySystemConfiguration[],
): MediaKeySystemConfiguration[] {
  return baseConfig.map(
    (config) =>
      ({
        ...config,
        audioCapabilities: undefined,
        videoCapabilities: undefined,
        // Note: TypeScript is wrong here (2024-08-07), it thinks that
        // `audioCapabilities` and `videoCapabilities` cannot be set to
        // `undefined`, though they definitely can.
      }) as unknown as MediaKeySystemConfiguration,
  );
}

/**
 * Check that the given `keySystemsConfigs` lead to an
 * `INCOMPATIBLE_KEYSYSTEMS` error.
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Promise}
 */
async function checkIncompatibleKeySystemsErrorMessage(
  keySystemsConfigs: IKeySystemOption[],
): Promise<void> {
  const mediaElement = document.createElement("video");
  const ContentDecryptor = (await vi.importActual("../../content_decryptor"))
    .default as typeof IContentDecryptor;

  const error = await testContentDecryptorError(
    ContentDecryptor,
    mediaElement,
    keySystemsConfigs,
  );
  expect(error.message).toEqual(incompatibleMKSAErrorMessage);
  expect(error.name).toEqual("EncryptedMediaError");
  expect((error as Error & { code?: string | undefined }).code).toEqual(
    "INCOMPATIBLE_KEYSYSTEMS",
  );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "bar",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "bar",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "baz",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "baz",
      removeCapabiltiesFromConfig(defaultKSConfig),
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "not-allowed" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "optional" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "not-allowed" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "optional" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should do nothing if persistentLicenseConfig is set to null", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
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
      },
    ]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(4);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.widevine.alpha",
      defaultWidevineConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.widevine.alpha",
      removeCapabiltiesFromConfig(defaultWidevineConfig),
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(8);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      defaultPRRecommendationKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(defaultPRRecommendationKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith(
      "com.apple.fps.1_0",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith(
      "com.apple.fps.1_0",
      removeCapabiltiesFromConfig(defaultKSConfig),
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
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(12);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      defaultPRRecommendationKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(defaultPRRecommendationKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
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
    const expectedPRRecommendationPersistentConfig: MediaKeySystemConfiguration[] =
      defaultPRRecommendationKSConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      });
    const expectedPersistentConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      },
    );
    const expectedIdentifierConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return { ...conf, distinctiveIdentifier: "required" };
      },
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(12);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedPRRecommendationPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(expectedPRRecommendationPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
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
    const expectedPersistentConfig: MediaKeySystemConfiguration[] =
      defaultWidevineConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.widevine.alpha",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.widevine.alpha",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
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
    const expectedPersistentConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      },
    );
    const expectedRecoPersistentConfig: MediaKeySystemConfiguration[] =
      defaultPRRecommendationKSConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      });
    const expectedIdentifierConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return { ...conf, distinctiveIdentifier: "required" };
      },
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(12);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedRecoPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(expectedRecoPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
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
    const expectedRecoPersistentConfig: MediaKeySystemConfiguration[] =
      defaultPRRecommendationKSConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedRecoPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(expectedRecoPersistentConfig),
    );
  });

  it("should successfully create a MediaKeySystemAccess if given the right configuration", async () => {
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation((keyType: string, conf: MediaKeySystemConfiguration[]) => {
        return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
      });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = (await vi.importActual("../../content_decryptor"))
      .default as typeof IContentDecryptor;
    return new Promise<void>((res, rej) => {
      const config = [{ type: "com.widevine.alpha", getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error) => {
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
    const mockRequestMediaKeySystemAccess = vi
      .fn()
      .mockImplementation((keyType: string, conf: MediaKeySystemConfiguration[]) => {
        if (keyType === "some-other-working-key-system") {
          return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
        }
        return Promise.reject("nope");
      });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = (await vi.importActual("../../content_decryptor"))
      .default as typeof IContentDecryptor;
    return new Promise<void>((res, rej) => {
      const config = [
        { type: "com.widevine.alpha", getLicense: neverCalledFn },
        { type: "some-other-working-key-system", getLicense: neverCalledFn },
      ];

      const mediaElement = document.createElement("video");
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(3);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          1,
          "com.widevine.alpha",
          defaultWidevineConfig,
        );
        expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          2,
          "com.widevine.alpha",
          removeCapabiltiesFromConfig(defaultWidevineConfig),
        );
        expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          3,
          "some-other-working-key-system",
          defaultKSConfig,
        );
        res();
      }, 10);
    });
  });

  it("should not continue to check if the ContentDecryptor is disposed from", async () => {
    let contentDecryptor: IContentDecryptor | null = null;
    let rmksHasBeenCalled = false;
    const mockRequestMediaKeySystemAccess = vi.fn().mockImplementation(() => {
      return Promise.resolve().then(() => {
        rmksHasBeenCalled = true;
        contentDecryptor?.dispose();
        return Promise.reject("nope");
      });
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = (await vi.importActual("../../content_decryptor"))
      .default as typeof IContentDecryptor;
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [
        { type: "foo", getLicense: neverCalledFn },
        { type: "bar", getLicense: neverCalledFn },
        { type: "baz", getLicense: neverCalledFn },
      ];
      contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error) => {
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
    const ContentDecryptor = (await vi.importActual("../../content_decryptor"))
      .default as typeof IContentDecryptor;
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [{ type: "foo", getLicense: neverCalledFn }];
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
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
