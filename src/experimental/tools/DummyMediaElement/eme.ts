import type {
  IMediaKeySession,
  IMediaKeySystemAccess,
  IMediaKeys,
} from "../../../compat/browser_compatibility_types";
import { getBoxOffsets } from "../../../parsers/containers/isobmff";
import arrayIncludes from "../../../utils/array_includes";
import { base64ToBytes, bytesToBase64 } from "../../../utils/base64";
import { be4toi, le2toi } from "../../../utils/byte_parsing";
import createUuid from "../../../utils/create_uuid";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference from "../../../utils/reference";
import sliceUint8array from "../../../utils/slice_uint8array";
import {
  bytesToHex,
  guidToUuid,
  hexToBytes,
  strToUtf8,
  utf16LEToStr,
  utf8ToStr,
} from "../../../utils/string_parsing";

const keySystemBlacklist: string[] = [];
const keySystemWhitelist: string[] = [];

/**
 * Re-implementation of the EME `navigator.requestMediaKeySystemAccess` API.
 * @param {string} keySystem
 * @param {Array.<Object>} supportedConfigurations
 * @returns {Promise.<Object>}
 */
export function requestMediaKeySystemAccess(
  keySystem: string,
  supportedConfigurations: MediaKeySystemConfiguration[],
): Promise<DummyMediaKeySystemAccess> {
  if (keySystem === "") {
    return Promise.reject(
      new TypeError("`requestMediaKeySystemAccess` error: empty string"),
    );
  }
  if (supportedConfigurations.length === 0) {
    return Promise.reject(
      new TypeError("`requestMediaKeySystemAccess` error: no given configuration."),
    );
  }
  if (
    (keySystemWhitelist.length > 0 && !arrayIncludes(keySystemWhitelist, keySystem)) ||
    (keySystemBlacklist.length > 0 && arrayIncludes(keySystemBlacklist, keySystem))
  ) {
    const error = new Error(`"${keySystem}" is not a supported keySystem`);
    error.name = "NotSupportedError";
    return Promise.reject(error);
  }
  for (const config of supportedConfigurations) {
    // TODO configurable configuration validation. Callback?
    return Promise.resolve(new DummyMediaKeySystemAccess(keySystem, config));
  }
  const error = new Error(
    "`requestMediaKeySystemAccess` error: No configuration supported.",
  );
  error.name = "NotSupportedError";
  return Promise.reject(error);
}

/**
 * Re-implementation of the EME `MediaKeySystemAccess` Object.
 * @class DummyMediaKeySystemAccess
 */
export class DummyMediaKeySystemAccess implements IMediaKeySystemAccess {
  public readonly keySystem: string;
  private _configuration: MediaKeySystemConfiguration;

  /**
   * @param {string} keySystem
   * @param {Object} configuration
   */
  constructor(keySystem: string, configuration: MediaKeySystemConfiguration) {
    this.keySystem = keySystem;
    this._configuration = configuration;
  }

  /**
   * @returns {Object}
   */
  public getConfiguration(): MediaKeySystemConfiguration {
    return this._configuration;
  }

  /**
   * @returns {Promise.<Object>}
   */
  public createMediaKeys(): Promise<DummyMediaKeys> {
    // TODO persistent-license
    return Promise.resolve(
      new DummyMediaKeys(this.keySystem, ["temporary" /* , "persistent-license" */]),
    );
  }
}

/**
 * Re-implementation of the EME `MediaKeys` Object.
 * @class DummyMediaKeys
 */
export class DummyMediaKeys implements IMediaKeys {
  private _keySystem: string;
  private _sessionTypes: MediaKeySessionType[];
  private _serverCertificateRef: SharedReference<Uint8Array | null>;

  public sessions: DummyMediaKeySession[];
  public onSessionKeyUpdates: (() => void) | null;

