import { expect } from "vitest";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export function generateGetLicenseForFakeLicense({
  expectedKeyIds,
  askedKeyIds,
  highPolicyLevelKeyIds,
  mediumPolicyLevelKeyIds,
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
          challengeObj.keyIds.forEach((kid) => {
            if (Array.isArray(expectedKeyIds)) {
              expect(expectedKeyIds).toContain(kid);
            }
            if (Array.isArray(askedKeyIds)) {
              askedKeyIds.push(kid);
            }
            if (Array.isArray(failingKeyIds) && failingKeyIds.includes(kid)) {
              const error = new Error("Should fallback!");
              error.noRetry = true;
              error.fallbackOnLastTry = true;
              reject(error);
            }
            let policyLevel = 0;
            if (
              Array.isArray(highPolicyLevelKeyIds) &&
              highPolicyLevelKeyIds.includes(kid)
            ) {
              policyLevel = 200;
            } else if (
              Array.isArray(mediumPolicyLevelKeyIds) &&
              mediumPolicyLevelKeyIds.includes(kid)
            ) {
              policyLevel = 50;
            }
            keys[kid] = {
              policyLevel,
            };
          });
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
