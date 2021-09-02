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
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  EMPTY,
  Observable,
  of as observableOf,
  Subject,
  takeUntil,
  throwError as observableThrow,
} from "rxjs";
import { ICustomMediaKeySystemAccess } from "../../../../compat";
import {
  defaultKSConfig,
  defaultWidevineConfig,
  mockCompat,
  testEMEManagerImmediateError,
} from "./utils";

export function requestMediaKeySystemAccessNoMediaKeys(
  keySystem : string,
  config : MediaKeySystemConfiguration[]
) : Observable<ICustomMediaKeySystemAccess> {
  if (config.length === 0) {
    throw new Error("requestMediaKeySystemAccessNoMediaKeys: no config given");
  }
  return observableOf({
    keySystem,
    getConfiguration() { return config[0]; },
    createMediaKeys() { return new Promise(() => { /* noop */ }); },
  });
}

const incompatibleMKSAErrorMessage =
  "EncryptedMediaError (INCOMPATIBLE_KEYSYSTEMS) No key system compatible " +
  "with your wanted configuration has been found in the current browser.";

/**
 * Check that the given `keySystemsConfigs` lead directly to an
 * `INCOMPATIBLE_KEYSYSTEMS` error.
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Promise}
 */
async function checkIncompatibleKeySystemsErrorMessage(
  keySystemsConfigs : unknown[]
) : Promise<void> {
  const mediaElement = document.createElement("video");
  const EMEManager = require("../../eme_manager").default;

  const error : any = await testEMEManagerImmediateError(EMEManager,
                                                         mediaElement,
                                                         keySystemsConfigs,
                                                         EMPTY);
  expect(error).not.toBe(null);
  expect(error.message).toEqual(incompatibleMKSAErrorMessage);
  expect(error.name).toEqual("EncryptedMediaError");
  expect(error.code).toEqual("INCOMPATIBLE_KEYSYSTEMS");
}

