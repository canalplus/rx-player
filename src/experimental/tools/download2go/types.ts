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

import { IKeySystemOption, TypedArray } from "../../../core/eme";
import Manifest from "../../../manifest";
import { ILocalManifest } from "../../../parsers/manifest/local";
import { IContextRicher } from "./api/downloader/types";
import { IContentProtection } from "./api/drm/types";

export type IVideoSettingsQualityInputType = "HIGH" | "MEDIUM" | "LOW";

export interface IGlobalSettings {
  nameDB?: string;
}

export interface IInitSettings {
  url: string;
  transport: "smooth" | "dash";
  contentID: string;
  metaData?: {
    [prop: string]: any;
  };
  adv?: IAdvancedSettings;
  keySystems?: IKeySystemOption;
}

export interface IResumeSettings extends IStoredManifest {
  type: "resume";
}

export interface IStoredManifest {
  contentID: string;
  transport: "smooth" | "dash";
  manifest: Manifest | null;
  builder: {
    video: IContextRicher[];
    audio: IContextRicher[];
    text: IContextRicher[];
  };
  progress: IProgressBuilder;
  size: number;
  metaData?: {
    [prop: string]: any;
  };
  duration: number;
}

export interface IProgressBuilder {
  percentage: number;
  current: number;
  overall: number;
}

export interface IStoredSegmentDB {
  contentID: string;
  representationID: string;
  data: TypedArray | ArrayBuffer;
  time: number;
  timescale: number;
  duration: number;
  isInitData: boolean;
  segmentKey: string;
  size: number;
}

export interface IContentLoader {
  progress: IProgressBuilder;
  size: number;
  transport: "dash" | "smooth";
  contentID: string;
  metaData?: {
    [prop: string]: any;
  };
  contentProtection?: IContentProtection;
  offlineManifest: ILocalManifest;
}

export interface IAdvancedSettings {
  quality?: IVideoSettingsQualityInputType;
}

/***
 *
 * Event Emitter type:
 *
 */

type IArgs<
  TEventRecord,
  TEventName extends keyof TEventRecord
> = TEventRecord[TEventName];

export interface IEmitterTrigger<T> {
  trigger<TEventName extends keyof T>(
    evt: TEventName,
    arg: IArgs<T, TEventName>
  ): void;
}

export interface IDownload2GoEvents {
  progress: {
    contentID: string;
    progress: number;
    size: number;
    status: string;
  };
  error: {
    action: string;
    contentID?: string;
    error: Error;
  };
  insertDB: {
    action: string;
    contentID: string;
    progress: number;
  };
}
