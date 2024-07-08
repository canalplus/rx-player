import { describe, afterEach, it, expect, vi } from "vitest";
import type { IKeySystemOption, IPlayerError } from "../../../../public_types";
import assert from "../../../../utils/assert";
import { concat } from "../../../../utils/byte_parsing";
import type IContentDecryptor from "../../content_decryptor";
import type { ContentDecryptorState as IContentDecryptorState } from "../../types";
import {
  formatFakeChallengeFromInitData,
  MediaKeySessionImpl,
  MediaKeysImpl,
  mockCompat,
} from "./utils";

/** Default video element used in our tests. */
const videoElt = document.createElement("video");

describe("decrypt - global tests - getLicense", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("should update the session after getLicense resolves with a license", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 0,
      ignoreLicenseRequests: false,
    });
  });

  it("should update the session after getLicense returns a license directly", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 0,
      ignoreLicenseRequests: false,
    });
  });

  it("should not update the session after getLicense resolves with null", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 0,
      ignoreLicenseRequests: true,
    });
  });

  it("should not update the session after getLicense returns null directly", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 0,
      ignoreLicenseRequests: true,
    });
  });

  it("should be able to retry maximum two times and fail after 3 tries with a rejected promise", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 3,
      ignoreLicenseRequests: false,
    });
  });

  it("should be able to retry maximum two times and fail after 3 tries with a thrown error", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 3,
      ignoreLicenseRequests: true,
    });
  });

  it("should be able to retry two times and succeed after a time with a resolved license", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 2,
      ignoreLicenseRequests: false,
    });
  });

  it("should be able to retry two times and succeed after a time with a returned license", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 2,
      ignoreLicenseRequests: false,
    });
  });

  it("should be able to retry two times and succeed after a time with a resolved null", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 2,
      ignoreLicenseRequests: true,
    });
  });

  it("should be able to retry two times and succeed after a time with a returned null", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 2,
      ignoreLicenseRequests: true,
    });
  });

  it("should be able to retry two times and succeed after a time with a resolved license", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 1,
      ignoreLicenseRequests: false,
    });
  });

  it("should be able to retry two times and succeed after a time with a returned license", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 1,
      ignoreLicenseRequests: false,
    });
  });

  it("should be able to retry two times and succeed after a time with a resolved null", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 1,
      ignoreLicenseRequests: true,
    });
  });

  it("should be able to retry two times and succeed after a time with a returned null", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: false,
      configuredRetries: undefined,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 1,
      ignoreLicenseRequests: true,
    });
  });

  it("should be able to fetch a license directly even when getLicenseConfig.retry is set to `0`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: 0,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 0,
      ignoreLicenseRequests: false,
    });
  });

  it("should fail after first failure when getLicenseConfig.retry is set to `0`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: 0,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 1,
      ignoreLicenseRequests: false,
    });
  });

  it("should fail after two failures when getLicenseConfig.retry is set to `1`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: 1,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 2,
      ignoreLicenseRequests: false,
    });
  });

  it("should not fail after one failure when getLicenseConfig.retry is set to `1`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: 1,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 1,
      ignoreLicenseRequests: false,
    });
  });

  it("should not fail after 6 failures when getLicenseConfig.retry is set to `6`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: 6,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 6,
      ignoreLicenseRequests: false,
    });
  }, 25000);

  it("should fail after 7 failures when getLicenseConfig.retry is set to `6`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: 6,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 7,
      ignoreLicenseRequests: false,
    });
  }, 25000);

  it("should not fail after 5 failures when getLicenseConfig.retry is set to `Infinity`", async () => {
    await checkGetLicense({
      isGetLicensePromiseBased: true,
      configuredRetries: Infinity,
      configuredTimeout: undefined,
      getTimeout: () => undefined,
      nbRetries: 5,
      ignoreLicenseRequests: false,
    });
  }, 15000);
});

/**
 * HUGE function to check most getLicense scenarios.
 * @param {Object} opts
 */
