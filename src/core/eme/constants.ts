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
  IMediaKeySession,
  IMediaKeySystemAccess,
  IMockMediaKeys,
} from "../../compat";
import noop from "../../utils/noop";
import OpenSessionsStore from "./open_sessions_store";
import PersistedSessionsStore from "./persisted_session_store";

// Infos indentifying a MediaKeySystemAccess
export interface IKeySystemAccessInfos {
  keySystemAccess: IMediaKeySystemAccess;
  keySystemOptions: IKeySystemOption;
}

// Infos identyfing a single MediaKey
export interface IMediaKeysInfos {
  keySystemAccess: IMediaKeySystemAccess;
  keySystemOptions: IKeySystemOption;
  mediaKeys : MediaKeys|IMockMediaKeys;
}

// Infos identyfing a single MediaKeySession
export interface IMediaKeySessionInfos {
  keySystemAccess: IMediaKeySystemAccess;
  keySystemOptions: IKeySystemOption;
  mediaKeys : MediaKeys|IMockMediaKeys;
  mediaKeySession : MediaKeySession|IMediaKeySession;
  initData : Uint8Array;
  initDataType : string;
}

// Data stored in a persistent MediaKeySession storage
export interface IPersistedSessionData {
  sessionId : string;
  initData : number;
}

// MediaKeySession storage interface
export interface IPersistedSessionStorage {
  load() : IPersistedSessionData[];
  save(x : IPersistedSessionData[]) : void;
}

// Options given by the caller
export interface IKeySystemOption {
  type : string;
  getLicense : (message : Uint8Array, messageType : string)
    => Promise<BufferSource>|BufferSource;
  serverCertificate? : ArrayBuffer|TypedArray;
  persistentLicense? : boolean;
  licenseStorage? : IPersistedSessionStorage;
  persistentStateRequired? : boolean;
  distinctiveIdentifierRequired? : boolean;
  closeSessionsOnStop? : boolean;
  onKeyStatusesChange? : (evt : Event, session : IMediaKeySession|MediaKeySession)
    => Promise<BufferSource>|BufferSource;
  videoRobustnesses?: Array<string|undefined>;
  audioRobustnesses?: Array<string|undefined>;
}

// Infos about the current state of the videoElement
export interface ICurrentMediaKeysInfos {
  $keySystemOptions: IKeySystemOption|null;
  $mediaKeys: IMockMediaKeys|MediaKeys|null;
  $mediaKeySystemConfiguration: MediaKeySystemConfiguration|null;
  $videoElement: HTMLMediaElement|null;
}

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
const currentMediaKeysInfos : ICurrentMediaKeysInfos = {
  $mediaKeys: null,  // MediaKeys instance
  $mediaKeySystemConfiguration: null, // active MediaKeySystemConfiguration
  $keySystemOptions: null,
  $videoElement: null,
};

// Keys are the different key statuses possible.
// Values are ``true`` if such key status defines an error
/* tslint:disable no-object-literal-type-assertion */
export const KEY_STATUS_ERRORS = {
  expired: true,
  "internal-error": true,
   // "released",
   // "output-restricted",
   // "output-downscaled",
   // "status-pending",
} as IDictionary<boolean>;
/* tslint:enable no-object-literal-type-assertion */

// default storage in a PersistedSessionSet
// do nothing
// TODO Should not be needed
const emptyStorage = {
  load() { return []; },
  save: noop,
};

const $storedSessions = new PersistedSessionsStore(emptyStorage);
const $loadedSessions = new OpenSessionsStore();

if (__DEV__) {
  // disable typescript warning TODO better way?
  (window as any).$loadedSessions = $loadedSessions;
  (window as any).$storedSessions = $storedSessions;
}

export {
  currentMediaKeysInfos,
  $storedSessions,
  $loadedSessions,
};
