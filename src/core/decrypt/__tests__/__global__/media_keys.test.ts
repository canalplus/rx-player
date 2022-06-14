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

import {
  MediaKeysImpl,
  mockCompat,
  testContentDecryptorError,
} from "./utils";

describe("core - decrypt - global tests - media key system access", () => {
  /** Used to implement every functions that should never be called. */
  const neverCalledFn = jest.fn();

  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  /** Default keySystems configuration used in our tests. */
  const ksConfig = [{ type: "com.widevine.alpha", getLicense: neverCalledFn }];

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.mock("../../set_server_certificate", () => ({ __esModule: true as const,
                                                       default: neverCalledFn }));
  });

  afterEach(() => {
    expect(neverCalledFn).not.toHaveBeenCalled();
  });

  it("should throw if createMediaKeys throws", async () => {
    // == mocks ==
    function requestMediaKeySystemAccessBadMediaKeys(
      keySystem : string,
      conf : MediaKeySystemConfiguration[]
    ) {
      return Promise.resolve({ keySystem,
                               getConfiguration() { return conf; },
                               createMediaKeys() { throw new Error("No non no"); } });
    }
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessBadMediaKeys });

    // == test ==
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const error : any =
      await testContentDecryptorError(ContentDecryptor, videoElt, ksConfig);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      "EncryptedMediaError (CREATE_MEDIA_KEYS_ERROR) No non no"
    );
    expect(error.name).toEqual("EncryptedMediaError");
    expect(error.code).toEqual("CREATE_MEDIA_KEYS_ERROR");
  });

  it("should throw if createMediaKeys rejects", async () => {
    // == mocks ==
    function requestMediaKeySystemAccessRejMediaKeys(
      keySystem : string,
      conf : MediaKeySystemConfiguration[]
    ) {
      return Promise.resolve({
        keySystem,
        getConfiguration: () => conf,
        createMediaKeys: () => Promise.reject(new Error("No non no")),
      });
    }
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessRejMediaKeys });

    // == test ==
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const error : any =
      await testContentDecryptorError(ContentDecryptor, videoElt, ksConfig);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      "EncryptedMediaError (CREATE_MEDIA_KEYS_ERROR) No non no"
    );
    expect(error.name).toEqual("EncryptedMediaError");
    expect(error.code).toEqual("CREATE_MEDIA_KEYS_ERROR");
  });

  /* eslint-disable max-len */
  it("should go into the WaitingForAttachment state if createMediaKeys resolves", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      mockCompat({});
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      let receivedStateChange = 0;
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        receivedStateChange++;
        try {
          expect(newState).toEqual(ContentDecryptorState.WaitingForAttachment);
        } catch (err) { rej(err); }
        setTimeout(() => {
          try {
            expect(receivedStateChange).toEqual(1);
            expect(contentDecryptor.getState())
              .toEqual(ContentDecryptorState.WaitingForAttachment);
            contentDecryptor.dispose();
          } catch (err) { rej(err); }
          res();
        });
      });
    });
  });

  /* eslint-disable max-len */
  it("should not create any session if no encrypted event was received", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    const mockSetMediaKeys = jest.fn(() => Promise.resolve());
    mockCompat({ setMediaKeys: mockSetMediaKeys });
    const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession");

    // == test ==
    const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
    const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
    const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
    contentDecryptor.addEventListener("stateChange", (newState: any) => {
      if (newState === ContentDecryptorState.WaitingForAttachment) {
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
        setTimeout(() => {
          expect(mockSetMediaKeys).toHaveBeenCalledTimes(1);
          expect(mockSetMediaKeys).toHaveBeenCalledWith(videoElt, new MediaKeysImpl());
          expect(mockCreateSession).not.toHaveBeenCalled();
          done();
        }, 5);
      }
    });
  });
});
