/**
 * Copyright 2019 CANAL+ Group
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

import { IContentProtection as IContentProtectionPSSH, IPersistedSessionData } from "../../../../../core/eme";
import { ContentBufferType } from "../downloader/types";

export type ITypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

export interface IContentProtection {
  contentID: string;
  drmKey: string;
  keySystems: {
    sessionsIDS: IPersistedSessionData[];
    type: string;
  };
}

export interface IUtilsKeySystemsTransaction {
  contentID: string;
  contentProtection$: Subject<IContentProtectionPSSH>;
}

export interface IEMEOptions {
  contentType: ContentBufferType;
  codec: string;
  initSegment: ITypedArray | ArrayBuffer;
}
