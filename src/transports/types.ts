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
import { IEventMessage } from "../parsers/containers/isobmff";
import { IBifThumbnail } from "../parsers/images/bif";
import { ILocalManifest } from "../parsers/manifest/local";
import { IMetaPlaylist } from "../parsers/manifest/metaplaylist";

// ---- Loader arguments ----

/** Arguments for the loader of the manifest pipeline. */
export interface IManifestLoaderArguments {
  /**
   * URL of the Manifest we want to load.
   * `undefined` if the Manifest doesn't have an URL linked to it, in which
   *  case the Manifest should be loaded from another mean.
   */
  url : string | undefined;
}

/** Arguments for the loader of the segment pipelines. */
export interface ISegmentLoaderArguments {
  /** Manifest object related to this segment. */
  manifest : Manifest;
  /** Period object related to this segment. */
  period : Period;
  /** Adaptation object related to this segment. */
  adaptation : Adaptation;
  /** Representation Object related to this segment. */
  representation : Representation;
  /** Segment we want to load. */
  segment : ISegment;
  /**
   * URL at which the segment should be downloaded.
   * `null` if we do not have an URL (in which case the segment should be loaded
   * through an other mean).
   */
  url : string | null;
}

// ---- Loader response ----

/** Payload of a "data-loaded" event. */
export interface ILoaderDataLoadedValue<T> {
  /** The loaded response data. */
  responseData : T;
  /** Duration the request took to be performed, in seconds. */
  duration : number | undefined;
  /**
   * "Real" URL (post-redirection) at which the data can be loaded.
   *
   * Note that this doesn't always apply e.g. some data might need multiple
   * URLs to be fetched, some other might need to fetch no URL.
   * This property should only be set when a unique URL is sufficient to
   * retrieve the whole data.
   */
  url? : string;
  /**
   * Time at which the request began in terms of `performance.now`.
   * If fetching the corresponding data necessitated to perform multiple
   * requests, this time corresponds to the first request made.
   */
  sendingTime? : number;
  /**
   * Time at which the request ended in terms of `performance.now`.
   * If fetching the corresponding data necessitated to perform multiple
   * requests, this time corresponds to the last request to end.
   */
  receivedTime? : number;
  /** Size in bytes of the loaded data.  `undefined` if we don't know.  */
  size : number | undefined;
}

/** Form that can take a loaded Manifest once loaded. */
export type ILoadedManifest = Document |
                              string |
                              IMetaPlaylist |
                              ILocalManifest |
                              Manifest;

/** Event emitted by a Manifest loader when the Manifest is fully available. */
export interface IManifestLoaderDataLoadedEvent {
  type : "data-loaded";
  value : ILoaderDataLoadedValue<ILoadedManifest>;
}

/** Event emitted by a segment loader when the data has been fully loaded. */
export interface ISegmentLoaderDataLoadedEvent<T> { type : "data-loaded";
                                                    value : ILoaderDataLoadedValue<T>; }

/**
 * Event emitted by a segment loader when the data is available without needing
 * to perform any request.
 *
 * Such data are for example directly generated from already-available data,
 * such as properties of a Manifest.
 */
export interface ISegmentLoaderDataCreatedEvent<T> { type : "data-created";
                                                     value : { responseData : T }; }

/**
 * Event emitted by a segment loader when new information on a pending request
 * is available.
 *
 * Note that this event is not mandatory.
 * It will be used to allow to communicate network metrics to the rest of the
 * player, like to adapt the quality of the content depending on the user's
 * bandwidth.
 */
export interface ILoaderProgressEvent {
  type : "progress";
  value : {
    /** Time since the beginning of the request so far, in seconds. */
    duration : number;
    /** Size of the data already downloaded, in bytes. */
    size : number;
    /** Size of whole data to download (data already-loaded included), in bytes. */
    totalSize? : number;
  };
}

/** Event emitted by a segment loader when a chunk of the response is available. */
export interface ISegmentLoaderDataChunkEvent {
  type : "data-chunk";
  value : {
    /** Loaded chunk, as raw data. */
    responseData: ArrayBuffer |
                  Uint8Array;
  };
}

