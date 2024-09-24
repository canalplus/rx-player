/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */

import type { ICustomMediaKeySystemAccess } from "../../../../compat/eme";
import type { IKeySystemOption } from "../../../../public_types";
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
  "EncryptedMediaError (INCOMPATIBLE_KEYSYSTEMS) No key system compatible " +
  "with your wanted configuration has been found in the current browser.";

function removeCapabilitiesConfig(
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
  const ContentDecryptor = jest.requireActual("../../content_decryptor").default;

  const error: any = await testContentDecryptorError(
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
  const neverCalledFn = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.mock("../../set_server_certificate", () => ({
      __esModule: true as const,
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
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  it("should throw if given multiple incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "bar",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "bar",
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "baz",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "baz",
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  /* eslint-disable max-len */
  it("should change persistentState value if persistentStateRequired is set to true", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        persistentStateRequired: true,
      },
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
      removeCapabilitiesConfig(expectedConfig),
    );
  });

  /* eslint-disable max-len */
  it("should not change persistentState value if persistentStateRequired is set to false", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        persistentStateRequired: false,
      },
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
      removeCapabilitiesConfig(expectedConfig),
    );
  });

  /* eslint-disable max-len */
  it("should change distinctiveIdentifier value if distinctiveIdentifierRequired is set to true", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        distinctiveIdentifierRequired: true,
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
      removeCapabilitiesConfig(expectedConfig),
    );
  });

  /* eslint-disable max-len */
  it("should not change distinctiveIdentifier value if distinctiveIdentifierRequired is set to false", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        distinctiveIdentifierRequired: false,
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
      removeCapabilitiesConfig(expectedConfig),
    );
  });

  /* eslint-disable max-len */
  it("should want persistent sessions if both persistentLicense and licenseStorage are set", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const licenseStorage = {
      save() {
        throw new Error("Should not save.");
      },
      load() {
        throw new Error("Should not load.");
      },
    };
    await checkIncompatibleKeySystemsErrorMessage([
      { type: "foo", getLicense: neverCalledFn, licenseStorage, persistentLicense: true },
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
      removeCapabilitiesConfig(expectedConfig),
    );
  });

  /* eslint-disable max-len */
  it("should want persistent sessions if just persistentLicense is set to true", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        persistentLicense: true,
        licenseStorage: {
          load() {
            return [];
          },
          save() {
            /* noop */
          },
        },
      },
    ]);
    const persistentConfig: MediaKeySystemConfiguration[] = defaultKSConfig.map(
      (conf) => {
        return {
          ...conf,
          persistentState: "required",
          sessionTypes: ["temporary", "persistent-license"],
        };
      },
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      1,
      "foo",
      persistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      2,
      "foo",
      removeCapabilitiesConfig(persistentConfig),
    );
  });

  it("should do nothing if persistentLicense is set to false", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "foo",
        getLicense: neverCalledFn,
        persistentLicense: false,
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
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  it("should translate a `clearkey` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "org.w3.clearkey",
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  it("should translate a `widevine` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultWidevineConfig),
    );
  });

  it("should translate a `playready` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultPRRecommendationKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  it("should translate a `fairplay` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  it("should translate a multiple keySystems at the same time", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
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
      removeCapabilitiesConfig(defaultPRRecommendationKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabilitiesConfig(defaultKSConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      defaultKSConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabilitiesConfig(defaultKSConfig),
    );
  });

  /* eslint-disable max-len */
  it("should translate a multiple keySystems at the same time with different configs", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "playready",
        persistentLicense: true,
        licenseStorage: {
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
        distinctiveIdentifierRequired: true,
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
      removeCapabilitiesConfig(expectedPRRecommendationPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabilitiesConfig(expectedIdentifierConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabilitiesConfig(expectedIdentifierConfig),
    );
  });

  /* eslint-disable max-len */
  it("should set widevine robustnesses for a `com.widevine.alpha` keySystem", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "com.widevine.alpha",
        persistentLicense: true,
        licenseStorage: {
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
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
  });

  it("should set playready robustnesses for a `playready` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "playready",
        persistentLicense: true,
        licenseStorage: {
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
        distinctiveIdentifierRequired: true,
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
      removeCapabilitiesConfig(expectedRecoPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      3,
      "com.microsoft.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      4,
      "com.microsoft.playready",
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      5,
      "com.chromecast.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      6,
      "com.chromecast.playready",
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      7,
      "com.youtube.playready",
      expectedPersistentConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      8,
      "com.youtube.playready",
      removeCapabilitiesConfig(expectedPersistentConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      9,
      "webkit-org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      10,
      "webkit-org.w3.clearkey",
      removeCapabilitiesConfig(expectedIdentifierConfig),
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      11,
      "org.w3.clearkey",
      expectedIdentifierConfig,
    );
    expect(mockRequestMediaKeySystemAccess).toHaveBeenNthCalledWith(
      12,
      "org.w3.clearkey",
      removeCapabilitiesConfig(expectedIdentifierConfig),
    );
  });

  /* eslint-disable max-len */
  it("should set playready robustnesses for a `com.microsoft.playready.recommendation` keySystem", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    await checkIncompatibleKeySystemsErrorMessage([
      {
        type: "com.microsoft.playready.recommendation",
        persistentLicense: true,
        licenseStorage: {
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
      removeCapabilitiesConfig(expectedRecoPersistentConfig),
    );
  });

  /* eslint-disable max-len */
  it("should successfully create a MediaKeySystemAccess if given the right configuration", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn((keyType, conf) => {
      return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    return new Promise<void>((res, rej) => {
      const config = [{ type: "com.widevine.alpha", getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
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

  /* eslint-disable max-len */
  it("should successfully create a MediaKeySystemAccess if given multiple configurations where one works", async () => {
    /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn((keyType, conf) => {
      if (keyType === "some-other-working-key-system") {
        return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
      }
      return Promise.reject("nope");
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    return new Promise<void>((res, rej) => {
      const config = [
        { type: "com.widevine.alpha", getLicense: neverCalledFn },
        { type: "some-other-working-key-system", getLicense: neverCalledFn },
      ];

      const mediaElement = document.createElement("video");
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
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
          removeCapabilitiesConfig(defaultWidevineConfig),
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

  /* eslint-disable max-len */
  it("should not continue to check if the ContentDecryptor is disposed from", async () => {
    /* eslint-enable max-len */
    let contentDecryptor: any = null;
    let rmksHasBeenCalled = false;
    const mockRequestMediaKeySystemAccess = jest.fn(() => {
      return Promise.resolve().then(() => {
        rmksHasBeenCalled = true;
        contentDecryptor.dispose();
        return Promise.reject("nope");
      });
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    return new Promise<void>((res, rej) => {
      const mediaElement = document.createElement("video");

      const config = [
        { type: "foo", getLicense: neverCalledFn },
        { type: "bar", getLicense: neverCalledFn },
        { type: "baz", getLicense: neverCalledFn },
      ];
      contentDecryptor = new ContentDecryptor(mediaElement, config);
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
    const mockRequestMediaKeySystemAccess = jest.fn(() => {
      rmksHasBeenCalled = true;
      throw new Error("nope");
    });
    mockCompat({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    });
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
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
