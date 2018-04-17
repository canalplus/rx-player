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

import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import Manifest, {
  Adaptation,
  IRepresentationIndex,
  ISegment,
  Period,
  Representation,
} from "../manifest";
import { IBifThumbnail } from "../parsers/images/bif";

// contains timings info on a single audio/video/text/image segment
export interface ISegmentTimingInfos {
  duration? : number; // duration of the segment. 0 for init segments
  time : number; // start time of the segment. -1 for init segments
  timescale : number; // time unit for seconds conversion.
}

export interface INextSegmentsInfos {
  duration : number;
  time : number;
  timescale : number;
}

// ---- LOADER ----

// -- arguments

// for the manifest pipeline
export interface IManifestLoaderArguments {
  url : string;
}

// for every other pipelines
export interface ISegmentLoaderArguments {
  init? : ISegmentTimingInfos;
  manifest : Manifest;
  period : Period;
  adaptation : Adaptation;
  representation : Representation;
  segment : ISegment;
}

// -- response

export interface ILoaderResponseValue<T> {
  responseData : T;
  duration? : number;
  size? : number;
  url? : string;
}

export interface ILoaderResponse<T> {
  type : "response";
  value : ILoaderResponseValue<T>;
}

// items emitted by net/ pipelines' loaders on xhr progress events
export interface ILoaderProgress {
  type : "progress";
  value : {
    duration : number;
    size : number;
    totalSize? : number; // undefined if the total size is not known
    url : string;
  };
}

// items emitted by net/ pipelines' loaders on xhr response events
interface ILoaderData<T> {
  type : "data";
  value : {
    responseData: T;
  };
}

export type ILoaderEvent<T> =
  ILoaderProgress|ILoaderResponse<T>|ILoaderData<T>;

export type ILoaderObserver<T> = Observer<ILoaderEvent<T>>;

export type ILoaderObservable<T> = Observable<ILoaderEvent<T>>;

// ---- PARSER ----

// -- arguments

export interface IManifestParserArguments<T> {
  response : ILoaderResponseValue<T>;
  url : string;
}

export interface ISegmentParserArguments<T> {
  response : ILoaderResponseValue<T>;
  manifest : Manifest;
  adaptation : Adaptation;
  representation : Representation;
  segment : ISegment;
  init? : ISegmentTimingInfos;
}

// -- response

export interface IManifestResult {
  manifest: IParsedManifest;
  url? : string;
}

export type IManifestParserObservable = Observable<IManifestResult>;

export type SegmentParserObservable = Observable<{
  segmentData : Uint8Array|ArrayBuffer|null;
  segmentInfos : ISegmentTimingInfos|null;
}>;

export interface ITextTrackSegmentData {
  data : string; // text track data, in the given type
  end? : number; // end time until which the segment apply
  language? : string; // language in which the text track is
  start : number; // start time from which the segment apply
  timeOffset : number; // time offset, in seconds, to add to each subtitle
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (examples: "ttml", "srt" or "vtt")
}

export type TextTrackParserObservable = Observable<{
  segmentData : ITextTrackSegmentData|null;
  segmentInfos : ISegmentTimingInfos|null;
}>;

export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timeOffset : number; // time offset, in seconds, to add to each image
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

export type ImageParserObservable = Observable<{
  segmentData : IImageTrackSegmentData|null;
  segmentInfos : ISegmentTimingInfos|null;
}>;

interface ITransportManifestPipeline {
  // TODO Remove resolver
  resolver?: (x : IManifestLoaderArguments) =>
    Observable<IManifestLoaderArguments>;
  loader: (x : IManifestLoaderArguments) =>
    ILoaderObservable<Document|string>;
  parser: (x : IManifestParserArguments<Document|string>) =>
    IManifestParserObservable;
}

interface ITransportSegmentPipelineBase<T> {
  loader : (x : ISegmentLoaderArguments) => ILoaderObservable<T>;
  parser: (x : ISegmentParserArguments<T>) => SegmentParserObservable;
}

export type ITransportVideoSegmentPipeline =
  ITransportSegmentPipelineBase<Uint8Array|ArrayBuffer>;

export type ITransportAudioSegmentPipeline =
  ITransportSegmentPipelineBase<Uint8Array|ArrayBuffer>;

export interface ITransportTextSegmentPipeline {
  // Note: The segment's data can be null for init segments
  loader: (x : ISegmentLoaderArguments) =>
    ILoaderObservable<Uint8Array|ArrayBuffer|string|null>;
  parser: (x : ISegmentParserArguments<Uint8Array|ArrayBuffer|string|null>) =>
    TextTrackParserObservable;
}

export interface ITransportImageSegmentPipeline {
  // Note: The segment's data can be null for init segments
  loader: (x : ISegmentLoaderArguments) =>
    ILoaderObservable<Uint8Array|ArrayBuffer|null>;
  parser: (x : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>) =>
    ImageParserObservable;
}

export type ITransportSegmentPipeline =
  ITransportAudioSegmentPipeline |
  ITransportVideoSegmentPipeline |
  ITransportTextSegmentPipeline |
  ITransportImageSegmentPipeline;

export type ITransportPipeline =
  ITransportManifestPipeline |
  ITransportSegmentPipeline;

export interface ITransportPipelines {
  manifest: ITransportManifestPipeline;
  audio : ITransportAudioSegmentPipeline;
  video : ITransportVideoSegmentPipeline;
  text : ITransportTextSegmentPipeline;
  image : ITransportImageSegmentPipeline;
}

export interface ITransportOptions {
  // every transports
  segmentLoader? : CustomSegmentLoader;

  // smooth only
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => Array<{
    systemId : string;
    privateData : Uint8Array;
  }>;

  // dash only
  // contentProtectionParser? : IContentProtectionParser;
}

export type ITransportFunction = (options? : ITransportOptions) =>
  ITransportPipelines;

export type CustomSegmentLoader = (
  // first argument: infos on the segment
  args : {
    adaptation : Adaptation;
    representation : Representation;
    segment : ISegment;
    transport : string;
    url : string;
    manifest : Manifest;
  },

  // second argument: callbacks
  callbacks : {
    resolve : (args: {
      data : ArrayBuffer|Uint8Array;
      size : number;
      duration : number;
    }) => void;

    reject : (err? : Error) => void;
    fallback? : () => void;
  }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;

export type CustomManifestLoader = (
  // first argument: url of the manifest
  url: string,

  // second argument: callbacks
  callbacks : {
    resolve : (args: {
      data : Document|string;
      size : number;
      duration : number;
    }) => void;

    reject : (err? : Error) => void;
    fallback? : () => void;
  }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;

// TODO move to DASH Segment's privateInfos
export interface IParsedContentProtection {
  schemeIdUri?: string;
  value?: string;
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
