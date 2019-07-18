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

export interface ICreatedMediaKeysEvent { type: "created-media-keys";
                                          value: IMediaKeysInfos; }

export interface IAttachedMediaKeysEvent { type: "attached-media-keys";
                                           value: IMediaKeysInfos; }

export type ILicense = TypedArray |
                       ArrayBuffer;

export interface IKeyMessageHandledEvent { type: "key-message-handled";
                                           value: { session: MediaKeySession |
                                                             ICustomMediaKeySession;
                                                    license: ILicense|null; }; }

export interface IKeyStatusChangeHandledEvent { type: "key-status-change-handled";
                                                value: { session: MediaKeySession |
                                                                  ICustomMediaKeySession;
                                                         license: ILicense|null; }; }

export interface ISessionUpdatedEvent { type: "session-updated";
                                        value: { session: MediaKeySession |
                                                          ICustomMediaKeySession;
                                                 license: ILicense|null; }; }

export type IMediaKeySessionHandledEvents = IKeyMessageHandledEvent |
                                            IKeyStatusChangeHandledEvent |
                                            ISessionUpdatedEvent;

export type IEMEManagerEvent = IEMEWarningEvent |
                               ICreatedMediaKeysEvent |
                               IAttachedMediaKeysEvent |
                               IMediaKeySessionHandledEvents;

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
                                         initDataType : string|undefined; }

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
}
