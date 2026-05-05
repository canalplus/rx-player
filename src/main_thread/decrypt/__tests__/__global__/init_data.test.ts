import { describe, afterEach, it, expect, vi } from "vitest";
import getEmeApiImplementation from "../../../../compat/eme/index.ts";
import assert from "../../../../utils/assert.ts";
import ContentDecryptor from "../../content_decryptor.ts";
import { ContentDecryptorState } from "../../types.ts";
import {
  formatFakeChallengeFromInitData,
  MediaKeySessionImpl,
  MediaKeysImpl,
  mockCompat,
} from "./utils.ts";

const mocks = vi.hoisted(() => {
  return {
    shouldRenewMediaKeySystemAccess: vi.fn(() => false),
    canReuseMediaKeys: vi.fn(() => true),
    onEncrypted: vi.fn(),
    requestMediaKeySystemAccess: vi.fn(),
    setMediaKeys: vi.fn(),
    getInitData: vi.fn(),
    generateKeyRequest: vi.fn(),
  };
});
vi.mock("../../../../compat/should_renew_media_key_system_access", () => ({
  default: mocks.shouldRenewMediaKeySystemAccess,
}));
vi.mock("../../../../compat/can_reuse_media_keys", () => ({
  default: mocks.canReuseMediaKeys,
}));
vi.mock("../../../../compat/eme", () => ({
  default: () => ({
    onEncrypted: mocks.onEncrypted,
    requestMediaKeySystemAccess: mocks.requestMediaKeySystemAccess,
    setMediaKeys: mocks.setMediaKeys,
  }),
  getInitData: mocks.getInitData,
  generateKeyRequest: mocks.generateKeyRequest,
  closeSession: vi.fn(),
  loadSession: vi.fn(),
}));

