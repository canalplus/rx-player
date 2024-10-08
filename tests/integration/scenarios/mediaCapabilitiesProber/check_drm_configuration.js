import { mediaCapabilitiesProber } from "../../../../dist/es2017/experimental/tools";
import { describe, it, expect } from "vitest";

/**
 * Mock requestMediaKeySystemAccess delivering mediaKeySystemAccess.
 */
function mockPositivesResultsRMKSA() {
  const saveRMKSA = navigator.requestMediaKeySystemAccess;
  navigator.requestMediaKeySystemAccess = (_, configurations) => {
    return new Promise((resolve) => {
      resolve({
        getConfiguration: () => {
          return configurations[0];
        },
      });
    });
  };
  return function reset() {
    navigator.requestMediaKeySystemAccess = saveRMKSA;
  };
}

/**
 * Mock requestMediaKeySystemAccess delivering either mediaKeySystemAccess
 * or rejecting (start with rejection).
 */
function mockMixedResultsRMKSA() {
  let i = 0;
  const saveRMKSA = navigator.requestMediaKeySystemAccess;
  navigator.requestMediaKeySystemAccess = (_, configurations) => {
    return new Promise((resolve, reject) => {
      i++;
      if (i % 2) {
        reject(new Error("Incompatible configuration"));
        return;
      }
      resolve({
        getConfiguration: () => {
          return configurations[0];
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
    return Promise.reject(new Error("Incompatible configuration"));
  };
  return function reset() {
    navigator.requestMediaKeySystemAccess = saveRMKSA;
  };
}

describe("mediaCapabilitiesProber - checkDrmConfiguration", () => {
  const mksConfiguration = [
    {
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
    },
  ];

  const keySystems = [
    // Let's consider this one as a compatible key system configuration
    ["com.widevine.alpha", mksConfiguration],

    // Let's consider this one as not compatible
    ["com.microsoft.playready", mksConfiguration],
  ];

  it("Should resolve when the given configuration is supported.", async () => {
    const resetRMKSA = mockPositivesResultsRMKSA();
    const results1 = await mediaCapabilitiesProber.checkDrmConfiguration(
      ...keySystems[0],
    );
    expect(results1).not.to.be.undefined;
    const results2 = await mediaCapabilitiesProber.checkDrmConfiguration(
      ...keySystems[1],
    );
    expect(results2).not.to.be.undefined;
    resetRMKSA();
  });

  it("Should reject when configurations are not supported yet resolve when some are.", async () => {
    const resetRMKSA = mockMixedResultsRMKSA();
    await mediaCapabilitiesProber.checkDrmConfiguration(...keySystems[0]).then(
      () => {
        throw new Error("Should not have resolved");
      },
      (err) => {
        expect(err).toBeInstanceOf(Error);
      },
    );
    const results2 = await mediaCapabilitiesProber.checkDrmConfiguration(
      ...keySystems[1],
    );
    expect(results2).not.to.be.undefined;
    resetRMKSA();
  });

  it("Should reject when no configuration is supported", async () => {
    const resetRMKSA = mockNegativeResultsRMKSA();
    await mediaCapabilitiesProber.checkDrmConfiguration(...keySystems[0]).then(
      () => {
        throw new Error("Should not have resolved");
      },
      (err) => {
        expect(err).toBeInstanceOf(Error);
      },
    );
    await mediaCapabilitiesProber.checkDrmConfiguration(...keySystems[1]).then(
      () => {
        throw new Error("Should not have resolved");
      },
      (err) => {
        expect(err).toBeInstanceOf(Error);
      },
    );
    resetRMKSA();
  });
});
