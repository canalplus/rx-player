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

import { IKeySystemOption } from "../../../core/eme";
import Manifest from "../../../manifest";
import { ILocalManifest } from "../../../parsers/manifest/local";
import { IContextRicher } from "./api/downloader/types";

export interface IDownloadArguments extends Partial<ICallbacks> {
  url : string;
  transport : string;
  keySystems? : IKeySystemOption;
  metadata? : any; // Should be a valid JSON Object
  filters? : IRepresentationFilters;
}

export interface ICallbacks {
  onProgress? : (evt: IProgressInfos) => void;
  onError? : (evt: Error) => void;
  onFinished? : () => void;
}

interface IProgressInfos {
  progress : number; // Percentage of progression (in terms of download) from 0 to 100
  size : number; // Size of the downloaded content at time T in bytes
}

export interface IStorageInfo {
  total : number; // total space available in that storage, in bytes
  used : number; // total number of bytes used in that storage
}

export interface IAvailableContent {
  id : string;
  metadata : any; // Should be a valid JSON Object
  size : number; // approximately the storage space taken by this content, in bytes
  duration : number; // Duration of the content (when played from start to end), in secs
  progress : number; // Percentage of progression (in terms of download) from 0 to 100
  isFinished : boolean; // `true` if the content is fully downloaded
  url : string; // original URL given for the download content
  transport : string; // original transport value for the downloaded content
}

export interface IPlaybackInfo {
  getManifest() : ILocalManifest; // type from RxPlayer
  keySystems? : IKeySystemOption[];
}

export interface IInitSettings extends IDownloadArguments {
  contentID: string;
}

export interface IVideoFilterArgs {
  height?: number;
  width?: number;
  bitrate: number;
  id: string|number;
}

export type IVideoRepresentationFilter = (filtersArgs: IVideoFilterArgs[]) => string;

export interface IRepresentationFilters {
  video: IVideoRepresentationFilter;
}

// ****

export interface IStoredManifest {
  url: string;
  contentID: string;
  transport: string;
  manifest: Manifest | null;
  builder: {
    video: IContextRicher[];
    audio: IContextRicher[];
    text: IContextRicher[];
  };
  progress: IProgressInformations;
  size: number;
  metadata?: any;
  duration: number;
}

export interface IProgressInformations {
  percentage: number;
  segmentsDownloaded: number;
  totalSegments: number;
}
