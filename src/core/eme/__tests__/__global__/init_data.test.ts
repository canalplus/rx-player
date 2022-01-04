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
/* eslint-disable @typescript-eslint/no-var-requires */
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

describe("core - eme - global tests - init data", () => {
  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  const getLicenseSpy = jest.fn(() => {
    return new Promise(() => { /* noop */ });
  });

  /** Default keySystems configuration used in our tests. */
  const ksConfig = [{ type: "com.widevine.alpha", getLicense: getLicenseSpy }];

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    getLicenseSpy.mockReset();
  });

  /* eslint-disable max-len */
  it("should create a session and generate a request when init data is sent through the arguments", () => {
  /* eslint-enable max-len */
    return new Promise<void>((res, rej) => {
      // == mocks ==
      const { generateKeyRequestSpy } = mockCompat();
      const mediaKeySession = new MediaKeySessionImpl();
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(createSessionSpy).toHaveBeenCalledTimes(1);
          expect(createSessionSpy).toHaveBeenCalledWith("temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(1);
          expect(generateKeyRequestSpy)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(getLicenseSpy).toHaveBeenCalledTimes(1);
          expect(getLicenseSpy).toHaveBeenCalledWith(
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
      const { generateKeyRequestSpy } = mockCompat();
      const mediaKeySession = new MediaKeySessionImpl();
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(createSessionSpy).toHaveBeenCalledTimes(1);
          expect(createSessionSpy).toHaveBeenCalledWith("temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(1);
          expect(generateKeyRequestSpy)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(getLicenseSpy).toHaveBeenCalledTimes(1);
          expect(getLicenseSpy).toHaveBeenCalledWith(
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
      const { generateKeyRequestSpy } = mockCompat();
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initDatas = [ new Uint8Array([54, 55, 75]),
                          new Uint8Array([87, 32]),
                          new Uint8Array([87, 77]) ];

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(createSessionSpy).toHaveBeenCalledTimes(3);
          expect(createSessionSpy).toHaveBeenNthCalledWith(1, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(2, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(3, "temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(3);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initDatas[0]);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc", initDatas[1]);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(3, mediaKeySessions[2], "cenc", initDatas[2]);
          expect(getLicenseSpy).toHaveBeenCalledTimes(3);
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
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
      const { generateKeyRequestSpy } = mockCompat();
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(createSessionSpy).toHaveBeenCalledTimes(2);
          expect(createSessionSpy).toHaveBeenNthCalledWith(1, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(2, "temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(2);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initData);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc2", initData);
          expect(getLicenseSpy).toHaveBeenCalledTimes(2);
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
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
      const { generateKeyRequestSpy, eventTriggers, getInitDataSpy } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySession = new MediaKeySessionImpl();
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(getInitDataSpy).toHaveBeenCalledTimes(1);
          expect(getInitDataSpy).toHaveBeenCalledWith(initDataEvent);
          expect(createSessionSpy).toHaveBeenCalledTimes(1);
          expect(createSessionSpy).toHaveBeenCalledWith("temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(1);
          expect(generateKeyRequestSpy)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(getLicenseSpy).toHaveBeenCalledTimes(1);
          expect(getLicenseSpy).toHaveBeenCalledWith(
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
      const { generateKeyRequestSpy, eventTriggers, getInitDataSpy } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySession = new MediaKeySessionImpl();
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockReturnValue(mediaKeySession);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(getInitDataSpy).toHaveBeenCalledTimes(3);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(1,
                                                         initDataEvent);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(2,
                                                         initDataEvent);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(3,
                                                         initDataEvent);
          expect(createSessionSpy).toHaveBeenCalledTimes(1);
          expect(createSessionSpy).toHaveBeenCalledWith("temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(1);
          expect(generateKeyRequestSpy)
            .toHaveBeenCalledWith(mediaKeySession, "cenc", initData);
          expect(getLicenseSpy).toHaveBeenCalledTimes(1);
          expect(getLicenseSpy).toHaveBeenCalledWith(
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
      const { generateKeyRequestSpy, eventTriggers, getInitDataSpy } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
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
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(getInitDataSpy).toHaveBeenCalledTimes(5);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(1,
                                                         initDataEvents[0]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(2,
                                                         initDataEvents[1]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(3,
                                                         initDataEvents[0]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(4,
                                                         initDataEvents[2]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(5,
                                                         initDataEvents[1]);
          expect(createSessionSpy).toHaveBeenCalledTimes(3);
          expect(createSessionSpy).toHaveBeenNthCalledWith(1, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(2, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(3, "temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(3);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initDatas[0]);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc", initDatas[1]);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(3, mediaKeySessions[2], "cenc", initDatas[2]);
          expect(getLicenseSpy).toHaveBeenCalledTimes(3);
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
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
      const { generateKeyRequestSpy, eventTriggers, getInitDataSpy } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
        .mockImplementation(() => mediaKeySessions[createSessionCallIdx++]);

      // == vars ==
      const initData = new Uint8Array([54, 55, 75]);
      const initDataEvents = [ { type: "cenc",
                                 values: [ { systemId: "15", data: initData } ] },

                               { type: "cenc2",
                                 values: [ { systemId: "15", data: initData } ] } ];

      // == test ==
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(getInitDataSpy).toHaveBeenCalledTimes(2);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(1,
                                                         initDataEvents[0]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(2,
                                                         initDataEvents[1]);
          expect(createSessionSpy).toHaveBeenCalledTimes(2);
          expect(createSessionSpy).toHaveBeenNthCalledWith(1, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(2, "temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(2);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initData);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc2", initData);
          expect(getLicenseSpy).toHaveBeenCalledTimes(2);
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initData, "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
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
      const { generateKeyRequestSpy, eventTriggers, getInitDataSpy } = mockCompat();
      const { triggerEncrypted } = eventTriggers;
      const mediaKeySessions = [ new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl(),
                                 new MediaKeySessionImpl() ];
      let createSessionCallIdx = 0;
      const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession")
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
      const { ContentDecryptorState } = require("../../eme_manager");
      const ContentDecryptor = require("../../eme_manager").default;
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
          expect(getInitDataSpy).toHaveBeenCalledTimes(4);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(1,
                                                         initDataEvents[0]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(2,
                                                         initDataEvents[1]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(3,
                                                         initDataEvents[0]);
          expect(getInitDataSpy).toHaveBeenNthCalledWith(4,
                                                         initDataEvents[2]);
          expect(createSessionSpy).toHaveBeenCalledTimes(3);
          expect(createSessionSpy).toHaveBeenNthCalledWith(1, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(2, "temporary");
          expect(createSessionSpy).toHaveBeenNthCalledWith(3, "temporary");
          expect(generateKeyRequestSpy).toHaveBeenCalledTimes(3);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(1, mediaKeySessions[0], "cenc", initDatas[0]);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(2, mediaKeySessions[1], "cenc", initDatas[1]);
          expect(generateKeyRequestSpy)
            .toHaveBeenNthCalledWith(3, mediaKeySessions[2], "cenc", initDatas[2]);
          expect(getLicenseSpy).toHaveBeenCalledTimes(3);
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            1,
            formatFakeChallengeFromInitData(initDatas[0], "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
            2,
            formatFakeChallengeFromInitData(initDatas[1], "cenc"),
            "license-request"
          );
          expect(getLicenseSpy).toHaveBeenNthCalledWith(
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
