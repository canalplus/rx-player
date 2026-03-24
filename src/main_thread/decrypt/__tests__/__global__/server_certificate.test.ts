import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import getEmeApiImplementation from "../../../../compat/eme";
import type { IKeySystemOption } from "../../../../public_types";
import assert from "../../../../utils/assert";
import ContentDecryptor from "../../content_decryptor";
import { ContentDecryptorState } from "../../types";
import { MediaKeysImpl, MediaKeySystemAccessImpl, mockCompat } from "./utils";

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

describe("decrypt - global tests - server certificate", () => {
  const mockGetLicense = vi.fn(() => {
    return new Promise<BufferSource>(() => {
      /* noop */
    });
  });

  const serverCertificate = new Uint8Array([1, 2, 3]);

  /** Default keySystems configuration used in our tests. */
  const ksConfigCert: IKeySystemOption[] = [
    {
      type: "com.widevine.alpha",
      getLicense: mockGetLicense,
      serverCertificate,
    },
  ];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mocks.shouldRenewMediaKeySystemAccess.mockReset();
    mocks.canReuseMediaKeys.mockReset();
    mocks.onEncrypted.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
    mocks.setMediaKeys.mockReset();
    mocks.getInitData.mockReset();
    mocks.generateKeyRequest.mockReset();
  });

  it("should set the serverCertificate only after the MediaKeys is attached", () => {
    const videoElt = document.createElement("video");
    mockCompat(mocks);
    mocks.setMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource): Promise<true> => {
        expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        return Promise.resolve(true);
      });

    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    return new Promise<void>((res) => {
      contentDecryptor.addEventListener("stateChange", (state) => {
        if (state === ContentDecryptorState.WaitingForAttachment) {
          contentDecryptor.removeEventListener("stateChange");
          setTimeout(() => {
            expect(mocks.setMediaKeys).not.toHaveBeenCalled();
            expect(mockCreateSession).not.toHaveBeenCalled();
            expect(mockSetServerCertificate).not.toHaveBeenCalled();
            contentDecryptor.attach();
          }, 5);
          setTimeout(() => {
            contentDecryptor.dispose(undefined);
            expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
            expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
            expect(mockCreateSession).not.toHaveBeenCalled();
            mockSetServerCertificate.mockRestore();
            mockCreateSession.mockRestore();
            res();
          }, 10);
        }
      });
    });
  });

  it("should not call serverCertificate multiple times on init data", () => {
    const videoElt = document.createElement("video");
    mockCompat(mocks);
    mocks.setMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource): Promise<true> => {
        expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        return Promise.resolve(true);
      });

    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        setTimeout(() => {
          expect(mocks.setMediaKeys).not.toHaveBeenCalled();
          expect(mockCreateSession).not.toHaveBeenCalled();
          expect(mockSetServerCertificate).not.toHaveBeenCalled();
          const initData = new Uint8Array([54, 55, 75]);
          contentDecryptor.onInitializationData({
            type: "cenc2",
            values: [{ systemId: "15", data: initData }],
          });
          contentDecryptor.attach();
        }, 5);
      }
    });
    return new Promise<void>((res) => {
      setTimeout(() => {
        contentDecryptor.dispose(undefined);
        expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).toHaveBeenCalledTimes(1);
        res();
      }, 100);
    });
  });

  it("should emit warning if serverCertificate call rejects but still continue", () => {
    const videoElt = document.createElement("video");
    mockCompat(mocks);
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource) => {
        throw new Error("some error");
      });

    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      }
    });

    let warningsReceived = 0;
    contentDecryptor.addEventListener("warning", (w) => {
      expect(w.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
      expect(w.type).toEqual("ENCRYPTED_MEDIA_ERROR");
      warningsReceived++;
    });
    return new Promise<void>((res) => {
      setTimeout(() => {
        contentDecryptor.dispose(undefined);
        expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        expect(warningsReceived).toEqual(1);
        res();
      }, 10);
    });
  });

  it("should emit warning if serverCertificate call throws but still continue", () => {
    const videoElt = document.createElement("video");
    mockCompat(mocks);
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource) => {
        return Promise.reject(new Error("some error"));
      });

    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      }
    });

    let warningsReceived = 0;
    contentDecryptor.addEventListener("warning", (w) => {
      expect(w.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
      expect(w.type).toEqual("ENCRYPTED_MEDIA_ERROR");
      warningsReceived++;
    });
    return new Promise<void>((res) => {
      setTimeout(() => {
        contentDecryptor.dispose(undefined);
        expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        expect(warningsReceived).toEqual(1);
        res();
      }, 10);
    });
  });

  it("should just continue if setServerCertificate is undefined", () => {
    const videoElt = document.createElement("video");
    mockCompat(mocks);
    vi.spyOn(MediaKeySystemAccessImpl.prototype, "createMediaKeys").mockImplementation(
      () => {
        const mediaKeys = new MediaKeysImpl();
        (mediaKeys as { setServerCertificate?: unknown }).setServerCertificate =
          undefined;
        return Promise.resolve(mediaKeys);
      },
    );
    mocks.setMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi.spyOn(
      MediaKeysImpl.prototype,
      "setServerCertificate",
    );
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        setTimeout(() => {
          expect(mocks.setMediaKeys).not.toHaveBeenCalled();
          expect(mockCreateSession).not.toHaveBeenCalled();
          expect(mockSetServerCertificate).not.toHaveBeenCalled();
          const initData = new Uint8Array([54, 55, 75]);
          contentDecryptor.onInitializationData({
            type: "cenc2",
            values: [{ systemId: "15", data: initData }],
          });

          contentDecryptor.attach();
        }, 5);
      }
    });
    return new Promise<void>((res) => {
      setTimeout(() => {
        contentDecryptor.dispose(undefined);
        expect(mocks.setMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).not.toHaveBeenCalled();
        expect(mockCreateSession).toHaveBeenCalledTimes(1);
        res();
      }, 10);
    });
  });
});
