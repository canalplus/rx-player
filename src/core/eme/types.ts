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

import { Subject } from "rxjs";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
  ICustomMediaKeySystemAccess,
} from "../../compat";
import { ICustomError } from "../../errors";
import LoadedSessionsStore from "./utils/loaded_sessions_store";
import PersistentSessionsStore from "./utils/persistent_sessions_store";

/** Information about the encryption initialization data. */
export interface IInitializationDataInfo {
  /** The initialization data type. */
  type : string | undefined;
  /** Initialization data itself. */
  data : Uint8Array;
}

/** Information concerning a MediaKeySession. */
export interface IMediaKeySessionContext {
  /** The MediaKeySession itself. */
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;
  /** The type of MediaKeySession (e.g. "temporary"). */
  sessionType : MediaKeySessionType;
  /** Initialization data assiociated to this MediaKeySession. */
  initializationData : IInitializationDataInfo;
}

/** Event emitted when a minor - recoverable - error happened. */
export interface IEMEWarningEvent { type : "warning";
                                    value : ICustomError; }

/**
 * Event emitted when we receive an "encrypted" event from the browser.
 * This is usually sent when pushing an initialization segment, if it stores
 * encryption information.
 */
export interface IEncryptedEvent { type: "encrypted-event-received";
                                   value: { type? : string;
                                            data : ArrayBuffer |
                                                   Uint8Array; }; }

/**
 * Sent when a MediaKeys has been created (or is already created) for the
 * current content.
 * This is necessary before creating a MediaKeySession which will allow
 * encryption keys to be communicated.
 * It carries a subject (attachMediaKeys$) that will be used by the init to
 * ask the EME to attach the mediakeys.
 */
export interface ICreatedMediaKeysEvent {
  type: "created-media-keys";
  value: { instances : IMediaKeysContext;
           stores : IMediaKeySessionStores;
           options : IKeySystemOption;
           attachMediaKeys$: Subject<void>; }; }

/**
 * Sent when the created (or already created) MediaKeys is attached to the
 * current HTMLMediaElement element.
 * On some peculiar devices, we have to wait for that step before the first
 * media segments are to be pushed to avoid issues.
 * Because this event is sent after a MediaKeys is created, you will always have
 * a "created-media-keys" event before an "attached-media-keys" event.
 */
export interface IAttachedMediaKeysEvent {
  type: "attached-media-keys";
  value: { instances : IMediaKeysContext;
           stores : IMediaKeySessionStores;
           options : IKeySystemOption; }; }

/**
 * Emitted when the initialization data received through an encrypted event or
 * through the EMEManager argument can already be decipherable without going
 * through the usual license-fetching logic.
 * This is usually because the MediaKeySession for this encryption key has
 * already been created.
 */
export interface IInitDataIgnoredEvent {
  type: "init-data-ignored";
  value : { initializationData : IInitializationDataInfo };
}

/**
 * Emitted when a "message" event is sent.
 * Those events generally allows the CDM to ask for data such as the license or
 * a server certificate.
 * As such, we will call the corresponding `getLicense` callback immediately
 * after this event is sent.
 *
 * Depending on the return of the getLicense call, we will then either emit a
 * "warning" event and retry the call (for when it failed but will be retried),
 * throw (when it failed with no retry left and no fallback policy is set), emit
 * a "blacklist-protection-data-event" (for when it failed with no retry left
 * but a fallback policy is set), emit a "session-updated" event (for when the
 * call resolved with some data) or emit a "no-update" event (for when the call
 * resolved with `null`).
 */
export interface ISessionMessageEvent {
  type: "session-message";
  value : { messageType : string;
            initializationData : IInitializationDataInfo; };
}

/**
 * Emitted when a `getLicense` call resolves with null.
 * In that case, we do not call `MediaKeySession.prototype.update` and no
 * `session-updated` event will be sent.
 */
export interface INoUpdateEvent {
  type : "no-update";
  value : { initializationData: IInitializationDataInfo };
}

/**
 * Emitted after the `MediaKeySession.prototype.update` function resolves.
 * This function is called when the `getLicense` callback resolves with a data
 * different than `null`.
 */
export interface ISessionUpdatedEvent {
  type: "session-updated";
  value: { session: MediaKeySession |
                    ICustomMediaKeySession;
           license: ILicense |
                    null;
           initializationData : IInitializationDataInfo; };
}

// Emitted when individual keys are considered undecipherable and are thus
// blacklisted.
// Emit the corresponding keyIDs as payload.
export interface IBlacklistKeysEvent { type : "blacklist-keys";
                                       value: ArrayBuffer[]; }

