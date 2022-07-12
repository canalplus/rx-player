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
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  formatFakeChallengeFromInitData,
  MediaKeySessionImpl,
  MediaKeysImpl,
  // MediaKeySystemAccessImpl,
  mockCompat,
  // testContentDecryptorError,
} from "./utils";

describe("core - decrypt - global tests - init data", () => {
  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  const mockGetLicense = jest.fn(() => {
    return new Promise(() => { /* noop */ });
  });

  /** Default keySystems configuration used in our tests. */
  const ksConfig = [{ type: "com.widevine.alpha", getLicense: mockGetLicense }];

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    mockGetLicense.mockReset();
  });

  /* eslint-disable max-len */
  it("should create a session and generate a request when init data is sent through the arguments", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest } = mockCompat();
      const mediaKeySession = new MediaKeySessionImpl();
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initData } ],
      });
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mockGenerateKeyRequest)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should ignore init data already sent through the argument", () => {
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest } = mockCompat();
      const mediaKeySession = new MediaKeySessionImpl();
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initData } ],
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initData } ],
      });
      setTimeout(() => {
        contentDecryptor.onInitializationData({
          type: "cenc",
          values: [ { systemId: "15", data: initData } ],
        });
      }, 5);
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mockGenerateKeyRequest)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });

  });

  /* eslint-disable max-len */
  it("should create multiple sessions for multiple sent init data when unknown", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest } = mockCompat();
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initDatas = [ new Uint8Array([54, 55, 75]),
                          new Uint8Array([87, 32]),
                          new Uint8Array([87, 77]) ];

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initDatas[0] } ],
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initDatas[1] } ],
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initDatas[0] } ],
      });
      setTimeout(() => {
        contentDecryptor.onInitializationData({
          type: "cenc",
          values: [ { systemId: "15", data: initDatas[2] } ],
        });
      });
      setTimeout(() => {
        contentDecryptor.onInitializationData({
          type: "cenc",
          values: [ { systemId: "15", data: initDatas[1] } ],
        });
      }, 5);
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(3);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(3, "temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(3);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initDatas[0]);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc", initDatas[1]);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(3, mediaKeySessions[2], "cenc", initDatas[2]);
          expect(mockGetLicense).toHaveBeenCalledTimes(3);
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            3,
            formatFakeChallengeFromInitData(initDatas[2], "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  /* eslint-disable max-len */
  it("should create multiple sessions for multiple sent init data types", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest } = mockCompat();
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      contentDecryptor.onInitializationData({
        type: "cenc",
        values: [ { systemId: "15", data: initData } ],
      });
      contentDecryptor.onInitializationData({
        type: "cenc2",
        values: [ { systemId: "15", data: initData } ],
      });
      setTimeout(() => {
        try {
          expect(mockCreateSession).toHaveBeenCalledTimes(2);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(2);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initData);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc2", initData);
          expect(mockGetLicense).toHaveBeenCalledTimes(2);
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initData, "cenc2"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  /* eslint-disable max-len */
  it("should create a session and generate a request when init data is received from the browser", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest, eventTriggers, mockGetInitData } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySession = new MediaKeySessionImpl();
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      const initDataEvent = {
        type: "cenc",
        values: [ { systemId: "15", data: initData } ],
      };
      triggerEncrypted.next(initDataEvent);
      setTimeout(() => {
        try {
          expect(mockGetInitData).toHaveBeenCalledTimes(1);
          expect(mockGetInitData).toHaveBeenCalledWith(initDataEvent);
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mockGenerateKeyRequest)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  it("should ignore init data already received through the browser", () => {
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest, eventTriggers, mockGetInitData } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySession = new MediaKeySessionImpl();
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      const initDataEvent = {
        type: "cenc",
        values: [ { systemId: "15", data: initData } ],
      };
      triggerEncrypted.next(initDataEvent);
      triggerEncrypted.next(initDataEvent);
      setTimeout(() => {
        triggerEncrypted.next(initDataEvent);
      }, 5);
      setTimeout(() => {
        try {
          expect(mockGetInitData).toHaveBeenCalledTimes(3);
          expect(mockGetInitData).toHaveBeenNthCalledWith(1,
                                                          initDataEvent);
          expect(mockGetInitData).toHaveBeenNthCalledWith(2,
                                                          initDataEvent);
          expect(mockGetInitData).toHaveBeenNthCalledWith(3,
                                                          initDataEvent);
          expect(mockCreateSession).toHaveBeenCalledTimes(1);
          expect(mockCreateSession).toHaveBeenCalledWith("temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(1);
          expect(mockGenerateKeyRequest)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(mockGetLicense).toHaveBeenCalledTimes(1);
          expect(mockGetLicense).toHaveBeenCalledWith(
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  /* eslint-disable max-len */
  it("should create multiple sessions for multiple received init data when unknown", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest, eventTriggers, mockGetInitData } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initDatas = [ new Uint8Array([54, 55, 75]),
                          new Uint8Array([87, 32]),
                          new Uint8Array([87, 77]) ];
      const initDataEvents = [ { type: "cenc",
                                 values: [ { systemId: "15", data: initDatas[0] } ] },

                               { type: "cenc",
                                 values: [ { systemId: "15", data: initDatas[1] } ] },

                               { type: "cenc",
                                 values: [ { systemId: "15", data: initDatas[2] } ] } ];

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      triggerEncrypted.next(initDataEvents[0]);
      triggerEncrypted.next(initDataEvents[1]);
      triggerEncrypted.next(initDataEvents[0]);
      setTimeout(() => {
        triggerEncrypted.next(initDataEvents[2]);
      });
      setTimeout(() => {
        triggerEncrypted.next(initDataEvents[1]);
      }, 5);
      setTimeout(() => {
        try {
          expect(mockGetInitData).toHaveBeenCalledTimes(5);
          expect(mockGetInitData).toHaveBeenNthCalledWith(1,
                                                          initDataEvents[0]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(2,
                                                          initDataEvents[1]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(3,
                                                          initDataEvents[0]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(4,
                                                          initDataEvents[2]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(5,
                                                          initDataEvents[1]);
          expect(mockCreateSession).toHaveBeenCalledTimes(3);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(3, "temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(3);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initDatas[0]);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc", initDatas[1]);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(3, mediaKeySessions[2], "cenc", initDatas[2]);
          expect(mockGetLicense).toHaveBeenCalledTimes(3);
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            3,
            formatFakeChallengeFromInitData(initDatas[2], "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  /* eslint-disable max-len */
  it("should create multiple sessions for multiple received init data types", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest, eventTriggers, mockGetInitData } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);
      const initDataEvents = [ { type: "cenc",
                                 values: [ { systemId: "15", data: initData } ] },

                               { type: "cenc2",
                                 values: [ { systemId: "15", data: initData } ] } ];

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      triggerEncrypted.next(initDataEvents[0]);
      triggerEncrypted.next(initDataEvents[1]);
      setTimeout(() => {
        try {
          expect(mockGetInitData).toHaveBeenCalledTimes(2);
          expect(mockGetInitData).toHaveBeenNthCalledWith(1, initDataEvents[0]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(2, initDataEvents[1]);
          expect(mockCreateSession).toHaveBeenCalledTimes(2);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(2);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initData);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc2", initData);
          expect(mockGetLicense).toHaveBeenCalledTimes(2);
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initData, "cenc2"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });

  // eslint-disable-next-line max-len
  it("should consider sent event through arguments and received events through the browser the same way", () => {
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { mockGenerateKeyRequest, eventTriggers, mockGetInitData } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const mockCreateSession = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initDatas = [ new Uint8Array([54, 55, 75]),
                          new Uint8Array([87, 32]),
                          new Uint8Array([87, 77]) ];
      const initDataEvents = [ { type: "cenc",
                                 values: [ { systemId: "15", data: initDatas[0] } ] },

                               { type: "cenc",
                                 values: [ { systemId: "15", data: initDatas[1] } ] },

                               { type: "cenc",
                                 values: [ { systemId: "15", data: initDatas[2] } ] } ];

      // == test ==
      const { ContentDecryptorState } = jest.requireActual("../../content_decryptor");
      const ContentDecryptor = jest.requireActual("../../content_decryptor").default;
      const contentDecryptor = new ContentDecryptor(videoElt, ksConfig);
      contentDecryptor.addEventListener("stateChange", (newState: any) => {
        if (newState !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${newState}`));
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
      });
      triggerEncrypted.next(initDataEvents[0]);
      contentDecryptor.onInitializationData(initDataEvents[1]);
      triggerEncrypted.next(initDataEvents[1]);
      triggerEncrypted.next(initDataEvents[0]);
      setTimeout(() => {
        contentDecryptor.onInitializationData(initDataEvents[0]);
        triggerEncrypted.next(initDataEvents[2]);
      });
      setTimeout(() => {
        try {
          expect(mockGetInitData).toHaveBeenCalledTimes(4);
          expect(mockGetInitData).toHaveBeenNthCalledWith(1,
                                                          initDataEvents[0]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(2,
                                                          initDataEvents[1]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(3,
                                                          initDataEvents[0]);
          expect(mockGetInitData).toHaveBeenNthCalledWith(4,
                                                          initDataEvents[2]);
          expect(mockCreateSession).toHaveBeenCalledTimes(3);
          expect(mockCreateSession).toHaveBeenNthCalledWith(1, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(2, "temporary");
          expect(mockCreateSession).toHaveBeenNthCalledWith(3, "temporary");
          expect(mockGenerateKeyRequest).toHaveBeenCalledTimes(3);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initDatas[0]);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc", initDatas[1]);
          expect(mockGenerateKeyRequest)
            .toHaveBeenNthCalledWith(3, mediaKeySessions[2], "cenc", initDatas[2]);
          expect(mockGetLicense).toHaveBeenCalledTimes(3);
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request"
          );
          expect(mockGetLicense).toHaveBeenNthCalledWith(
            3,
            formatFakeChallengeFromInitData(initDatas[2], "cenc"),
            "license-request"
          );
          res();
        } catch (err) {
          rej(err);
        }
      }, 100);
    });
  });
});
