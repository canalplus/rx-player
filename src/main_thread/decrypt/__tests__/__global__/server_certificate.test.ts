import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { MediaKeysImpl, MediaKeySystemAccessImpl, mockCompat } from "./utils";

describe("decrypt - global tests - server certificate", () => {
  const mockGetLicense = vi.fn(() => {
    return new Promise(() => {
      /* noop */
    });
  });

  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  const serverCertificate = [1, 2, 3];

  /** Default keySystems configuration used in our tests. */
  const ksConfigCert = [
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

  it("should set the serverCertificate only after the MediaKeys is attached", async () => {
    const { mockSetMediaKeys } = mockCompat();
    mockSetMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource) => {
        expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        return Promise.resolve(true);
      });

    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    const eme = getEmeApiImplementation("auto");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    return new Promise<void>((res) => {
      contentDecryptor.addEventListener("stateChange", (state: any) => {
        if (state === ContentDecryptorState.WaitingForAttachment) {
          contentDecryptor.removeEventListener("stateChange");
          setTimeout(() => {
            expect(mockSetMediaKeys).not.toHaveBeenCalled();
            expect(mockCreateSession).not.toHaveBeenCalled();
            expect(mockSetServerCertificate).not.toHaveBeenCalled();
            contentDecryptor.attach();
          }, 5);
          setTimeout(() => {
            contentDecryptor.dispose();
            expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
            expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
            expect(mockCreateSession).not.toHaveBeenCalled();
            res();
          }, 10);
        }
      });
    });
  });

  it("should not call serverCertificate multiple times on init data", async () => {
    const { mockSetMediaKeys } = mockCompat();
    mockSetMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource) => {
        expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        return Promise.resolve(true);
      });

    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    const eme = getEmeApiImplementation("auto");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state: any) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        setTimeout(() => {
          expect(mockSetMediaKeys).not.toHaveBeenCalled();
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
        contentDecryptor.dispose();
        expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).toHaveBeenCalledTimes(1);
        res();
      }, 100);
    });
  });

  it("should emit warning if serverCertificate call rejects but still continue", async () => {
    const { mockSetMediaKeys } = mockCompat();
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource) => {
        throw new Error("some error");
      });

    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    const eme = getEmeApiImplementation("auto");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state: any) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      }
    });

    let warningsReceived = 0;
    contentDecryptor.addEventListener("warning", (w: any) => {
      expect(w.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
      expect(w.type).toEqual("ENCRYPTED_MEDIA_ERROR");
      warningsReceived++;
    });
    return new Promise<void>((res) => {
      setTimeout(() => {
        contentDecryptor.dispose();
        expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        expect(warningsReceived).toEqual(1);
        res();
      }, 10);
    });
  });

  it("should emit warning if serverCertificate call throws but still continue", async () => {
    const { mockSetMediaKeys } = mockCompat();
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi
      .spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate: BufferSource) => {
        return Promise.reject(new Error("some error"));
      });

    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    const eme = getEmeApiImplementation("auto");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state: any) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      }
    });

    let warningsReceived = 0;
    contentDecryptor.addEventListener("warning", (w: any) => {
      expect(w.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
      expect(w.type).toEqual("ENCRYPTED_MEDIA_ERROR");
      warningsReceived++;
    });
    return new Promise<void>((res) => {
      setTimeout(() => {
        contentDecryptor.dispose();
        expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).not.toHaveBeenCalled();
        expect(warningsReceived).toEqual(1);
        res();
      }, 10);
    });
  });

  it("should just continue if setServerCertificate is undefined", async () => {
    const { mockSetMediaKeys } = mockCompat();
    vi.spyOn(MediaKeySystemAccessImpl.prototype, "createMediaKeys").mockImplementation(
      () => {
        const mediaKeys = new MediaKeysImpl();
        (mediaKeys as { setServerCertificate?: unknown }).setServerCertificate =
          undefined;
        return Promise.resolve(mediaKeys);
      },
    );
    mockSetMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      return Promise.resolve();
    });
    const mockCreateSession = vi.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = vi.spyOn(
      MediaKeysImpl.prototype,
      "setServerCertificate",
    );
    const { ContentDecryptorState } = (await vi.importActual("../../types")) as any;
    const ContentDecryptor = ((await vi.importActual("../../content_decryptor")) as any)
      .default;
    const getEmeApiImplementation = (await import("../../../../compat/eme")).default;
    const eme = getEmeApiImplementation("auto");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state: any) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        setTimeout(() => {
          expect(mockSetMediaKeys).not.toHaveBeenCalled();
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
        contentDecryptor.dispose();
        expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
        expect(mockSetServerCertificate).not.toHaveBeenCalled();
        expect(mockCreateSession).toHaveBeenCalledTimes(1);
        res();
      }, 10);
    });
  });
});