/**
 * Event Emitted when specific "protection data" cannot be deciphered and is thus
 * blacklisted.
 *
 * The linked value is the initialization data linked to the content that cannot
 * be deciphered.
 */
export interface IBlacklistProtectionDataEvent { type: "blacklist-protection-data";
                                                 value: IInitializationDataInfo; }

// Every event sent by the EMEManager
export type IEMEManagerEvent = IEMEWarningEvent | // minor error
                               IEncryptedEvent | // browser's "encrypted" event
                               ICreatedMediaKeysEvent |
                               IAttachedMediaKeysEvent |
                               IInitDataIgnoredEvent | // initData already handled
                               ISessionMessageEvent | // MediaKeySession event
                               INoUpdateEvent | // `getLicense` returned `null`
                               ISessionUpdatedEvent | // `update` call resolved
                               IBlacklistKeysEvent | // keyIDs undecipherable
                               IBlacklistProtectionDataEvent; // initData undecipherable

export type ILicense = BufferSource |
                       ArrayBuffer;

// Segment protection manually sent to the EMEManager
export interface IContentProtection { type : string; // initDataType
                                      data : Uint8Array; } // initData

// Emitted after the `onKeyStatusesChange` callback has been called
export interface IKeyStatusChangeHandledEvent { type: "key-status-change-handled";
                                                value: { session: MediaKeySession |
                                                                  ICustomMediaKeySession;
                                                         license: ILicense|null; }; }

// Emitted after the `getLicense` callback has been called
export interface IKeyMessageHandledEvent { type: "key-message-handled";
                                           value: { session: MediaKeySession |
                                                             ICustomMediaKeySession;
                                                    license: ILicense|null; }; }

// Infos indentifying a MediaKeySystemAccess
export interface IKeySystemAccessInfos {
  keySystemAccess: MediaKeySystemAccess |
                   ICustomMediaKeySystemAccess;
  keySystemOptions: IKeySystemOption;
}

/** Context behind a created MediaKeys instance. */
export interface IMediaKeysContext {
  /** The MediaKeySystemAccess which allowed to create the MediaKeys instance. */
  mediaKeySystemAccess: MediaKeySystemAccess |
                        ICustomMediaKeySystemAccess;
  /** The MediaKeys instance. */
  mediaKeys : MediaKeys |
              ICustomMediaKeys;
}

/** Stores helping to create and retrieve MediaKeySessions. */
export interface IMediaKeySessionStores {
  /** Retrieve MediaKeySessions already loaded on the current MediaKeys instance. */
  loadedSessionsStore : LoadedSessionsStore;
  /** Retrieve persistent MediaKeySessions already created. */
  persistentSessionsStore : PersistentSessionsStore |
                            null;
}

/**
 * Data stored in a persistent MediaKeySession storage.
 * Has to be versioned to be able to play MediaKeySessions persisted in an old
 * RxPlayer version when in a new one.
 */
export type IPersistentSessionInfo = IPersistentSessionInfoV2 |
                                     IPersistentSessionInfoV1 |
                                     IPersistentSessionInfoV0;

/** Wrap initialization data and allow linearization of it into base64. */
interface IInitDataContainer {
  /** The initData itself. */
  initData : Uint8Array;

