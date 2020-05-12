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
import { ILocalManifest } from "../parsers/manifest/local";
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

export interface ISegmentProtection { type : string;
                                      data : Uint8Array; }

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
  url : string | null; // URL at which the segment should be downloaded
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
                              IMetaPlaylist |
                              ILocalManifest;
export type IManifestLoaderEvent = ILoaderDataLoaded<ILoadedManifest>;
export type IManifestLoaderObservable = Observable<IManifestLoaderEvent>;
export type IManifestLoaderObserver = Observer<IManifestLoaderEvent>;

export type ISegmentLoaderEvent<T> = ILoaderChunkedDataEvent |
                                     ILoaderRegularDataEvent<T>;

export type ISegmentLoaderObservable<T> = Observable<ILoaderChunkedDataEvent |
                                                     ILoaderRegularDataEvent<T>>;

// ---- PARSER ----

// -- arguments

/** Arguments given to the `parser` function of the Manifest pipeline. */
export interface IManifestParserArguments {
  /** Response obtained from the loader. */
  response : ILoaderDataLoadedValue<unknown>;
  /** URL originally requested. */
  url? : string;
  /**
   * If set, offset to add to `performance.now()` to obtain the current
   * server's time.
   */
  externalClockOffset? : number;
  /** The previous value of the Manifest (when updating). */
  previousManifest : Manifest | null;
  /**
   * Allow the parser to ask for loading supplementary ressources while still
   * profiting from the same retries and error management than the loader.
   */
  scheduleRequest : (request : () =>
    Observable< ILoaderDataLoadedValue< Document | string > >) =>
    Observable< ILoaderDataLoadedValue< Document | string > >;
  /**
   * If set to `true`, the Manifest parser can perform advanced optimizations
   * to speed-up the parsing process. Those optimizations might lead to a
   * de-synchronization with what is actually on the server, hence the "unsafe"
   * part.
   * To use with moderation and only when needed.
   */
  unsafeMode : boolean;
}

export interface ISegmentParserArguments<T> {
  response : { data: T; // Segment's data
               isChunked : boolean; }; // If true, the given response corresponds
                                       // to a chunk of the whole data.
                                       // If false, the response is the whole
                                       // segment.
  initTimescale? : number; // timescale taken from the init segment which might
                           // be useful for the following regular segments.
  content : {
    manifest : Manifest; // Manifest related to this segment
    period : Period; // Period related to this segment
    adaptation : Adaptation; // Adaptation related to this segment
    representation : Representation; // Representation related to this segment
    segment : ISegment; // The segment we want to parse
  };
}

// -- response

/** Event emitted when a Manifest object has been parsed. */
export interface IManifestParserResponseEvent {
  type : "parsed";
  value: {
    /** The parsed Manifest Object itself. */
    manifest : Manifest;
    /** Final - real - URL (post-redirection) of the Manifest. */
    url? : string;
  };
}

/** Event emitted when a minor error was encountered when parsing the Manifest. */
export interface IManifestParserWarningEvent {
  type : "warning";
  value : Error;
}

/** Events emitted by the Manifest parser. */
export type IManifestParserEvent = IManifestParserResponseEvent |
                                   IManifestParserWarningEvent;

/** Observable returned by the Manifest parser. */
export type IManifestParserObservable = Observable<IManifestParserEvent>;

// Format of a parsed initialization segment
export interface ISegmentParserParsedInitSegment<T> {
  initializationData : T | null; // Data to push to initialize the decoder
  initTimescale? : number; // timescale taken from the init segment which might
                           // be useful for the following regular segments.
  segmentProtections : ISegmentProtection[]; // Information about the
                                             // protection put in place
                                            // for the segments in this
                                            // Representation
                                            // Empty if not encrypted.
}

