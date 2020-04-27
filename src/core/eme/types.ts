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

import {
  ICompatMediaKeySystemAccess,
  ICustomMediaKeys,
  ICustomMediaKeySession,
  ICustomMediaKeySystemAccess,
} from "../../compat";
import { ICustomError } from "../../errors";
import SessionsStore from "./utils/open_sessions_store";
import PersistedSessionsStore from "./utils/persisted_session_store";

// Emitted when a minor error happened.
export interface IEMEWarningEvent { type : "warning";
                                    value : ICustomError; }

// Emitted when we receive an "encrypted" event from the browser.
// This is usually sent when pushing an initialization segment, if it stores
// encryption information.
export interface IEncryptedEvent { type: "encrypted-event-received";
                                   value: { type? : string;
                                            data : ArrayBuffer |
                                                   Uint8Array; }; }

// Sent when a MediaKeys has been created (or is already created) for the
// current content.
// This is necessary before creating a MediaKeySession which will allow
// encryption keys to be communicated.
export interface ICreatedMediaKeysEvent { type: "created-media-keys";
                                          value: IMediaKeysInfos; }

// Sent when the created (or already created) MediaKeys is attached to the
// current HTMLMediaElement element.
// On some peculiar devices, we have to wait for that step before the first
// media segments are to be pushed to avoid issues.
// Because this event is sent after a MediaKeys is created, you will always have
// a "created-media-keys" event before an "attached-media-keys" event.
export interface IAttachedMediaKeysEvent { type: "attached-media-keys";
                                           value: IMediaKeysInfos; }

// Emitted when the initialization data received through an encrypted event or
// through the EMEManager argument can already be decipherable without going
// through the usual license-fetching logic.
// This is usually because the MediaKeySession for this encryption key has
// already been created.
export interface IInitDataIgnoredEvent { type: "init-data-ignored";
                                         value : { type? : string;
                                                   data : ArrayBuffer |
                                                          Uint8Array; }; }

// Emitted when a "message" event is sent.
// Those events generally allows the CDM to ask for data such as the license or
// a server certificate.
// As such, we will call the corresponding `getLicense` callback immediately
// after this event is sent.
//
// Depending on the return of the getLicense call, we will then either emit a
// "warning" event and retry the call (for when it failed but will be retried),
// throw (when it failed with no retry left and no fallback policy is set), emit
// a "blacklist-protection-data-event" (for when it failed with no retry left
// but a fallback policy is set), emit a "session-updated" event (for when the
// call resolved with some data) or emit a "no-update" event (for when the call
// resolved with `null`).
export interface ISessionMessageEvent { type: "session-message";
                                        value : { messageType : string;
                                                  initData : Uint8Array;
                                                  initDataType? : string; }; }

// Emitted when a `getLicense` call resolves with null.
// In that case, we do not call `MediaKeySession.prototype.update` and no
// `session-updated` event will be sent.
export interface INoUpdateEvent { type : "no-update";
                                  value : { initData : Uint8Array;
                                            initDataType? : string; }; }

// Emitted after the `MediaKeySession.prototype.update` function resolves.
// This function is called when the `getLicense` callback resolves with a data
// different than `null`.
export interface ISessionUpdatedEvent { type: "session-updated";
                                        value: { session: MediaKeySession |
                                                          ICustomMediaKeySession;
                                                 license: ILicense|null;
                                                 initData : Uint8Array;
                                                 initDataType? : string; }; }

// Emitted when individual keys are considered undecipherable and are thus
// blacklisted.
// Emit the corresponding keyIDs as payload.
export interface IBlacklistKeysEvent { type : "blacklist-keys";
                                       value: ArrayBuffer[]; }

// Emitted when specific "protection data" cannot be deciphered and is thus
// blacklisted.
// The `data` and `type` value correspond respectively to the `initData` (which
// can be, for example, a concatenation of PSSH boxes when pusing ISOBMFF
// segments) and `initDataType` of an `encrypted` event (or of the event sent
// through the EMEManager argument).
export interface IBlacklistProtectionDataEvent { type: "blacklist-protection-data";
                                                 value: { type : string;
                                                          data : Uint8Array; }; }

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

export type ILicense = TypedArray |
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
  keySystemAccess: ICompatMediaKeySystemAccess |
                   ICustomMediaKeySystemAccess;
  keySystemOptions: IKeySystemOption;
}

// Infos identyfing a single MediaKey
export interface IMediaKeysInfos {
  mediaKeySystemAccess: ICompatMediaKeySystemAccess |
                        ICustomMediaKeySystemAccess;
  keySystemOptions: IKeySystemOption; // options set by the user
  mediaKeys : MediaKeys |
              ICustomMediaKeys;
  sessionsStore : SessionsStore;
  sessionStorage : PersistedSessionsStore|null;
}

// Data stored in a persistent MediaKeySession storage
// Has to be versioned to be able to play sessions persisted in an old
// RxPlayer version when in a new one.
export type IPersistedSessionInfo = IPersistedSessionInfoV1 |
                                    IPersistedSessionInfoV0;

export interface IPersistedSessionInfoV1 { version : 1;
                                           sessionId : string;
                                           initData : Uint8Array;
                                           initDataType? : string | undefined; }

export interface IPersistedSessionInfoV0 { version? : undefined;
                                           sessionId : string;
                                           // This initData is a hash of a real
                                           // one. Here we don't handle
                                           // collision.
                                           initData : number;
                                           initDataType? : string | undefined; }

// MediaKeySession storage interface
export interface IPersistedSessionStorage { load() : IPersistedSessionInfo[];
                                            save(x : IPersistedSessionInfo[]) : void; }

export type TypedArray = Int8Array |
                         Int16Array |
                         Int32Array |
                         Uint8Array |
                         Uint16Array |
                         Uint32Array |
                         Uint8ClampedArray |
                         Float32Array |
                         Float64Array;

// Options given by the caller
export interface IKeySystemOption {
  type : string;
  getLicense : (message : Uint8Array, messageType : string)
                 => Promise<TypedArray |
                            ArrayBuffer |
                            null> |
                    TypedArray |
                    ArrayBuffer |
                    null;
  getLicenseConfig? : { retry? : number;
                        timeout? : number; };
  serverCertificate? : ArrayBuffer | TypedArray;
  persistentLicense? : boolean;
  licenseStorage? : IPersistedSessionStorage;
  persistentStateRequired? : boolean;
  distinctiveIdentifierRequired? : boolean;
  closeSessionsOnStop? : boolean;
  onKeyStatusesChange? : (evt : Event, session : MediaKeySession |
                                                 ICustomMediaKeySession)
                           => Promise<TypedArray |
                                      ArrayBuffer |
                                      null> |
                              TypedArray |
                              ArrayBuffer |
                              null;
  videoRobustnesses?: Array<string|undefined>;
  audioRobustnesses?: Array<string|undefined>;
  throwOnLicenseExpiration? : boolean;
  disableMediaKeysAttachmentLock? : boolean;
  fallbackOn? : { keyInternalError? : boolean;
                  keyOutputRestricted? : boolean; };
}
