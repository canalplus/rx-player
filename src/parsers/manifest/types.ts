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

import { IRepresentationIndex } from "../../manifest";

export interface IContentProtection {
  systemId? : string;
  keyId : string;
}

export interface IParsedRepresentation {
  // required
  bitrate : number;
  index : IRepresentationIndex;
  id: string;

  // optional
  codecs?: string;
  contentProtections? : IContentProtection[];
  frameRate?: string;
  height?: number;
  mimeType?: string;
  width?: number;
}

export type IParsedAdaptations =
  Partial<Record<string, IParsedAdaptation[]>>;

export interface IParsedAdaptation {
  // required
  id: string;
  representations: IParsedRepresentation[];
  type: string;

  // optional
  audioDescription? : boolean;
  closedCaption? : boolean;
  language?: string;
}

export interface IParsedPeriod {
  // required
  id : string;
  start : number;
  adaptations : IParsedAdaptations;

  // optional
  duration? : number;
  end? : number;
}

export interface IParsedManifest {
  // required
  id: string;
  isLive : boolean;
  periods: IParsedPeriod[];
  transportType: string; // "smooth", "dash" etc.

  // optional
  availabilityEndTime? : number;
  availabilityStartTime? : number;
  baseURL? : string;
  duration? : number;
  lifetime?: number;
  minimumTime? : number;
  presentationLiveGap?: number;
  suggestedPresentationDelay?: number;
  timeShiftBufferDepth?: number;
  utcTimings?: {
    schemaIdUri?: string;
    value?: string;
  }[];
  uris?: string[]; // uris where the manifest can be refreshed
}