async function checkGetLicense({
  isGetLicensePromiseBased,
  configuredRetries,
  configuredTimeout,
  getTimeout,
  nbRetries,
  ignoreLicenseRequests,
}: {
  /**
   * Set it to false if you want to return directly a value from
   * `getLicense` (i.e. not wrapped in a Promise).
   * This is valable both for success, and errors (which will be either
   * thrown directly or wrapped in a rejecting Promise).
   *
   * This value will be forced to `true` if the `getTimeout` call for the
   * corresponding `getLicense` returns something other than `undefined`.
   */
  isGetLicensePromiseBased: boolean;
  /** Maximum amount of retries: value of getLicenseConfig.retry. */
  configuredRetries: number | undefined;
  /**
   * Return getLicense timeout after which the response will be emitted, in
   * milliseconds.
   * Put to `undefined` for no timeout at all (synchronous).
   * Note that if a timeout is given, getLicense will return a Promise.
   * As such, `isGetLicensePromiseBased` will be ignored.
   */
  getTimeout: (callIdx: number) => number | undefined;
  /** Maximum configured timeout: value of getLicenseConfig.timeout. */
  configuredTimeout: number | undefined;
  /**
   * Nb of times getLicense should fail in a row.
   * If put at a higher value than `configuredRetries`, no license will be
   * obtained.
   */
  nbRetries: number;
  /**
   * If `true`, getLicense will return `null` - to ignore a request - when
   * it succeed.
   */
  ignoreLicenseRequests: boolean;
}): Promise<void> {
  const initData = new Uint8Array([54, 55, 75]);
  const initDataEvent = {
    type: "cenc",
    values: [{ systemId: "15", data: initData }],
  };
  const challenge = formatFakeChallengeFromInitData(initData, "cenc");
  // == mocks ==
  const mediaKeySession = new MediaKeySessionImpl();
  vi.spyOn(MediaKeysImpl.prototype, "createSession").mockReturnValue(mediaKeySession);
  const mockUpdate = vi.spyOn(mediaKeySession, "update");
  let remainingRetries = nbRetries;
  const mockGetLicense = vi.fn((): BufferSource | Promise<BufferSource | null> | null => {
    const callIdx = nbRetries - remainingRetries;
    const timeout = getTimeout(callIdx);
    if (remainingRetries === 0) {
      const challengeU8 = new Uint8Array(challenge);
      const result = ignoreLicenseRequests ? null : concat(challengeU8, challengeU8);
      if (timeout !== undefined) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(result), timeout);
        });
      }
      return isGetLicensePromiseBased ? Promise.resolve(result) : result;
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
  mockCompat();
  const ContentDecryptorState = (await vi.importActual("../../types"))
    .ContentDecryptorState as typeof IContentDecryptorState;
  const ContentDecryptor = (await vi.importActual("../../content_decryptor"))
    .default as typeof IContentDecryptor;
  const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
  return new Promise((res, rej) => {
    // == vars ==
    /** Default keySystems configuration used in our tests. */
    const maxRetries = configuredRetries === undefined ? 2 : configuredRetries;
    const shouldFail = nbRetries > maxRetries;
    let warningsLeft = nbRetries;
    const ksConfig: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: mockGetLicense,
        getLicenseConfig:
          configuredRetries !== undefined || configuredTimeout !== undefined
            ? { retry: configuredRetries, timeout: configuredTimeout }
            : undefined,
      },
    ];
    function checkKeyLoadError(error: unknown) {
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
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null);
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);

    contentDecryptor.addEventListener("stateChange", (newState: number) => {
      if (newState !== ContentDecryptorState.WaitingForAttachment) {
        rej(new Error(`Unexpected state: ${newState}`));
      }
      contentDecryptor.removeEventListener("stateChange");
      contentDecryptor.attach();
    });

    contentDecryptor.addEventListener("error", (error: Error) => {
      if (shouldFail) {
        try {
          checkKeyLoadError(error);
          expect(mockGetLicense).toHaveBeenCalledTimes(maxRetries + 1);
          for (let i = 1; i <= maxRetries + 1; i++) {
            // TODO there's seem to be an issue with how vitest check Uint8Array
            // equality
            expect(mockGetLicense).toHaveBeenNthCalledWith(
              i,
              challenge,
              "license-request",
            );
          }
          expect(mockUpdate).toHaveBeenCalledTimes(0);
          res();
        } catch (e) {
          rej(e);
        }
      } else {
        rej(new Error(`Unexpected error: ${error.toString()}`));
      }
    });

    contentDecryptor.addEventListener("warning", (warning: Error) => {
      if (warningsLeft-- > 0) {
        try {
          checkKeyLoadError(warning);
          const requestIdx = nbRetries - remainingRetries;
          expect(mockGetLicense).toHaveBeenCalledTimes(requestIdx);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            requestIdx,
            challenge,
            "license-request",
          );
        } catch (e) {
          rej(e);
        }
      } else {
        rej(new Error(`Unexpected warning: ${warning.toString()}`));
      }
    });

    contentDecryptor.onInitializationData(initDataEvent);

    if (!shouldFail) {
      let timeout: number;
      switch (nbRetries) {
        case 0:
          timeout = 100;
          break;
        case 1:
          timeout = 300;
          break;
        case 2:
          timeout = 800;
          break;
        case 3:
          timeout = 2000;
          break;
        case 4:
          timeout = 4000;
          break;
        case 5:
          timeout = 8000;
          break;
        case 6:
          timeout = 12000;
          break;
        default:
          timeout = 16000;
      }
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
            // TODO there's seem to be an issue with how vitest check Uint8Array
            // equality
            expect(mockGetLicense).toHaveBeenNthCalledWith(
              i,
              challenge,
              "license-request",
            );
          }
          contentDecryptor.dispose();
          res();
        } catch (e) {
          rej(e);
        }
      }, timeout);
    }
  });
}
