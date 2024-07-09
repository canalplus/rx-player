import { expect } from "vitest";
import isNullOrUndefined from "../../utils/is_null_or_undefined";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

/**
 * Generate `getLicense` function able to construct licenses for the Dummy EME
 * API created by the RxPlayer.
 *
 * @param {Object} opts
 * @param {Array.<string>|undefined} [opts.expectedKeyIds] - If set, and if a
 * key id is found in a challenge but is not contained in `expectedKeyIds`, then
 * the corresponding `getLicense` call will throw.
 *
 * If not set, we will not check the validity of key id contained in a challenge.
 *
 * The expected format is as a string of lower case hex code for the key ids,
 * without any separator.
 * @param {Array.<string>|undefined} [opts.askedKeyIds] - If set, the returned
 * `getLicense` function will push to that array each time a new key id is
 * encountered in a challenge.
 * You're thus supposed to set this option as an empty array if checking which
 * key ids has been checked is of interest to you.
 *
 * The format for each key id is as a string of lower case hex code for the key
 * ids, without any separator.
 * @param {Array.<string>|undefined} [opts.policyLevels] - Optional object
 * where the keys are the key ids and the values are the numeric
 * "policy level" wanted. The idea is that the Dummy EME implementation may
 * then play with the currently respected policy level to simulate cases like
 * an `"output-restricted"` MediaKeyStatus.
 * For key ids not present in that object, a policy level of `0` will be
 * associated to it.
 *
 * The expected format for a key id is as a string of lower case hex code for
 * the key ids, without any separator.
 * @param {Array.<string>|undefined} [opts.failingKeyIds] - Optional object
 * where the keys are the key ids for which a `getLicense` call should throw
 * if any are encountered in a challenge and where values are objects with
 * the following properties, all optional:
 *   - `noRetry`: To set to `true` if you want that a challenge with that key
 *     id lead to an error with `noRetry` set to `true` on the rejected `Error`
 *     object. This should prevent retries under the RxPlayer API.
 *   - `fallbackOnLastTry`: To set to `true` if you want that a challenge with
 *     that key id lead to an error with `fallbackOnLastTry` set to `true` on
 *     the rejected `Error` object.
 *
 * The expected format for a key id is as a string of lower case hex code for
 * the key ids, without any separator.
 */
export function generateGetLicenseForFakeLicense({
  expectedKeyIds,
  askedKeyIds,
  policyLevels,
  failingKeyIds,
}) {
  return function getLicense(challenge, messageType) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          expect(messageType).toEqual("license-request");
          const challengeStr = textDecoder.decode(challenge);
          const challengeObj = JSON.parse(challengeStr);
          const keys = {};
          for (const kid of challengeObj.keyIds) {
            if (Array.isArray(expectedKeyIds)) {
              expect(expectedKeyIds).toContain(kid);
            }
            if (Array.isArray(askedKeyIds)) {
              askedKeyIds.push(kid);
            }
            if (
              !isNullOrUndefined(failingKeyIds) &&
              !isNullOrUndefined(failingKeyIds[kid])
            ) {
              const error = new Error("Key id in failingKeyIds");
              error.noRetry = challengeObj.keyIds.some((k) => {
                return (
                  !isNullOrUndefined(failingKeyIds) &&
                  !isNullOrUndefined(failingKeyIds[k]) &&
                  failingKeyIds[k].noRetry === true
                );
              });
              error.fallbackOnLastTry = challengeObj.keyIds.some((k) => {
                return (
                  !isNullOrUndefined(failingKeyIds) &&
                  !isNullOrUndefined(failingKeyIds[k]) &&
                  failingKeyIds[k].fallbackOnLastTry === true
                );
              });
              reject(error);
              return;
            }
            let policyLevel = 0;
            if (
              !isNullOrUndefined(policyLevels) &&
              !isNullOrUndefined(policyLevels[kid])
            ) {
              policyLevel = policyLevels[kid];
            }
            keys[kid] = {
              policyLevel,
            };
          }
          const license = {
            type: "license",
            persistent: false,
            keys,
          };
          const licenseU8 = textEncoder.encode(JSON.stringify(license));
          resolve(licenseU8.buffer);
        } catch (e) {
          reject(e);
        }
      }, 50);
    });
  };
}
