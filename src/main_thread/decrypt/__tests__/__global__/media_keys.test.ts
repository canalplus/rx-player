import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import getEmeApiImplementation from "../../../../compat/eme/index.ts";
import type { IKeySystemOption } from "../../../../public_types.ts";
import assert from "../../../../utils/assert.ts";
import ContentDecryptor from "../../content_decryptor.ts";
import { ContentDecryptorState } from "../../types.ts";
import {
  MediaKeysImpl,
  MediaKeySystemAccessImpl,
  mockCompat,
  testContentDecryptorError,
} from "./utils.ts";

const mocks = vi.hoisted(() => {
  return {
    // Used to implement every functions that should never be called.
    neverCalled: vi.fn(),
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
vi.mock("../../set_server_certificate", () => ({
  default: mocks.neverCalled,
}));

describe("decrypt - global tests - media key system access", () => {
  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  /** Default keySystems configuration used in our tests. */
  const ksConfig: IKeySystemOption[] = [
    { type: "com.widevine.alpha", getLicense: mocks.neverCalled },
  ];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    expect(mocks.neverCalled).not.toHaveBeenCalled();
    mocks.shouldRenewMediaKeySystemAccess.mockReset();
    mocks.canReuseMediaKeys.mockReset();
    mocks.onEncrypted.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
    mocks.setMediaKeys.mockReset();
    mocks.getInitData.mockReset();
    mocks.generateKeyRequest.mockReset();
  });

  it("should throw if createMediaKeys throws", async () => {
    function requestMediaKeySystemAccessBadMediaKeys(
      keySystem: string,
      conf: MediaKeySystemConfiguration[],
    ): Promise<unknown> {
      return Promise.resolve({
        keySystem,
        getConfiguration() {
          return conf;
        },
        createMediaKeys() {
          throw new Error("No non no");
        },
      });
    }
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(
      requestMediaKeySystemAccessBadMediaKeys,
    );

    // == test ==
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const error = await testContentDecryptorError(
      eme,
      ContentDecryptor,
      videoElt,
      ksConfig,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual("CREATE_MEDIA_KEYS_ERROR: No non no");
    expect(error.name).toEqual("EncryptedMediaError");
    expect((error as Error & { code?: string | undefined }).code).toEqual(
      "CREATE_MEDIA_KEYS_ERROR",
    );
  });

  it("should throw if createMediaKeys rejects", async () => {
    function requestMediaKeySystemAccessRejMediaKeys(
      keySystem: string,
      conf: MediaKeySystemConfiguration[],
    ) {
      return Promise.resolve({
        keySystem,
        getConfiguration: () => conf,
        createMediaKeys: () => Promise.reject(new Error("No non no")),
      });
    }
    mockCompat(mocks);
    mocks.requestMediaKeySystemAccess.mockImplementation(
      requestMediaKeySystemAccessRejMediaKeys,
    );

    // == test ==
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const error = await testContentDecryptorError(
      eme,
      ContentDecryptor,
      videoElt,
      ksConfig,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual("CREATE_MEDIA_KEYS_ERROR: No non no");
    expect(error.name).toEqual("EncryptedMediaError");
    expect((error as Error & { code?: string | undefined }).code).toEqual(
      "CREATE_MEDIA_KEYS_ERROR",
    );
  });

  it("should go into the WaitingForAttachment state if createMediaKeys resolves", async () => {
    mockCompat(mocks);
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    return new Promise<void>((res, rej) => {
      const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
      let receivedStateChange = 0;
      contentDecryptor.addEventListener("stateChange", (newState) => {
        receivedStateChange++;
        try {
          expect(newState).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        } catch (err) {
          rej(err);
        }
        setTimeout(() => {
          try {
            expect(receivedStateChange).toEqual(1);
            expect(contentDecryptor.getState()).toEqual(
              ContentDecryptorState.WaitingForAttachment,
            );
            contentDecryptor.dispose(undefined);
          } catch (err) {
            rej(err);
          }
          res();
        });
      });
    });
  });

  it("should not call createMediaKeys again if previous one is compatible", async () => {
    mockCompat(mocks);
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    return new Promise<void>((res, rej) => {
      const contentDecryptor1 = new ContentDecryptor(eme, videoElt, ksConfig);
      let receivedStateChange1 = 0;
      contentDecryptor1.addEventListener("error", rej);
      contentDecryptor1.addEventListener("stateChange", (state1) => {
        receivedStateChange1++;
        try {
          if (receivedStateChange1 === 2) {
            expect(state1).toEqual(ContentDecryptorState.ReadyForContent);
            return;
          } else if (receivedStateChange1 !== 1) {
            throw new Error("Unexpected stateChange event.");
          }
          expect(state1).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
          contentDecryptor1.attach();
        } catch (err) {
          rej(err);
        }

        setTimeout(() => {
          contentDecryptor1.dispose(undefined);
          const contentDecryptor2 = new ContentDecryptor(eme, videoElt, ksConfig);
          let receivedStateChange2 = 0;
          contentDecryptor2.addEventListener("error", rej);
          contentDecryptor2.addEventListener("stateChange", (state2) => {
            receivedStateChange2++;
            try {
              if (receivedStateChange2 === 2) {
                expect(state2).toEqual(ContentDecryptorState.ReadyForContent);
                return;
              } else if (receivedStateChange2 !== 1) {
                throw new Error("Unexpected stateChange event.");
              }
              expect(state2).toEqual(ContentDecryptorState.WaitingForAttachment);
              expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
              contentDecryptor2.attach();
              setTimeout(() => {
                try {
                  contentDecryptor2.dispose(undefined);
                  expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
                  res();
                } catch (err) {
                  rej(err);
                }
              });
            } catch (err) {
              rej(err);
            }
          });
        }, 10);
      });
    });
  });

  it("should call createMediaKeys again if the platform needs re-creation of the MediaKeys", async () => {
    mockCompat(mocks);
    mocks.canReuseMediaKeys.mockImplementation(() => false);
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    return new Promise<void>((res, rej) => {
      const eme = getEmeApiImplementation("auto");
      assert(eme !== null, "Expected to have an EME implementation");
      const contentDecryptor1 = new ContentDecryptor(eme, videoElt, ksConfig);
      let receivedStateChange1 = 0;
      contentDecryptor1.addEventListener("error", rej);
      contentDecryptor1.addEventListener("stateChange", (state1) => {
        receivedStateChange1++;
        try {
          if (receivedStateChange1 === 2) {
            expect(state1).toEqual(ContentDecryptorState.ReadyForContent);
            return;
          } else if (receivedStateChange1 !== 1) {
            throw new Error("Unexpected stateChange event.");
          }
          expect(state1).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
          contentDecryptor1.attach();
        } catch (err) {
          rej(err);
        }

        setTimeout(() => {
          contentDecryptor1.dispose(undefined);
          const contentDecryptor2 = new ContentDecryptor(eme, videoElt, ksConfig);
          let receivedStateChange2 = 0;
          contentDecryptor2.addEventListener("error", rej);
          contentDecryptor2.addEventListener("stateChange", (state2) => {
            receivedStateChange2++;
            try {
              if (receivedStateChange2 === 2) {
                expect(state2).toEqual(ContentDecryptorState.ReadyForContent);
                return;
              } else if (receivedStateChange2 !== 1) {
                throw new Error("Unexpected stateChange event.");
              }
              expect(state2).toEqual(ContentDecryptorState.WaitingForAttachment);
              expect(mockCreateMediaKeys).toHaveBeenCalledTimes(2);
              contentDecryptor2.attach();
              setTimeout(() => {
                try {
                  contentDecryptor2.dispose(undefined);
                  expect(mockCreateMediaKeys).toHaveBeenCalledTimes(2);
                  res();
                } catch (err) {
                  rej(err);
                }
              });
            } catch (err) {
              rej(err);
            }
          });
        }, 10);
      });
    });
  });

  it("should not call createMediaKeys again if the platform needs MediaKeySystemAccess renewal", async () => {
    mockCompat(mocks);
    mocks.shouldRenewMediaKeySystemAccess.mockImplementation(() => true);
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    return new Promise<void>((res, rej) => {
      const contentDecryptor1 = new ContentDecryptor(eme, videoElt, ksConfig);
      let receivedStateChange1 = 0;
      contentDecryptor1.addEventListener("error", rej);
      contentDecryptor1.addEventListener("stateChange", (state1) => {
        receivedStateChange1++;
        try {
          if (receivedStateChange1 === 2) {
            expect(state1).toEqual(ContentDecryptorState.ReadyForContent);
            return;
          } else if (receivedStateChange1 !== 1) {
            throw new Error("Unexpected stateChange event.");
          }
          expect(state1).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
          contentDecryptor1.attach();
        } catch (err) {
          rej(err);
        }

        setTimeout(() => {
          contentDecryptor1.dispose(undefined);
          const contentDecryptor2 = new ContentDecryptor(eme, videoElt, ksConfig);
          let receivedStateChange2 = 0;
          contentDecryptor2.addEventListener("error", rej);
          contentDecryptor2.addEventListener("stateChange", (state2) => {
            receivedStateChange2++;
            try {
              if (receivedStateChange2 === 2) {
                expect(state2).toEqual(ContentDecryptorState.ReadyForContent);
                return;
              } else if (receivedStateChange2 !== 1) {
                throw new Error("Unexpected stateChange event.");
              }
              expect(state2).toEqual(ContentDecryptorState.WaitingForAttachment);
              expect(mockCreateMediaKeys).toHaveBeenCalledTimes(2);
              contentDecryptor2.attach();
              setTimeout(() => {
                try {
                  contentDecryptor2.dispose(undefined);
                  expect(mockCreateMediaKeys).toHaveBeenCalledTimes(2);
                  res();
                } catch (err) {
                  rej(err);
                }
              });
            } catch (err) {
              rej(err);
            }
          });
        }, 10);
      });
    });
  });

  it("should not create any session if no encrypted event was received", async () => {
    mockCompat(mocks);
    mocks.setMediaKeys.mockImplementation(() => {
      /* noop */
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");

    // == test ==
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);
    return new Promise<void>((res) => {
      contentDecryptor.addEventListener("stateChange", (newState) => {
        if (newState === ContentDecryptorState.WaitingForAttachment) {
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
          setTimeout(() => {
            expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
            expect(mocks.setMediaKeys).toHaveBeenCalledWith(
              videoElt,
              new MediaKeysImpl(),
            );
            expect(mockCreateSession).not.toHaveBeenCalled();
            res();
          }, 5);
        }
      });
    });
  });
});
