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
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-properties */

import {
  EMPTY,
  of as observableOf,
  Subject,
  // throwError as observableThrow,
} from "rxjs";
import {
  take,
  takeUntil,
} from "rxjs/operators";
import {
  MediaKeysImpl,
  MediaKeySystemAccessImpl,
  mockCompat,
  testEMEManagerImmediateError,
} from "./utils";

describe("core - eme - global tests - media key system access", () => {
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
      return observableOf({ keySystem,
                            getConfiguration() { return conf; },
                            createMediaKeys() { throw new Error("No non no"); } });
    }
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessBadMediaKeys });

    // == test ==
    const EMEManager = require("../../eme_manager").default;
    const error : any =
      await testEMEManagerImmediateError(EMEManager, videoElt, ksConfig, EMPTY);
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
      return observableOf({
        keySystem,
        getConfiguration: () => conf,
        createMediaKeys: () => Promise.reject(new Error("No non no")),
      });
    }
    mockCompat({ requestMediaKeySystemAccess: requestMediaKeySystemAccessRejMediaKeys });

    // == test ==
    const EMEManager = require("../../eme_manager").default;
    const error : any =
      await testEMEManagerImmediateError(EMEManager, videoElt, ksConfig, EMPTY);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      "EncryptedMediaError (CREATE_MEDIA_KEYS_ERROR) No non no"
    );
    expect(error.name).toEqual("EncryptedMediaError");
    expect(error.code).toEqual("CREATE_MEDIA_KEYS_ERROR");
  });

  /* eslint-disable max-len */
  it("should emit a created-media-keys event if createMediaKeys resolves", (done) => {
  /* eslint-enable max-len */
    mockCompat({});
    const EMEManager = require("../../eme_manager").default;
    const kill$ = new Subject<void>();
    EMEManager(videoElt, ksConfig, EMPTY)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        expect(evt.type).toEqual("created-media-keys");
        kill$.next();
        done();
      });
  });

  /* eslint-disable max-len */
  it("should not create any session until if no encrypted event was received", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    const setMediaKeysSpy = jest.fn(() => EMPTY);
    mockCompat({ setMediaKeys: setMediaKeysSpy });
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");

    // == test ==
    let eventsReceived = 0;
    const kill$ = new Subject<void>();
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfig, EMPTY)
      .pipe(takeUntil(kill$), take(1))
      .subscribe((evt : any) => {
        eventsReceived++;
        expect(evt.type).toEqual("created-media-keys");
        evt.value.attachMediaKeys$.next();
        setTimeout(() => {
          expect(eventsReceived).toEqual(1);
          expect(setMediaKeysSpy).toHaveBeenCalledTimes(1);
          expect(setMediaKeysSpy).toHaveBeenCalledWith(videoElt, new MediaKeysImpl());
          expect(createSessionSpy).not.toHaveBeenCalled();
          done();
        }, 10);
      });
  });

  /* eslint-disable max-len */
  it("should emit \"attached-media-keys\" event when the MediaKeys is attached", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    const setMediaKeysSpy = jest.fn(() => observableOf(null));
    mockCompat({ setMediaKeys: setMediaKeysSpy });

    // == test ==
    let eventsReceived = 0;
    const kill$ = new Subject<void>();
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfig, EMPTY)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            kill$.next();
            expect(setMediaKeysSpy).toHaveBeenCalledTimes(1);
            expect(setMediaKeysSpy).toHaveBeenCalledWith(videoElt, new MediaKeysImpl());
            done();
            break;
          default:
            throw new Error("Unexpected event");
        }
      });
  });

  /* eslint-disable max-len */
  it("should not create any session until if no encrypted event was received", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    const setMediaKeysSpy = jest.fn(() => observableOf(null));
    mockCompat({ setMediaKeys: setMediaKeysSpy });
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");

    // == test ==
    let eventsReceived = 0;
    const kill$ = new Subject<void>();
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfig, EMPTY)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            setTimeout(() => {
              kill$.next();
              expect(createSessionSpy).not.toHaveBeenCalled();
              done();
            }, 10);
            break;
          default:
            throw new Error("Unexpected event");
        }
      });
  });

  /* eslint-disable max-len */
  it("should not attach the MediaKeys but still emit the \"attached-media-keys\" event if already attached", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    const mediaElement = document.createElement("video");
    const defaultMediaKeys = new MediaKeysImpl();
    const setMediaKeysSpy = jest.fn(() => observableOf(null));
    mockCompat({ setMediaKeys: setMediaKeysSpy });
    jest.spyOn(MediaKeySystemAccessImpl.prototype, "createMediaKeys")
      .mockReturnValue(Promise.resolve(defaultMediaKeys));
    Object.defineProperty(mediaElement, "mediaKeys", {
      get: jest.fn(() => defaultMediaKeys),
      set: jest.fn(() => { throw new Error("Should not set MediaKeys manually."); }),
    });
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");

    // == test ==
    let eventsReceived = 0;
    const kill$ = new Subject<void>();
    const EMEManager = require("../../eme_manager").default;
    EMEManager(mediaElement, ksConfig, new Subject())
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            setTimeout(() => {
              kill$.next();
              expect(setMediaKeysSpy).not.toHaveBeenCalled();
              expect(createSessionSpy).not.toHaveBeenCalled();
              done();
            }, 10);
            break;
          default:
            throw new Error("Unexpected event");
        }
      });
  });
});
