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

import { AsyncSubject, ReplaySubject, Subscription } from "rxjs";

import { IKeySystemOption } from "../../../../../core/eme/types";
import { ISegment } from "../../../../../manifest";
import { ISidxSegment } from "../../../../../parsers/containers/isobmff";
import {
  ISettingsDownloader,
  IProgressBarBuilderAbstract,
  videoSettingsQualityInputType,
} from "../../types";
import { TypedArray } from "../drm/keySystems";

export interface IRepresentation {
  segmentBase: { indexRange: [number, number] | never[] };
  initialization: {
    range: [number, number] | never[];
    mediaURL: string | null;
  };
}

export enum Quality {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export interface ISegmentsBuiltType {
  data: ArrayBuffer;
  duration: number;
  timescale: number;
  time: number;
}

export interface IOptionsBuilder {
  quality: [number, number] | videoSettingsQualityInputType;
  contentID: string;
  keySystemsOptions?: IKeySystemOption;
}

export interface ILoaderBuilder {
  id: string;
  contentID: string;
  duration?: number;
  codecs?: string;
  keySystemsOptions?: IKeySystemOption;
  type: string;
}

export interface IEmitterLoaderBuilder {
  id: string;
  segmentDownloaded: number;
  totalSegments?: number;
  size?: number;
}

export interface IProgressBarBuilder {
  progress: number;
  overall: number;
  downloadedID: string[];
}

export interface IVideoSettings {
  quality: [number, number] | videoSettingsQualityInputType;
  keySystems?: IKeySystemOption;
}

export interface ILocalIndexSegmentOnline {
  duration: number;
  time: number;
  timescale: number;
  data: ArrayBuffer | Uint8Array;
  size: number;
}

export interface ILocalIndexOnline {
  init?: string | null;
  segments: Array<ISegmentBuilder | SegmentBuilt>;
}

export interface ILocalRepresentationOnline {
  bitrate: number;
  mimeType: string;
  codecs: string;
  width?: number;
  height?: number;
  id: string;
  index: ILocalIndexOnline;
}

export interface ILocalAdaptationOnline {
  type: "audio" | "video" | "text" | "thumbnail";
  audioDescription?: boolean;
  closedCaption?: boolean;
  language?: string;
  representations: ILocalRepresentationOnline[];
}

export interface ILocalPeriodOnline {
  start: number;
  duration: number;
  adaptations: ILocalAdaptationOnline[];
}

export interface ILocalManifestOnline {
  version: string;
  duration: number;
  periods: ILocalPeriodOnline[];
  isFinished: boolean;
}

export interface ISegmentBuilder {
  segment: ISidxSegment | ISegment;
  utils: {
    type: "TemplateRepresentationIndex" | "BaseRepresentationIndex";
    id: string;
    contentID: string;
    url: string;
    segmentKey: [string, number];
  };
}

export type SegmentBuilt = [[string, number], number, number, number];

export type SegmentIndex =
  | {
      dataInit: TypedArray | ArrayBuffer;
      mediaURL: string | null;
      nextSegmentsRanges?: ISegment[];
      duration?: number;
      type: "TemplateRepresentationIndex";
    }
  | {
      dataInit: TypedArray;
      mediaURL: string | null;
      duration: number;
      nextSegmentsRanges: ISidxSegment[] | null;
      type: "BaseRepresentationIndex";
    };

export interface IDownloadManagerOutput {
  manifest: ILocalManifestOnline;
  size: number;
  progress: number;
  progressBarBuilder: IProgressBarBuilder;
}

export type settingsType =
  | ISettingsDownloader
  | {
      contentID: string;
      rxpManifest: ILocalManifestOnline;
      type: "resume";
      metaData?: {
        [prop: string]: any;
      };
    };

export interface IActiveSubs {
  [contentID: string]: Subscription;
}

export interface IPauseSubject {
  [contentID: string]: AsyncSubject<void>;
}

export interface IDownloaderManagerAbstract {
  settings: settingsType;
  activeSubsDownloader: IActiveSubs;
  progress$: ReplaySubject<IProgressBarBuilderAbstract>;
  pause$: AsyncSubject<void>;
  progressSetupUnsubFn: any;
}

export interface IProgressBarBuilderDownload {
  size: number;
  progressBarBuilder: IProgressBarBuilder;
  progress$: ReplaySubject<IProgressBarBuilderAbstract>;
  pause$: AsyncSubject<void>;
  activeSubsDownloader: IActiveSubs;
}