/**
 * Event emitted by segment loaders when all data from a segment has been
 * communicated through `ISegmentLoaderDataChunkEvent` events.
 */
export interface ISegmentLoaderDataChunkCompleteEvent {
  type : "data-chunk-complete";
  value : {
    /** Duration the request took to be performed, in seconds. */
    duration : number | undefined;
    /**
     * "Real" URL (post-redirection) at which the segment was loaded.
     *
     * Note that this doesn't always apply e.g. some segment might need multiple
     * URLs to be fetched, some other might need to fetch no URL.
     * This property should only be set when a unique URL is sufficient to
     * retrieve the whole data.
     */
    url? : string;
    /**
     * Time at which the request began in terms of `performance.now`.
     * If fetching the corresponding data necessitated to perform multiple
     * requests, this time corresponds to the first request made.
     */
    sendingTime? : number;
    /**
     * Time at which the request ended in terms of `performance.now`.
     * If fetching the corresponding data necessitated to perform multiple
     * requests, this time corresponds to the last request to end.
     */
    receivedTime? : number;
    /** Size in bytes of the loaded data.  `undefined` if we don't know.  */
    size : number | undefined;
  };
}

/**
 * Event sent by a segment loader when the corresponding segment is available
 * chunk per chunk.
 */
export type ISegmentLoaderChunkEvent = ISegmentLoaderDataChunkEvent |
                                       ISegmentLoaderDataChunkCompleteEvent;

/** Event emitted by a Manifest loader. */
export type IManifestLoaderEvent = IManifestLoaderDataLoadedEvent;

/** Event emitted by a segment loader. */
export type ISegmentLoaderEvent<T> = ILoaderProgressEvent |
                                     ISegmentLoaderChunkEvent |
                                     ISegmentLoaderDataLoadedEvent<T> |
                                     ISegmentLoaderDataCreatedEvent<T>;

// ---- Parser arguments ----

