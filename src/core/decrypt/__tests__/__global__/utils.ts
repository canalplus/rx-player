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
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-restricted-properties */

import { Subject } from "rxjs";
import { IEncryptedEventData } from "../../../../compat/eme";
import {
  base64ToBytes,
  bytesToBase64,
} from "../../../../utils/base64";
import EventEmitter, { fromEvent } from "../../../../utils/event_emitter";
import flatMap from "../../../../utils/flat_map";
import {
  strToUtf8,
  utf8ToStr,
} from "../../../../utils/string_parsing";

/** Default MediaKeySystemAccess configuration used by the RxPlayer. */
export const defaultKSConfig = [{
  audioCapabilities: [ { contentType: "audio/mp4;codecs=\"mp4a.40.2\"" },
                       { contentType: "audio/webm;codecs=opus" } ],
  distinctiveIdentifier: "optional" as const,
  initDataTypes: ["cenc"] as const,
  persistentState: "optional" as const,
  sessionTypes: ["temporary"] as const,
  videoCapabilities: [ { contentType: "video/mp4;codecs=\"avc1.4d401e\"" },
                       { contentType: "video/mp4;codecs=\"avc1.42e01e\"" },
                       { contentType: "video/webm;codecs=\"vp8\"" } ],
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
    thisArg?: unknown
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
export class MediaKeySessionImpl extends EventEmitter<Record<string, unknown>> {
  public readonly closed : Promise<void>;
  public readonly expiration: number;
  public readonly keyStatuses : MediaKeyStatusMapImpl;
  public readonly sessionId: string;
  public onkeystatuseschange: ((this: MediaKeySessionImpl, ev: Event) => unknown) | null;
  public onmessage: (
    (this: MediaKeySessionImpl, ev: MediaKeyMessageEvent) => unknown
  ) | null;

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
    setTimeout(() => {
      const event : MediaKeyMessageEvent =
        Object.assign(new CustomEvent("message"),
                      { message: msg.buffer,
                        messageType: "license-request" as const });

      this.trigger("message", event);
      if (this.onmessage !== null && this.onmessage !== undefined) {
        this.onmessage(event);
      }
    }, 5);
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
    setTimeout(() => {
      this.trigger("keyStatusesChange", event);
      if (this.onkeystatuseschange !== null && this.onkeystatuseschange !== undefined) {
        this.onkeystatuseschange(event);
      }
    }, 50);
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
) : Promise<MediaKeySystemAccessImpl> {
  return Promise.resolve(new MediaKeySystemAccessImpl(keySystem, config));
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
  const mockEvents : Record<string, jest.Mock> = {
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

  const mockRmksa = jest.fn(requestMediaKeySystemAccessImpl);
  const mockSetMediaKeys = jest.fn();
  const mockGenerateKeyRequest = jest.fn((
    mks : MediaKeySessionImpl,
    initializationDataType,
    initializationData
  ) => {
    return mks.generateRequest(initializationDataType,
                               initializationData);
  });

  const mockGetInitData = jest.fn((encryptedEvent : IEncryptedEventData) => {
    return encryptedEvent;
  });

  jest.mock("../../../../compat", () => (
    { events: mockEvents,
      requestMediaKeySystemAccess: mockRmksa,
      setMediaKeys: mockSetMediaKeys,
      getInitData: mockGetInitData,
      generateKeyRequest: mockGenerateKeyRequest,
      ...exportedFunctions }));

  return { mockEvents,
           eventTriggers: { triggerEncrypted,
                            triggerKeyMessage,
                            triggerKeyError,
                            triggerKeyStatusesChange },
           mockRequestMediaKeySystemAccess: mockRmksa,
           mockGetInitData,
           mockSetMediaKeys,
           mockGenerateKeyRequest };
}

/**
 * Check that the ContentDecryptor, when called with those arguments, throws.
 * If that's the case, resolve with the corresponding error.
 * Else, reject.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @param {Array} keySystemsConfigs
 * @returns {Promise}
 */
export function testContentDecryptorError(
  ContentDecryptor : any,
  mediaElement : HTMLMediaElement,
  keySystemsConfigs : unknown[]
) : Promise<unknown> {
  return new Promise((res, rej) => {
    const contentDecryptor = new ContentDecryptor(mediaElement, keySystemsConfigs);
    contentDecryptor.addEventListener("error", (error: any) => {
      res(error);
    });
    setTimeout(() => {
      rej(new Error("Timeout exceeded"));
    }, 10);
  });
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
