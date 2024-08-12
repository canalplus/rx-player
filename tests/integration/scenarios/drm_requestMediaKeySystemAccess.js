import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { manifestInfos } from "../../contents/DASH_DRM_static_SegmentTemplate";
import DummyMediaElement from "../../../dist/es2017/experimental/tools/DummyMediaElement";
import RxPlayer from "../../../dist/es2017";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import sleep from "../../utils/sleep";
import { lockLowestBitrates } from "../../utils/bitrates";
import { generateGetLicenseForFakeLicense } from "../utils/drm_utils";

describe("DRM: requestMediaKeySystemAcces use cases", function () {
  const { url, transport } = manifestInfos;
  let player;
  const oldMediaSourceSupported = MediaSource.isTypeSupported;

  let dummy;
  beforeEach(() => {
    MediaSource.isTypeSupported = () => true;
  });

  afterEach(async () => {
    MediaSource.isTypeSupported = oldMediaSourceSupported;
    player?.dispose();
  });

  it("should trigger error if none of the key system provided is supported", async function () {
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: () => false,
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            expectedkeyids: [],
            askedKeyIds: [],
          }),
        },
        {
          type: "com.widevine.alpha",
          getLicense: generateGetLicenseForFakeLicense({
            expectedkeyids: [],
            askedKeyIds: [],
          }),
        },
      ],
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it('should ask for the following keySystems if just "playready" is set', async () => {
    let checkNumber = 0;
    let keySystemCheckError = null;
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => {
            // NOTE: this method should always return `false` for the test to pass
            try {
              switch (checkNumber++) {
                case 0:
                case 1:
                  expect(keySystem).toEqual("com.microsoft.playready.recommendation");
                  break;
                case 2:
                case 3:
                  expect(keySystem).toEqual("com.microsoft.playready");
                  break;
                case 4:
                case 5:
                  expect(keySystem).toEqual("com.chromecast.playready");
                  break;
                case 6:
                case 7:
                  expect(keySystem).toEqual("com.youtube.playready");
                  break;
                default:
                  throw new Error("Too many playready checks");
              }
            } catch (e) {
              keySystemCheckError = e;
              return true;
            }
            return false;
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "playready",
          getLicense: generateGetLicenseForFakeLicense({
            expectedkeyids: [],
            askedKeyIds: [],
          }),
        },
      ],
    });
    try {
      await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    } catch (err) {
      if (keySystemCheckError !== null) {
        throw keySystemCheckError;
      } else if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it('should ask for the following keySystems if just "widevine" is set', async () => {
    let checkNumber = 0;
    let keySystemCheckError = null;
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => {
            // NOTE: this method should always return `false` for the test to pass
            try {
              switch (checkNumber++) {
                case 0:
                case 1:
                  expect(keySystem).toEqual("com.widevine.alpha");
                  break;
                default:
                  throw new Error("Too many widevine checks");
              }
            } catch (e) {
              keySystemCheckError = e;
              return true;
            }
            return false;
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "widevine",
          getLicense: generateGetLicenseForFakeLicense({
            expectedkeyids: [],
            askedKeyIds: [],
          }),
        },
      ],
    });
    try {
      await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    } catch (err) {
      if (keySystemCheckError !== null) {
        throw keySystemCheckError;
      } else if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it("should load the content with a supported key system", async function () {
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => keySystem === "com.widevine.alpha",
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: () => {
            throw new Error("Wrong key system");
          },
        },
        {
          type: "com.widevine.alpha",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getError()).toBeNull();
    expect(askedKeyIds.length).toEqual(expectedKeyIds.length);
    const ksConfig = player.getKeySystemConfiguration();
    expect(ksConfig).not.toBeNull();
    expect(ksConfig.keySystem).toEqual("com.widevine.alpha");
  });

  it("should try to create key system with no audio or video capabilities if adding them fails", async function () {
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => keySystem === "com.widevine.alpha",
          getMediaKeySystemConfiguration: (_keySystem, configs) => {
            return (
              configs.find(
                (config) =>
                  (config.audioCapabilities === null ||
                    config.audioCapabilities === undefined ||
                    config.audioCapabilities.length === 0) &&
                  (config.videoCapabilities === null ||
                    config.videoCapabilities === undefined ||
                    config.videoCapabilities.length === 0),
              ) ?? null
            );
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: () => {
            throw new Error("Wrong key system");
          },
        },
        {
          type: "com.widevine.alpha",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getError()).toBeNull();
    expect(askedKeyIds.length).toEqual(expectedKeyIds.length);
    const ksConfig = player.getKeySystemConfiguration();
    expect(ksConfig).not.toBeNull();
    expect(ksConfig.keySystem).toEqual("com.widevine.alpha");
    expect(ksConfig.configuration.videoCapabilities).toEqual(undefined);
    expect(ksConfig.configuration.audioCapabilities).toEqual(undefined);
  });

  it("should ask for the right robustnesses when a widevine keySystem is set", async () => {
    for (const keySystem of ["widevine", "com.widevine.alpha"]) {
      let checkNumber = 0;
      let keySystemCheckError = null;
      dummy = new DummyMediaElement({
        drmOptions: {
          requestMediaKeySystemAccessConfig: {
            getMediaKeySystemConfiguration: (keySystem, configs) => {
              // NOTE: this method should always return `false` for the test to pass
              try {
                switch (checkNumber++) {
                  case 0:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    expect(configs[0].videoCapabilities).not.toHaveLength(0);
                    expect(configs[0].audioCapabilities).not.toHaveLength(0);
                    for (const prop of ["audioCapabilities", "videoCapabilities"]) {
                      let previousRobustness = null;
                      for (const capability of configs[0][prop]) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("HW_SECURE_ALL");
                        } else if (previousRobustness === "HW_SECURE_ALL") {
                          if (robustness !== "HW_SECURE_ALL") {
                            expect(robustness).toEqual("HW_SECURE_DECODE");
                          }
                        } else if (previousRobustness === "HW_SECURE_DECODE") {
                          if (robustness !== "HW_SECURE_DECODE") {
                            expect(robustness).toEqual("HW_SECURE_CRYPTO");
                          }
                        } else if (previousRobustness === "HW_SECURE_CRYPTO") {
                          if (robustness !== "HW_SECURE_CRYPTO") {
                            expect(robustness).toEqual("SW_SECURE_DECODE");
                          }
                        } else if (previousRobustness === "SW_SECURE_DECODE") {
                          if (robustness !== "SW_SECURE_DECODE") {
                            expect(robustness).toEqual("SW_SECURE_CRYPTO");
                          }
                        } else if (previousRobustness === "SW_SECURE_CRYPTO") {
                          if (robustness !== "SW_SECURE_CRYPTO") {
                            throw new Error("Unexpected robustness: " + robustness);
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "SW_SECURE_CRYPTO") {
                        throw new Error("Robustness in improper order");
                      }
                    }
                    break;
                  case 1:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    expect(configs[0].videoCapabilities).toBeUndefined();
                    expect(configs[0].audioCapabilities).toBeUndefined();
                    break;
                  default:
                    throw new Error("Too many widevine checks");
                }
              } catch (e) {
                keySystemCheckError = e;
              }
              return null;
            },
          },
        },
      });
      player = new RxPlayer({ videoElement: dummy });
      lockLowestBitrates(player);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({
              expectedkeyids: [],
              askedKeyIds: [],
            }),
          },
        ],
      });
      try {
        await waitForPlayerState(player, "STOPPED", ["LOADING"]);
      } catch (err) {
        if (keySystemCheckError !== null) {
          throw keySystemCheckError;
        } else if (player.getError() !== null) {
          throw player.getError();
        }
        throw err;
      }
      const error = player.getError();
      expect(error).not.toBeNull();
      expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
      expect(error.name).to.equal("EncryptedMediaError");
      expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
      expect(keySystemCheckError).to.equal(null);
      player.dispose();
      await sleep(10);
      expect(checkNumber).toEqual(2);
    }
  });

  it("should ask for the right robustnesses when a com.microsoft.playready.recommendation keySystem is set", async () => {
    let checkNumber = 0;
    let keySystemCheckError = null;
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          getMediaKeySystemConfiguration: (keySystem, configs) => {
            // NOTE: this method should always return `false` for the test to pass
            try {
              switch (checkNumber++) {
                case 0:
                  expect(keySystem).toEqual("com.microsoft.playready.recommendation");
                  expect(configs).toHaveLength(1);
                  expect(configs[0].videoCapabilities).not.toHaveLength(0);
                  expect(configs[0].audioCapabilities).not.toHaveLength(0);
                  for (const prop of ["audioCapabilities", "videoCapabilities"]) {
                    let previousRobustness = null;
                    for (const capability of configs[0][prop]) {
                      const robustness = capability.robustness;
                      if (previousRobustness === null) {
                        expect(robustness).toEqual("3000");
                      } else if (previousRobustness === "3000") {
                        if (robustness !== "3000") {
                          expect(robustness).toEqual("2000");
                        }
                      }
                      previousRobustness = robustness;
                    }
                    if (previousRobustness === null) {
                      throw new Error("No robustness communicated");
                    } else if (previousRobustness !== "2000") {
                      throw new Error("Robustness in improper order");
                    }
                  }
                  break;
                case 1:
                  expect(keySystem).toEqual("com.microsoft.playready.recommendation");
                  expect(configs).toHaveLength(1);
                  expect(configs[0].videoCapabilities).toBeUndefined();
                  expect(configs[0].audioCapabilities).toBeUndefined();
                  break;
                default:
                  throw new Error("Too many widevine checks");
              }
            } catch (e) {
              keySystemCheckError = e;
            }
            return null;
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready.recommendation",
          getLicense: generateGetLicenseForFakeLicense({
            expectedkeyids: [],
            askedKeyIds: [],
          }),
        },
      ],
    });
    try {
      await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    } catch (err) {
      if (keySystemCheckError !== null) {
        throw keySystemCheckError;
      } else if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(keySystemCheckError).to.equal(null);
    expect(checkNumber).toEqual(2);
    player.dispose();
  });

  it("should only ask for the right robustnesses with a specific key system when a playready keySystem is set", async () => {
    let checkNumber = 0;
    let keySystemCheckError = null;
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          getMediaKeySystemConfiguration: (keySystem, configs) => {
            // NOTE: this method should always return `false` for the test to pass
            try {
              switch (checkNumber++) {
                case 0:
                  expect(keySystem).toEqual("com.microsoft.playready.recommendation");
                  expect(configs).toHaveLength(1);
                  expect(configs[0].videoCapabilities).not.toHaveLength(0);
                  expect(configs[0].audioCapabilities).not.toHaveLength(0);
                  for (const prop of ["audioCapabilities", "videoCapabilities"]) {
                    let previousRobustness = null;
                    for (const capability of configs[0][prop]) {
                      const robustness = capability.robustness;
                      if (previousRobustness === null) {
                        expect(robustness).toEqual("3000");
                      } else if (previousRobustness === "3000") {
                        if (robustness !== "3000") {
                          expect(robustness).toEqual("2000");
                        }
                      }
                      previousRobustness = robustness;
                    }
                    if (previousRobustness === null) {
                      throw new Error("No robustness communicated");
                    } else if (previousRobustness !== "2000") {
                      throw new Error("Robustness in improper order");
                    }
                  }
                  break;
                case 1:
                  expect(keySystem).toEqual("com.microsoft.playready.recommendation");
                  expect(configs).toHaveLength(1);
                  expect(configs[0].videoCapabilities).toBeUndefined();
                  expect(configs[0].audioCapabilities).toBeUndefined();
                  break;
                case 2:
                case 4:
                case 6:
                  expect(configs).toHaveLength(1);
                  expect(configs[0].videoCapabilities).not.toHaveLength(0);
                  expect(configs[0].audioCapabilities).not.toHaveLength(0);
                  expect(configs[0].videoCapabilities).not.toBeUndefined();
                  expect(configs[0].audioCapabilities).not.toBeUndefined();
                  for (const prop of ["audioCapabilities", "videoCapabilities"]) {
                    for (const capability of configs[0][prop]) {
                      expect(capability.robustness).toEqual(undefined);
                    }
                  }
                  break;
                case 3:
                case 5:
                case 7:
                  expect(configs).toHaveLength(1);
                  expect(configs[0].videoCapabilities).toBeUndefined();
                  expect(configs[0].audioCapabilities).toBeUndefined();
                  break;
              }
            } catch (e) {
              keySystemCheckError = e;
            }
            return null;
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "playready",
          getLicense: generateGetLicenseForFakeLicense({
            expectedkeyids: [],
            askedKeyIds: [],
          }),
        },
      ],
    });
    try {
      await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    } catch (err) {
      if (keySystemCheckError !== null) {
        throw keySystemCheckError;
      } else if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(keySystemCheckError).to.equal(null);
    expect(checkNumber).toEqual(8);
    player.dispose();
  });

  it("should not ask for any robustnesses when other playready keySystems are set", async () => {
    for (const keySystem of [
      "com.microsoft.playready",
      "com.playready.hardware",
      "com.playready.software",
      "com.chromecast.playready",
      "com.youtube.playready",
    ]) {
      let checkNumber = 0;
      let keySystemCheckError = null;
      dummy = new DummyMediaElement({
        drmOptions: {
          requestMediaKeySystemAccessConfig: {
            getMediaKeySystemConfiguration: (_keySystem, configs) => {
              // NOTE: this method should always return `false` for the test to pass
              try {
                switch (checkNumber++) {
                  case 0:
                    expect(configs).toHaveLength(1);
                    expect(configs[0].videoCapabilities).not.toHaveLength(0);
                    expect(configs[0].audioCapabilities).not.toHaveLength(0);
                    expect(configs[0].videoCapabilities).not.toBeUndefined();
                    expect(configs[0].audioCapabilities).not.toBeUndefined();
                    for (const prop of ["audioCapabilities", "videoCapabilities"]) {
                      for (const capability of configs[0][prop]) {
                        expect(capability.robustness).toEqual(undefined);
                      }
                    }
                    break;
                  case 1:
                    expect(configs).toHaveLength(1);
                    expect(configs[0].videoCapabilities).toBeUndefined();
                    expect(configs[0].audioCapabilities).toBeUndefined();
                    break;
                }
              } catch (e) {
                keySystemCheckError = e;
              }
              return null;
            },
          },
        },
      });
      player = new RxPlayer({ videoElement: dummy });
      lockLowestBitrates(player);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({
              expectedkeyids: [],
              askedKeyIds: [],
            }),
          },
        ],
      });
      try {
        await waitForPlayerState(player, "STOPPED", ["LOADING"]);
      } catch (err) {
        if (keySystemCheckError !== null) {
          throw keySystemCheckError;
        } else if (player.getError() !== null) {
          throw player.getError();
        }
        throw err;
      }
      const error = player.getError();
      expect(error).not.toBeNull();
      expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
      expect(error.name).to.equal("EncryptedMediaError");
      expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
      expect(keySystemCheckError).to.equal(null);
      player.dispose();
      await sleep(10);
      expect(checkNumber).toEqual(2);
    }
  });

  it("should not play hevc if not anounced as supported", async function () {
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => keySystem === "com.widevine.alpha",
          getMediaKeySystemConfiguration: (_keySystem, configs) => {
            for (const config of configs) {
              if (
                !Array.isArray(config.videoCapabilities) ||
                config.videoCapabilities === undefined
              ) {
                return config;
              }
              const filtered = config.videoCapabilities.filter((v) => {
                return (
                  v.contentType === undefined ||
                  (v.contentType.indexOf("hev") === -1 &&
                    v.contentType.indexOf("hvc") === -1)
                );
              });
              if (filtered.length !== 0) {
                return {
                  ...config,
                  videoCapabilities: filtered,
                };
              }
            }
            return null;
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "80399bf58a2140148053e27e748e98c0",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: () => {
            throw new Error("Wrong key system");
          },
        },
        {
          type: "com.widevine.alpha",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    try {
      await waitForLoadedStateAfterLoadVideo(player);
    } catch (err) {
      if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    expect(player.getError()).toBeNull();
    expect(askedKeyIds).toContain("80399bf58a2140148053e27e748e98c0");
    const availableVideoTracks = player.getAvailableVideoTracks();
    expect(availableVideoTracks).toHaveLength(1);
    expect(
      availableVideoTracks[0].representations.every(
        (r) => r.codec !== undefined && r.codec.indexOf("avc1") === 0,
      ),
    ).toBeTruthy();
  });

  it("should not play avc if not anounced as supported", async function () {
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => keySystem === "com.widevine.alpha",
          getMediaKeySystemConfiguration: (_keySystem, configs) => {
            for (const config of configs) {
              if (
                !Array.isArray(config.videoCapabilities) ||
                config.videoCapabilities === undefined
              ) {
                return config;
              }
              const filtered = config.videoCapabilities.filter((v) => {
                return v.contentType === undefined || v.contentType.indexOf("avc") === -1;
              });
              if (filtered.length !== 0) {
                return {
                  ...config,
                  videoCapabilities: filtered,
                };
              }
            }
            return null;
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "80399bf58a2140148053e27e748e98c0",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: () => {
            throw new Error("Wrong key system");
          },
        },
        {
          type: "com.widevine.alpha",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    try {
      await waitForLoadedStateAfterLoadVideo(player);
    } catch (err) {
      if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    expect(player.getError()).toBeNull();
    expect(askedKeyIds).not.toContain("80399bf58a2140148053e27e748e98c0");
    const availableVideoTracks = player.getAvailableVideoTracks();
    expect(availableVideoTracks).toHaveLength(1);
    expect(
      availableVideoTracks[0].representations.every(
        (r) =>
          r.codec !== undefined &&
          (r.codec.indexOf("hev1") === 0 || r.codec.indexOf("hvc1") === 0),
      ),
    ).toBeTruthy();
  });

  it("should have both avc and hevc if both are anounced as supported", async function () {
    dummy = new DummyMediaElement({
      drmOptions: {
        requestMediaKeySystemAccessConfig: {
          isKeySystemSupported: (keySystem) => keySystem === "com.widevine.alpha",
          getMediaKeySystemConfiguration: (_keySystem, configs) => {
            return configs[0];
          },
        },
      },
    });
    player = new RxPlayer({ videoElement: dummy });
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "80399bf58a2140148053e27e748e98c0",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: () => {
            throw new Error("Wrong key system");
          },
        },
        {
          type: "com.widevine.alpha",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    try {
      await waitForLoadedStateAfterLoadVideo(player);
    } catch (err) {
      if (player.getError() !== null) {
        throw player.getError();
      }
      throw err;
    }
    expect(player.getError()).toBeNull();
    const availableVideoTracks = player.getAvailableVideoTracks();
    expect(availableVideoTracks).toHaveLength(2);
    expect(
      availableVideoTracks[0].representations.every(
        (r) =>
          r.codec !== undefined &&
          (r.codec.indexOf("hev1") === 0 || r.codec.indexOf("hvc1") === 0),
      ),
    ).toBeTruthy();
    expect(
      availableVideoTracks[1].representations.every(
        (r) => r.codec !== undefined && r.codec.indexOf("avc1") === 0,
      ),
    ).toBeTruthy();
  });

  it('should ask for specific video robustnesses if videoCapabilitiesConfig is set to "robustness"', async () => {
    for (const keySystem of ["widevine", "com.widevine.alpha"]) {
      let checkNumber = 0;
      let keySystemCheckError = null;
      dummy = new DummyMediaElement({
        drmOptions: {
          requestMediaKeySystemAccessConfig: {
            getMediaKeySystemConfiguration: (keySystem, configs) => {
              // NOTE: this method should always return `false` for the test to pass
              try {
                switch (checkNumber++) {
                  case 0:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    expect(configs[0].videoCapabilities).not.toHaveLength(0);
                    expect(configs[0].audioCapabilities).not.toHaveLength(0);

                    // videoCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].videoCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("foo");
                        } else if (previousRobustness === "foo") {
                          if (robustness !== "foo") {
                            expect(robustness).toEqual("bar");
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "bar") {
                        throw new Error("Robustness in improper order");
                      }
                    }

                    // audioCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].audioCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("HW_SECURE_ALL");
                        } else if (previousRobustness === "HW_SECURE_ALL") {
                          if (robustness !== "HW_SECURE_ALL") {
                            expect(robustness).toEqual("HW_SECURE_DECODE");
                          }
                        } else if (previousRobustness === "HW_SECURE_DECODE") {
                          if (robustness !== "HW_SECURE_DECODE") {
                            expect(robustness).toEqual("HW_SECURE_CRYPTO");
                          }
                        } else if (previousRobustness === "HW_SECURE_CRYPTO") {
                          if (robustness !== "HW_SECURE_CRYPTO") {
                            expect(robustness).toEqual("SW_SECURE_DECODE");
                          }
                        } else if (previousRobustness === "SW_SECURE_DECODE") {
                          if (robustness !== "SW_SECURE_DECODE") {
                            expect(robustness).toEqual("SW_SECURE_CRYPTO");
                          }
                        } else if (previousRobustness === "SW_SECURE_CRYPTO") {
                          if (robustness !== "SW_SECURE_CRYPTO") {
                            throw new Error("Unexpected robustness: " + robustness);
                          }
                        }
                        previousRobustness = robustness;
                      }
                    }
                    break;
                  case 1:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    // videoCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].videoCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("foo");
                        } else if (previousRobustness === "foo") {
                          if (robustness !== "foo") {
                            expect(robustness).toEqual("bar");
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "bar") {
                        throw new Error("Robustness in improper order");
                      }
                    }
                    expect(configs[0].audioCapabilities).toBeUndefined();
                    break;
                  default:
                    throw new Error("Too many widevine checks");
                }
              } catch (e) {
                keySystemCheckError = e;
              }
              return null;
            },
          },
        },
      });
      player = new RxPlayer({ videoElement: dummy });
      lockLowestBitrates(player);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({
              expectedkeyids: [],
              askedKeyIds: [],
            }),
            videoCapabilitiesConfig: {
              type: "robustness",
              value: ["foo", "bar"],
            },
          },
        ],
      });
      try {
        await waitForPlayerState(player, "STOPPED", ["LOADING"]);
      } catch (err) {
        if (keySystemCheckError !== null) {
          throw keySystemCheckError;
        } else if (player.getError() !== null) {
          throw player.getError();
        }
        throw err;
      }
      const error = player.getError();
      expect(error).not.toBeNull();
      expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
      expect(error.name).to.equal("EncryptedMediaError");
      expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
      expect(keySystemCheckError).to.equal(null);
      player.dispose();
      await sleep(10);
      expect(checkNumber).toEqual(2);
    }
  });

  it('should ask for specific audio robustnesses if audioCapabilitiesConfig is set to "robustness"', async () => {
    for (const keySystem of ["widevine", "com.widevine.alpha"]) {
      let checkNumber = 0;
      let keySystemCheckError = null;
      dummy = new DummyMediaElement({
        drmOptions: {
          requestMediaKeySystemAccessConfig: {
            getMediaKeySystemConfiguration: (keySystem, configs) => {
              // NOTE: this method should always return `false` for the test to pass
              try {
                switch (checkNumber++) {
                  case 0:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    expect(configs[0].audioCapabilities).not.toHaveLength(0);
                    expect(configs[0].videoCapabilities).not.toHaveLength(0);

                    // audioCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].audioCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("foo");
                        } else if (previousRobustness === "foo") {
                          if (robustness !== "foo") {
                            expect(robustness).toEqual("bar");
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "bar") {
                        throw new Error("Robustness in improper order");
                      }
                    }

                    // videoCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].videoCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("HW_SECURE_ALL");
                        } else if (previousRobustness === "HW_SECURE_ALL") {
                          if (robustness !== "HW_SECURE_ALL") {
                            expect(robustness).toEqual("HW_SECURE_DECODE");
                          }
                        } else if (previousRobustness === "HW_SECURE_DECODE") {
                          if (robustness !== "HW_SECURE_DECODE") {
                            expect(robustness).toEqual("HW_SECURE_CRYPTO");
                          }
                        } else if (previousRobustness === "HW_SECURE_CRYPTO") {
                          if (robustness !== "HW_SECURE_CRYPTO") {
                            expect(robustness).toEqual("SW_SECURE_DECODE");
                          }
                        } else if (previousRobustness === "SW_SECURE_DECODE") {
                          if (robustness !== "SW_SECURE_DECODE") {
                            expect(robustness).toEqual("SW_SECURE_CRYPTO");
                          }
                        } else if (previousRobustness === "SW_SECURE_CRYPTO") {
                          if (robustness !== "SW_SECURE_CRYPTO") {
                            throw new Error("Unexpected robustness: " + robustness);
                          }
                        }
                        previousRobustness = robustness;
                      }
                    }
                    break;
                  case 1:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    // audioCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].audioCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("foo");
                        } else if (previousRobustness === "foo") {
                          if (robustness !== "foo") {
                            expect(robustness).toEqual("bar");
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "bar") {
                        throw new Error("Robustness in improper order");
                      }
                    }
                    expect(configs[0].videoCapabilities).toBeUndefined();
                    break;
                  default:
                    throw new Error("Too many widevine checks");
                }
              } catch (e) {
                keySystemCheckError = e;
              }
              return null;
            },
          },
        },
      });
      player = new RxPlayer({ videoElement: dummy });
      lockLowestBitrates(player);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({
              expectedkeyids: [],
              askedKeyIds: [],
            }),
            audioCapabilitiesConfig: {
              type: "robustness",
              value: ["foo", "bar"],
            },
          },
        ],
      });
      try {
        await waitForPlayerState(player, "STOPPED", ["LOADING"]);
      } catch (err) {
        if (keySystemCheckError !== null) {
          throw keySystemCheckError;
        } else if (player.getError() !== null) {
          throw player.getError();
        }
        throw err;
      }
      const error = player.getError();
      expect(error).not.toBeNull();
      expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
      expect(error.name).to.equal("EncryptedMediaError");
      expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
      expect(keySystemCheckError).to.equal(null);
      player.dispose();
      await sleep(10);
      expect(checkNumber).toEqual(2);
    }
  });

  it('should ask for specific audio and video robustnesses if audioCapabilitiesConfig and videoCapabilities are set to "robustness"', async () => {
    for (const keySystem of ["widevine", "com.widevine.alpha"]) {
      let checkNumber = 0;
      let keySystemCheckError = null;
      dummy = new DummyMediaElement({
        drmOptions: {
          requestMediaKeySystemAccessConfig: {
            getMediaKeySystemConfiguration: (keySystem, configs) => {
              // NOTE: this method should always return `false` for the test to pass
              try {
                switch (checkNumber++) {
                  case 0:
                    expect(keySystem).toEqual("com.widevine.alpha");
                    expect(configs).toHaveLength(1);
                    expect(configs[0].audioCapabilities).not.toHaveLength(0);
                    expect(configs[0].videoCapabilities).not.toHaveLength(0);

                    // audioCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].audioCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("foo");
                        } else if (previousRobustness === "foo") {
                          if (robustness !== "foo") {
                            expect(robustness).toEqual("bar");
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "bar") {
                        throw new Error(
                          "audio robustness in improper order 1: " + previousRobustness,
                        );
                      }
                    }

                    // videoCapabilities
                    {
                      let previousRobustness = null;
                      for (const capability of configs[0].videoCapabilities) {
                        const robustness = capability.robustness;
                        if (previousRobustness === null) {
                          expect(robustness).toEqual("Waka");
                        } else if (previousRobustness === "Waka") {
                          if (robustness !== "Waka") {
                            expect(robustness).toEqual("Flocka");
                          }
                        }
                        previousRobustness = robustness;
                      }
                      if (previousRobustness === null) {
                        throw new Error("No robustness communicated");
                      } else if (previousRobustness !== "Flocka") {
                        throw new Error(
                          "video robustness in improper order 1: " + previousRobustness,
                        );
                      }
                    }
                    break;
                  default:
                    throw new Error("Too many widevine checks");
                }
              } catch (e) {
                keySystemCheckError = e;
              }
              return null;
            },
          },
        },
      });
      player = new RxPlayer({ videoElement: dummy });
      lockLowestBitrates(player);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({
              expectedkeyids: [],
              askedKeyIds: [],
            }),
            audioCapabilitiesConfig: {
              type: "robustness",
              value: ["foo", "bar"],
            },
            videoCapabilitiesConfig: {
              type: "robustness",
              value: ["Waka", "Flocka"],
            },
          },
        ],
      });
      try {
        await waitForPlayerState(player, "STOPPED", ["LOADING"]);
      } catch (err) {
        if (keySystemCheckError !== null) {
          throw keySystemCheckError;
        } else if (player.getError() !== null) {
          throw player.getError();
        }
        throw err;
      }
      const error = player.getError();
      expect(error).not.toBeNull();
      expect(error.code).to.equal("INCOMPATIBLE_KEYSYSTEMS");
      expect(error.name).to.equal("EncryptedMediaError");
      expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
      expect(keySystemCheckError).to.equal(null);
      player.dispose();
      await sleep(10);
      expect(checkNumber).toEqual(1);
    }
  });
});
