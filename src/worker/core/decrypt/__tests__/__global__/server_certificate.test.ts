/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import {
  MediaKeysImpl,
  MediaKeySystemAccessImpl,
  mockCompat,
} from "./utils";

describe("core - decrypt - global tests - server certificate", () => {

  const mockGetLicense = jest.fn(() => {
    return new Promise(() => { /* noop */ });
  });

  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  const serverCertificate = [1, 2, 3];

  /** Default keySystems configuration used in our tests. */
  const ksConfigCert = [{ type: "com.widevine.alpha",
                          getLicense: mockGetLicense,
                          serverCertificate }];

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("should set the serverCertificate only after the MediaKeys is attached", (done) => {
    const { mockSetMediaKeys } = mockCompat();
    mockSetMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
    });
    const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).not.toHaveBeenCalled();
          return Promise.resolve(true);
        });

    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfigCert);

    contentDecryptor.addEventListener("stateChange", (state: any) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        setTimeout(() => {
          expect(mockSetMediaKeys).not.toHaveBeenCalled();
          expect(mockCreateSession).not.toHaveBeenCalled();
          expect(mockSetServerCertificate).not.toHaveBeenCalled();
          contentDecryptor.attach();
        }, 5);
      }
    });
    setTimeout(() => {
      contentDecryptor.dispose();
      expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
      expect(mockCreateSession).not.toHaveBeenCalled();
      done();
    }, 10);
  });

  it("should not call serverCertificate multiple times on init data", (done) => {
    const { mockSetMediaKeys } = mockCompat();
    mockSetMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
    });
    const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).not.toHaveBeenCalled();
          return Promise.resolve(true);
        });

    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfigCert);

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
            values: [ { systemId: "15", data: initData } ],
          });
          contentDecryptor.attach();
        }, 5);
      }
    });
    setTimeout(() => {
      contentDecryptor.dispose();
      expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
      done();
    }, 10);
  });

  /* eslint-disable max-len */
  it("should emit warning if serverCertificate call rejects but still continue", (done) => {
  /* eslint-enable max-len */

    const { mockSetMediaKeys } = mockCompat();
    const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          throw new Error("some error");
        });

    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfigCert);

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
    setTimeout(() => {
      contentDecryptor.dispose();
      expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(warningsReceived).toEqual(1);
      done();
    }, 10);
  });

  /* eslint-disable max-len */
  it("should emit warning if serverCertificate call throws but still continue", (done) => {
  /* eslint-enable max-len */

    const { mockSetMediaKeys } = mockCompat();
    const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          return Promise.reject(new Error("some error"));
        });

    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfigCert);

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
    setTimeout(() => {
      contentDecryptor.dispose();
      expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockSetServerCertificate).toHaveBeenCalledTimes(1);
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(warningsReceived).toEqual(1);
      done();
    }, 10);
  });

  /* eslint-disable max-len */
  it("should just continue if setServerCertificate is undefined", (done) => {
  /* eslint-enable max-len */
    const { mockSetMediaKeys } = mockCompat();
    jest.spyOn(MediaKeySystemAccessImpl.prototype, "createMediaKeys")
      .mockImplementation(() => {
        const mediaKeys = new MediaKeysImpl();
        (mediaKeys as { setServerCertificate? : unknown })
          .setServerCertificate = undefined;
        return Promise.resolve(mediaKeys);
      });
    mockSetMediaKeys.mockImplementation(() => {
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
    });
    const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const mockSetServerCertificate = jest.spyOn(MediaKeysImpl.prototype,
                                                "setServerCertificate");
    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfigCert);

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
            values: [ { systemId: "15", data: initData } ],
          });

          contentDecryptor.attach();
        }, 5);
      }
    });
    setTimeout(() => {
      contentDecryptor.dispose();
      expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
      expect(mockSetServerCertificate).not.toHaveBeenCalled();
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
      done();
    }, 10);
  });
});