/** Arguments given to the `parser` function of the Manifest pipeline. */
export interface IManifestParserArguments {
  /** Response obtained from the loader. */
  response : ILoaderDataLoadedValue<unknown>;
  /** Original URL used for the full version of the Manifest. */
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

/** Arguments given to the `parser` function of the segment pipeline. */
export interface ISegmentParserArguments<T> {
  /** Attributes of the corresponding loader's response. */
  response : {
    /** The loaded data. */
    data: T;
    /**
     * If `true`,`data` is only a "chunk" of the whole segment (which potentially
     * will contain multiple chunks).
     * If `false`, `data` is the data for the whole segment.
     */
    isChunked : boolean;
  };
  /**
   * "Timescale" obtained from parsing the wanted representation's initialization
   * segment.
   *
   * `undefined` if either no such `timescale` has been parsed yet or if this
   * value doesn't exist for the wanted segment.
   *
   * This value can be useful when parsing the loaded segment's data.
   */
  initTimescale? : number;
  /** Context about the wanted segment. */
  content : {
    /** Manifest object related to this segment. */
    manifest : Manifest;
    /** Period object related to this segment. */
    period : Period;
    /** Adaptation object related to this segment. */
    adaptation : Adaptation;
    /** Representation Object related to this segment. */
    representation : Representation;
    /** Segment we want to parse. */
    segment : ISegment;
  };
}

// ---- Parser response ----

/** Event emitted when a Manifest object has been parsed. */
export interface IManifestParserResponseEvent {
  type : "parsed";
  value: {
    /** The parsed Manifest Object itself. */
    manifest : Manifest;
    /**
     * "Real" URL (post-redirection) at which the Manifest can be refreshed.
     *
     * Note that this doesn't always apply e.g. some Manifest might need multiple
     * URLs to be fetched, some other might need to fetch no URL.
     * This property should only be set when a unique URL is sufficient to
     * retrieve the whole data.
     */
    url? : string;
  };
}

/** Event emitted when a minor error was encountered when parsing the Manifest. */
export interface IManifestParserWarningEvent {
  type : "warning";
  /** Error describing the minor parsing error encountered. */
  value : Error;
}

/** Events emitted by the Manifest parser. */
export type IManifestParserEvent = IManifestParserResponseEvent |
                                   IManifestParserWarningEvent;

/** Observable returned by the Manifest parser. */
export type IManifestParserObservable = Observable<IManifestParserEvent>;

/**
 * Time information for a single segment.
 * Those variables expose the best guess we have on the effective duration and
 * starting time that the corresponding segment should have at decoding time.
 */
export interface IChunkTimeInfo {
  /**
   * Difference between the latest and the earliest presentation time
   * available in that segment, in seconds.
   *
   * Either `undefined` or set to `0` for initialization segment.
   */
  duration : number | undefined;
  /** Earliest presentation time available in that segment, in seconds. */
  time : number;
}

/** Encryption information linked to a segment. */
export interface ISegmentProtection {
  /**
   * The `initialization data type` of that segment protection information.
   * (https://www.w3.org/TR/encrypted-media/#initialization-data-type)
   */
  type : string;
  /** The segment protection information. */
  data : Uint8Array;
}

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
  chunkInfos : IChunkTimeInfo | null; // Time information about the segment
  chunkOffset : number; // time offset, in seconds, to add to the absolute
                        // timed data defined in `chunkData` to obtain the
                        // "real" wanted effective time.
                        //
                        // For example:
                        //   If `chunkData` announce that the segment begins at
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
  emsgs? : IEventMessage[];
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

/** Text track segment data, once parsed. */
export interface ITextTrackSegmentData {
  /** The text track data, in the format indicated in `type`. */
  data : string;
  /** The format of `data` (examples: "ttml", "srt" or "vtt") */
  type : string;
  /**
   * Language in which the text track is, as a language code.
   * This is mostly needed for "sami" subtitles, to know which cues can / should
   * be parsed.
   */
  language? : string;
  /** start time from which the segment apply, in seconds. */
  start? : number;
  /** end time until which the segment apply, in seconds. */
  end? : number;
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

/**
 * "Resolve" URL of the Manifest.
 *
 * This is just here for legacy reasons. It should not be implemented anymore.
 * TODO Remove resolver
 */
export type IManifestResolverFunction =
  (x : IManifestLoaderArguments) => Observable<IManifestLoaderArguments>;

export type IManifestLoaderFunction =
  (x : IManifestLoaderArguments) => Observable<IManifestLoaderEvent>;

export type IManifestParserFunction =
  (x : IManifestParserArguments) => IManifestParserObservable;

// TODO Remove resolver
export interface ITransportManifestPipeline { resolver? : IManifestResolverFunction;
                                              loader : IManifestLoaderFunction;
                                              parser : IManifestParserFunction; }

export type ITransportAudioVideoSegmentLoader =
  (x : ISegmentLoaderArguments) => Observable<ISegmentLoaderEvent< Uint8Array |
                                                                   ArrayBuffer |
                                                                   null >>;
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
  (x : ISegmentLoaderArguments) => Observable< ISegmentLoaderEvent< Uint8Array |
                                                                    ArrayBuffer |
                                                                    string |
                                                                    null >>;

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
  (x : ISegmentLoaderArguments) => Observable< ISegmentLoaderEvent< Uint8Array |
                                                                    ArrayBuffer |
                                                                    null >>;

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
  /* eslint-disable import/no-deprecated */
  supplementaryImageTracks? : ISupplementaryImageTrack[];
  supplementaryTextTracks? : ISupplementaryTextTrack[];
  /* eslint-enable import/no-deprecated */

  __priv_patchLastSegmentInSidx? : boolean;
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
  callbacks : { resolve : (rArgs : { data : ArrayBuffer | Uint8Array;
                                     sendingTime? : number;
                                     receivingTime? : number;
                                     size? : number;
                                     duration? : number; })
                          => void;

                progress : (pArgs : { duration : number;
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
