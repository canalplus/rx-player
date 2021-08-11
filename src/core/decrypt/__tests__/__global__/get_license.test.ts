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
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-restricted-properties */

import { IPlayerError } from "../../../../public_types";
import { concat } from "../../../../utils/byte_parsing";
import {
  formatFakeChallengeFromInitData,
  MediaKeySessionImpl,
  MediaKeysImpl,
  mockCompat,
} from "./utils";

/** Default video element used in our tests. */
const videoElt = document.createElement("video");

/* eslint-disable max-len */
describe("core - decrypt - global tests - getLicense", () => {

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("should update the session after getLicense resolves with a license", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 0,
                            ignoreLicenseRequests: false });
  });

  it("should update the session after getLicense returns a license directly", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 0,
                            ignoreLicenseRequests: false });
  });

  it("should not update the session after getLicense resolves with null", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 0,
                            ignoreLicenseRequests: true });
  });

  it("should not update the session after getLicense returns null directly", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 0,
                            ignoreLicenseRequests: true });
  });

  it("should be able to retry maximum two times and fail after 3 tries with a rejected promise", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 3,
                            ignoreLicenseRequests: false });
  });

  it("should be able to retry maximum two times and fail after 3 tries with a thrown error", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 3,
                            ignoreLicenseRequests: true });
  });

  it("should be able to retry two times and succeed after a time with a resolved license", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 2,
                            ignoreLicenseRequests: false });
  });

  it("should be able to retry two times and succeed after a time with a returned license", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 2,
                            ignoreLicenseRequests: false });
  });

  it("should be able to retry two times and succeed after a time with a resolved null", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 2,
                            ignoreLicenseRequests: true });
  });

  it("should be able to retry two times and succeed after a time with a returned null", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 2,
                            ignoreLicenseRequests: true });
  });

  it("should be able to retry two times and succeed after a time with a resolved license", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 1,
                            ignoreLicenseRequests: false });
  });

  it("should be able to retry two times and succeed after a time with a returned license", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 1,
                            ignoreLicenseRequests: false });
  });

  it("should be able to retry two times and succeed after a time with a resolved null", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 1,
                            ignoreLicenseRequests: true });
  });

  it("should be able to retry two times and succeed after a time with a returned null", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: false,
                            configuredRetries: undefined,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 1,
                            ignoreLicenseRequests: true });
  });

  it("should be able to fetch a license directly even when getLicenseConfig.retry is set to `0`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: 0,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 0,
                            ignoreLicenseRequests: false });
  });

  it("should fail after first failure when getLicenseConfig.retry is set to `0`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: 1,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 0,
                            ignoreLicenseRequests: false });
  });

  it("should fail after two failures when getLicenseConfig.retry is set to `1`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: 2,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 2,
                            ignoreLicenseRequests: false });
  });

  it("should not fail after one failure when getLicenseConfig.retry is set to `1`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: 2,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 1,
                            ignoreLicenseRequests: false });
  });

  it("should not fail after 5 failures when getLicenseConfig.retry is set to `6`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: 6,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 5,
                            ignoreLicenseRequests: false });
  }, 15000);

  it("should fail after 6 failures when getLicenseConfig.retry is set to `6`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: 6,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 6,
                            ignoreLicenseRequests: false });
  }, 25000);

  it("should not fail after 5 failures when getLicenseConfig.retry is set to `Infinity`", async () => {
    await checkGetLicense({ isGetLicensePromiseBased: true,
                            configuredRetries: Infinity,
                            configuredTimeout: undefined,
                            getTimeout: () => undefined,
                            nbRetries: 5,
                            ignoreLicenseRequests: false });
  }, 15000);

});

/**
 * HUGE function to check most getLicense scenarios.
 * @param {Object} opts
 */
