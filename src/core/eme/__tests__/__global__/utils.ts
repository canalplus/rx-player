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

import {
  defer as observableDefer,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import { IEncryptedEventData } from "../../../../compat/eme";
import {
  base64ToBytes,
  bytesToBase64,
} from "../../../../utils/base64";
import castToObservable from "../../../../utils/cast_to_observable";
import EventEmitter, { fromEvent } from "../../../../utils/event_emitter";
import flatMap from "../../../../utils/flat_map";
import {
  strToUtf8,
  utf8ToStr,
} from "../../../../utils/string_parsing";

/** Default MediaKeySystemAccess configuration used by the RxPlayer. */
export const defaultKSConfig = [{
  audioCapabilities: [ { contentType: "audio/mp4;codecs=\"mp4a.40.2\"",
                         robustness: undefined },
                       { contentType: "audio/webm;codecs=opus",
                         robustness: undefined } ],
  distinctiveIdentifier: "optional" as const,
  initDataTypes: ["cenc"] as const,
  persistentState: "optional" as const,
  sessionTypes: ["temporary"] as const,
  videoCapabilities: [ { contentType: "video/mp4;codecs=\"avc1.4d401e\"",
                         robustness: undefined },
                       { contentType: "video/mp4;codecs=\"avc1.42e01e\"",
                         robustness: undefined },
                       { contentType: "video/webm;codecs=\"vp8\"",
                         robustness: undefined } ],
}];

/** Default Widevine MediaKeySystemAccess configuration used by the RxPlayer. */
export const defaultWidevineConfig = (() => {
  const ROBUSTNESSES = [ "HW_SECURE_ALL",
                         "HW_SECURE_DECODE",
                         "HW_SECURE_CRYPTO",
                         "SW_SECURE_DECODE",
                         "SW_SECURE_CRYPTO" ];
  const videoCapabilities = flatMap(ROBUSTNESSES, robustness => {
    return [{ contentType: "video/mp4;codecs=\"avc1.4d401e\"",
              robustness },
            { contentType: "video/mp4;codecs=\"avc1.42e01e\"",
              robustness },
            { contentType: "video/webm;codecs=\"vp8\"",
              robustness } ];
  });
  const audioCapabilities = flatMap(ROBUSTNESSES, robustness => {
    return [{ contentType: "audio/mp4;codecs=\"mp4a.40.2\"",
              robustness },
            { contentType: "audio/webm;codecs=opus",
              robustness } ];
  });
  return defaultKSConfig.map(conf => {
    return { ...conf,  audioCapabilities, videoCapabilities };
  });
})();

/**
 * Custom implementation of an EME-compliant MediaKeyStatusMap.
 * @class MediaKeyStatusMapImpl
 */
export class MediaKeyStatusMapImpl {
  public get size() : number {
    return this._map.size;
  }

  private _map : Map<ArrayBuffer, MediaKeyStatus>;
  constructor() {
    this._map = new Map();
  }

  public get(keyId: BufferSource): MediaKeyStatus | undefined {
    const keyIdAB = keyId instanceof ArrayBuffer ? keyId :
                                                   keyId.buffer;
    return this._map.get(keyIdAB);
  }

  public has(keyId: BufferSource): boolean {
    const keyIdAB = keyId instanceof ArrayBuffer ? keyId :
                                                   keyId.buffer;
    return this._map.has(keyIdAB);
  }

  public forEach(
    callbackfn: (
      value: MediaKeyStatus,
      key: BufferSource,
      parent: MediaKeyStatusMapImpl
    ) => void,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    thisArg?: any
  ): void {
    this._map.forEach((value, key) => callbackfn.bind(thisArg, value, key, this));
  }

  public _setKeyStatus(keyId : BufferSource, value : MediaKeyStatus | undefined) : void {
    const keyIdAB = keyId instanceof ArrayBuffer ? keyId :
                                                   keyId.buffer;
    if (value === undefined) {
      this._map.delete(keyIdAB);
    } else {
      this._map.set(keyIdAB, value);
    }
  }
}

/**
 * Custom implementation of an EME-compliant MediaKeySession.
 * @class MediaKeySessionImpl
 */
export class MediaKeySessionImpl extends EventEmitter<any> {
  public readonly closed : Promise<void>;
  public readonly expiration: number;
  public readonly keyStatuses : MediaKeyStatusMapImpl;
  public readonly sessionId: string;
  public onkeystatuseschange: ((this: MediaKeySessionImpl, ev: Event) => any) | null;
  public onmessage: ((this: MediaKeySessionImpl, ev: MediaKeyMessageEvent) => any) | null;

  private _currentKeyId : number;
  private _close? : () => void;
  constructor() {
    super();
    this._currentKeyId = 0;
    this.expiration = Number.MAX_VALUE;
    this.keyStatuses = new MediaKeyStatusMapImpl();

    this.closed = new Promise((res) => {
      this._close = res;
    });

    this.onkeystatuseschange = null;
    this.onmessage = null;
    this.sessionId = "";
  }

  public close() : Promise<void> {
    if (this._close !== undefined) {
      this._close();
    }
    return Promise.resolve();
  }

  public generateRequest(initDataType: string, initData: BufferSource) : Promise<void> {
    const msg = formatFakeChallengeFromInitData(initData, initDataType);
    const event : MediaKeyMessageEvent =
      Object.assign(new CustomEvent("message"),
                    { message: msg.buffer,
                      messageType: "license-request" as const });

    this.trigger("message", event);
    if (this.onmessage !== null && this.onmessage !== undefined) {
      this.onmessage(event);
    }
    return Promise.resolve();
  }

  public load(_sessionId: string): Promise<boolean> {
    throw new Error("Not implemented yet");
  }

  public remove(): Promise<void> {
    return Promise.resolve();
  }

  public update(_response: BufferSource): Promise<void> {
    this.keyStatuses._setKeyStatus(new Uint8Array([0, 1, 2, this._currentKeyId++]),
                                   "usable");
    const event = new CustomEvent("keystatuseschange");
    this.trigger("keyStatusesChange", event);
    if (this.onkeystatuseschange !== null && this.onkeystatuseschange !== undefined) {
      this.onkeystatuseschange(event);
    }
    return Promise.resolve();
  }
}

/**
 * Custom implementation of an EME-compliant MediaKeys.
 * @class MediaKeysImpl
 */
export class MediaKeysImpl {
  createSession(_sessionType? : MediaKeySessionType) : MediaKeySessionImpl {
    return new MediaKeySessionImpl();
  }

  setServerCertificate(_serverCertificate : BufferSource) : Promise<true> {
    return Promise.resolve(true);
  }
}

/**
 * Custom implementation of an EME-compliant MediaKeySystemAccess.
 * @class MediaKeySystemAccessImpl
 */
export class MediaKeySystemAccessImpl {
  public readonly keySystem : string;
  private readonly _config : MediaKeySystemConfiguration[];
  constructor(keySystem : string, config : MediaKeySystemConfiguration[]) {
    this.keySystem = keySystem;
    this._config = config;
  }
  createMediaKeys() : Promise<MediaKeysImpl> {
    return Promise.resolve(new MediaKeysImpl());
  }
  getConfiguration() : MediaKeySystemConfiguration[] {
    return this._config;
  }
}

export function requestMediaKeySystemAccessImpl(
  keySystem : string,
  config : MediaKeySystemConfiguration[]
) : Observable<MediaKeySystemAccessImpl> {
  return observableOf(new MediaKeySystemAccessImpl(keySystem, config));
}

/**
 * Mock functions coming from the compat directory.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function mockCompat(exportedFunctions = {}) {
  const triggerEncrypted = new Subject<IEncryptedEventData>();
  const triggerKeyMessage = new Subject();
  const triggerKeyError = new Subject();
  const triggerKeyStatusesChange = new Subject();
  const eventSpies : Record<string, jest.Mock> = {
    onEncrypted$: jest.fn(() => triggerEncrypted),
    onKeyMessage$: jest.fn((mediaKeySession : MediaKeySessionImpl) => {
      return fromEvent(mediaKeySession, "message");
    }),
    onKeyError$: jest.fn((mediaKeySession : MediaKeySessionImpl) => {
      return fromEvent(mediaKeySession, "error");
    }),
    onKeyStatusesChange$: jest.fn((mediaKeySession : MediaKeySessionImpl) => {
      return fromEvent(mediaKeySession, "keyStatusesChange");
    }),
  };

  const rmksaSpy = jest.fn(requestMediaKeySystemAccessImpl);
  const setMediaKeysSpy = jest.fn(() => observableOf(null));
  const generateKeyRequestSpy = jest.fn((
    mks : MediaKeySessionImpl,
    initializationDataType,
    initializationData
  ) => {
    return observableDefer(() => {
      return castToObservable(mks.generateRequest(initializationDataType,
                                                  initializationData));
    });
  });

  const getInitDataSpy = jest.fn((encryptedEvent : IEncryptedEventData) => {
    return encryptedEvent;
  });

  jest.mock("../../../../compat", () => (
    { events: eventSpies,
      requestMediaKeySystemAccess: rmksaSpy,
      setMediaKeys: setMediaKeysSpy,
      getInitData: getInitDataSpy,
      generateKeyRequest: generateKeyRequestSpy,
      ...exportedFunctions }));

  return { eventSpies,
           eventTriggers: { triggerEncrypted,
                            triggerKeyMessage,
                            triggerKeyError,
                            triggerKeyStatusesChange },
           requestMediaKeySystemAccessSpy: rmksaSpy,
           getInitDataSpy,
           setMediaKeysSpy,
           generateKeyRequestSpy };
}

/**
 * Check that the EMEManager, when called with those arguments, throws
 * directly without any event emitted.
 *
 * If that's the case, resolve with the corresponding error.
 * Else, reject.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @param {Observable} contentProtections$
 * @returns {Promise}
 */
export function testEMEManagerImmediateError(
  /* eslint-disable @typescript-eslint/naming-convention */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  EMEManager : any,
  /* eslint-enable @typescript-eslint/naming-convention */
  mediaElement : HTMLMediaElement,
  keySystemsConfigs : unknown[],
  contentProtections$ : Observable<unknown>
) : Promise<unknown> {
  return new Promise((res, rej) => {
    EMEManager(mediaElement, keySystemsConfigs, contentProtections$)
      .subscribe(
        (evt : unknown) => {
          const eventStr = JSON.stringify(evt as any);
          rej(new Error("Received an EMEManager event: " + eventStr));
        },
        (err : unknown) => { res(err); },
        () => rej(new Error("EMEManager completed."))
      );
  });
}

/**
 * Check that the event received corresponds to the session-message event for a
 * license request.
 * @param {Object} evt
 * @param {Object} initDataVal
 */
export function expectLicenseRequestMessage(
  evt : { type : string; value : any},
  initDataVal : { type : string | undefined;
                  values : Array<{ systemId : string | unknown;
                                   data : Uint8Array; }>; }
) : void {
  expect(evt.type).toEqual("session-message");
  expect(evt.value.messageType).toEqual("license-request");
  expect(evt.value.initializationData).toEqual(initDataVal);
}

/**
 * @param {Object} evt
 * @param {Uint8Array} initData
 * @param {string|undefined} initDataType
 */
export function expectInitDataIgnored(
  evt : { type : string; value : any},
  initDataVal : { type : string | undefined;
                  values : Array<{ systemId : string | undefined;
                                   data : Uint8Array; }>; }
) : void {
  expect(evt.type).toEqual("init-data-ignored");
  expect(evt.value.initializationData).toEqual(initDataVal);
}

/**
 * @param {Object} evt
 * @param {Uint8Array} initData
 * @param {string|undefined} initDataType
 */
export function expectEncryptedEventReceived(
  evt : { type : string; value : any},
  initData : IEncryptedEventData
) : void {
  expect(evt.type).toEqual("encrypted-event-received");
  expect(evt.value).toEqual(initData);
}

/**
 * Does the reverse operation than what `formatFakeChallengeFromInitData` does:
 * Retrieve initialization data from a fake challenge done in our tests
 * @param {Uint8Array} challenge
 * @returns {Object}
 */
export function extrackInfoFromFakeChallenge(
  challenge : Uint8Array
) : { initData : Uint8Array; initDataType : string } {
  const licenseData = JSON.stringify(utf8ToStr(challenge));
  const initData = base64ToBytes(licenseData[1]);
  return { initData, initDataType: licenseData[0] };
}

/**
 * @param {BufferSource} initData
 * @param {string} initDataType
 * @returns {Uint8Array}
 */
export function formatFakeChallengeFromInitData(
  initData : BufferSource,
  initDataType : string
) : Uint8Array {
  const initDataAB = initData instanceof ArrayBuffer ? initData :
                                                       initData.buffer;
  const objChallenge = [initDataType, bytesToBase64(new Uint8Array(initDataAB))];
  return strToUtf8(JSON.stringify(objChallenge));
}