  /**
   * Convert it to base64.
   * `toJSON` is specially interpreted by JavaScript engines to be able to rely
   * on it when calling `JSON.stringify` on it or any of its parent objects:
   * https://tc39.es/ecma262/#sec-serializejsonproperty
   */
  toJSON() : string;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * in RxPlayer versions after the v3.21.0 included.
 * The previous implementation (version 1) was fine enough but did not linearize
 * well due to it containing an Uint8Array. This data is now wrapped into a
 * container which will convert it to base64 when linearized through
 * `JSON.stringify`.
 */
export interface IPersistentSessionInfoV2 {
  /** Version for this object. */
  version : 2;
  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId : string;
  /**
   * The initialization data associated to the `MediaKeySession`, wrapped in a
   * container to allow efficient linearization.
   */
  initData : IInitDataContainer;
  /**
   * A hash of the initialization data (generated by the `hashBuffer` function,
   * at the time of v3.20.1 at least). Allows for a faster comparison than just
   * comparing initialization data multiple times.
   */
  initDataHash : number;
  /** Type giving information about the format of the initialization data. */
  initDataType? : string | undefined;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * in the v3.20.1 RxPlayer version.
 * Add sub-par (as in not performant) collision prevention by setting both
 * the hash of the initialization data and the initialization data itself.
 * The hash could be checked first for a fast comparison, then the full data.
 * Had to do this way because this structure is documented in the API as being
 * put in an array with one element per sessionId.
 * We might implement a HashMap in future versions instead.
 */
export interface IPersistentSessionInfoV1 {
  /** Version for this object. */
  version : 1;
  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId : string;
  /** The initialization data associated to the `MediaKeySession`, untouched. */
  initData : Uint8Array;
  /**
   * A hash of the initialization data (generated by the `hashBuffer` function,
   * at the time of v3.20.1 at least). Allows for a faster comparison than just
   * comparing initialization data multiple times.
   */
  initDataHash : number;
  /** Type giving information about the format of the initialization data. */
  initDataType? : string | undefined;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * in RxPlayer versions before the v3.20.1
 * Here we have no collision detection. We could theorically load the wrong
 * persistent session.
 */
export interface IPersistentSessionInfoV0 {
  /** Version for this object. Usually not defined here. */
  version? : undefined;
  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId : string;
  /** This initData is a hash of a real one. Here we don't handle collision. */
  initData : number;
  /** Type giving information about the format of the initialization data. */
  initDataType? : string | undefined;
}

/** Persistent MediaKeySession storage interface. */
export interface IPersistentSessionStorage { load() : IPersistentSessionInfo[];
                                             save(x : IPersistentSessionInfo[]) : void; }

/** Options related to a single key system. */
export interface IKeySystemOption {
  /**
   * Key system wanted.
   *
   * Either as a canonical name (like "widevine" or "playready") or as  the
   * complete reverse domain name denomination (e.g. "com.widevine.alpha").
   */
  type : string;
  /** Logic used to fetch the license */
  getLicense : (message : Uint8Array, messageType : string)
                 => Promise<BufferSource | null> |
                    BufferSource |
                    null;
  /** Supplementary optional configuration for the getLicense call. */
  getLicenseConfig? : { retry? : number;
                        timeout? : number; };
  /**
   * Optional `serverCertificate` we will try to set to speed-up the
   * license-fetching process.
   * `null` or `undefined` indicates that no serverCertificate should be
   * set.
   */
  serverCertificate? : BufferSource | null;
  /**
   * If `true`, we will try to persist the licenses obtained as well as try to
   * load already-persisted licenses.
   */
  persistentLicense? : boolean;
  /** Storage mechanism used to store and retrieve information on stored licenses. */
  licenseStorage? : IPersistentSessionStorage;
  /**
   * If true, we will require that the CDM is able to persist state.
   * See EME specification related to the `persistentState` configuration.
   */
  persistentStateRequired? : boolean;
  /**
   * If true, we will require that the CDM should use distinctive identyfiers.
   * See EME specification related to the `distinctiveIdentifier` configuration.
   */
  distinctiveIdentifierRequired? : boolean;
  /**
   * If true, all open MediaKeySession (used to decrypt the content) will be
   * closed when the current playback stops.
   */
  closeSessionsOnStop? : boolean;
  /** Callback called when one of the key's status change. */
  onKeyStatusesChange? : (evt : Event, session : MediaKeySession |
                                                 ICustomMediaKeySession)
                           => Promise<BufferSource | null> |
                              BufferSource |
                              null;
  /** Allows to define custom robustnesses value for the video data. */
  videoRobustnesses?: Array<string|undefined>;
  /** Allows to define custom robustnesses value for the audio data. */
  audioRobustnesses?: Array<string|undefined>;
  /**
   * If explicitely set to `false`, we won't throw on error when a used license
   * is expired.
   */
  throwOnLicenseExpiration? : boolean;
  /**
   * If set to `true`, we will not wait until the MediaKeys instance is attached
   * to the media element before pushing segments to it.
   * Setting it to `true` might be needed on some targets to work-around a
   * deadlock in the browser-side logic (or most likely the CDM implementation)
   * but it can also break playback of contents with both encrypted and
   * unencrypted data, most especially on Chromium and Chromium-derived browsers.
   */
  disableMediaKeysAttachmentLock? : boolean;
  /**
   * Enable fallback logic, to switch to other Representations when a key linked
   * to another one fails with an error.
   * Configure only this if you have contents with multiple keys depending on
   * the Representation (also known as qualities/profiles).
   */
  fallbackOn? : {
    /**
     * If `true`, we will fallback when a key obtain the "internal-error" status.
     * If `false`, we fill just throw a fatal error instead.
     */
    keyInternalError? : boolean;
    /**
     * If `true`, we will fallback when a key obtain the "internal-error" status.
     * If `false`, we fill just throw a fatal error instead.
     */
    keyOutputRestricted? : boolean;
  };
}
