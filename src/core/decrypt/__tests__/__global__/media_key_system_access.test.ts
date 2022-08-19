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

import { ICustomMediaKeySystemAccess } from "../../../../compat";
import {
  defaultKSConfig,
  defaulPlayReadyRecommendationConfig,
  defaultWidevineConfig,
  mockCompat,
  testContentDecryptorError,
} from "./utils";

export function requestMediaKeySystemAccessNoMediaKeys(
  keySystem : string,
  config : MediaKeySystemConfiguration[]
) : Promise<ICustomMediaKeySystemAccess> {
  if (config.length === 0) {
    throw new Error("requestMediaKeySystemAccessNoMediaKeys: no config given");
  }
  return Promise.resolve({
    keySystem,
    getConfiguration() { return config[0]; },
    createMediaKeys() { return new Promise(() => { /* noop */ }); },
  });
}

const incompatibleMKSAErrorMessage =
  "EncryptedMediaError (INCOMPATIBLE_KEYSYSTEMS) No key system compatible " +
  "with your wanted configuration has been found in the current browser.";

/**
 * Check that the given `keySystemsConfigs` lead to an
 * `INCOMPATIBLE_KEYSYSTEMS` error.
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Promise}
 */
async function checkIncompatibleKeySystemsErrorMessage(
  keySystemsConfigs : unknown[]
) : Promise<void> {
  const mediaElement = document.createElement("video");
  const ContentDecryptor = jest.requireActual("../../content_decryptor").default;

  const error : any = await testContentDecryptorError(ContentDecryptor,
                                                      mediaElement,
                                                      keySystemsConfigs);
  expect(error).not.toBe(null);
  expect(error.message).toEqual(incompatibleMKSAErrorMessage);
  expect(error.name).toEqual("EncryptedMediaError");
  expect(error.code).toEqual("INCOMPATIBLE_KEYSYSTEMS");
}