  constructor(keySystem: string, sessionTypes: MediaKeySessionType[]) {
    this._keySystem = keySystem;
    this._sessionTypes = sessionTypes;
    this._serverCertificateRef = new SharedReference<Uint8Array | null>(null);
    this.sessions = [];
    this.onSessionKeyUpdates = null;
  }

  /**
   * @param {string} sessionType
   * @returns {Object}
   */
  public createSession(
    sessionType: MediaKeySessionType = "temporary",
  ): DummyMediaKeySession {
    if (!arrayIncludes(this._sessionTypes, sessionType)) {
      const error = new Error(
        `\`createSession\`: ${sessionType} sessionType not supported`,
      );
      error.name = "NotSupportedError";
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const newSession = new DummyMediaKeySession({
      keySystem: this._keySystem,
      sessionType,
      serverCertificateRef: this._serverCertificateRef,
      callbacks: {
        onClosed() {
          const index = self.sessions.indexOf(newSession);
          if (index >= 0) {
            self.sessions.splice(index, 1);
          }
        },
        onKeysUpdate() {
          self.onSessionKeyUpdates?.();
        },
      },
    });
    this.sessions.push(newSession);
    return newSession;
  }

  /**
   * @param {BufferSource} serverCertificate
   * @returns {Promise.<boolean>}
   */
  setServerCertificate(serverCertificate: BufferSource): Promise<boolean> {
    if (serverCertificate.byteLength === 0) {
      throw new TypeError(
        "Cannot set `serverCertificate`: an empty certificate was given",
      );
    }
    const clonedServerCertificate = bufferSourceToUint8Array(serverCertificate).slice();
    this._serverCertificateRef.setValue(clonedServerCertificate);
    return Promise.resolve(true);
  }
}

interface IDrmChallenge {
  certificate: string | null;
  persistent: boolean;
  keyIds: string[];
}

interface IDrmLicense {
  type: "license";
  persistent: boolean;
  expiration?: number;
  keys: Record<
    /** Key id, as lower case hex values */
    string,
    {
      /**
       * "Restriction level" for this key id, a higher number meaning more
       * restrictive.
       */
      policyLevel: number;
    }
  >;
}

/**
 * Re-implementation of the EME `MediaKeySession` Object.
 * @class DummyMediaKeySession
 */
export class DummyMediaKeySession
  extends EventEmitter<MediaKeySessionEventMap>
  implements IMediaKeySession
{
  public readonly closed: Promise<MediaKeySessionClosedReason>;
  public readonly keyStatuses: DummyMediaKeyStatusMap;
  public expiration: number;
  public sessionId: string;

  private _sessionType: MediaKeySessionType;
  private _unitialized: boolean;
  private _callable: boolean;
  private _closing: boolean;
  private _closed: boolean;
  private _keySystem: string;
  private _onSessionClosed: () => void;
  private _serverCertificateRef: IReadOnlySharedReference<Uint8Array | null>;
  private _callbacks: IDummyMediaKeySessionCallbacks;
  private _currentPolicyLevel: number;

  /**
   * @param {Object} args
   */
  constructor({
    keySystem,
    sessionType,
    serverCertificateRef,
    callbacks,
  }: {
    keySystem: string;
    sessionType: MediaKeySessionType;
    serverCertificateRef: IReadOnlySharedReference<Uint8Array | null>;
    callbacks: IDummyMediaKeySessionCallbacks;
  }) {
    super();

    this._callbacks = callbacks;
    this._onSessionClosed = noop; // Just here to make TypeScript happy
    this.closed = new Promise((resolve) => {
      this._onSessionClosed = () => {
        this.removeEventListener();
        try {
          this._callbacks.onClosed();
        } catch (e) {
          // we don't care
        }
        resolve("closed-by-application");
      };
    });
    this._currentPolicyLevel = 100;

    this.expiration = NaN;
    this.keyStatuses = new DummyMediaKeyStatusMap();
    this.sessionId = "";

    this._serverCertificateRef = serverCertificateRef;

    this._keySystem = keySystem;
    this._sessionType = sessionType;
    this._unitialized = true;
    this._callable = false;
    this._closing = false;
    this._closed = false;
  }

  /**
   * @returns {Promise}
   */
  public close(): Promise<void> {
    // 1. If this object's closing or closed value is true, return a resolved promise.
    if (this._closing || this._closed) {
      return Promise.resolve();
    }

    // 2. If this object's callable value is false, return a promise rejected with an InvalidStateError.
    if (!this._callable) {
      const err = new Error("Cannot call `close` at this time");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 4. Set this object's closing or closed value to true.
    this._closing = true;

    this.keyStatuses.clear();

    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          this._callbacks.onKeysUpdate();
        } catch (e) {
          // We don't care
        }
        try {
          this.trigger("keystatuseschange", new Event("keystatuseschange"));
        } catch (e) {
          // We don't care
        }

        this.expiration = NaN;
        this._closed = true;
        this._onSessionClosed();
        resolve();
      }, 0);
    });
  }

  /**
   * @param {string} initDataType
   * @param {BufferSource} initData
   * @returns {Promise}
   */
  public generateRequest(initDataType: string, initData: BufferSource): Promise<void> {
    // 1. If this object's closing or closed value is true, return a promise
    // rejected with an InvalidStateError.
    if (this._closing || this._closed) {
      const err = new Error("Cannot call `generateRequest`: closing session");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 2. If this object's uninitialized value is false, return a promise
    // rejected with an InvalidStateError.
    if (!this._unitialized) {
      const err = new Error("Cannot call `generateRequest`: already initialized");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 3. Let this object's uninitialized value be false.
    this._unitialized = false;

    // 4. If initDataType is the empty string, return a promise rejected with a
    // newly created TypeError.
    if (typeof initDataType !== "string" || initDataType === "") {
      return Promise.reject(
        new TypeError("Invalid `generateRequest` call: empty initDataType"),
      );
    }

    // 5. If initData is an empty array, return a promise rejected with a newly
    // created TypeError.
    let initDataU8;
    if (initData instanceof ArrayBuffer) {
      initDataU8 = new Uint8Array(initData);
    } else if (initData instanceof Uint8Array) {
      initDataU8 = initData;
    } else {
      initDataU8 = new Uint8Array(initData.buffer);
    }

    if (initDataU8.byteLength === 0) {
      return Promise.reject(
        new TypeError("Invalid `generateRequest` call: empty initData"),
      );
    }

    // 6. If the Key System implementation represented by this object's cdm
    // implementation value does not support initDataType as an Initialization
    // Data Type, return a promise rejected with a NotSupportedError. String
    // comparison is case-sensitive.
    if (initDataType !== "cenc") {
      const err = new Error(
        `Cannot call \`generateRequest\`: unsupported initDataType "${initDataType}"`,
      );
      err.name = "NotSupportedError";
      return Promise.reject(err);
    }

    // 7. Let init data be a copy of the contents of the initData parameter.
    const clonedInitData = initDataU8.slice();

    const psshs = splitPsshBoxes(clonedInitData);
    let keyIds: Uint8Array[] | null = null;
    for (const pssh of psshs) {
      try {
        const psshInfo = getKeyIdsFromPssh(pssh, 0);
        if (psshInfo !== null) {
          switch (psshInfo.systemId) {
            case undefined:
              if (psshInfo.kids.length === 0) {
                keyIds = psshInfo.kids;
              }
              break;
            case "PlayReady":
              if (this._keySystem.indexOf("playready") >= 0) {
                keyIds = psshInfo.kids;
              }
              break;
            case "Widevine":
              if (this._keySystem.indexOf("widevine") >= 0) {
                keyIds = psshInfo.kids;
              }
              break;
            case "Nagra":
              if (this._keySystem.indexOf("nagra") >= 0) {
                keyIds = psshInfo.kids;
              }
              break;
          }
        }
      } catch (e) {
        /* noop */
      }
    }

    if (keyIds === null || keyIds.length === 0) {
      throw new TypeError("No key id found in initialization data");
    }

    const kids = keyIds.map((k) => bytesToHex(k));
    this.sessionId = createUuid();
    this._callable = true;
    setTimeout(() => {
      const certificateBase = this._serverCertificateRef.getValue();
      const certificate =
        certificateBase === null ? null : bytesToBase64(certificateBase);
      const message: IDrmChallenge = {
        certificate,
        persistent: this._sessionType === "persistent-license",
        keyIds: kids,
      };
      this.trigger(
        "message",
        new MediaKeyMessageEvent("message", {
          messageType: "license-request",
          message: strToUtf8(JSON.stringify(message)).buffer,
        }),
      );
    }, 0);

    return Promise.resolve();
  }

  /**
   * @param {string} sessionId
   * @returns {Promise.<boolean>}
   */
  public load(sessionId: string): Promise<boolean> {
    // 1. If this object's closing or closed value is true, return a promise
    // rejected with an InvalidStateError.
    if (this._closing || this._closed) {
      const err = new Error("Cannot call `load`: closing session");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 2. If this object's uninitialized value is false, return a promise
    // rejected with an InvalidStateError.
    if (!this._unitialized) {
      const err = new Error("Cannot call `load`: already initialized");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 3. Let this object's uninitialized value be false.
    this._unitialized = false;

    // 4. If sessionId is the empty string, return a promise rejected with a
    // newly created TypeError.
    if (typeof sessionId !== "string" || sessionId === "") {
      return Promise.reject(new TypeError("Invalid `load` call: empty sessionId"));
    }

    // TODO persistent license
    return Promise.reject(new TypeError("Persistent license not implemented yet."));
  }

  /**
   * @returns {Promise}
   */
  public remove(): Promise<void> {
    // 1. If this object's closing or closed value is true, return a promise
    // rejected with an InvalidStateError.
    if (this._closing || this._closed) {
      const err = new Error("Cannot call `remove`: closing session");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 2. If this object's callable value is false, return a promise rejected
    // with an InvalidStateError.
    if (!this._callable) {
      const err = new Error("Cannot call `remove` at this time");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // Run the Update Key Statuses algorithm on the session, providing all key
    // ID(s) in the session along with the "released" MediaKeyStatus value for
    // each.
    const keymap = this.keyStatuses.getInnerMap();
    keymap.forEach(({ policyLevel }, key) => {
      keymap.set(key, { status: "released", policyLevel });
    });

    if (this.keyStatuses.size > 0) {
      try {
        this._callbacks.onKeysUpdate();
      } catch (e) {
        // We don't care
      }
      setTimeout(() => {
        this.trigger("keystatuseschange", new Event("keystatuseschange"));
      }, 0);
    }
    this.expiration = NaN;

    return new Promise((resolve) => {
      resolve();
    });
  }

  /**
   * @param {BufferSource} response
   * @returns {Promise}
   */
  public update(response: BufferSource): Promise<void> {
    // 1. If this object's closing or closed value is true, return a promise
    // rejected with an InvalidStateError.
    if (this._closing || this._closed) {
      const err = new Error("Cannot call `update`: closing session");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 2. If this object's callable value is false, return a promise
    // rejected with an InvalidStateError.
    if (!this._callable) {
      const err = new Error("Cannot call `update` at this time");
      err.name = "InvalidStateError";
      return Promise.reject(err);
    }

    // 3. If response is an empty array, return a promise rejected with a
    // newly created TypeError.
    if (response.byteLength === 0) {
      return Promise.reject(new TypeError("Invalid `update` call: empty response"));
    }

    const responseU8 = bufferSourceToUint8Array(response);
    const parsed = utf8ToStr(responseU8);

    let hasUpdatedKeys = false;
    try {
      const parsedObj = JSON.parse(parsed) as IDrmLicense;
      for (const key of Object.keys(parsedObj.keys)) {
        const { policyLevel } = parsedObj.keys[key];
        if (policyLevel > this._currentPolicyLevel) {
          this.keyStatuses.set(key, "output-restricted", policyLevel);
        } else {
          this.keyStatuses.set(key, "usable", policyLevel);
        }
        hasUpdatedKeys = true;
      }
      if (parsedObj.expiration !== undefined) {
        this.expiration = parsedObj.expiration;
      }
    } catch (err) {
      throw new TypeError(err instanceof Error ? err.message : "Invalid message");
    }

    if (hasUpdatedKeys) {
      setTimeout(() => {
        try {
          this._callbacks.onKeysUpdate();
        } catch (e) {
          // We don't care
        }
        this.trigger("keystatuseschange", new Event("keystatuseschange"));
      }, 0);
    }
    return Promise.resolve();
  }

  public updatePolicyLevel(newLevel: number) {
    this._currentPolicyLevel = newLevel;

    let hasUpdatedKeys = false;
    try {
      const keymap = this.keyStatuses.getInnerMap();
      keymap.forEach(({ status, policyLevel }, key) => {
        if (policyLevel > newLevel) {
          if (status !== "output-restricted") {
            keymap.set(key, { status: "output-restricted", policyLevel });
            hasUpdatedKeys = true;
          }
        } else if (status === "output-restricted") {
          keymap.set(key, { status: "usable", policyLevel });
          hasUpdatedKeys = true;
        }
      });
    } catch (e) {
      // we don't care
    }

    if (hasUpdatedKeys) {
      setTimeout(() => {
        try {
          this._callbacks.onKeysUpdate();
        } catch (e) {
          // We don't care
        }
        this.trigger("keystatuseschange", new Event("keystatuseschange"));
      }, 0);
    }
  }
}

interface IDummyMediaKeySessionCallbacks {
  onClosed: () => void;
  onKeysUpdate: () => void;
}

/**
 * Re-implementation of the `MediaKeyStatusMap` where insertion is possible.
 *
 * Used to mock the corresponding EME API.
 * @class DummyMediaKeyStatusMap
 */
export class DummyMediaKeyStatusMap implements MediaKeyStatusMap {
  private _innerMap: Map<
    string,
    {
      status: MediaKeyStatus;
      policyLevel: number;
    }
  >;

  /**
   * @returns {number} - the number of elements in the `DummyMediaKeyStatusMap`.
   */
  get size(): number {
    return this._innerMap.size;
  }

  constructor() {
    this._innerMap = new Map();
  }

  /**
   * Returns the actual Map backing this `DummyMediaKeyStatusMap`.
   * Useful to perform complex modifications.
   * @returns {Map}
   */
  public getInnerMap(): Map<string, { status: MediaKeyStatus; policyLevel: number }> {
    return this._innerMap;
  }

  /**
   * Executes a provided function once per each key/value pair in the
   * `DummyMediaKeyStatusMap`, in insertion order.
   * @param {function} callbackfn
   */
  public forEach(
    callbackfn: (
      value: MediaKeyStatus,
      key: BufferSource,
      parent: MediaKeyStatusMap,
    ) => void,
  ): void {
    return this._innerMap.forEach((value, key) => {
      callbackfn(value.status, hexToBytes(key).buffer, this);
    });
  }

  /**
   * Adds a new element with a specified key id and `MediaKeyStatus` to the
   * `DummyMediaKeyStatusMap`.
   * If an element with the same key id already exists, the element will be
   * updated.
   * @param {string} key - Key as an hex string in lower case
   * @param {string} status
   * @param {number} policyLevel
   * @returns {Object}
   */
  public set(key: string, status: MediaKeyStatus, policyLevel: number): this {
    this._innerMap.set(key, { status, policyLevel });
    return this;
  }

  /**
   * Returns a specified element from this `DummyMediaKeyStatusMap` object.
   * @param {BufferSource} key
   * @returns {string|undefined} - Returns the element associated with the
   * specified key id.
   * If no element is associated with the specified key id, undefined is
   * returned.
   */
  public get(key: BufferSource): MediaKeyStatus | undefined {
    const keyU8 = bufferSourceToUint8Array(key);
    const keyStr = bytesToHex(keyU8);
    return this._innerMap.get(keyStr)?.status;
  }

  /**
   * @returns {boolean} - Indicate whether an element with the specified key id
   * exists or not.
   */
  public has(key: BufferSource): boolean {
    const keyU8 = bufferSourceToUint8Array(key);
    const keyStr = bytesToHex(keyU8);
    return this._innerMap.has(keyStr);
  }

  public clear(): void {
    return this._innerMap.clear();
  }
}

/**
 * Convert a vague `BufferSource` Object to a more precize `Uint8Array`.
 * @param {BufferSource} buf
 * @returns {Uint8Array}
 */
function bufferSourceToUint8Array(buf: BufferSource): Uint8Array {
  if (buf instanceof Uint8Array) {
    return buf;
  } else if (buf instanceof ArrayBuffer) {
    return new Uint8Array(buf);
  } else {
    return new Uint8Array(buf.buffer);
  }
}

/* eslint-disable @typescript-eslint/naming-convention */
const SYSTEM_IDS: Record<string, "cenc" | "PlayReady" | "Nagra" | "Widevine"> = {
  "1077EFECC0B24D02ACE33C1E52E2FB4B": "cenc",
  // "1F83E1E86EE94F0DBA2F5EC4E3ED1A66": "SecureMedia",
  // "35BF197B530E42D78B651B4BF415070F": "DivX DRM",
  // "45D481CB8FE049C0ADA9AB2D2455B2F2": "CoreCrypt",
  // "5E629AF538DA4063897797FFBD9902D4": "Marlin",
  // "616C7469636173742D50726F74656374": "AltiProtect",
  // "644FE7B5260F4FAD949A0762FFB054B4": "CMLA",
  // "69F908AF481646EA910CCD5DCCCB0A3A": "Marlin",
  // "6A99532D869F59229A91113AB7B1E2F3": "MobiDRM",
  // "80A6BE7E14484C379E70D5AEBE04C8D2": "Irdeto",
  // "94CE86FB07FF4F43ADB893D2FA968CA2": "FairPlay",
  // "992C46E6C4374899B6A050FA91AD0E39": "SteelKnot",
  "9A04F07998404286AB92E65BE0885F95": "PlayReady",
  // "9A27DD82FDE247258CBC4234AA06EC09": "Verimatrix VCAS",
  // "A68129D3575B4F1A9CBA3223846CF7C3": "VideoGuard Everywhere",
  ADB41C242DBF4A6D958B4457C0D27B95: "Nagra",
  // "B4413586C58CFFB094A5D4896C1AF6C3": "Viaccess-Orca",
  // "DCF4E3E362F158187BA60A6FE33FF3DD": "DigiCAP",
  // E2719D58A985B3C9781AB030AF78D30E: "ClearKey",
  EDEF8BA979D64ACEA3C827DCD51D21ED: "Widevine",
  // "F239E769EFA348509C16A903C6932EFB": "PrimeTime",
};
/* eslint-enable @typescript-eslint/naming-convention */

type ValueOf<T> = T[keyof T];

function getKeyIdsFromPssh(
  buf: Uint8Array,
  baseOffset: number,
): {
  systemId: ValueOf<typeof SYSTEM_IDS> | undefined;
  kids: Uint8Array[];
} | null {
  let offset = baseOffset + 4 + 4;
  const version = buf[offset];
  if (version === undefined || version > 1) {
    throw new Error("Invalid PSSH: Invalid version");
  }
  offset++;
  if (buf.length < offset + offset + 19) {
    throw new Error("Invalid PSSH: too short");
  }

  offset += 3; // flags
  const systemId = bytesToHex(buf.subarray(offset, offset + 16));
  offset += 16;

  if (version === 1) {
    if (buf.length < offset + 4) {
      return null;
    }
    const kidCount = be4toi(buf, offset);
    offset += 4;

    const kids = [];
    let i = kidCount;
    while (i--) {
      if (buf.length < offset + 16) {
        return null;
      }
      kids.push(buf.subarray(offset, offset + 16));
      offset += 16;
    }
    return {
      systemId: undefined,
      kids,
    };
  }

  const systemIdStr = SYSTEM_IDS[systemId.toUpperCase()];
  switch (systemIdStr) {
    case "PlayReady": {
      const kid = getPlayReadyKIDFromPssh(buf, baseOffset);
      return {
        systemId: "PlayReady",
        kids: [hexToBytes(kid)],
      };
    }
    case "Widevine": {
      let innerOffset =
        4 /* box length */ +
        4 /* box name */ +
        4 /* version + flags */ +
        16 /* system id */ +
        4; /* length of widevine header. */

      // TODO real widevine PSSH parsing.
      while (true) {
        if (buf.byteLength < baseOffset + innerOffset + 16 + 2) {
          return null;
        }
        if (
          buf[baseOffset + innerOffset] === 0x12 &&
          buf[baseOffset + innerOffset + 1] === 0x10
        ) {
          const kid = buf.subarray(
            baseOffset + innerOffset + 2,
            baseOffset + innerOffset + 2 + 16,
          );
          return {
            systemId: "Widevine",
            kids: [kid],
          };
        }
        innerOffset += 1;
      }
    }
    case "Nagra": {
      const innerOffset =
        baseOffset +
        4 /* box length */ +
        4 /* box name */ +
        4 /* version + flags */ +
        16 /* system id */ +
        4; /* length */

      const nagraBase64 = utf8ToStr(buf.subarray(innerOffset));
      const decodedBase64 = base64ToBytes(nagraBase64);
      const nagraStr = utf8ToStr(decodedBase64);
      const parsed = JSON.parse(nagraStr) as
        | {
            contentId?: string;
            keyId?: string;
          }
        | undefined
        | null;
      if (parsed === null || parsed === undefined || parsed.keyId === undefined) {
        throw new Error("Unrecognized Nagra PSSH");
      }
      return {
        systemId: "Nagra",
        kids: [hexToBytes(parsed.keyId.replace(/-/g, ""))],
      };
    }
    case "cenc":
      throw new Error("cenc pssh should have been set to version 1");
  }
}

/**
 * Parse PlayReady pssh to get its Hexa-coded KeyID.
 * @param {Uint8Array} buf
 * @param {number} baseOffset
 * @returns {string}
 */
export function getPlayReadyKIDFromPssh(buf: Uint8Array, baseOffset: number): string {
  const innerOffset =
    baseOffset +
    4 /* box length */ +
    4 /* box name */ +
    4 /* version + flags */ +
    16; /* system id */
  const xmlLength = le2toi(buf.subarray(innerOffset), 4);
  const xml = utf16LEToStr(buf.subarray(innerOffset + 14, innerOffset + 14 + xmlLength));
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const kidElement = doc.querySelector("KID");
  if (kidElement === null) {
    throw new Error("Cannot parse PlayReady PSSH: invalid XML");
  }
  const b64guidKid = kidElement.textContent === null ? "" : kidElement.textContent;

  const uuidKid = guidToUuid(base64ToBytes(b64guidKid));
  return bytesToHex(uuidKid).toLowerCase();
}

/**
 * @param {Uint8Array} data
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
function splitPsshBoxes(data: Uint8Array): Uint8Array[] {
  let i = 0;
  const psshBoxes: Uint8Array[] = [];
  while (i < data.length) {
    let psshOffsets;
    try {
      psshOffsets = getBoxOffsets(data, 0x70737368 /* pssh */);
    } catch (e) {
      return psshBoxes;
    }
    if (psshOffsets === null) {
      return psshBoxes;
    }
    const pssh = sliceUint8array(data, psshOffsets[0], psshOffsets[2]);
    psshBoxes.push(pssh);
    i = psshOffsets[2];
  }
  return psshBoxes;
}