// Format of a parsed regular (non-initialization) segment
export interface ISegmentParserParsedSegment<T> {
  chunkData : T | null; // Data to decode
  chunkInfos : IChunkTimingInfos | null; // Timing infos about the segment
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

// What a segment parser returns when parsing an init segment
export interface ISegmentParserInitSegment<T> {
  type : "parsed-init-segment";
  value : ISegmentParserParsedInitSegment<T>;
}

// What a segment parser returns when parsing a regular (non-init) segment
export interface ISegmentParserSegment<T> {
  type : "parsed-segment";
  value : ISegmentParserParsedSegment<T>;
}

// generic segment parser response
export type ISegmentParserResponse<T> =
  ISegmentParserInitSegment<T> |
  ISegmentParserSegment<T>;

// format under which audio / video data / initialization data is decodable
export type IAudioVideoTrackSegmentData = Uint8Array |
                                          ArrayBuffer;

// format under which text data is decodable
export interface ITextTrackSegmentData {
  data : string; // text track data
  type : string; // the type of `data` (examples: "ttml", "srt" or "vtt")
  language? : string; // language in which the text track is, as a language code
  start? : number; // start time from which the segment apply, timescaled
  end? : number; // end time until which the segment apply, timescaled
  timescale : number; // timescale to convert `start` and `end` into seconds
}

// format under which image data is decodable
export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

// Response from an audio / video segment parser when parsing an init segment
export type IAudioVideoParserInitSegmentResponse =
  ISegmentParserInitSegment< IAudioVideoTrackSegmentData >;

// Response from an audio / video segment parser when parsing a regular segment
export type IAudioVideoParserSegmentResponse =
  ISegmentParserSegment< IAudioVideoTrackSegmentData >;

// Response object returned by the audio's / video's segment parser
export type IAudioVideoParserResponse = IAudioVideoParserInitSegmentResponse |
                                        IAudioVideoParserSegmentResponse;

// Response from a text segment parser when parsing an init segment
export type ITextParserInitSegmentResponse = ISegmentParserInitSegment< null >;

// Response from a text segment parser when parsing a regular segment
export type ITextParserSegmentResponse =
  ISegmentParserSegment< ITextTrackSegmentData >;

// Response object returned by the text's segment parser
export type ITextParserResponse = ITextParserInitSegmentResponse |
                                  ITextParserSegmentResponse;

// Response from a image segment parser when parsing an init segment
export type IImageParserInitSegmentResponse = ISegmentParserInitSegment< null >;

// Response from a image segment parser when parsing a regular segment
export type IImageParserSegmentResponse =
  ISegmentParserSegment< IImageTrackSegmentData >;

// Response object returned by the image's segment parser
export type IImageParserResponse = IImageParserInitSegmentResponse |
                                   IImageParserSegmentResponse;

export type IAudioVideoParserObservable = Observable<IAudioVideoParserResponse>;
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

export type ITransportAudioVideoSegmentLoader =
  (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< Uint8Array |
                                                             ArrayBuffer |
                                                             null >;
export type ITransportAudioVideoSegmentParser =
  (x : ISegmentParserArguments< Uint8Array |
                                ArrayBuffer |
                                null >) => IAudioVideoParserObservable;

export interface ITransportAudioVideoSegmentPipeline {
  loader : ITransportAudioVideoSegmentLoader;
  parser : ITransportAudioVideoSegmentParser;
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

export type ITransportSegmentPipeline = ITransportAudioVideoSegmentPipeline |
                                        ITransportTextSegmentPipeline |
                                        ITransportImageSegmentPipeline;

export type ITransportPipeline = ITransportManifestPipeline |
                                 ITransportSegmentPipeline;

export interface ITransportPipelines { manifest : ITransportManifestPipeline;
                                       audio : ITransportAudioVideoSegmentPipeline;
                                       video : ITransportAudioVideoSegmentPipeline;
                                       text : ITransportTextSegmentPipeline;
                                       image : ITransportImageSegmentPipeline; }

interface IServerSyncInfos { serverTimestamp : number;
                             clientTime : number; }

export interface ITransportOptions {
  aggressiveMode? : boolean;
  checkMediaSegmentIntegrity? : boolean;
  lowLatencyMode : boolean;
  manifestLoader?: CustomManifestLoader;
  referenceDateTime? : number;
  representationFilter? : IRepresentationFilter;
  segmentLoader? : CustomSegmentLoader;
  serverSyncInfos? : IServerSyncInfos;
  /* tslint:disable deprecation */
  supplementaryImageTracks? : ISupplementaryImageTrack[];
  supplementaryTextTracks? : ISupplementaryTextTrack[];
  /* tslint:enable deprecation */
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