describe("core - eme - global tests - media key system access", () => {
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
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    const getLicenseFn = neverCalledFn;
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: getLicenseFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should throw if given multiple incompatible keySystemsConfigs", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    const config = [ { type: "foo", getLicense: neverCalledFn },
                     { type: "bar", getLicense: neverCalledFn },
                     { type: "baz", getLicense: neverCalledFn } ];
    await checkIncompatibleKeySystemsErrorMessage(config);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(3);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(1, "foo", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(2, "bar", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(3, "baz", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should throw an error if no implementation of requestMediaKeySystemAccess is set", async () => {
  /* eslint-enable max-len */
    mockCompat({ requestMediaKeySystemAccess: undefined });
    const mediaElement = document.createElement("video");
    const EMEManager = require("../../eme_manager").default;

    const config = [{ type: "foo", getLicense: neverCalledFn }];
    const error : any = await testEMEManagerImmediateError(EMEManager,
                                                           mediaElement,
                                                           config,
                                                           EMPTY);
    expect(error).not.toBe(null);
    expect(error.message)
      .toEqual("requestMediaKeySystemAccess is not implemented in your browser.");
  });

  it("should throw if given a single incompatible keySystemsConfigs", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should change persistentState value if persistentStateRequired is set to true", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentStateRequired: true }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, persistentState: "required" };
    });
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should not change persistentState value if persistentStateRequired is set to false", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentStateRequired: false }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should change distinctiveIdentifier value if distinctiveIdentifierRequired is set to true", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{
      type: "foo",
      getLicense: neverCalledFn,
      distinctiveIdentifierRequired: true,
    }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should not change distinctiveIdentifier value if distinctiveIdentifierRequired is set to false", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{
      type: "foo",
      getLicense: neverCalledFn,
      distinctiveIdentifierRequired: false,
    }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should do nothing if just licenseStorage is set", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    const licenseStorage = { save() { throw new Error("Should not save."); },
                             load() { throw new Error("Should not load."); } };
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     licenseStorage }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should want persistent sessions if both persistentLicense and licenseStorage are set", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    const licenseStorage = { save() { throw new Error("Should not save."); },
                             load() { throw new Error("Should not load."); } };
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     licenseStorage,
                                                     persistentLicense: true }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary",
                              "persistent-license"] };
    });
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", expectedConfig);
  });

  /* eslint-disable max-len */
  it("should want persistent sessions if just persistentLicense is set to true", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentLicense: true }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);

    const expectedConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary", "persistent-license"] };
    });
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", expectedConfig);
  });

  it("should do nothing if persistentLicense is set to false", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "foo",
                                                     getLicense: neverCalledFn,
                                                     persistentLicense: false }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledWith("foo", defaultKSConfig);
  });

  it("should translate a `clearkey` keySystem", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "clearkey",
                                                     getLicense: neverCalledFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(1, "webkit-org.w3.clearkey", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(2, "org.w3.clearkey", defaultKSConfig);
  });

  it("should translate a `widevine` keySystem", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "widevine",
                                                     getLicense: neverCalledFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenCalledWith("com.widevine.alpha", defaultWidevineConfig);
  });

  it("should translate a `playready` keySystem", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     getLicense: neverCalledFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(3);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(1, "com.microsoft.playready", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(2, "com.chromecast.playready", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(3, "com.youtube.playready", defaultKSConfig);
  });

  it("should translate a `fairplay` keySystem", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "fairplay",
                                                     getLicense: neverCalledFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenCalledWith("com.apple.fps.1_0", defaultKSConfig);
  });

  it("should translate a multiple keySystems at the same time", async () => {
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     getLicense: neverCalledFn },
                                                   { type: "clearkey",
                                                     getLicense: neverCalledFn }]);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(5);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(1, "com.microsoft.playready", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(2, "com.chromecast.playready", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(3, "com.youtube.playready", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(4, "webkit-org.w3.clearkey", defaultKSConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(5, "org.w3.clearkey", defaultKSConfig);
  });

  /* eslint-disable max-len */
  it("should translate a multiple keySystems at the same time with different configs", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     persistentLicense: true,
                                                     getLicense: neverCalledFn },
                                                   { type: "clearkey",
                                                     distinctiveIdentifierRequired: true,
                                                     getLicense: neverCalledFn }]);
    const expectedPersistentConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary",
                              "persistent-license"] };
    });
    const expectedIdentifierConfig = defaultKSConfig.map(conf => {
      return { ...conf, distinctiveIdentifier: "required" };
    });
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(5);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(1, "com.microsoft.playready", expectedPersistentConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(2, "com.chromecast.playready", expectedPersistentConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(3, "com.youtube.playready", expectedPersistentConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(4, "webkit-org.w3.clearkey", expectedIdentifierConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(5, "org.w3.clearkey", expectedIdentifierConfig);
  });

  /* eslint-disable max-len */
  it("should set widevine robustnesses for a `com.widevine.alpha` keySystem", async () => {
  /* eslint-enable max-len */
    const requestMediaKeySystemAccessSpy = jest.fn(() => observableThrow(() => "nope"));
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
    await checkIncompatibleKeySystemsErrorMessage([{ type: "playready",
                                                     persistentLicense: true,
                                                     getLicense: neverCalledFn },
                                                   { type: "clearkey",
                                                     distinctiveIdentifierRequired: true,
                                                     getLicense: neverCalledFn }]);
    const expectedPersistentConfig = defaultKSConfig.map(conf => {
      return { ...conf,
               persistentState: "required",
               sessionTypes: ["temporary", "persistent-license"] };
    });
    const expectedIdentifierConfig = defaultKSConfig.map(conf => {
      return { ...conf,  distinctiveIdentifier: "required" };
    });
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(5);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(1, "com.microsoft.playready", expectedPersistentConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(2, "com.chromecast.playready", expectedPersistentConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(3, "com.youtube.playready", expectedPersistentConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(4, "webkit-org.w3.clearkey", expectedIdentifierConfig);
    expect(requestMediaKeySystemAccessSpy)
      .toHaveBeenNthCalledWith(5, "org.w3.clearkey", expectedIdentifierConfig);
  });

  /* eslint-disable max-len */
  it("should successfully create a MediaKeySystemAccess if given the right configuration", async () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      const requestMediaKeySystemAccessSpy = jest.fn((keyType, conf) => {
        return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
      });
      mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
      const config = [{ type: "com.widevine.alpha",
                        getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const EMEManager = require("../../eme_manager").default;
      EMEManager(mediaElement, config, new Subject<void>())
        .subscribe(
          (evt : unknown) => {
            const eventStr = JSON.stringify(evt as any);
            rej(new Error("Received an EMEManager event: " + eventStr));
          },
          (err : unknown) => { rej(err); },
          () => rej(new Error("EMEManager completed."))
        );
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      expect(requestMediaKeySystemAccessSpy)
        .toHaveBeenCalledWith("com.widevine.alpha", defaultWidevineConfig);
      res();
    });
  });

  /* eslint-disable max-len */
  it("should successfully create a MediaKeySystemAccess if given multiple configurations where one works", async () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      let callNb = 0;
      const requestMediaKeySystemAccessSpy = jest.fn((keyType, conf) => {
        if (++callNb === 2) {
          return requestMediaKeySystemAccessNoMediaKeys(keyType, conf);
        }
        return observableThrow(() => "nope");
      });
      mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
      const config = [{ type: "com.widevine.alpha",
                        getLicense: neverCalledFn },
                      { type: "some-other-working-key-system",
                        getLicense: neverCalledFn }];

      const mediaElement = document.createElement("video");
      const EMEManager = require("../../eme_manager").default;
      EMEManager(mediaElement, config, new Subject<void>())
        .subscribe(
          (evt : unknown) => {
            const eventStr = JSON.stringify(evt as any);
            rej(new Error("Received an EMEManager event: " + eventStr));
          },
          (err : unknown) => { rej(err); },
          () => rej(new Error("EMEManager completed."))
        );
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
      expect(requestMediaKeySystemAccessSpy)
        .toHaveBeenNthCalledWith(1, "com.widevine.alpha", defaultWidevineConfig);
      expect(requestMediaKeySystemAccessSpy)
        .toHaveBeenNthCalledWith(2, "some-other-working-key-system", defaultKSConfig);
      res();
    });
  });

  xit("should not continue to check if the observable is unsubscribed from", () => {
    return new Promise<void>((res, rej) => {
      const killSubject$ = new Subject<void>();
      let rmksHasBeenCalled = false;
      const requestMediaKeySystemAccessSpy = jest.fn(() => {
        if (rmksHasBeenCalled) {
          rej("requestMediaKeySystemAccess has already been called.");
        }
        rmksHasBeenCalled = true;
        killSubject$.next();
        killSubject$.complete();
        return observableThrow(() => "nope");
      });
      mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessSpy });
      const mediaElement = document.createElement("video");
      const EMEManager = require("../../eme_manager").default;

      const config = [ { type: "foo", getLicense: neverCalledFn },
                       { type: "bar", getLicense: neverCalledFn },
                       { type: "baz", getLicense: neverCalledFn } ];
      EMEManager(mediaElement, config, EMPTY)
        .pipe(takeUntil(killSubject$))
        .subscribe(
          () => { rej("We should not have received an event"); },
          () => { rej("We should not have received an error."); },
          () =>  {
            expect(rmksHasBeenCalled).toBe(true);
            setTimeout(() => { res(); }, 10);
          }
        );
    });
  });
});
