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
  IRepresentationFilter,
  ISegment,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
  Period,
  Representation,
} from "../manifest";
import { IBifThumbnail } from "../parsers/images/bif";
import { IMetaPlaylist } from "../parsers/manifest/metaplaylist";

// Contains timings information on a single segment.
// Those variables expose the best guess we have on the effective duration and
// starting time that the corresponding segment should have at decoding time.
export interface IChunkTimingInfos {
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

// Contains timing information on new segments indicated in the metadata of
// a previous segment
export interface INextSegmentsInfos {
  duration : number; // duration of the segment, in the corresponding timescale
  time : number; // start time of the segment, in the corresponding timescale
  timescale : number; // convert duration and time into seconds
}

// ---- LOADER ----

// -- arguments

// Arguments for the loader of the manifest pipeline
export interface IManifestLoaderArguments {
  url? : string; // URL of the concerned manifest
}

// Argument for the loader of the segment pipelines
export interface ISegmentLoaderArguments {
  manifest : Manifest; // Manifest related to this segment
  period : Period; // Period related to this segment
  adaptation : Adaptation; // Adaptation related to this segment
  representation : Representation; // Representation related to this segment
  segment : ISegment; // Segment we want to load
}

// -- response

// Value of a "data-loaded" event
export interface ILoaderDataLoadedValue<T> {
  responseData : T; // The response for the request
  duration? : number; // time in seconds it took to load this content
  size? : number; // size in bytes of this content
  url? : string; // real URL (post-redirection) used to download this content
  sendingTime? : number; // time at which the request was sent (since the time
                         // origin), in ms
  receivedTime? : number; // time at which the request was received (since the
                          // time origin), in ms
}

// Event emitted by a loader with the response after a request completed
export interface ILoaderDataLoaded<T> { type : "data-loaded";
                                        value : ILoaderDataLoadedValue<T>; }

// Event emitted by a loader with the response when it did not perform any request
export interface ILoaderDataCreated<T> { type : "data-created";
                                         value : { responseData : T }; }

// Event emitted by loaders on xhr progress events
export interface ILoaderProgress { type : "progress";
                                   value : { duration : number;
                                             size : number;
                                             totalSize? : number; }; }

// Event emitted by loaders when a chunk of the response is available
export interface ILoaderChunkedData { type : "data-chunk";
                                      value : {
                                        responseData: ArrayBuffer|Uint8Array;
                                      }; }

// Event emitted by loaders when all data has been emitted through chunks
export interface ILoaderChunkedDataComplete { type : "data-chunk-complete";
                                              value : { duration : number;
                                                        receivedTime : number;
                                                        sendingTime : number;
                                                        size : number;
                                                        status : number;
                                                        url : string; }; }

// Events sent by loaders
export type ILoaderChunkedDataEvent = ILoaderChunkedData |
                                      ILoaderProgress |
                                      ILoaderChunkedDataComplete;

export type ILoaderRegularDataEvent<T> = ILoaderProgress |
                                         ILoaderDataLoaded<T> |
                                         ILoaderDataCreated<T>;

export type ILoadedManifest = Document |
                              string |
                              IMetaPlaylist;
export type IManifestLoaderEvent = ILoaderDataLoaded<ILoadedManifest>;
export type IManifestLoaderObservable = Observable<IManifestLoaderEvent>;
export type IManifestLoaderObserver = Observer<IManifestLoaderEvent>;

export type ISegmentLoaderEvent<T> = ILoaderChunkedDataEvent |
                                     ILoaderRegularDataEvent<T>;

export type ISegmentLoaderObservable<T> = Observable<ILoaderChunkedDataEvent |
                                                     ILoaderRegularDataEvent<T>>;

// ---- PARSER ----

// -- arguments

export interface IManifestParserArguments {
  response : ILoaderDataLoadedValue<unknown>; // Response from the loader
  url? : string; // URL originally requested
  externalClockOffset? : number; // If set, offset to add to `performance.now()`
                                 // to obtain the current server's time

