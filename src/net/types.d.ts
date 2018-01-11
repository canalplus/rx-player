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

import Adaptation from "../manifest/adaptation";
import Manifest from "../manifest/index";
import Representation from "../manifest/representation";
import Segment from "../manifest/segment";

import { IBifThumbnail } from "../parsers/images/bif";

// TODO Refacto to unify those
import { IPeriodDash } from "./dash/types";
import { IPeriodSmooth } from "./smooth/types";

// contains timings info on a single audio/video/text/image segment
export interface ISegmentTimingInfos {
  duration? : number; // duration of the segment. 0 for init segments
  time : number; // start time of the segment. -1 for init segments
  timescale? : number; // time unit for seconds conversion.
                       // might be undefined for init segments.
}

export interface INextSegmentsInfos {
  duration : number;
  time : number;
  timescale : number;
}

export interface ISegmentInformations {
  segment: Segment;
  representation: Representation;
  adaptation: Adaptation|null;
  manifest: Manifest;
  init: IBufferSegmentInfos|null;
}

// ---- RESOLVER ---- TODO delete

export type IResolverObservable = Observable<string>;

// ---- LOADER ----

// -- arguments

type IManifestLoaderArguments = string;

// for every other pipelines
export interface ISegmentLoaderArguments {
  init? : ISegmentTimingInfos|null;
  manifest : Manifest;
  adaptation : Adaptation|null;
  representation : Representation;
  segment : Segment;
}

// -- response

interface ILoaderResponseValue<T> {
  responseData : T;
  duration? : number;
  size? : number;
  url? : string;
}

interface ILoaderResponse<T> {
  type : "response";
  value : ILoaderResponseValue<T>;
}

// items emitted by net/ pipelines' loaders on xhr progress events
interface ILoaderProgress {
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

export type ILoaderObserver<T> = Observer<
  ILoaderProgress|ILoaderResponse<T>|ILoaderData<T>>;

export type ILoaderObservable<T> = Observable<
  ILoaderProgress|ILoaderResponse<T>|ILoaderData<T>>;

// ---- PARSER ----

// -- arguments

export interface IManifestParserArguments<T> {
  response : ILoaderResponseValue<T>;
}

export interface ISegmentParserArguments<T> {
  response : ILoaderResponseValue<T>;
  manifest : Manifest;
  adaptation : Adaptation;
  representation : Representation;
  segment : Segment;
  init? : ISegmentTimingInfos;
}

// -- response

// TODO
export type IManifestParserObservable = Observable<{
  manifest: IParsedManifest;
  url? : string;
}>;

export type SegmentParserObservable = Observable<{
  segmentData? : Uint8Array|ArrayBuffer;
  segmentInfos : ISegmentTimingInfos;
}>;

export interface ITextTrackSegmentData {
  data : string;
  start : number;
  timescale : number;
  // type : "ttml"|"vtt"|"sami"|"smil";
  type : string;
  end? : number;
  language? : string;
  timeOffset : number;
}

export type TextTrackParserObservable = Observable<{
  segmentData? : ITextTrackSegmentData;
  segmentInfos? : ISegmentTimingInfos;
}>;

export type ImageParserObservable = Observable<{
  segmentData? : IBifThumbnail[];
  segmentInfos : ISegmentTimingInfos;
}>;

// Type parameters:
//   - T : Data returned by the Manifest loader fed into the Manifest
//         parser
//   - U : Data returned by the audio segment loader fed into the audio
//         sergment parser
//   - V : Data returned by the video segment loader fed into the video
//         sergment parser
//   - W : Data returned by the text segment loader fed into the text
//         sergment parser
//   - X : Data returned by the image segment loader fed into the image
//         sergment parser
export interface ITransportPipelines<T, U, V, W, X> {
  manifest: {
    resolver?: (x : IManifestLoaderArguments) => IResolverObservable;
    loader: (x : IManifestLoaderArguments) => ILoaderObservable<T>;
    parser: (x : IManifestParserArguments<T>) => IManifestParserObservable;
  };
  audio: {
    loader: (x : ISegmentLoaderArguments) => ILoaderObservable<U>;
    parser: (x : ISegmentParserArguments<U>) => SegmentParserObservable;
  };
  video: {
    loader: (x : ISegmentLoaderArguments) => ILoaderObservable<V>;
    parser: (x : ISegmentParserArguments<V>) => SegmentParserObservable;
  };
  text: {
    loader: (x : ISegmentLoaderArguments) => ILoaderObservable<W>;
    parser: (x : ISegmentParserArguments<W>) => TextTrackParserObservable;
  };
  image: {
    loader: (x : ISegmentLoaderArguments) => ILoaderObservable<X>;
    parser: (x : ISegmentParserArguments<X>) => ImageParserObservable;
  };
}

export type ITransportFunction =
  (options : any) => ITransportPipelines<any, any, any, any, any>;

export type CustomSegmentLoader = (
  // first argument: infos on the segment
  args : {
    adaptation : Adaptation|null;
    representation : Representation;
    segment : Segment;
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

interface IParsedManifest {
  locations?: any[];
  transportType: string;
  id?: string;
  type?: string;
  availabilityStartTime?: Date|number;
  presentationLiveGap?: number;
  accessibility?: string[];
  // representations?: IRepresentationDash[];
  baseURL?: string|null;
  profiles?: string;
  availabilityEndTime?: Date|number;
  publishTime?: Date|number;
  mediaPresentationDuration?: number;
  minimumUpdatePeriod?: number;
  minBufferTime?: number;
  timeShiftBufferDepth?: number;
  suggestedPresentationDelay?: number;
  maxSegmentDuration?: number;
  maxSubsegmentDuration?: number;
  periods: Array<IPeriodDash|IPeriodSmooth>;
}
