import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */

import {
  MediaKeysImpl,
  MediaKeySystemAccessImpl,
  mockCompat,
  testContentDecryptorError,
} from "./utils";

describe("decrypt - global tests - media key system access", () => {
  /** Used to implement every functions that should never be called. */
  const neverCalledFn = vi.fn();

  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  /** Default keySystems configuration used in our tests. */
  const ksConfig = [{ type: "com.widevine.alpha", getLicense: neverCalledFn }];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doMock("../../set_server_certificate", () => ({
      default: neverCalledFn,
    }));
  });

  afterEach(() => {
    expect(neverCalledFn).not.toHaveBeenCalled();
  });

  it("should throw if createMediaKeys throws", async () => {
    // == mocks ==
    function requestMediaKeySystemAccessBadMediaKeys(
      keySystem: string,
      conf: MediaKeySystemConfiguration[],
    ) {
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
    mockCompat({
      requestMediaKeySystemAccess: vi.fn(requestMediaKeySystemAccessBadMediaKeys),
    });

    // == test ==
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const error: any = await testContentDecryptorError(
      ContentDecryptor,
      videoElt,
      ksConfig,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual("CREATE_MEDIA_KEYS_ERROR: No non no");
    expect(error.name).toEqual("EncryptedMediaError");
    expect(error.code).toEqual("CREATE_MEDIA_KEYS_ERROR");
  });

  it("should throw if createMediaKeys rejects", async () => {
    // == mocks ==
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
    mockCompat({
      requestMediaKeySystemAccess: vi.fn(requestMediaKeySystemAccessRejMediaKeys),
    });

    // == test ==
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const error: any = await testContentDecryptorError(
      ContentDecryptor,
      videoElt,
      ksConfig,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual("CREATE_MEDIA_KEYS_ERROR: No non no");
    expect(error.name).toEqual("EncryptedMediaError");
    expect(error.code).toEqual("CREATE_MEDIA_KEYS_ERROR");
  });

  it("should go into the WaitingForAttachment state if createMediaKeys resolves", async () => {
    mockCompat();
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    return new Promise<void>((res, rej) => {
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      let receivedStateChange = 0;
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        receivedStateChange++;
        try {
          expect(newState.name).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
        } catch (err) {
          rej(err);
        }
        setTimeout(() => {
          try {
            expect(receivedStateChange).toEqual(1);
            expect(contentDecryptor.getState()).toEqual({
              name: ContentDecryptorState.WaitingForAttachment,
              payload: null,
            });
            contentDecryptor.dispose();
          } catch (err) {
            rej(err);
          }
          res();
        });
      });
    });
  });

  it("should not call createMediaKeys again if previous one is compatible", async () => {
    mockCompat();
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    return new Promise<void>((res, rej) => {
      const contentDecryptor1 = new ContentDecryptor(videoElt, ksConfig);
      let receivedStateChange1 = 0;
      contentDecryptor1.addEventListener("stateChange", (state1: any) => {
        receivedStateChange1++;
        if (state1.name === ContentDecryptorState.Error) {
          rej(state1.payload);
        }
        try {
          if (receivedStateChange1 === 2) {
            expect(state1.name).toEqual(ContentDecryptorState.ReadyForContent);
            return;
          } else if (receivedStateChange1 !== 1) {
            throw new Error("Unexpected stateChange event.");
          }
          expect(state1.name).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
          contentDecryptor1.attach();
        } catch (err) {
          rej(err);
        }

        setTimeout(() => {
          contentDecryptor1.dispose();
          const contentDecryptor2 = new ContentDecryptor(videoElt, ksConfig);
          let receivedStateChange2 = 0;
          contentDecryptor2.addEventListener("stateChange", (state2: any) => {
            receivedStateChange2++;
            if (state2.name === ContentDecryptorState.Error) {
              rej(state2.payload);
            }
            try {
              if (receivedStateChange2 === 2) {
                expect(state2.name).toEqual(ContentDecryptorState.ReadyForContent);
                return;
              } else if (receivedStateChange2 !== 1) {
                throw new Error("Unexpected stateChange event.");
              }
              expect(state2.name).toEqual(ContentDecryptorState.WaitingForAttachment);
              expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
              contentDecryptor2.attach();
              setTimeout(() => {
                try {
                  contentDecryptor2.dispose();
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
    mockCompat({
      canReuseMediaKeys: vi.fn(() => false),
    });
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    return new Promise<void>((res, rej) => {
      const contentDecryptor1 = new ContentDecryptor(videoElt, ksConfig);
      let receivedStateChange1 = 0;
      contentDecryptor1.addEventListener("stateChange", (state1: any) => {
        receivedStateChange1++;
        if (state1.name === ContentDecryptorState.Error) {
          rej(state1.payload);
        }
        try {
          if (receivedStateChange1 === 2) {
            expect(state1.name).toEqual(ContentDecryptorState.ReadyForContent);
            return;
          } else if (receivedStateChange1 !== 1) {
            throw new Error("Unexpected stateChange event.");
          }
          expect(state1.name).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
          contentDecryptor1.attach();
        } catch (err) {
          rej(err);
        }

        setTimeout(() => {
          contentDecryptor1.dispose();
          const contentDecryptor2 = new ContentDecryptor(videoElt, ksConfig);
          let receivedStateChange2 = 0;
          contentDecryptor2.addEventListener("stateChange", (state2: any) => {
            receivedStateChange2++;
            if (state2.name === ContentDecryptorState.Error) {
              rej(state2.payload);
            }
            try {
              if (receivedStateChange2 === 2) {
                expect(state2.name).toEqual(ContentDecryptorState.ReadyForContent);
                return;
              } else if (receivedStateChange2 !== 1) {
                throw new Error("Unexpected stateChange event.");
              }
              expect(state2.name).toEqual(ContentDecryptorState.WaitingForAttachment);
              expect(mockCreateMediaKeys).toHaveBeenCalledTimes(2);
              contentDecryptor2.attach();
              setTimeout(() => {
                try {
                  contentDecryptor2.dispose();
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
    mockCompat({
      shouldRenewMediaKeySystemAccess: vi.fn(() => true),
    });
    const mockCreateMediaKeys = vi.spyOn(
      MediaKeySystemAccessImpl.prototype,
      "createMediaKeys",
    );
    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;

    return new Promise<void>((res, rej) => {
      const contentDecryptor1 = new ContentDecryptor(videoElt, ksConfig);
      let receivedStateChange1 = 0;
      contentDecryptor1.addEventListener("stateChange", (state1: any) => {
        receivedStateChange1++;
        if (state1.name === ContentDecryptorState.Error) {
          rej(state1.payload);
        }
        try {
          if (receivedStateChange1 === 2) {
            expect(state1.name).toEqual(ContentDecryptorState.ReadyForContent);
            return;
          } else if (receivedStateChange1 !== 1) {
            throw new Error("Unexpected stateChange event.");
          }
          expect(state1.name).toEqual(ContentDecryptorState.WaitingForAttachment);
          expect(mockCreateMediaKeys).toHaveBeenCalledTimes(1);
          contentDecryptor1.attach();
        } catch (err) {
          rej(err);
        }

        setTimeout(() => {
          contentDecryptor1.dispose();
          const contentDecryptor2 = new ContentDecryptor(videoElt, ksConfig);
          let receivedStateChange2 = 0;
          contentDecryptor2.addEventListener("stateChange", (state2: any) => {
            receivedStateChange2++;
            if (state2.name === ContentDecryptorState.Error) {
              rej(state2.payload);
            }
            try {
              if (receivedStateChange2 === 2) {
                expect(state2.name).toEqual(ContentDecryptorState.ReadyForContent);
                return;
              } else if (receivedStateChange2 !== 1) {
                throw new Error("Unexpected stateChange event.");
              }
              expect(state2.name).toEqual(ContentDecryptorState.WaitingForAttachment);
              expect(mockCreateMediaKeys).toHaveBeenCalledTimes(2);
              contentDecryptor2.attach();
              setTimeout(() => {
                try {
                  contentDecryptor2.dispose();
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
    // == mocks ==
    const mockSetMediaKeys = vi.fn(() => Promise.resolve());
    mockCompat({ setMediaKeys: mockSetMediaKeys });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");

    // == test ==
    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
    return new Promise<void>((res) => {
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState.name === ContentDecryptorState.WaitingForAttachment) {
          contentDecryptor.removeEventListener("stateChange");
          contentDecryptor.attach();
          setTimeout(() => {
            expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
            expect(mockSetMediaKeys).toHaveBeenCalledWith(videoElt, new MediaKeysImpl());
            expect(mockCreateSession).not.toHaveBeenCalled();
            res();
          }, 5);
        }
      });
    });
  });
});
