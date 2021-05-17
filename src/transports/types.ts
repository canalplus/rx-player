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
import { IInbandEvent } from "../core/stream";
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

/**
 * Interface returned by any transport implementation.
 * @param {Object} options - Options allowing to configure the transport's
 * behavior.
 * @returns {Object} - The "transport pipelines". Those are all APIs for this
 * transport implementation.
 */
export type ITransportFunction = (options : ITransportOptions) =>
  ITransportPipelines;

/**
 * Every API implemented for a transport implementation, allowing to load and
 * parse the Manifest or any segment.
 */
export interface ITransportPipelines {
  /** Functions allowing to load an parse the Manifest for this transport. */
  manifest : ITransportManifestPipeline;
  /** Functions allowing to load an parse audio segments. */
  audio : ISegmentPipeline<Uint8Array | ArrayBuffer | null,
                           Uint8Array | ArrayBuffer | null>;
  /** Functions allowing to load an parse video segments. */
  video : ISegmentPipeline<Uint8Array | ArrayBuffer | null,
                           Uint8Array | ArrayBuffer | null>;
  /** Functions allowing to load an parse text (e.g. subtitles) segments. */
  text : ISegmentPipeline<Uint8Array | ArrayBuffer | string | null,
                          ITextTrackSegmentData | null>;
  /** Functions allowing to load an parse image (e.g. thumbnails) segments. */
  image : ISegmentPipeline<Uint8Array | ArrayBuffer | null,
                           IImageTrackSegmentData | null>;
}

/** Functions allowing to load and parse the Manifest. */
export interface ITransportManifestPipeline { resolver? : IManifestResolverFunction;
                                              loader : IManifestLoaderFunction;
                                              parser : IManifestParserFunction; }

/**
 * @deprecated
 * "Resolves the Manifest's URL, to obtain its true URL.
 * This is a deprecated function which corresponds to an old use case at
 * Canal+ where the URL of the Manifest first need to be parsed from a .wsx
 * file.
 * Thankfully this API should not be used anymore, though to not break
 * compatibility, we have to keep it until a v4.x.x release.
 *
 * @param {Object} x - Object containing the URL used to obtain the real URL of
 * the Manifest.
 * @returns {Observable.<Object>}
 */
export type IManifestResolverFunction =
  (x : IManifestLoaderArguments) => Observable<IManifestLoaderArguments>;

/**
 * "Loader" of the Manifest pipeline, allowing to request a Manifest so it can
 * later be parsed by the `parseManifest` function.
 *
 * @param {Object} x - Object containing the URL of the Manifest we want to
 * load.
 * @returns {Observable.<Object>}
 */
export type IManifestLoaderFunction =
  (x : IManifestLoaderArguments) => Observable<IManifestLoaderEvent>;

/**
 * "Parser" of the Manifest pipeline, allowing to parse a loaded Manifest so
 * it can be exploited by the rest of the RxPlayer's logic.
 *
 * @param {Object} x
 * @returns {Observable.<Object>}
 */
export type IManifestParserFunction = (
  x : IManifestParserArguments
) => Observable< IManifestParserResponseEvent |
                 IManifestParserWarningEvent>;

/** Functions allowing to load and parse segments of any type. */
export interface ISegmentPipeline<
  TLoadedFormat,
  TParsedSegmentDataFormat,
> {
  loader : ISegmentLoader<TLoadedFormat>;
  parser : ISegmentParser<TLoadedFormat,
                          TParsedSegmentDataFormat>;
}

/**
 * Segment loader function, allowing to load a segment of any type.
 * @param {Object} x
 * @returns {Observable.<Object>}
 */
export type ISegmentLoader<TLoadedFormat> = (
  x : ISegmentLoaderArguments
) => Observable<ISegmentLoaderEvent<TLoadedFormat>>;

/**
 * Segment parser function, allowing to parse a segment of any type.
 * @param {Object} x
 * @returns {Observable.<Object>}
 */
export type ISegmentParser<
  TLoadedFormat,
  TParsedSegmentDataFormat
> = (
  x : ISegmentParserArguments< TLoadedFormat >
) =>
  /**
   * The parsed data.
   *
   * Can be of two types:
   *   - `ISegmentParserParsedInitSegment`: When the parsed segment was an
   *     initialization segment.
   *     Such segments only serve to initialize the decoder and do not contain
   *     any decodable media data.
   *   - `ISegmentParserParsedSegment`: When the parsed segment was a media
   *     segment.
   *     Such segments generally contain decodable media data.
   */
  ISegmentParserParsedInitSegment<TParsedSegmentDataFormat> |
  ISegmentParserParsedSegment<TParsedSegmentDataFormat>;

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
                              ArrayBuffer |
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
export interface ISegmentLoaderDataLoadedEvent<T> {
  type : "data-loaded";
  value : ILoaderDataLoadedValue<T>;
}

