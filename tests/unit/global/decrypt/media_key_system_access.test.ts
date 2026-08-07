import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import type { IMediaKeySystemAccess } from "../../../../src/compat/browser_compatibility_types.ts";
import getEmeApiImplementation from "../../../../src/compat/eme/index.ts";
import ContentDecryptor from "../../../../src/main_thread/decrypt/content_decryptor.ts";
import type { IKeySystemOption } from "../../../../src/public_types.ts";
import assert from "../../../../src/utils/assert.ts";
import {
  defaultKSConfig,
  defaultPRRecommendationKSConfig,
  defaultWidevineConfig,
  mockCompat,
  testContentDecryptorError,
} from "./utils.ts";

const mocks = vi.hoisted(() => {
  return {
    // Used to implement every functions that should never be called.
    neverCalled: vi.fn(),
    shouldRenewMediaKeySystemAccess: vi.fn(() => false),
    canReuseMediaKeys: vi.fn(() => true),
    onEncrypted: vi.fn(),
    requestMediaKeySystemAccess: vi.fn(),
    setMediaKeys: vi.fn(),
    getInitData: vi.fn(),
    generateKeyRequest: vi.fn(),
  };
});
vi.mock("../../../../src/compat/should_renew_media_key_system_access", () => ({
  default: mocks.shouldRenewMediaKeySystemAccess,
}));
vi.mock("../../../../src/compat/can_reuse_media_keys", () => ({
  default: mocks.canReuseMediaKeys,
}));
vi.mock("../../../../src/compat/eme", () => ({
  default: () => ({
    onEncrypted: mocks.onEncrypted,
    requestMediaKeySystemAccess: mocks.requestMediaKeySystemAccess,
    setMediaKeys: mocks.setMediaKeys,
  }),
  getInitData: mocks.getInitData,
  generateKeyRequest: mocks.generateKeyRequest,
  closeSession: vi.fn(),
  loadSession: vi.fn(),
}));
vi.mock("../../../../src/main_thread/decrypt/set_server_certificate", () => ({
  default: mocks.neverCalled,
}));

