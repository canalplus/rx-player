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

import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { concat } from "../../../../utils/byte_parsing";
import { IContentProtection } from "../../types";
import {
  formatFakeChallengeFromInitData,
  MediaKeySessionImpl,
  MediaKeysImpl,
  mockCompat,
} from "./utils";

/** Default video element used in our tests. */
const videoElt = document.createElement("video");

/* eslint-disable max-len */
describe("core - eme - global tests - getLicense", () => {

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("should update the session after getLicense resolves with a license", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 0,
                      ignoreLicenseRequests: false }, done);
  });

  it("should update the session after getLicense returns a license directly", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 0,
                      ignoreLicenseRequests: false }, done);
  });

  it("should not update the session after getLicense resolves with null", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 0,
                      ignoreLicenseRequests: true }, done);
  });

  it("should not update the session after getLicense returns null directly", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 0,
                      ignoreLicenseRequests: true }, done);
  });

  it("should be able to retry maximum two times and fail after 3 tries with a rejected promise", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 3,
                      ignoreLicenseRequests: false }, done);
  });

  it("should be able to retry maximum two times and fail after 3 tries with a thrown error", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 3,
                      ignoreLicenseRequests: true }, done);
  });

  it("should be able to retry two times and succeed after a time with a resolved license", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 2,
                      ignoreLicenseRequests: false }, done);
  });

  it("should be able to retry two times and succeed after a time with a returned license", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 2,
                      ignoreLicenseRequests: false }, done);
  });

  it("should be able to retry two times and succeed after a time with a resolved null", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 2,
                      ignoreLicenseRequests: true }, done);
  });

  it("should be able to retry two times and succeed after a time with a returned null", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 2,
                      ignoreLicenseRequests: true }, done);
  });

  it("should be able to retry one time and succeed after a time with a resolved license", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 1,
                      ignoreLicenseRequests: false }, done);
  });

  it("should be able to retry one time and succeed after a time with a returned license", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 1,
                      ignoreLicenseRequests: false }, done);
  });

  it("should be able to retry two times and succeed after a time with a resolved null", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 1,
                      ignoreLicenseRequests: true }, done);
  });

  it("should be able to retry two times and succeed after a time with a returned null", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: false,
                      configuredRetries: undefined,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 1,
                      ignoreLicenseRequests: true }, done);
  });

  it("should be able to fetch a license directly even when getLicenseConfig.retry is set to `0`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: 0,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 0,
                      ignoreLicenseRequests: false }, done);
  });

  it("should fail after first failure when getLicenseConfig.retry is set to `0`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: 1,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 0,
                      ignoreLicenseRequests: false }, done);
  });

  it("should fail after two failures when getLicenseConfig.retry is set to `1`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: 2,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 2,
                      ignoreLicenseRequests: false }, done);
  });

  it("should not fail after one failure when getLicenseConfig.retry is set to `1`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: 2,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 1,
                      ignoreLicenseRequests: false }, done);
  });

  it("should not fail after 5 failures when getLicenseConfig.retry is set to `6`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: 6,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 5,
                      ignoreLicenseRequests: false }, done);
  }, 15000);

  it("should fail after 6 failures when getLicenseConfig.retry is set to `6`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: 6,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 6,
                      ignoreLicenseRequests: false }, done);
  }, 15000);

  it("should not fail after 5 failures when getLicenseConfig.retry is set to `Infinity`", (done) => {
    checkGetLicense({ isGetLicensePromiseBased: true,
                      configuredRetries: Infinity,
                      configuredTimeout: undefined,
                      getTimeout: () => undefined,
                      nbRetries: 5,
                      ignoreLicenseRequests: false }, done);
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
    ignoreLicenseRequests : boolean; },
  done : () => void
) {
  // == mocks ==
  mockCompat();
  const mediaKeySession = new MediaKeySessionImpl();
  jest.spyOn(MediaKeysImpl.prototype, "createSession").mockReturnValue(mediaKeySession);
  const updateSpy = jest.spyOn(mediaKeySession, "update");
  let remainingRetries = nbRetries;
  const getLicenseSpy = jest.fn(() => {
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
                      getLicense: getLicenseSpy,
                      getLicenseConfig: configuredRetries !== undefined ||
                                        configuredTimeout !== undefined ?
                                          { retry: configuredRetries,
                                            timeout: configuredTimeout } :
                                          undefined }];
  let eventsReceived = 0;
  let licenseReceived = false;
  const initDataSubject = new Subject<IContentProtection>();
  const initData = new Uint8Array([54, 55, 75]);
  const initDataEvent = { type: "cenc", values: [ { systemId: "15", data: initData } ] };
  const kill$ = new Subject();
  const challenge = formatFakeChallengeFromInitData(initData, "cenc");
  function checkKeyLoadError(error : any) {
    expect(error.name).toEqual("EncryptedMediaError");
    expect(error.type).toEqual("ENCRYPTED_MEDIA_ERROR");
    expect(error.code).toEqual("KEY_LOAD_ERROR");
    expect(error.message).toEqual("AAAA");
  }

  // == test ==
  const EMEManager = require("../../eme_manager").default;
  EMEManager(videoElt, ksConfig, initDataSubject)
    .pipe(takeUntil(kill$))
    .subscribe((evt : any) => {
      if (evt.type === "created-media-keys") {
        evt.value.attachMediaKeys$.next();
      }
      eventsReceived++;
      // Those first three have been tested enough
      if (eventsReceived <= 3) {
        return;
      }
      if (warningsLeft-- === 0) {
        if (!licenseReceived) {
          if (ignoreLicenseRequests) {
            expect(evt.type).toEqual("no-update");
            expect(evt.value.initializationData).toEqual(initDataEvent);
            expect(evt.value.initializationData.type).toEqual("cenc");
            expect(updateSpy).toHaveBeenCalledTimes(0);
          } else {
            const license = concat(challenge, challenge);
            expect(evt.type).toEqual("session-updated");
            expect(evt.value.session).toEqual(mediaKeySession);
            expect(evt.value.license).toEqual(license);
            expect(evt.value.initializationData).toEqual(initDataEvent);
            expect(updateSpy).toHaveBeenCalledTimes(1);
            expect(updateSpy).toHaveBeenCalledWith(license);
          }
          expect(getLicenseSpy).toHaveBeenCalledTimes(nbRetries + 1);
          for (let i = 1; i <= nbRetries + 1; i++) {
            expect(getLicenseSpy).toHaveBeenNthCalledWith(i, challenge, "license-request");
          }
          licenseReceived = true;
          setTimeout(() => {
            kill$.next();
            done();
          }, 5);
          return;
        }
      } else {
        expect(evt.type).toEqual("warning");
        checkKeyLoadError(evt.value);
        const requestIdx = nbRetries - remainingRetries;
        expect(getLicenseSpy).toHaveBeenCalledTimes(requestIdx);
        expect(getLicenseSpy).toHaveBeenNthCalledWith(requestIdx, challenge, "license-request");
        return;
      }
      throw new Error(`Unexpected event: ${evt.type}`);
    }, (error : any) => {
      if (shouldFail) {
        checkKeyLoadError(error);
        expect(eventsReceived).toEqual(5);
        expect(getLicenseSpy).toHaveBeenCalledTimes(maxRetries);
        expect(getLicenseSpy).toHaveBeenNthCalledWith(maxRetries, challenge, "license-request");
        expect(updateSpy).toHaveBeenCalledTimes(0);
        done();
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    });
  initDataSubject.next(initDataEvent);
}