describe("core - decrypt - global tests - media key system access", () => {
  // Used to implement every functions that should never be called.
  const neverCalledFn = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.mock("../../set_server_certificate", () => ({ __esModule: true as const,
                                                       default: neverCalledFn }));
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
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    const getLicenseFn = neverCalledFn;
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: getLicenseFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should throw if given multiple incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    const config = [ { type: "foo", getLicense: neverCalledFn },
                     { type: "bar", getLicense: neverCalledFn },
                     { type: "baz", getLicense: neverCalledFn } ];
    await checkIncompatibleKeySystemsErrorMessage(config);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(3);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(1, "foo", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(2, "bar", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(3, "baz", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should throw an error if no implementation of requestMediaKeySystemAccess is set", async () => {
  /* eslint-enable max-len */
    mockCompat({ requestMediaKeySystemAccess: undefined });
    const mediaElement = document.createElement("video");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;

    const config = [{ type: "foo", getLicense: neverCalledFn }];
    const error : any = await testContentDecryptorError(ContentDecryptor,
                                                        mediaElement,
                                                        config);
    expect(error).not.toBe(null);
    expect(error.message)
      .toEqual("requestMediaKeySystemAccess is not implemented in your browser.");
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should set persistentState value if persistentState is set to \"required\"", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentState: "required" }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, persistentState: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should set persistentState value if persistentState is set to \"not-allowed\"", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentState: "not-allowed" }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, persistentState: "not-allowed" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should set persistentState value if persistentState is set to \"optional\"", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentState: "optional" }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, persistentState: "optional" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should set distinctiveIdentifier value if distinctiveIdentifier is set to \"required\"", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{
      type: "foo",
      getLicense: neverCalledFn,
      distinctiveIdentifier: "required",
    }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should set distinctiveIdentifier value if distinctiveIdentifier is set to \"not-allowed\"", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{
      type: "foo",
      getLicense: neverCalledFn,
      distinctiveIdentifier: "not-allowed",
    }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, distinctiveIdentifier: "not-allowed" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should set distinctiveIdentifier value if distinctiveIdentifier is set to \"optional\"", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{
      type: "foo",
      getLicense: neverCalledFn,
      distinctiveIdentifier: "optional",
    }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, distinctiveIdentifier: "optional" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should want persistent sessions if persistentLicenseConfig is set", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    const persistentLicenseConfig = { save() { throw new Error("Should not save."); },
                                      load() { throw new Error("Should not load."); } };
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentLicenseConfig }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary",
                              "persistent-license"] };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it("should do nothing if persistentLicenseConfig is set to null", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentLicenseConfig: null }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should do nothing if persistentLicenseConfig is set to undefined", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{
      type: "foo",
      getLicense: neverCalledFn,
      persistentLicenseConfig: undefined,
    }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should translate a `clearkey` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "clearkey",
                                                     getLicense: neverCalledFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(1, "webkit-org.w3.clearkey", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(2, "org.w3.clearkey", defaultKSConfig);
  });

  it("should translate a `widevine` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "widevine",
                                                     getLicense: neverCalledFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenCalledWith("com.widevine.alpha", defaultWidevineConfig);
  });

  it("should translate a `playready` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     getLicense: neverCalledFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(4);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(1,
                               "com.microsoft.playready.recommendation",
                               defaulPlayReadyRecommendationConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(2,
                               "com.microsoft.playready",
                               defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(3, "com.chromecast.playready", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(4, "com.youtube.playready", defaultKSConfig);
  });

  it("should translate a `fairplay` keySystem", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "fairplay",
                                                     getLicense: neverCalledFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenCalledWith("com.apple.fps.1_0", defaultKSConfig);
  });

  it("should translate a multiple keySystems at the same time", async () => {
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     getLicense: neverCalledFn },
                                                   { type: "clearkey",
                                                     getLicense: neverCalledFn }]);
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(1,
                               "com.microsoft.playready.recommendation",
                               defaulPlayReadyRecommendationConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(2, "com.microsoft.playready", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(3, "com.chromecast.playready", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(4, "com.youtube.playready", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(5, "webkit-org.w3.clearkey", defaultKSConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(6, "org.w3.clearkey", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should translate a multiple keySystems at the same time with different configs", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     persistentLicenseConfig: {
                                                       load() { return []; },
                                                       save() { return []; },
                                                     },
                                                     getLicense: neverCalledFn },
                                                   { type: "clearkey",
                                                     distinctiveIdentifier: "required",
                                                     getLicense: neverCalledFn }]);
    const expectedPersistentConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary",
                              "persistent-license"] };
    });
    const expectedRecoPersistentConfig = defaulPlayReadyRecommendationConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary",
                              "persistent-license"] };
    });
    const expectedIdentifierConfig = defaultKSConfig.map(conf => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(1,
                               "com.microsoft.playready.recommendation",
                               expectedRecoPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(2, "com.microsoft.playready", expectedPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(3, "com.chromecast.playready", expectedPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(4, "com.youtube.playready", expectedPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(5, "webkit-org.w3.clearkey", expectedIdentifierConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(6, "org.w3.clearkey", expectedIdentifierConfig);
  });

  /* eslint-disable max-len */
  it("should set widevine robustnesses for a `com.widevine.alpha` keySystem", async () => {
  /* eslint-enable max-len */
    const mockRequestMediaKeySystemAccess = jest.fn(() => Promise.reject("nope"));
    mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     persistentLicenseConfig: {
                                                       load() { return []; },
                                                       save() { return []; },
                                                     },
                                                     getLicense: neverCalledFn },
                                                   { type: "clearkey",
                                                     distinctiveIdentifier: "required",
                                                     getLicense: neverCalledFn }]);
    const expectedPersistentConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary", "persistent-license"] };
    });
    const expectedRecoPersistentConfig = defaulPlayReadyRecommendationConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary", "persistent-license"] };
    });
    const expectedIdentifierConfig = defaultKSConfig.map(conf => {
      return { ...conf,  distinctiveIdentifier: "required" };
    });
    expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(6);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(1,
                               "com.microsoft.playready.recommendation",
                               expectedRecoPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(2, "com.microsoft.playready", expectedPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(3, "com.chromecast.playready", expectedPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(4, "com.youtube.playready", expectedPersistentConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(5, "webkit-org.w3.clearkey", expectedIdentifierConfig);
    expect(mockRequestMediaKeySystemAccess)
      .toHaveBeenNthCalledWith(6, "org.w3.clearkey", expectedIdentifierConfig);
  });

  /* eslint-disable max-len */
  it("should successfully create a MediaKeySystemAccess if given the right configuration", async () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      const mockRequestMediaKeySystemAccess = jest.fn((keyType, conf) => {
        return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
      });
      mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
      const config = [{ type: "com.widevine.alpha",
                        getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAccess)
          .toHaveBeenCalledWith("com.widevine.alpha", defaultWidevineConfig);
        res();
      }, 10);
    });
  });

  /* eslint-disable max-len */
  it("should successfully create a MediaKeySystemAccess if given multiple configurations where one works", async () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      let callNb = 0;
      const mockRequestMediaKeySystemAccess = jest.fn((keyType, conf) => {
        if (++callNb === 2) {
          return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
        }
        return Promise.reject("nope");
      });
      mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
      const config = [{ type: "com.widevine.alpha",
                        getLicense: neverCalledFn },
                      { type: "some-other-working-key-system",
                        getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
        rej(error);
      });
      setTimeout(() => {
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(2);
        expect(mockRequestMediaKeySystemAccess)
          .toHaveBeenNthCalledWith(1, "com.widevine.alpha", defaultWidevineConfig);
        expect(mockRequestMediaKeySystemAccess)
          .toHaveBeenNthCalledWith(2, "some-other-working-key-system", defaultKSConfig);
        res();
      }, 10);
    });
  });

  it("should not continue to check if the ContentDecryptor is disposed from", () => {
    return new Promise<void>((res, rej) => {
      let contentDecryptor : any = null;
      let rmksHasBeenCalled = false;
      const mockRequestMediaKeySystemAccess = jest.fn(() => {
        return Promise.resolve().then(() => {
          rmksHasBeenCalled = true;
          contentDecryptor.dispose();
          return Promise.reject("nope");
        });
      });
      mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
      const mediaElement = document.createElement("video");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;

      const config = [ { type: "foo", getLicense: neverCalledFn },
                       { type: "bar", getLicense: neverCalledFn },
                       { type: "baz", getLicense: neverCalledFn } ];
      contentDecryptor = new ContentDecryptor(mediaElement, config);
      contentDecryptor.addEventListener("error", (error: any) => {
        rej(error);
      });
      setTimeout(() => {
        expect(rmksHasBeenCalled).toEqual(true);
        expect(mockRequestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
        expect(mockRequestMediaKeySystemAccess)
          .toHaveBeenNthCalledWith(1, "foo", defaultKSConfig);
        res();
      }, 10);
    });
  });

  it("should trigger error even if requestMediaKeySystemAccess throws", () => {
    return new Promise<void>((res, rej) => {
      let rmksHasBeenCalled = false;
      const mockRequestMediaKeySystemAccess = jest.fn(() => {
        rmksHasBeenCalled = true;
        throw new Error("nope");
      });
      mockCompat({ requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess });
      const mediaElement = document.createElement("video");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;

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
