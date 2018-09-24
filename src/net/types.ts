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
  Observable,
  Observer,
} from "rxjs";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../manifest";
import { IBifThumbnail } from "../parsers/images/bif";
import { IParsedManifest } from "../parsers/manifest/types";

// Contains timings informations on a single segment.
// Those variables expose the best guess we have on the effective duration and
// starting time that the corresponding segment should have at decoding time.
export interface ISegmentTimingInfos {
  duration? : number; // duration of the segment in the corresponding timescale
                      // (see timescale).
                      // 0 for init segments
  time : number; // effective start time of the segment at decoding time in the
                 // corresponding timescale (see timescale).
                 // -1 for init segments
  timescale : number; // time unit for seconds conversion.
                      // e.g.:
                      //   timeInSeconds = time / timescale
                      //   durationInSeconds = duration / timescale
}

export interface INextSegmentsInfos {
  duration : number; // duration of the segment, in the corresponding timescale
  time : number; // start time of the segment, in the corresponding timescale
  timescale : number; // convert duration and time into seconds
}

// ---- LOADER ----

// -- arguments

// loader argument for the manifest pipeline
export interface IManifestLoaderArguments {
  url : string; // URL of the concerned manifest
}

// loader argument for every other pipelines
export interface ISegmentLoaderArguments {
  init? : ISegmentTimingInfos; // Infos about the initialization segment of the
                               // corresponding Representation
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
  manifest: IParsedManifest; // the manifest itself
  url? : string; // final URL of the manifest
}

export type IManifestParserObservable = Observable<IManifestResult>;

export type SegmentParserObservable = Observable<{
  segmentData : Uint8Array|ArrayBuffer|null; // Data to decode
  segmentInfos : ISegmentTimingInfos|null; // Timing infos about the segment
  segmentOffset : number; // time offset, in seconds, to add to the absolute
                          // timed data defined in `segmentData` to obtain the
                          // "real" wanted effective time.
                          //
                          // For example:
                          //   If `segmentData` anounce that the segment begins
                          //   at 32 seconds, and `segmentOffset` equals to `4`,
                          //   then the segment should really begin at 36
                          //   seconds (32 + 4).
                          //
                          // Note that `segmentInfos` needs not to be offseted
                          // as it should already contain the correct time
                          // information.
}>;

export interface ITextTrackSegmentData {
  data : string; // text track data
  end? : number; // end time until which the segment apply, timescaled
  language? : string; // language in which the text track is, as a language code
  start : number; // start time from which the segment apply, timescaled
  timescale : number; // timescale to convert `start` and `end` into seconds
  type : string; // the type of `data` (examples: "ttml", "srt" or "vtt")
}

export type TextTrackParserObservable = Observable<{
  segmentData : ITextTrackSegmentData|null; // Data to parse and decode
  segmentInfos : ISegmentTimingInfos|null; // Timing infos about the segment
  segmentOffset : number; // time offset, in seconds, to add to the absolute
                          // timed data defined in `segmentData` to obtain the
                          // "real" wanted effective times.
}>;

export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

export type ImageParserObservable = Observable<{
  segmentData : IImageTrackSegmentData|null; // Data to parse and decode
  segmentInfos : ISegmentTimingInfos|null; // Timing infos about the segment
  segmentOffset : number; // time offset, in seconds, to add to the absolute
                          // timed data defined in `segmentData` to obtain the
                          // "real" wanted effective times.
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
  ITransportSegmentPipelineBase<Uint8Array|ArrayBuffer|null>;

export type ITransportAudioSegmentPipeline =
  ITransportSegmentPipelineBase<Uint8Array|ArrayBuffer|null>;

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

export interface ITransportStreamOptions {
  transportPipelines : ITransportPipelines;
  customRepresentationFilter? : CustomRepresentationFilter;
}

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

interface IParsedKeySystem {
  systemId : string;
  privateData : Uint8Array;
}

export interface ITransportOptions {
  // every transports
  segmentLoader? : CustomSegmentLoader;
  manifestLoader?: CustomManifestLoader;

  // smooth only
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => IParsedKeySystem[];

  // dash only
  // contentProtectionParser? : IContentProtectionParser;
}

export type CustomRepresentationFilter = (representation: Representation) => boolean;

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