/**
 * Event emitted by a segment loader when the data is available without needing
 * to perform any request.
 *
 * Such data are for example directly generated from already-available data,
 * such as properties of a Manifest.
 */
export interface ISegmentLoaderDataCreatedEvent<T> {
  type : "data-created";
  value : { responseData : T };
}

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
    Observable< ILoaderDataLoadedValue< string | Document | ArrayBuffer > >) =>
    Observable< ILoaderDataLoadedValue< string | Document | ArrayBuffer > >;
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
    /**
     * The loaded data.
     *
     * Possibly in Uint8Array or ArrayBuffer form if chunked (see `isChunked`
     * property) or loaded through custom loaders.
     */
    data: T | Uint8Array | ArrayBuffer;
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
   * Either `undefined` or set to `0` for an initialization segment.
   */
  duration : number | undefined;
  /** Earliest presentation time available in that segment, in seconds. */
  time : number;
}

/** Result returned by a segment parser when it parsed an initialization segment. */
export interface ISegmentParserParsedInitSegment<DataType> {
  segmentType : "init";
  /**
   * Initialization segment that can be directly pushed to the corresponding
   * buffer.
   */
  initializationData : DataType;
  /**
   * Timescale metadata found inside this initialization segment.
   * That timescale might be useful when parsing further merdia segments.
   */
  initTimescale? : number;
  /**
   * If set to `true`, some protection information has been found in this
   * initialization segment and lead the corresponding `Representation`
   * object to be updated with that new information.
   *
   * In that case, you can re-check any encryption-related information with the
   * `Representation` linked to that segment.
   *
   * In the great majority of cases, this is set to `true` when new content
   * protection initialization data to have been encountered.
   */
  protectionDataUpdate : boolean;
}

/**
 * Result returned by a segment parser when it parsed a media segment (not an
 * initialization segment).
 */
export interface ISegmentParserParsedSegment<DataType> {
  segmentType : "media";
  /** Parsed chunk of data that can be decoded. */
  chunkData : DataType;
  /** Time information on this parsed chunk. */
  chunkInfos : IChunkTimeInfo | null;
  /**
   * time offset, in seconds, to add to the absolute timed data defined in
   * `chunkData` to obtain the "real" wanted effective time.
   *
   * For example:
   *   If `chunkData` announces (when parsed by the demuxer or decoder) that the
   *   segment begins at 32 seconds, and `chunkOffset` equals to `4`, then the
   *   segment should really begin at 36 seconds (32 + 4).
   *
   * Note that `chunkInfos` needs not to be offseted as it should already
   * contain the correct time information.
   */
  chunkOffset : number;
  /**
   * start and end windows for the segment (part of the chunk respectively
   * before and after that time will be ignored).
   * `undefined` when their is no such limitation.
   */
  appendWindow : [ number | undefined,
                   number | undefined ];
  /**
   * If set and not empty, then "events" have been encountered in this parsed
   * chunks.
   */
  inbandEvents? : IInbandEvent[]; // Inband events parsed from segment data
  /**
   * If set to `true`, then parsing this chunk revealed that the current
   * Manifest instance needs to be refreshed.
   */
  needsManifestRefresh?: boolean;
  /**
   * If set to `true`, some protection information has been found in this
   * media segment and lead the corresponding `Representation` object to be
   * updated with that new information.
   *
   * In that case, you can re-check any encryption-related information with the
   * `Representation` linked to that segment.
   *
   * In the great majority of cases, this is set to `true` when new content
   * protection initialization data to have been encountered.
   */
  protectionDataUpdate : boolean;
}

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

/** Format under which image data is decodable by the RxPlayer. */
export interface IImageTrackSegmentData {
  /** Exploitable image track data. */
  data : IBifThumbnail[];
  /** End time time until which the segment apply, in the timescale given. */
  end : number;
  /** Start time time from which the segment apply, in the timescale given. */
  start : number;
  /** Timescale to convert the `start` and `end` properties into seconds. */
  timescale : number;
  /** The format the data is in (example: "bif"). */
  type : "bif";
}

interface IServerSyncInfos { serverTimestamp : number;
                             clientTime : number; }

export interface ITransportOptions {
  aggressiveMode? : boolean;
  checkMediaSegmentIntegrity? : boolean;
  lowLatencyMode : boolean;
  manifestLoader?: CustomManifestLoader;
  manifestUpdateUrl? : string;
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
