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
  IMockMediaKeys,
} from "../../compat";

export interface IPersistedSessionData {
  sessionId : string;
  initData : number;
}

export interface IPersistedSessionStorage {
  load() : IPersistedSessionData[];
  save(x : IPersistedSessionData[]) : void;
}

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

export interface ICurrentMediaKeysInfos {
  $keySystem: IKeySystemOption|null;
  $mediaKeys: IMockMediaKeys|MediaKeys|null;
  $mediaKeySystemConfiguration: MediaKeySystemConfiguration|null;
  $videoElement: HTMLMediaElement|null;
}

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
