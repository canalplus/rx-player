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

// A minor error happened
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
// This is necessary before creating MediaKeySession which will allow encryption
// keys to be communicated.
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
export interface IAlreadyHandledInitDataEvent { type: "init-data-already-handled";
                                                value: { type? : string;
                                                         data : ArrayBuffer |
                                                                Uint8Array; }; }

// Emitted after a MediaKeySession has been "updated".
// This include for example when a license is pushed, but can also be sent for
// any kind of App->CDM communication.
export interface ISessionUpdatedEvent { type: "session-updated";
                                        value: { session: MediaKeySession |
                                                          ICustomMediaKeySession;
                                                 license: ILicense|null; }; }

// Emitted when individual keys are considered undecipherable and are thus
// blacklisted.
// Emit the corresponding keyIDs as payload.
export interface IBlacklistKeysEvent { type : "blacklist-keys";
                                       value: ArrayBuffer[]; }

// Emitted when specific "protection data" cannot be deciphered and are thus
// blacklisted.
// The `data` and `type` value correspond respectively to the `initData` (which
// can be, for example, a concatenation of PSSH boxes when pusing ISOBMFF
// segments) and `initDataType` of an `encrypted` event (or of the event sent
// through the EMEManager argument).
export interface IBlacklistProtectionDataEvent { type: "blacklist-protection-data";
                                                 value: { type : string;
                                                          data : Uint8Array; }; }

// Every event sent by the EMEManager
export type IEMEManagerEvent = IEMEWarningEvent |
                               IEncryptedEvent |
                               ICreatedMediaKeysEvent |
                               IAttachedMediaKeysEvent |
                               IAlreadyHandledInitDataEvent |
                               ISessionUpdatedEvent |
                               IBlacklistKeysEvent |
                               IBlacklistProtectionDataEvent;

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
export interface IPersistedSessionData { sessionId : string;
                                         initData : number;
                                         initDataType? : string|undefined; }

// MediaKeySession storage interface
export interface IPersistedSessionStorage { load() : IPersistedSessionData[];
                                            save(x : IPersistedSessionData[]) : void; }

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
