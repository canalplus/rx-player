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
                                    value : ICustomError |
                                            Error; }

export interface ICreatedMediaKeysEvent { type: "created-media-keys";
                                          value: IMediaKeysInfos; }

export interface IAttachedMediaKeysEvent { type: "attached-media-keys";
                                           value: IMediaKeysInfos; }

export type IEMEManagerEvent = IEMEWarningEvent |
                               ICreatedMediaKeysEvent |
                               IAttachedMediaKeysEvent |
                               IMediaKeySessionEvents;

export type ILicense = TypedArray |
                       ArrayBuffer;

export interface IMediaKeySessionEvents { type : MediaKeyMessageType |
                                                 "key-status-change" |
                                                 "session-updated";
                                          value : { session? :
                                                      MediaKeySession |
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
                                         initDataType : string|undefined; }

// MediaKeySession storage interface
export interface IPersistedSessionStorage { load() : IPersistedSessionData[];
                                            save(x : IPersistedSessionData[]) : void; }

type TypedArray = Int8Array |
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

// Keys are the different key statuses possible.
// Values are ``true`` if such key status defines an error
/* tslint:disable no-object-literal-type-assertion */
export const KEY_STATUS_ERRORS = { "internal-error": true,
                                   expired: false,
                                   released: false,
                                   "output-restricted": false,
                                   "output-downscaled": false,
                                   "status-pending": false,
                                 } as Partial<Record<string, boolean>>;
/* tslint:enable no-object-literal-type-assertion */