function requestMediaKeySystemAccessNoMediaKeys(
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

  const eme = getEmeApiImplementation("auto");
  assert(eme !== null, "Expected to have an EME implementation");
  const error = await testContentDecryptorError(
    eme,
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
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    expect(mocks.neverCalled).not.toHaveBeenCalled();
    mocks.shouldRenewMediaKeySystemAccess.mockReset();
    mocks.canReuseMediaKeys.mockReset();
    mocks.onEncrypted.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
    mocks.setMediaKeys.mockReset();
    mocks.getInitData.mockReset();
    mocks.generateKeyRequest.mockReset();
  });

  it("should throw if an empty keySystemsConfigs is given", async () => {
    mockCompat(mocks);
    await checkIncompatibleKeySystemsErrorMessage([]);
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    const getLicenseFn = mocks.neverCalled;
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: getLicenseFn },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should throw if given multiple incompatible keySystemsConfigs", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    const config = [
      { type: "foo", getLicense: mocks.neverCalled },
      { type: "bar", getLicense: mocks.neverCalled },
      { type: "baz", getLicense: mocks.neverCalled },
    ];
    await checkIncompatibleKeySystemsErrorMessage(config);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "bar",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "bar",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "baz",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "baz",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it('should set persistentState value if persistentState is set to "required"', async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: mocks.neverCalled, persistentState: "required" },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "required" };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it('should set persistentState value if persistentState is set to "not-allowed"', async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        persistentState: "not-allowed",
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "not-allowed" };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it('should set persistentState value if persistentState is set to "optional"', async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: mocks.neverCalled, persistentState: "optional" },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, persistentState: "optional" };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it('should set distinctiveIdentifier value if distinctiveIdentifier is set to "required"', async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        distinctiveIdentifier: "required",
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it('should set distinctiveIdentifier value if distinctiveIdentifier is set to "not-allowed"', async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        distinctiveIdentifier: "not-allowed",
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "not-allowed" };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it('should set distinctiveIdentifier value if distinctiveIdentifier is set to "optional"', async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        distinctiveIdentifier: "optional",
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return { ...conf, distinctiveIdentifier: "optional" };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should want only persistent sessions if wantedSessionTypes is set to `['persistent-license']`", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        wantedSessionTypes: ["persistent-license"],
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        sessionTypes: ["persistent-license"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should want only temporary sessions if wantedSessionTypes is set to `['temporary']`", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        wantedSessionTypes: ["temporary"],
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        sessionTypes: ["temporary"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should want both temporary and persistent sessions if wantedSessionTypes is set to `['persistent-license', 'temporary']`", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        wantedSessionTypes: ["persistent-license", "temporary"],
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        sessionTypes: ["persistent-license", "temporary"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should want persistent sessions if persistentLicenseConfig is set", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    const persistentLicenseConfig = {
      save() {
        throw new Error("Should not save.");
      },
      load() {
        throw new Error("Should not load.");
      },
    };
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: mocks.neverCalled, persistentLicenseConfig },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["persistent-license"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should not want persistent sessions if persistentLicenseConfig is set but wantedSessionTypes only wants temporary licenses", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    const persistentLicenseConfig = {
      save() {
        throw new Error("Should not save.");
      },
      load() {
        throw new Error("Should not load.");
      },
    };
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        wantedSessionTypes: ["temporary"],
        persistentLicenseConfig,
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        sessionTypes: ["temporary"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should properly handle persistentLicenseConfig and wantedSessionTypes set to persistent-license", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    const persistentLicenseConfig = {
      save() {
        throw new Error("Should not save.");
      },
      load() {
        throw new Error("Should not load.");
      },
    };
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        wantedSessionTypes: ["persistent-license"],
        persistentLicenseConfig,
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["persistent-license"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should properly handle persistentLicenseConfig and wantedSessionTypes set to both temporary and persistent-license", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    const persistentLicenseConfig = {
      save() {
        throw new Error("Should not save.");
      },
      load() {
        throw new Error("Should not load.");
      },
    };
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
        wantedSessionTypes: ["temporary", "persistent-license"],
        persistentLicenseConfig,
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);

    const expectedConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map((conf) => {
      return {
        ...conf,
        persistentState: "required",
        sessionTypes: ["temporary", "persistent-license"],
      };
    });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      expectedConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(expectedConfig),
    );
  });

  it("should do nothing if persistentLicenseConfig is set to null", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should do nothing if persistentLicenseConfig is set to undefined", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: mocks.neverCalled,
      },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should translate a `clearkey` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "clearkey", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(4);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should translate a `widevine` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "widevine", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.widevine.alpha",
      defaultWidevineConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.widevine.alpha",
      removeCapabiltiesFromConfig(defaultWidevineConfig),
    );
  });

  it("should translate a `playready` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "playready", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(8);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      defaultPRRecommendationKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(defaultPRRecommendationKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should translate a `fairplay` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "fairplay", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledWith(
      "com.apple.fps.1_0",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledWith(
      "com.apple.fps.1_0",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should translate a multiple keySystems at the same time", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "playready", getLicense: mocks.neverCalled },
      { type: "clearkey", getLicense: mocks.neverCalled },
    ]);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(12);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      defaultPRRecommendationKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(defaultPRRecommendationKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(defaultKSConfig),
    );
  });

  it("should translate a multiple keySystems at the same time with different configs", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
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
        getLicense: mocks.neverCalled,
      },
      {
        type: "clearkey",
        distinctiveIdentifier: "required",
        getLicense: mocks.neverCalled,
      },
    ]);
    const expectedPRRecommendationPersistentConfig: MediaKeySystemConfiguration[] =
      defaultPRRecommendationKSConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["persistent-license"],
        };
      });
    const expectedPersistentConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["persistent-license"],
        };
      },
    );
    const expectedIdentifierConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return { ...conf, distinctiveIdentifier: "required" };
      },
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(12);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedPRRecommendationPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(expectedPRRecommendationPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
    );
  });

  it("should set widevine robustnesses for a `com.widevine.alpha` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
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
        getLicense: mocks.neverCalled,
      },
    ]);
    const expectedPersistentConfig: MediaKeySystemConfiguration[] =
      defaultWidevineConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["persistent-license"],
        };
      });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.widevine.alpha",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.widevine.alpha",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
  });

  it("should set playready robustnesses for a `playready` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
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
        getLicense: mocks.neverCalled,
      },
      {
        type: "clearkey",
        distinctiveIdentifier: "required",
        getLicense: mocks.neverCalled,
      },
    ]);
    const expectedPersistentConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["persistent-license"],
        };
      },
    );
    const expectedRecoPersistentConfig: MediaKeySystemConfiguration[] =
      defaultPRRecommendationKSConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["persistent-license"],
        };
      });
    const expectedIdentifierConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return { ...conf, distinctiveIdentifier: "required" };
      },
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(12);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedRecoPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(expectedRecoPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabiltiesFromConfig(expectedPersistentConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabiltiesFromConfig(expectedIdentifierConfig),
    );
  });

  it("should set playready robustnesses for a `com.microsoft.playready.recommendation` keySystem", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(() => Promise.reject("nope"));
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
        getLicense: mocks.neverCalled,
      },
    ]);
    const expectedRecoPersistentConfig: MediaKeySystemConfiguration[] =
      defaultPRRecommendationKSConfig.map((conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["persistent-license"],
        };
      });
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "com.microsoft.playready.recommendation",
      expectedRecoPersistentConfig,
    );
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "com.microsoft.playready.recommendation",
      removeCapabiltiesFromConfig(expectedRecoPersistentConfig),
    );
  });

  it("should successfully create a MediaKeySystemAccess if given the right configuration", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(
      (keyType: string, conf: MediaKeySystemConfiguration[]) => {
        return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
      },
    );
    return new Promise<void>((res, rej) => {
      const config = [{ type: "com.widevine.alpha", getLicense: mocks.neverCalled }];

      const mediaElement = document.createElement("video");
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", (error) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledWith(
          "com.widevine.alpha",
          defaultWidevineConfig,
        );
        res();
      }, 10);
    });
  });

  it("should successfully create a MediaKeySystemAccess if given multiple configurations where one works", async () => {
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(
      (keyType: string, conf: MediaKeySystemConfiguration[]) => {
        if (keyType === "some-other-working-key-system") {
          return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
        }
        return Promise.reject("nope");
      },
    );
    return new Promise<void>((res, rej) => {
      const config = [
        { type: "com.widevine.alpha", getLicense: mocks.neverCalled },
        { type: "some-other-working-key-system", getLicense: mocks.neverCalled },
      ];

      const mediaElement = document.createElement("video");
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", (error) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(3);
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          1,
          "com.widevine.alpha",
          defaultWidevineConfig,
        );
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          2,
          "com.widevine.alpha",
          removeCapabiltiesFromConfig(defaultWidevineConfig),
        );
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          3,
          "some-other-working-key-system",
          defaultKSConfig,
        );
        res();
      }, 10);
    });
  });

  it("should not continue to check if the ContentDecryptor is disposed from", async () => {
    mockCompat(mocks);
    let contentDecryptor: ContentDecryptor | null = null;
    let rmksHasBeenCalled = false;
    mocks.requestMediaKeySystemAccess.mockImplementation(() => {
      return Promise.resolve().then(() => {
        rmksHasBeenCalled = true;
        contentDecryptor?.dispose(undefined);
        return Promise.reject("nope");
      });
    });
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [
        { type: "foo", getLicense: mocks.neverCalled },
        { type: "bar", getLicense: mocks.neverCalled },
        { type: "baz", getLicense: mocks.neverCalled },
      ];
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      contentDecryptor = new ContentDecryptor(eme, mediaElement, config);
      contentDecryptor.addEventListener("error", (error) => {
        rej(error);
      });
      setTimeout(() => {
        expect(rmksHasBeenCalled).toEqual(true);
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        expect(mocks.requestMediaKeySystemAccess).toHaveBeenNthCalledWith(
          1,
          "foo",
          defaultKSConfig,
        );
        res();
      }, 10);
    });
  });

  it("should trigger error even if requestMediaKeySystemAccess throws", async () => {
    mockCompat(mocks);
    let rmksHasBeenCalled = false;
    mocks.requestMediaKeySystemAccess.mockImplementation(() => {
      rmksHasBeenCalled = true;
      throw new Error("nope");
    });
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [{ type: "foo", getLicense: mocks.neverCalled }];
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
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