function checkGetLicense(
  { isGetLicensePromiseBased,
    configuredRetries,
    configuredTimeout,
    getTimeout,
    nbRetries,
    ignoreLicenseRequests } : {
      /**
       * Set it to false if you want to return directly a value from
       * `getLicense` (i.e. not wrapped in a Promise).
       * This is valable both for success, and errors (which will be either
       * thrown directly or wrapped in a rejecting Promise).
       *
       * This value will be forced to `true` if the `getTimeout` call for the
       * corresponding `getLicense` returns something other than `undefined`.
       */
    isGetLicensePromiseBased : boolean;
      /** Maximum amount of retries: value of getLicenseConfig.retry. */
    configuredRetries : number | undefined;
      /**
       * Return getLicense timeout after which the response will be emitted, in
       * milliseconds.
       * Put to `undefined` for no timeout at all (synchronous).
       * Note that if a timeout is given, getLicense will return a Promise.
       * As such, `isGetLicensePromiseBased` will be ignored.
       */
    getTimeout : (callIdx : number) => number | undefined;
      /** Maximum configured timeout: value of getLicenseConfig.timeout. */
    configuredTimeout : number | undefined;
      /**
       * Nb of times getLicense should fail in a row.
       * If put at a higher value or equal to `configuredRetries`, no license
       * will be obtained.
       */
    nbRetries : number;
      /**
       * If `true`, getLicense will return `null` - to ignore a request - when
       * it succeed.
       */
    ignoreLicenseRequests : boolean; }
) : Promise<void> {
  return new Promise((res, rej) => {
    // == mocks ==
    mockCompat();
    const mediaKeySession = new MediaKeySessionImpl();
    jest.spyOn(MediaKeysImpl.prototype, "createSession").mockReturnValue(mediaKeySession);
    const mockUpdate = jest.spyOn(mediaKeySession, "update");
    let remainingRetries = nbRetries;
    const mockGetLicense = jest.fn(() => {
      const callIdx = nbRetries - remainingRetries;
      const timeout = getTimeout(callIdx);
      if (remainingRetries === 0) {
        const challengeU8 = new Uint8Array(challenge);
        const result = ignoreLicenseRequests ? null :
                                               concat(challengeU8, challengeU8);
        if (timeout !== undefined) {
          return new Promise(resolve => {
            setTimeout(() => resolve(result), timeout);
          });
        }
        return isGetLicensePromiseBased ? Promise.resolve(result) :
                                          result;
      }
      remainingRetries--;
      if (timeout !== undefined) {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject("AAAA");
          }, timeout);
        });
      }
      if (!isGetLicensePromiseBased) {
        throw new Error("AAAA");
      }
      return Promise.reject(new Error("AAAA"));
    });

    // == vars ==
    /** Default keySystems configuration used in our tests. */
    const maxRetries = configuredRetries === undefined ? 3 :
                                                         configuredRetries;
    const shouldFail = nbRetries >= maxRetries;
    let warningsLeft = nbRetries;
    const ksConfig = [{ type: "com.widevine.alpha",
                        getLicense: mockGetLicense,
                        getLicenseConfig: configuredRetries !== undefined ||
                                          configuredTimeout !== undefined ?
                                            { retry: configuredRetries,
                                              timeout: configuredTimeout } :
                                            undefined }];
    const initData = new Uint8Array([54, 55, 75]);
    const initDataEvent = { type: "cenc", values: [ { systemId: "15", data: initData } ] };
    const challenge = formatFakeChallengeFromInitData(initData, "cenc");
    function checkKeyLoadError(error : unknown) {
      try {
        expect(error).toBeInstanceOf(Error);
        expect((error as IPlayerError).name).toEqual("EncryptedMediaError");
        expect((error as IPlayerError).type).toEqual("ENCRYPTED_MEDIA_ERROR");
        expect((error as IPlayerError).code).toEqual("KEY_LOAD_ERROR");
        expect((error as IPlayerError).message).toEqual("AAAA");
      } catch (e) {
        rej(e);
      }
    }

    // == test ==
    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);

    contentDecryptor.addEventListener("stateChange", (newState: number) => {
      if (newState !== ContentDecryptorState.WaitingForAttachment) {
        rej(new Error(`Unexpected state: ${newState}`));
      }
      contentDecryptor.removeEventListener("stateChange");
      contentDecryptor.attach();
    });

    contentDecryptor.addEventListener("error", (error: unknown) => {
      if (shouldFail) {
        try {
          checkKeyLoadError(error);
          expect(mockGetLicense).toHaveBeenCalledTimes(maxRetries);
          expect(mockGetLicense).toHaveBeenNthCalledWith(maxRetries, challenge, "license-request");
          expect(mockUpdate).toHaveBeenCalledTimes(0);
          res();
        } catch (e) {
          rej(e);
        }
      } else {
        rej(new Error(`Unexpected error: ${error}`));
      }
    });

    contentDecryptor.addEventListener("warning", (warning: Error) => {
      if (warningsLeft-- > 0) {
        try {
          checkKeyLoadError(warning);
          const requestIdx = nbRetries - remainingRetries;
          expect(mockGetLicense).toHaveBeenCalledTimes(requestIdx);
          expect(mockGetLicense).toHaveBeenNthCalledWith(requestIdx, challenge, "license-request");
        } catch (e) {
          rej(e);
        }
      } else {
        rej(new Error(`Unexpected warning: ${warning}`));
      }
    });

    contentDecryptor.onInitializationData(initDataEvent);

    const timeout = nbRetries === 0 ? 100 :
                    nbRetries === 1 ? 300 :
                    nbRetries === 2 ? 800 :
                    nbRetries === 3 ? 1200 :
                    nbRetries === 4 ? 3000 :
                                      10000;
    setTimeout(() => {
      try {
        if (ignoreLicenseRequests) {
          expect(mockUpdate).toHaveBeenCalledTimes(0);
        } else {
          const license = concat(challenge, challenge);
          expect(mockUpdate).toHaveBeenCalledTimes(1);
          expect(mockUpdate).toHaveBeenCalledWith(license);
        }
        expect(mockGetLicense).toHaveBeenCalledTimes(nbRetries + 1);
        for (let i = 1; i <= nbRetries + 1; i++) {
          expect(mockGetLicense).toHaveBeenNthCalledWith(i, challenge, "license-request");
        }
        contentDecryptor.dispose();
        res();
      } catch (e) {
        rej(e);
      }
    }, timeout);
  });
}
