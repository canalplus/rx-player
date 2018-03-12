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

interface IKeySystem {
  systemId : string;
  privateData : Uint8Array;
}

interface IHSSManifestSegment {
  ts : number;
  d? : number;
  r : number;
}

// interface IInitialization {
//   range?: Array<number|null>|null;
//   media?: string|null;
//   indexRange?: Array<number|null>;
// }

// interface IIndex {
//   timeline: IHSSManifestSegment[];
//   timescale: number;
//   initialization?: IInitialization;
//   indexType?: string;
// }

interface IContentProtectionSmooth {
  keyId : string;
  keySystems: IKeySystem[];
}

// interface ISmoothRepresentationIndexIndex {
//   timeline : IHSSManifestSegment[];
//   indexType : "smooth";
//   timescale : number;
//   initialization : {};
// }

interface IRepresentationSmooth {
  // required
  baseURL : string;
  bitrate: number;
  codecPrivateData: string;
  index: IRepresentationIndex;
  id: string;

  // optional
  audiotag?: number;
  bitsPerSample? : number;
  channels? : number;
  codecs?: string;
  height?: number;
  mimeType?: string;
  packetSize?: number;
  samplingRate?: number;
  width?: number;
}

interface IPeriodSmooth {
  id: string;
  adaptations: IAdaptationSmooth[];
  duration: number;
  laFragCount?: number;
}

interface IAdaptationSmooth {
  // -- required --
  id: string;
  type: string;
  representations: IRepresentationSmooth[];

  // -- optional --
  closedCaption? : boolean;
  audioDescription? : boolean;
  name?: string;
  language?: string;
  normalizedLanguage?: string;
}

export interface IParsedRepresentation {
  // required
  baseURL : string;
  bitrate : number;
  index : IRepresentationIndex;
  id: string;

  // optional
  audioSamplingRate?: string;
  audiotag?: number;
  codecs?: string;
  codingDependency?: boolean;
  frameRate?: number;
  height?: number;
  maxPlayoutRate?: number;
  maximumSAPPeriod?: number;
  mimeType?: string;
  profiles?: string;
  qualityRanking?: number;
  segmentProfiles?: string;
  width?: number;

  // TODO move to DASH Segment's privateInfos
  contentProtection?: IParsedContentProtection;
}

export interface IParsedAdaptation {
  // required
  id: string;
  representations: IParsedRepresentation[];
  type: string;

  // optional
  audioDescription? : boolean;
  bitstreamSwitching?: boolean;
  closedCaption? : boolean;
  language?: string;
  maxBitrate?: number;
  maxFrameRate?: number;
  maxHeight?: number;
  maxWidth?: number;
  minBitrate?: number;
  minFrameRate?: number;
  minHeight?: number;
  minWidth?: number;
  name? : string;
  normalizedLanguage? : string;
  par?: string;
  segmentAlignment?: number|boolean;
  subsegmentAlignment?: number|boolean;

  // TODO move to DASH Segment's privateInfos
  contentProtection?: IParsedContentProtection;
}

export interface IParsedPeriod {
  // required
  id : string;
  start : number;
  end? : number;
  adaptations : IParsedAdaptation[];

  // optional
  duration? : number;
  bitstreamSwitching? : boolean;
}

export interface IParsedManifest {
  // required
  availabilityStartTime : number;
  duration: number;
  id: string;
  periods: IParsedPeriod[];
  transportType: string; // "smooth", "dash" etc.
  type: string; // "static" or "dynamic" TODO isLive?
  uris: string[]; // uris where the manifest can be refreshed

  // optional
  availabilityEndTime?: number;
  maxSegmentDuration?: number;
  maxSubsegmentDuration?: number;
  minBufferTime?: number;
  minimumTime? : number;
  minimumUpdatePeriod?: number;
  presentationLiveGap?: number;
  profiles?: string;
  publishTime?: number;
  suggestedPresentationDelay?: number;
  timeShiftBufferDepth?: number;
}

// TODO move to DASH Segment's privateInfos
export interface IParsedContentProtection {
  schemeIdUri?: string;
  value?: string;
}

export {
  IKeySystem,
  IPeriodSmooth,
  IAdaptationSmooth,
  IHSSManifestSegment,
  IRepresentationSmooth,
  IContentProtectionSmooth,
};
