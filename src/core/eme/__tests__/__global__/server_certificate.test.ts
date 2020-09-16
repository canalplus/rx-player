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

/* tslint:disable no-unsafe-any */

import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { IContentProtection } from "../../types";
import {
  expectLicenseRequestMessage,
  MediaKeysImpl,
  MediaKeySystemAccessImpl,
  mockCompat,
} from "./utils";

/* tslint:disable no-unsafe-any */
describe("core - eme - global tests - server certificate", () => {

  const getLicenseSpy = jest.fn(() => {
    /* tslint:disable ban */
    return new Promise(() => { /* noop */ });
    /* tslint:enable ban */
  });

  /** Default video element used in our tests. */
  const videoElt = document.createElement("video");

  const serverCertificate = [1, 2, 3];

  /** Default keySystems configuration used in our tests. */
  const ksConfigCert = [{ type: "com.widevine.alpha",
                          getLicense: getLicenseSpy,
                          serverCertificate }];

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  /* tslint:disable max-line-length */
  it("should set the serverCertificate after receiving the first encrypted event", (done) => {
  /* tslint:enable max-line-length */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate : BufferSource) => {
        expect(createSessionSpy).not.toHaveBeenCalled();
        /* tslint:disable ban */
        return Promise.resolve(true);
        /* tslint:enable ban */
      });

    // == vars ==
    let eventsReceived = 0;
    const initDataSubject = new Subject<IContentProtection>();
    const initData = new Uint8Array([54, 55, 75]);
    const kill$ = new Subject();

    // == test ==
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfigCert, initDataSubject)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
            initDataSubject.next({ type: "cenc", data: initData });
            break;
          case 3:
            expectLicenseRequestMessage(evt, initData, "cenc");
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(serverCertificateSpy).toHaveBeenCalledWith(serverCertificate);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2", data: initData });
            }, 10);
            break;
          case 4:
            expectLicenseRequestMessage(evt, initData, "cenc2");
            setTimeout(() => {
              kill$.next();
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(createSessionSpy).toHaveBeenCalledTimes(2);
              done();
            }, 10);
            break;
          default:
            throw new Error(`Unexpected event: ${evt.type}`);
        }
      });
  });

  /* tslint:disable max-line-length */
  it("should emit warning if serverCertificate call rejects but still continue", (done) => {
  /* tslint:enable max-line-length */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate : BufferSource) => {
        expect(createSessionSpy).not.toHaveBeenCalled();
        /* tslint:disable ban */
        return Promise.reject("some error");
        /* tslint:enable ban */
      });

    // == vars ==
    let eventsReceived = 0;
    const initDataSubject = new Subject<IContentProtection>();
    const initData = new Uint8Array([54, 55, 75]);
    const kill$ = new Subject();

    // == test ==
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfigCert, initDataSubject)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
            initDataSubject.next({ type: "cenc", data: initData });
            break;
          case 3:
            expect(evt.type).toEqual("warning");
            expect(evt.value.name).toEqual("EncryptedMediaError");
            expect(evt.value.type).toEqual("ENCRYPTED_MEDIA_ERROR");
            expect(evt.value.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
            expect(evt.value.message)
              .toEqual("EncryptedMediaError (LICENSE_SERVER_CERTIFICATE_ERROR) `setServerCertificate` error");
            break;
          case 4:
            expectLicenseRequestMessage(evt, initData, "cenc");
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(serverCertificateSpy).toHaveBeenCalledWith(serverCertificate);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2", data: initData });
            }, 10);
            break;
          case 5:
            expectLicenseRequestMessage(evt, initData, "cenc2");
            setTimeout(() => {
              kill$.next();
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(createSessionSpy).toHaveBeenCalledTimes(2);
              done();
            }, 10);
            break;
          default:
            throw new Error(`Unexpected event: ${evt.type}`);
        }
      });
  });

  /* tslint:disable max-line-length */
  it("should emit warning if serverCertificate call throws but still continue", (done) => {
  /* tslint:enable max-line-length */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate : BufferSource) => {
        expect(createSessionSpy).not.toHaveBeenCalled();
        throw new Error("some error");
      });

    // == vars ==
    let eventsReceived = 0;
    const initDataSubject = new Subject<IContentProtection>();
    const initData = new Uint8Array([54, 55, 75]);
    const kill$ = new Subject();

    // == test ==
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfigCert, initDataSubject)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
            initDataSubject.next({ type: "cenc", data: initData });
            break;
          case 3:
            expect(evt.type).toEqual("warning");
            expect(evt.value.name).toEqual("EncryptedMediaError");
            expect(evt.value.type).toEqual("ENCRYPTED_MEDIA_ERROR");
            expect(evt.value.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
            expect(evt.value.message)
              .toEqual("EncryptedMediaError (LICENSE_SERVER_CERTIFICATE_ERROR) Error: some error");
            break;
          case 4:
            expectLicenseRequestMessage(evt, initData, "cenc");
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(serverCertificateSpy).toHaveBeenCalledWith(serverCertificate);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2", data: initData });
            }, 10);
            break;
          case 5:
            expectLicenseRequestMessage(evt, initData, "cenc2");
            setTimeout(() => {
              kill$.next();
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(createSessionSpy).toHaveBeenCalledTimes(2);
              done();
            }, 10);
            break;
          default:
            throw new Error(`Unexpected event: ${evt.type}`);
        }
      });
  });

  /* tslint:disable max-line-length */
  it("should just continue if serverCertificate is undefined", (done) => {
  /* tslint:enable max-line-length */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    jest.spyOn(MediaKeySystemAccessImpl.prototype, "createMediaKeys")
      .mockImplementation(() => {
        const mediaKeys = new MediaKeysImpl();
        (mediaKeys as any).setServerCertificate = undefined;
        /* tslint:disable ban */
        return Promise.resolve(mediaKeys);
        /* tslint:enable ban */
      });
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
      .mockImplementation((_serverCertificate : BufferSource) => {
        expect(createSessionSpy).not.toHaveBeenCalled();
        /* tslint:disable ban */
        return Promise.resolve(true);
        /* tslint:enable ban */
      });

    // == vars ==
    let eventsReceived = 0;
    const initDataSubject = new Subject<IContentProtection>();
    const initData = new Uint8Array([54, 55, 75]);
    const kill$ = new Subject();

    // == test ==
    const EMEManager = require("../../eme_manager").default;
    EMEManager(videoElt, ksConfigCert, initDataSubject)
      .pipe(takeUntil(kill$))
      .subscribe((evt : any) => {
        switch (++eventsReceived) {
          case 1:
            expect(evt.type).toEqual("created-media-keys");
            evt.value.attachMediaKeys$.next();
            break;
          case 2:
            expect(evt.type).toEqual("attached-media-keys");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
            initDataSubject.next({ type: "cenc", data: initData });
            break;
          case 3:
            expectLicenseRequestMessage(evt, initData, "cenc");
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2", data: initData });
            }, 10);
            break;
          case 4:
            expectLicenseRequestMessage(evt, initData, "cenc2");
            setTimeout(() => {
              kill$.next();
              expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
              expect(createSessionSpy).toHaveBeenCalledTimes(2);
              done();
            }, 10);
            break;
          default:
            throw new Error(`Unexpected event: ${evt.type}`);
        }
      });
  });
});