  // allow the parser to load supplementary ressources (of type U)
  scheduleRequest : (request : () =>
    Observable< ILoaderDataLoadedValue< Document | string > >) =>
    Observable< ILoaderDataLoadedValue< Document | string > >;
}

export interface ISegmentParserArguments<T> {
  response : { data: T; // Segment's data
               isChunked : boolean; }; // If true, the given response corresponds
                                       // to a chunk of the whole data.
                                       // If false, the response is the whole
                                       // segment.

  // TODO just timescale?
  init? : IChunkTimingInfos; // Infos about the initialization segment of the
                             // corresponding Representation
  content : {
    manifest : Manifest; // Manifest related to this segment
    period : Period; // Period related to this segment
    adaptation : Adaptation; // Adaptation related to this segment
    representation : Representation; // Representation related to this segment
    segment : ISegment; // The segment we want to parse
  };
}

// -- response

// Response object returned by the Manifest's parser
export interface IManifestParserResponse {
  manifest : Manifest; // the manifest itself
  url? : string; // final URL of the manifest
}

export type IManifestParserObservable = Observable<IManifestParserResponse>;

export interface ISegmentParserResponse<T> {
  chunkData : T | null; // Data to decode
  chunkInfos : IChunkTimingInfos|null; // Timing infos about the segment
  chunkOffset : number; // time offset, in seconds, to add to the absolute
                        // timed data defined in `chunkData` to obtain the
                        // "real" wanted effective time.
                        //
                        // For example:
                        //   If `chunkData` anounce that the segment begins at
                        //   32 seconds, and `chunkOffset` equals to `4`, then
                        //   the segment should really begin at 36 seconds
                        //   (32 + 4).
                        //
                        // Note that `chunkInfos` needs not to be offseted as
                        // it should already contain the correct time
                        // information.
  appendWindow : [ number | undefined, // start window for the segment
                                       // (part of the segment before that time
                                       // will be ignored)
                   number | undefined ]; // end window for the segment
                                         // (part of the segment after that time
                                         // will be ignored)
}

// Response object returned by the video's segment parser
export type IVideoParserResponse =
  ISegmentParserResponse< Uint8Array | ArrayBuffer >;

// Response object returned by the audio's segment parser
export type IAudioParserResponse =
  ISegmentParserResponse< Uint8Array | ArrayBuffer >;

export interface ITextTrackSegmentData {
  data : string; // text track data
  type : string; // the type of `data` (examples: "ttml", "srt" or "vtt")
  language? : string; // language in which the text track is, as a language code
  start? : number; // start time from which the segment apply, timescaled
  end? : number; // end time until which the segment apply, timescaled
  timescale : number; // timescale to convert `start` and `end` into seconds
}

// Response object returned by the text's segment parser
export type ITextParserResponse =
  ISegmentParserResponse< ITextTrackSegmentData >;

export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

// Response object returned by the image's segment parser
export type IImageParserResponse =
  ISegmentParserResponse< IImageTrackSegmentData >;

export type ISegmentParserObservable<T> = Observable<ISegmentParserResponse<T>>;
export type IVideoParserObservable = Observable<IVideoParserResponse>;
export type IAudioParserObservable = Observable<IAudioParserResponse>;
export type ITextParserObservable = Observable<ITextParserResponse>;
export type IImageParserObservable = Observable<IImageParserResponse>;

// TODO Remove resolver
export type IManifestResolverFunction =
  (x : IManifestLoaderArguments) => Observable<IManifestLoaderArguments>;

export type IManifestLoaderFunction =
  (x : IManifestLoaderArguments) => IManifestLoaderObservable;

export type IManifestParserFunction =
  (x : IManifestParserArguments) => IManifestParserObservable;

// TODO Remove resolver
export interface ITransportManifestPipeline { resolver? : IManifestResolverFunction;
                                              loader : IManifestLoaderFunction;
                                              parser : IManifestParserFunction; }

export type ITransportVideoSegmentLoader =
  (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< Uint8Array |
                                                             ArrayBuffer |
                                                             null >;
export type ITransportVideoSegmentParser =
  (x : ISegmentParserArguments< Uint8Array |
                                ArrayBuffer |
                                null >) => IVideoParserObservable;

export interface ITransportVideoSegmentPipeline {
  loader : ITransportVideoSegmentLoader;
  parser : ITransportVideoSegmentParser;
}

export type ITransportAudioSegmentLoader =
  (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< Uint8Array |
                                                             ArrayBuffer |
                                                             null >;
export type ITransportAudioSegmentParser =
  (x : ISegmentParserArguments< Uint8Array |
                                ArrayBuffer |
                                null >) => IAudioParserObservable;

export interface ITransportAudioSegmentPipeline {
  loader : ITransportAudioSegmentLoader;
  parser : ITransportAudioSegmentParser;
}

// Note: The segment's data can be null for init segments
export type ITransportTextSegmentLoader =
  (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< Uint8Array |
                                                             ArrayBuffer |
                                                             string |
                                                             null >;

export type ITransportTextSegmentParser =
  (x : ISegmentParserArguments< Uint8Array |
                                ArrayBuffer |
                                string |
                                null >) => ITextParserObservable;

export interface ITransportTextSegmentPipeline {
  loader : ITransportTextSegmentLoader;
  parser : ITransportTextSegmentParser;
}

export type ITransportImageSegmentLoader =
  // Note: The segment's data can be null for init segments
  (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< Uint8Array |
                                                             ArrayBuffer |
                                                             null >;

export type ITransportImageSegmentParser =
  (x : ISegmentParserArguments< Uint8Array |
                                ArrayBuffer |
                                null >) => IImageParserObservable;

export interface ITransportImageSegmentPipeline {
  loader : ITransportImageSegmentLoader;
  parser : ITransportImageSegmentParser;
}

export type ITransportSegmentPipeline = ITransportAudioSegmentPipeline |
                                        ITransportVideoSegmentPipeline |
                                        ITransportTextSegmentPipeline |
                                        ITransportImageSegmentPipeline;

export type ITransportPipeline = ITransportManifestPipeline |
                                 ITransportSegmentPipeline;

export interface ITransportPipelines { manifest : ITransportManifestPipeline;
                                       audio : ITransportAudioSegmentPipeline;
                                       video : ITransportVideoSegmentPipeline;
                                       text : ITransportTextSegmentPipeline;
                                       image : ITransportImageSegmentPipeline; }

interface IParsedKeySystem { systemId : string;
                             privateData : Uint8Array; }

interface IServerSyncInfos { serverTimestamp : number;
                             clientTime : number; }

export interface ITransportOptions {
  aggressiveMode? : boolean;
  checkMediaSegmentIntegrity? : boolean;
  keySystems? : (hex? : Uint8Array) => IParsedKeySystem[]; // TODO deprecate
  lowLatencyMode : boolean;
  manifestLoader?: CustomManifestLoader;
  minRepresentationBitrate? : number; // TODO deprecate
  referenceDateTime? : number;
  representationFilter? : IRepresentationFilter;
  segmentLoader? : CustomSegmentLoader;
  serverSyncInfos? : IServerSyncInfos;
  suggestedPresentationDelay? : number;
  supplementaryImageTracks? : ISupplementaryImageTrack[];
  supplementaryTextTracks? : ISupplementaryTextTrack[];
}

export type ITransportFunction = (options : ITransportOptions) =>
                                   ITransportPipelines;

export type CustomSegmentLoader = (
  // first argument: infos on the segment
  args : { adaptation : Adaptation;
           representation : Representation;
           segment : ISegment;
           transport : string;
           url : string;
           manifest : Manifest; },

  // second argument: callbacks
  callbacks : { resolve : (args : { data : ArrayBuffer | Uint8Array;
                                    sendingTime? : number;
                                    receivingTime? : number;
                                    size? : number;
                                    duration? : number; })
                          => void;

                progress : (args : { duration : number;
                                     size : number;
                                     totalSize? : number; })
                           => void;
                reject : (err? : Error) => void;
                fallback? : () => void; }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;

export type CustomManifestLoader = (
  // first argument: url of the manifest
  url : string | undefined,

  // second argument: callbacks
  callbacks : { resolve : (args : { data : ILoadedManifest;
                                    sendingTime? : number;
                                    receivingTime? : number;
                                    size? : number;
                                    duration? : number; })
                          => void;

                 reject : (err? : Error) => void;
                 fallback? : () => void; }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;