describe("decrypt - global tests - init data", () => {
  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  const mockGetLicense = vi.fn().mockImplementation(() => {
    return new Promise(() => {
      /* noop */
    });
  });

  /** Default keySystems configuration used in our tests. */
  const ksConfig = [{ type: "com.widevine.alpha", getLicense: mockGetLicense }];

  afterEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    mocks.shouldRenewMediaKeySystemAccess.mockReset();
    mocks.canReuseMediaKeys.mockReset();
    mocks.onEncrypted.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
    mocks.setMediaKeys.mockReset();
    mocks.getInitData.mockReset();
    mocks.generateKeyRequest.mockReset();
  });

  it("should create a session and generate a request when init data is sent through the arguments", () => {
    mockCompat(mocks);
    const mediaKeySession = new MediaKeySessionImpl();
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockReturnValue(mediaKeySession);
    return new Promise<void>((res, rej) => {
      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initData }],
      });
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mocks.generateKeyRequest).toHaveBeenCalledWith(
            mediaKeySession,
            "cenc",
            initData,
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should ignore init data already sent through the argument", () => {
    mockCompat(mocks);
    const mediaKeySession = new MediaKeySessionImpl();
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockReturnValue(mediaKeySession);
    return new Promise<void>((res, rej) => {
      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initData }],
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initData }],
      });
      setTimeout(() => {
        contentDecryptor.onInitializationData({
          type: "cenc",
          values: [{ systemId: "15", data: initData }],
        });
      }, 5);
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mocks.generateKeyRequest).toHaveBeenCalledWith(
            mediaKeySession,
            "cenc",
            initData,
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should create multiple sessions for multiple sent init data when unknown", () => {
    mockCompat(mocks);
    const mediaKeySessions = [
      new MediaKeySessionImpl(),
      new MediaKeySessionImpl(),
      new MediaKeySessionImpl(),
    ];
    let createSessionCallIdx = 0;
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initDatas = [
        new Uint8Array([54, 55, 75]),
        new Uint8Array([87, 32]),
        new Uint8Array([87, 77]),
      ];

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initDatas[0] }],
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initDatas[1] }],
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initDatas[0] }],
      });
      setTimeout(() => {
        contentDecryptor.onInitializationData({
          type: "cenc",
          values: [{ systemId: "15", data: initDatas[2] }],
        });
      });
      setTimeout(() => {
        contentDecryptor.onInitializationData({
          type: "cenc",
          values: [{ systemId: "15", data: initDatas[1] }],
        });
      }, 5);
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(3);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(3, "temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(3);
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            1,
            mediaKeySessions[0],
            "cenc",
            initDatas[0],
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            2,
            mediaKeySessions[1],
            "cenc",
            initDatas[1],
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            3,
            mediaKeySessions[2],
            "cenc",
            initDatas[2],
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(3);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            3,
            formatFakeChallengeFromInitData(initDatas[2], "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should create multiple sessions for multiple sent init data types", () => {
    mockCompat(mocks);
    const mediaKeySessions = [new MediaKeySessionImpl(), new MediaKeySessionImpl()];
    let createSessionCallIdx = 0;
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [{ systemId: "15", data: initData }],
      });
      contentDecryptor.onInitializationData({
        type: "cenc2",
        values: [{ systemId: "15", data: initData }],
      });
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(2);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(2);
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            1,
            mediaKeySessions[0],
            "cenc",
            initData,
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            2,
            mediaKeySessions[1],
            "cenc2",
            initData,
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(2);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initData, "cenc2"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should create a session and generate a request when init data is received from the browser", () => {
    const { eventTriggers } = mockCompat(mocks);
    const mediaKeySession = new MediaKeySessionImpl();
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockReturnValue(mediaKeySession);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      const initDataEvent = {
        type: "cenc",
        values: [{ systemId: "15", data: initData }],
      };
      eventTriggers.triggerEncrypted(videoElt, initDataEvent);
      setTimeout(() => {
        try {
          expect(mocks.getInitData).toHaveBeenCalledTimes(1);
          expect(mocks.getInitData).toHaveBeenCalledWith(initDataEvent);
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mocks.generateKeyRequest).toHaveBeenCalledWith(
            mediaKeySession,
            "cenc",
            initData,
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should ignore init data already received through the browser", () => {
    const { eventTriggers } = mockCompat(mocks);
    const mediaKeySession = new MediaKeySessionImpl();
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockReturnValue(mediaKeySession);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      const initDataEvent = {
        type: "cenc",
        values: [{ systemId: "15", data: initData }],
      };
      eventTriggers.triggerEncrypted(videoElt, initDataEvent);
      eventTriggers.triggerEncrypted(videoElt, initDataEvent);
      setTimeout(() => {
        eventTriggers.triggerEncrypted(videoElt, initDataEvent);
      }, 5);
      setTimeout(() => {
        try {
          expect(mocks.getInitData).toHaveBeenCalledTimes(3);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(1, initDataEvent);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(2, initDataEvent);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(3, initDataEvent);
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mocks.generateKeyRequest).toHaveBeenCalledWith(
            mediaKeySession,
            "cenc",
            initData,
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should create multiple sessions for multiple received init data when unknown", () => {
    const { eventTriggers } = mockCompat(mocks);
    const mediaKeySessions = [
      new MediaKeySessionImpl(),
      new MediaKeySessionImpl(),
      new MediaKeySessionImpl(),
    ];
    let createSessionCallIdx = 0;
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initDatas = [
        new Uint8Array([54, 55, 75]),
        new Uint8Array([87, 32]),
        new Uint8Array([87, 77]),
      ];
      const initDataEvents = [
        { type: "cenc", values: [{ systemId: "15", data: initDatas[0] }] },

        { type: "cenc", values: [{ systemId: "15", data: initDatas[1] }] },

        { type: "cenc", values: [{ systemId: "15", data: initDatas[2] }] },
      ];

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[0]);
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[1]);
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[0]);
      setTimeout(() => {
        eventTriggers.triggerEncrypted(videoElt, initDataEvents[2]);
      });
      setTimeout(() => {
        eventTriggers.triggerEncrypted(videoElt, initDataEvents[1]);
      }, 5);
      setTimeout(() => {
        try {
          expect(mocks.getInitData).toHaveBeenCalledTimes(5);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(1, initDataEvents[0]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(2, initDataEvents[1]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(3, initDataEvents[0]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(4, initDataEvents[2]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(5, initDataEvents[1]);
          expect(mockCreateSession).toHaveBeenCalledTimes(3);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(3, "temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(3);
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            1,
            mediaKeySessions[0],
            "cenc",
            initDatas[0],
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            2,
            mediaKeySessions[1],
            "cenc",
            initDatas[1],
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            3,
            mediaKeySessions[2],
            "cenc",
            initDatas[2],
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(3);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            3,
            formatFakeChallengeFromInitData(initDatas[2], "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should create multiple sessions for multiple received init data types", () => {
    const { eventTriggers } = mockCompat(mocks);
    const mediaKeySessions = [new MediaKeySessionImpl(), new MediaKeySessionImpl()];
    let createSessionCallIdx = 0;
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);
      const initDataEvents = [
        { type: "cenc", values: [{ systemId: "15", data: initData }] },

        { type: "cenc2", values: [{ systemId: "15", data: initData }] },
      ];

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[0]);
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[1]);
      setTimeout(() => {
        try {
          expect(mocks.getInitData).toHaveBeenCalledTimes(2);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(1, initDataEvents[0]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(2, initDataEvents[1]);
          expect(mockCreateSession).toHaveBeenCalledTimes(2);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(2);
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            1,
            mediaKeySessions[0],
            "cenc",
            initData,
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            2,
            mediaKeySessions[1],
            "cenc2",
            initData,
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(2);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initData, "cenc2"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should consider sent event through arguments and received events through the browser the same way", () => {
    const { eventTriggers } = mockCompat(mocks);
    const mediaKeySessions = [
      new MediaKeySessionImpl(),
      new MediaKeySessionImpl(),
      new MediaKeySessionImpl(),
    ];
    let createSessionCallIdx = 0;
    const mockCreateSession = vi
      .spyOn(MediaKeysImpl.prototype, "createSession")
      .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

    return new Promise<void>((res, rej) => {
      // == vars ==
      const initDatas = [
        new Uint8Array([54, 55, 75]),
        new Uint8Array([87, 32]),
        new Uint8Array([87, 77]),
      ];
      const initDataEvents = [
        { type: "cenc", values: [{ systemId: "15", data: initDatas[0] }] },

        { type: "cenc", values: [{ systemId: "15", data: initDatas[1] }] },

        { type: "cenc", values: [{ systemId: "15", data: initDatas[2] }] },
      ];

      // == test ==
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      contentDecryptor.addEventListener(
        "stateChange",
        (newState: ContentDecryptorState) => {
          if (newState !== ContentDecryptorState.WaitingForAttachment) {
            rej(new Error(`Unexpected state: ${newState}`));
          }
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
        },
      );
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[0]);
      contentDecryptor.onInitializationData(initDataEvents[1]);
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[1]);
      eventTriggers.triggerEncrypted(videoElt, initDataEvents[0]);
      setTimeout(() => {
        contentDecryptor.onInitializationData(initDataEvents[0]);
        eventTriggers.triggerEncrypted(videoElt, initDataEvents[2]);
      });
      setTimeout(() => {
        try {
          expect(mocks.getInitData).toHaveBeenCalledTimes(4);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(1, initDataEvents[0]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(2, initDataEvents[1]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(3, initDataEvents[0]);
          expect(mocks.getInitData).toHaveBeenNthCalledWith(4, initDataEvents[2]);
          expect(mockCreateSession).toHaveBeenCalledTimes(3);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(3, "temporary");
          expect(mocks.generateKeyRequest).toHaveBeenCalledTimes(3);
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            1,
            mediaKeySessions[0],
            "cenc",
            initDatas[0],
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            2,
            mediaKeySessions[1],
            "cenc",
            initDatas[1],
          );
          expect(mocks.generateKeyRequest).toHaveBeenNthCalledWith(
            3,
            mediaKeySessions[2],
            "cenc",
            initDatas[2],
          );
          expect(mockGetLicense).toHaveBeenCalledTimes(3);
          // TODO there's seem to be an issue with how vitest check Uint8Array
          // equality
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request",
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            3,
            formatFakeChallengeFromInitData(initDatas[2], "cenc"),
            "license-request",
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });
});
