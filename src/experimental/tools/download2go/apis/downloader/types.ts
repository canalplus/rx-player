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

import { IDBPDatabase } from "idb";
import { AsyncSubject } from "rxjs";

import Manifest, {
  ISegment,
  Period,
  Adaptation,
  Representation,
} from "../../../../../manifest";
import { SegmentPipelinesManager } from "../../../../../core/pipelines";
import {
  IEmitterTrigger,
  IDownload2GoEvents,
  IProgressBuilder,
} from "../../types";
import { TypedArray } from "../../../../../core/eme";

export type ContentVideoType = "video" | "audio" | "text";
export type DownloadType = "start" | "resume";

export interface IContext {
  manifest: Manifest;
  period: Period;
  adaptation: Adaptation;
  representation: Representation;
  segment: ISegment;
}
export interface IContextUniq {
  representation: Representation;
  adaptation: Adaptation;
  segment: ISegment;
}

export interface IContextBuilder {
  period: Period;
  contexts: IContextUniq[];
}

export interface IGlobalContext {
  video: IContextBuilder[];
  audio: IContextBuilder[];
  text: IContextBuilder[];
  manifest: Manifest;
}

export interface IContextRicher {
  nextSegments: ISegment[];
  period: Period;
  adaptation: Adaptation;
  representation: Representation;
  id: string;
}

export interface IAdaptationStored {
  type: ContentVideoType;
  audioDescription?: boolean;
  closedCaption?: boolean;
  language?: string;
  representations: Representation[];
}

export interface IAdaptationForPeriodBuilder {
  [id: string]: IAdaptationStored[];
}

export interface IInitSegment {
  nextSegments: ISegment[];
  ctx: IContext;
  contentType: ContentVideoType;
  segmentPipelinesManager: SegmentPipelinesManager<any>;
}

export interface IInitGroupedSegments {
  progress: IProgressBuilder;
  video: IContextRicher[];
  audio: IContextRicher[];
  text: IContextRicher[];
  segmentPipelinesManager: SegmentPipelinesManager<any> | null;
  manifest: Manifest | null;
  type: DownloadType;
}

export interface ISegmentStored {
  contentID: string;
  contentType: ContentVideoType;
  representationID: string;
  segmentKey: string;
  time: number;
  timescale: number;
  duration: number;
  isInitData: boolean;
  data: TypedArray | ArrayBuffer;
  size: number;
}

export interface IUtilsNotification {
  emitter: IEmitterTrigger<IDownload2GoEvents>;
  db: IDBPDatabase;
}

export interface IUtils {
  emitter: IEmitterTrigger<IDownload2GoEvents>;
  db: IDBPDatabase;
  pause$: AsyncSubject<void>;
  contentID: string;
}

export interface IManifestDBState {
  progress: IProgressBuilder;
  manifest: Manifest | null;
  video: IContextRicher[];
  audio: IContextRicher[];
  text: IContextRicher[];
  size: number;
}

export interface ICustomSegment {
  chunkData: Uint8Array;
  ctx: IContext;
  index: number;
  contentType: ContentVideoType;
  representationID: string;
  isInitData: boolean;
  nextSegments?: ISegment[];
  progress?: IProgressBuilder;
  type: DownloadType;
}

export interface ISegmentPipelineContext {
  type: DownloadType;
  progress?: IProgressBuilder;
  isInitData: boolean;
  segmentPipelinesManager: SegmentPipelinesManager<any>;
  nextSegments?: ISegment[];
}
