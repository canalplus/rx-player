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
/* eslint-disable no-restricted-properties */
/* eslint-disable @typescript-eslint/restrict-template-expressions */


import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { IContentProtection } from "../../types";
import {
  expectLicenseRequestMessage,
  MediaKeysImpl,
  MediaKeySystemAccessImpl,
  mockCompat,
} from "./utils";

describe("core - eme - global tests - server certificate", () => {

  const getLicenseSpy = jest.fn(() => {
    return new Promise(() => { /* noop */ });
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

  /* eslint-disable max-len */
  it.only("should set the serverCertificate only after the MediaKeys is attached", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          expect(createSessionSpy).not.toHaveBeenCalled();
          return Promise.resolve(true);
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
            expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
            expect(serverCertificateSpy).toHaveBeenCalledWith(serverCertificate);
            initDataSubject.next({ type: "cenc",
                                   values: [ { systemId: "15", data: initData } ] });
            break;
          case 3:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2",
                                     values: [ { systemId: "15", data: initData } ] });
            }, 10);
            break;
          case 4:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc2",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
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

  /* eslint-disable max-len */
  it("should emit warning if serverCertificate call rejects but still continue", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          expect(createSessionSpy).not.toHaveBeenCalled();
          return Promise.reject("some error");
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
            expect(evt.type).toEqual("warning");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
            expect(serverCertificateSpy).toHaveBeenCalledWith(serverCertificate);
            expect(evt.value.name).toEqual("EncryptedMediaError");
            expect(evt.value.type).toEqual("ENCRYPTED_MEDIA_ERROR");
            expect(evt.value.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
            expect(evt.value.message)
              .toEqual(
                "EncryptedMediaError (LICENSE_SERVER_CERTIFICATE_ERROR) " +
                "`setServerCertificate` error");
            break;
          case 3:
            expect(evt.type).toEqual("attached-media-keys");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
            initDataSubject.next({ type: "cenc",
                                   values: [ { systemId: "15", data: initData } ] });
            break;
          case 4:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2",
                                     values: [ { systemId: "15", data: initData } ] });
            }, 10);
            break;
          case 5:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc2",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
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

  /* eslint-disable max-len */
  it("should emit warning if serverCertificate call throws but still continue", (done) => {
  /* eslint-enable max-len */

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
            expect(evt.type).toEqual("warning");
            expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
            expect(serverCertificateSpy).toHaveBeenCalledWith(serverCertificate);
            expect(evt.value.name).toEqual("EncryptedMediaError");
            expect(evt.value.type).toEqual("ENCRYPTED_MEDIA_ERROR");
            expect(evt.value.code).toEqual("LICENSE_SERVER_CERTIFICATE_ERROR");
            expect(evt.value.message)
              .toEqual(
                "EncryptedMediaError (LICENSE_SERVER_CERTIFICATE_ERROR) Error: some error"
              );
            break;
          case 3:
            expect(evt.type).toEqual("attached-media-keys");
            expect(createSessionSpy).not.toHaveBeenCalled();
            expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
            initDataSubject.next({ type: "cenc",
                                   values: [ { systemId: "15", data: initData } ] });
            break;
          case 4:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2",
                                     values: [ { systemId: "15", data: initData } ] });
            }, 10);
            break;
          case 5:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc2",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
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

  /* eslint-disable max-len */
  it("should just continue if serverCertificate is undefined", (done) => {
  /* eslint-enable max-len */

    // == mocks ==
    mockCompat();
    const createSessionSpy = jest.spyOn(MediaKeysImpl.prototype, "createSession");
    jest.spyOn(MediaKeySystemAccessImpl.prototype, "createMediaKeys")
      .mockImplementation(() => {
        const mediaKeys = new MediaKeysImpl();
        (mediaKeys as any).setServerCertificate = undefined;
        return Promise.resolve(mediaKeys);
      });
    const serverCertificateSpy =
      jest.spyOn(MediaKeysImpl.prototype, "setServerCertificate")
        .mockImplementation((_serverCertificate : BufferSource) => {
          expect(createSessionSpy).not.toHaveBeenCalled();
          return Promise.resolve(true);
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
            initDataSubject.next({ type: "cenc",
                                   values: [ { systemId: "15", data: initData } ] });
            break;
          case 3:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
            setTimeout(() => {
              expect(serverCertificateSpy).toHaveBeenCalledTimes(0);
              expect(createSessionSpy).toHaveBeenCalledTimes(1);
              initDataSubject.next({ type: "cenc2",
                                     values: [ { systemId: "15", data: initData } ] });
            }, 10);
            break;
          case 4:
            expectLicenseRequestMessage(evt,
                                        { type: "cenc2",
                                          values: [ { systemId: "15",
                                                      data: initData } ] });
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
