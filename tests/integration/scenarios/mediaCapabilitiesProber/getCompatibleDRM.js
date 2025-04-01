import { mediaCapabilitiesProber } from "../../../../dist/es2017/experimental/tools";
import { describe, it, expect } from "vitest";

/**
 * Mock requestMediaKeySystemAccess delivering mediaKeySystemAccess.
 */
function mockPositivesResultsRMKSA() {
  const saveRMKSA = navigator.requestMediaKeySystemAccess;
  const saveSetMediaKeys = HTMLMediaElement.prototype.setMediaKeys;
  HTMLMediaElement.prototype.setMediaKeys = () => {
    return Promise.resolve();
  };
  navigator.requestMediaKeySystemAccess = (type, configurations) => {
    return new Promise((resolve) => {
      resolve({
        keySystem: type,
        getConfiguration: () => {
          return configurations[0];
        },
        createMediaKeys: () => {
          return {
            setServerCertificate: () => Promise.resolve(),
            createSession: () => {
              return {
                addEventListener: () => {
                  /* noop */
                },
                removeEventListener: () => {
                  /* noop */
                },
                load: () => {
                  return Promise.reject(new Error("Do not load"));
                },
                generateRequest: () => {
                  return Promise.resolve();
                },
                close: () => {
                  return Promise.resolve();
                },
                update: () => {},
              };
            },
          };
        },
      });
    });
  };
  return function reset() {
    navigator.requestMediaKeySystemAccess = saveRMKSA;
    HTMLMediaElement.prototype.setMediaKeys = saveSetMediaKeys;
  };
}

/**
 * Mock requestMediaKeySystemAccess delivering either mediaKeySystemAccess
 * or rejecting (start with rejection).
 */
function mockMixedResultsRMKSA() {
  let i = 0;
  const saveRMKSA = navigator.requestMediaKeySystemAccess;
  navigator.requestMediaKeySystemAccess = (type, configurations) => {
    return new Promise((resolve, reject) => {
      i++;
      if (i % 2) {
        reject();
        return;
      }
      resolve({
        keySystem: type,
        getConfiguration: () => {
          return configurations[0];
        },
        createMediaKeys: () => {
          return {
            setServerCertificate: () => Promise.resolve(),
            createSession: () => {
              return {
                addEventListener: () => {
                  /* noop */
                },
                removeEventListener: () => {
                  /* noop */
                },
                load: () => {
                  return Promise.reject(new Error("Do not load"));
                },
                generateRequest: () => {
                  return Promise.resolve();
                },
                close: () => {
                  return Promise.resolve();
                },
                update: () => {},
              };
            },
          };
        },
      });
    });
  };
  return function reset() {
    navigator.requestMediaKeySystemAccess = saveRMKSA;
  };
}

/**
 * Mock requestMediaKeySystemAccess rejecting.
 */
function mockNegativeResultsRMKSA() {
  const saveRMKSA = navigator.requestMediaKeySystemAccess;
  navigator.requestMediaKeySystemAccess = () => {
    return Promise.reject();
  };
  return function reset() {
    navigator.requestMediaKeySystemAccess = saveRMKSA;
  };
}

describe("mediaCapabilitiesProber - getCompatibleDRMConfigurations", () => {
  const mksConfiguration = {
    initDataTypes: ["cenc"],
    videoCapabilities: [
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"', // standard mp4 codec
        robustness: "HW_SECURE_CRYPTO",
      },
      {
        contentType: 'video/mp4;codecs="avc1.4d401e"',
        robustness: "SW_SECURE_DECODE",
      },
    ],
  };

  const keySystems = [
    // Let's consider this one as a compatible key system configuration
    { type: "com.widevine.alpha", configuration: mksConfiguration },

    // Let's consider this one as not compatible
    { type: "com.microsoft.playready", configuration: mksConfiguration },
  ];

  it("Should support all configurations.", async () => {
    const resetRMKSA = mockPositivesResultsRMKSA();
    const results =
      await mediaCapabilitiesProber.getCompatibleDRMConfigurations(keySystems);

    expect(results.length).to.be.equal(2);
    for (let i = 0; i < results.length; i++) {
      expect(results[i].configuration).not.to.be.undefined;
      expect(results[i].type).not.to.be.undefined;
      expect(results[i].compatibleConfiguration).not.to.be.undefined;
    }
    resetRMKSA();
  });

  it("Should support half of configurations only.", async () => {
    const resetRMKSA = mockMixedResultsRMKSA();
    const results =
      await mediaCapabilitiesProber.getCompatibleDRMConfigurations(keySystems);

    expect(results.length).to.be.equal(2);
    expect(results[0].configuration).not.to.be.undefined;
    expect(results[0].type).not.to.be.undefined;
    expect(results[0].compatibleConfiguration).to.be.undefined;
    expect(results[1].configuration).not.to.be.undefined;
    expect(results[1].type).not.to.be.undefined;
    expect(results[1].compatibleConfiguration).not.to.be.undefined;
    resetRMKSA();
  });

  it("Should not support configurations.", async () => {
    const resetRMKSA = mockNegativeResultsRMKSA();
    const results =
      await mediaCapabilitiesProber.getCompatibleDRMConfigurations(keySystems);

    expect(results.length).to.be.equal(2);
    expect(results[0].configuration).not.to.be.undefined;
    expect(results[0].type).not.to.be.undefined;
    expect(results[0].compatibleConfiguration).to.be.undefined;
    expect(results[1].configuration).not.to.be.undefined;
    expect(results[1].type).not.to.be.undefined;
    expect(results[1].compatibleConfiguration).to.be.undefined;
    resetRMKSA();
  });
});
