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

import { IInbandEvent } from "../core/stream";
import Manifest, {
  Adaptation,
  IExposedAdaptation,
  IExposedManifest,
  IExposedPeriod,
  IExposedRepresentation,
  IExposedSegment,
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
import TaskCanceller, {
  CancellationSignal,
} from "../utils/task_canceller";

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
  audio : ISegmentPipeline<ILoadedAudioVideoSegmentFormat,
                           Uint8Array | ArrayBuffer | null>;
  /** Functions allowing to load an parse video segments. */
  video : ISegmentPipeline<ILoadedAudioVideoSegmentFormat,
                           Uint8Array | ArrayBuffer | null>;
  /** Functions allowing to load an parse text (e.g. subtitles) segments. */
  text : ISegmentPipeline<ILoadedTextSegmentFormat,
                          ITextTrackSegmentData | null>;
  /** Functions allowing to load an parse image (e.g. thumbnails) segments. */
  image : ISegmentPipeline<ILoadedImageSegmentFormat,
                           IImageTrackSegmentData | null>;
}

/** Functions allowing to load and parse the Manifest. */
export interface ITransportManifestPipeline {
  /**
   * "Loader" of the Manifest pipeline, allowing to request a Manifest so it can
   * later be parsed by the `parseManifest` function.
   *
   * @param {string|undefined} url - URL of the Manifest we want to load.
   * `undefined` if the Manifest doesn't have an URL linked to it, in which case
   * the Manifest should be loaded through another mean.
   * @param {CancellationSignal} cancellationSignal - Signal which will allow to
   * cancel the loading operation if the Manifest is not needed anymore (for
   * example, if the content has just been stopped).
   * When cancelled, the promise returned by this function will reject with a
   * `CancellationError`.
   * @returns {Promise.<Object>} - Promise emitting the loaded Manifest, that
   * then can be parsed through the `parseManifest` function.
   *
   * Rejects in two cases:
   *   - The loading operation has been cancelled through the `cancelSignal`
   *     given in argument.
   *     In that case, this Promise will reject with a `CancellationError`.
   *   - The loading operation failed, most likely due to a request error.
   *     In that case, this Promise will reject with the corresponding Error.
   */
  loadManifest : (
    url : string | undefined,
    cancelSignal : CancellationSignal,
  ) => Promise<IRequestedData<ILoadedManifestFormat>>;

  /**
   * "Parser" of the Manifest pipeline, allowing to parse a loaded Manifest so
   * it can be exploited by the rest of the RxPlayer's logic.
   *
   * @param {Object} manifestData - Response obtained from the `loadManifest`
   * function.
   * @param {Object} parserOptions - Various options relative to the parsing
   * operation.
   * @param {Function} onWarnings - Callbacks called:
   *   - when minor Manifest parsing errors are found
   *   - when `scheduleRequest` rejects on requests this function can do
   *     without.
   * @param {CancellationSignal} cancelSignal - Cancellation signal which will
   * allow to abort the parsing operation if you do not want the Manifest
   * anymore.
   *
   * That cancellationSignal can be triggered at any time, such as:
   *   - after a warning is received
   *   - while a request scheduled through the `scheduleRequest` argument is
   *     pending.
   *
   * `parseManifest` will interrupt all operations if the signal has been
   * triggered in one of those scenarios, and will automatically reject with
   * the corresponding `CancellationError` instance.
   * @param {Function} scheduleRequest - Allows `parseManifest` to schedule
   * network requests, for example to fetch sub-parts of the Manifest or
   * supplementary resources we can only know of at Manifest parsing time.
   *
   * All requests scheduled through `scheduleRequest` should abort (and the
   * corresponding Promise reject a `CancellationError`) when/if `cancelSignal`
   * is triggered.
   *
   * If a request scheduled through `scheduleRequest` rejects with an error:
   *   - either the error was due to a cancellation, in which case
   *     `parseManifest` should reject the same error immediately.
   *   - either the requested resource was mandatory to parse the Manifest
   *     in which case `parseManifest` will reject with the same error.
   *   - either the parser can make up for that error, in which case it will
   *     just be emitted as a warning and `parseManifest` will continue its
   *     operations.
   * @returns {Object | Promise.<Object>} - Returns directly the Manifest data
   * if the parsing can be performed synchronously or through a Promise if it
   * needs to perform network requests first through the `scheduleRequest`
   * function.
   *
   * Throws if an error happens synchronously and rejects if it happens
   * asynchronously.
   *
   * If this error is due to a failed request performed through the
   * `scheduleRequest` argument, then the rejected error should be the same one
   * than the one rejected by `scheduleRequest`.
   *
   * If this error is due to a cancellation instead (indicated through the
   * `cancelSignal` argument), then the rejected error should be the
   * `CancellationError` instance instead.
   */
  parseManifest : (
    manifestData : IRequestedData<unknown>,
    parserOptions : IManifestParserOptions,
    onWarnings : (warnings : Error[]) => void,
    cancelSignal : CancellationSignal,
    scheduleRequest : IManifestParserRequestScheduler
  ) => IManifestParserResult |
       Promise<IManifestParserResult>;

  /**
   * @deprecated
   * "Resolves the Manifest's URL, to obtain its true URL.
   * This is a deprecated function which corresponds to an old use case at
   * Canal+ where the URL of the Manifest first need to be parsed from a .wsx
   * file.
   * Thankfully this API should not be used anymore, though to not break
   * compatibility, we have to keep it until a v4.x.x release.
   *
   * @param {string | undefined} url - URL used to obtain the real URL of the
   * Manifest.
   * @param {CancellationSignal} cancelSignal - Cancellation signal which will
   * allow to abort the resolving operation if you do not want the Manifest
   * anymore.
   * When cancelled, the promise returned by this function will reject with a
   * `CancellationError`.
   * @returns {Promise.<string|undefined>} - Promise emitting the "real" URL of
   * the Manifest, that should be loaded by the `loadManifest` function.
   * `undefined` if the URL is either unknown or inexistant.
   *
   * Rejects in two cases:
   *
   *   1. The resolving operation has been aborted through the `cancelSignal`
   *      given in argument.
   *      In that case, this Promise will reject a `CancellationError`.
   *
   *   2. The resolving operation failed, most likely due to a request error.
   *      In that case, this Promise will reject the corresponding Error.
   */
  resolveManifestUrl? : (
    url : string | undefined,
    cancelSignal : CancellationSignal,
  ) => Promise<string | undefined>;
}

/** Functions allowing to load and parse segments of any type. */
export interface ISegmentPipeline<
  TLoadedFormat,
  TParsedSegmentDataFormat,
> {
  loadSegment : ISegmentLoader<TLoadedFormat>;
  parseSegment : ISegmentParser<TLoadedFormat,
                                TParsedSegmentDataFormat>;
}

/**
 * Segment loader function, allowing to load a segment of any type.
 * @param {stop|null} url - URL at which the segment should be downloaded.
 * `null` if we do not have an URL (in which case the segment should be loaded
 * through other means, such as information taken from the segment's content).
 * @param {Object} content - Content linked to the wanted segment.
 * @param {CancellationSignal} cancelSignal - Cancellation signal which will
 * allow to cancel the loading operation if the segment is not needed anymore.
 *
 * When cancelled, this loader should stop any pending operation (such as an
 * HTTP request) and the Promise returned should reject immediately with a
 * `CancellationError`, generated through this CancellationSignal object.
 * @param {Object} callbacks - Callbacks called on various loader events.
 * @returns {Promise.<Object>} - Promise resolving when it has finished loading
 * the segment.
 */
export type ISegmentLoader<TLoadedFormat> = (
  url : string | null,
  content : ISegmentContext,
  cancelSignal : CancellationSignal,
  callbacks : ISegmentLoaderCallbacks<TLoadedFormat>
) => Promise<ISegmentLoaderResultSegmentCreated<TLoadedFormat> |
             ISegmentLoaderResultSegmentLoaded<TLoadedFormat> |
             ISegmentLoaderResultChunkedComplete>;

/**
 * Segment parser function, allowing to parse a chunk (which may be a sub-part
 * of a segment) of any type.
 *
 * This function will throw if it encounters any error it cannot recover from.
 */
export type ISegmentParser<
  TLoadedFormat,
  TParsedSegmentDataFormat
> = (
  /** Attributes of the corresponding loader's response. */
  loadedSegment : {
    /** The loaded segment data. */
    data : TLoadedFormat;
    /**
     * If `true`,`data` is only a "chunk" of the whole segment (which potentially
     * will contain multiple chunks).
     * If `false`, `data` is the data for the whole segment.
     */
    isChunked : boolean;
  },
  /** Context about the wanted segment. */
  content : ISegmentContext,
  /**
   * "Timescale" obtained from parsing the wanted representation's initialization
   * segment.
   *
   * `undefined` if either no such `timescale` has been parsed yet or if this
   * value doesn't exist for the wanted segment.
   *
   * This value can be useful when parsing the loaded segment's data.
   */
  initTimescale : number | undefined
) =>
  /**
   * The parsed data.
   *
   * Can be of two types:
   *   - `ISegmentParserParsedInitChunk`: When the parsed chunk was part of an
   *     initialization segment.
   *     Such segments only serve to initialize the decoder and do not contain
   *     any decodable media data.
   *   - `ISegmentParserParsedMediaChunk`: When the parsed chunk was part of a
   *     media segment.
   *     Such segments generally contain decodable media data.
   */
  ISegmentParserParsedInitChunk<TParsedSegmentDataFormat> |
  ISegmentParserParsedMediaChunk<TParsedSegmentDataFormat>;

export interface IManifestParserOptions {
  /**
   * If set, offset to add to `performance.now()` to obtain the current
   * server's time.
   */
  externalClockOffset : number | undefined;
  /** Original URL used for the full version of the Manifest. */
  originalUrl : string | undefined;
  /** The previous value of the Manifest (when updating). */
  previousManifest : Manifest | null;
  /**
   * If set to `true`, the Manifest parser can perform advanced optimizations
   * to speed-up the parsing process. Those optimizations might lead to a
   * de-synchronization with what is actually on the server, hence the "unsafe"
   * part.
   * To use with moderation and only when needed.
   */
  unsafeMode : boolean;
}

export interface IManifestParserCallbacks {
  onWarning : (warning : Error) => void;

  /**
   * @param {Function} performRequest - Function performing the request
   * @param {TaskCanceller} canceller - Interface allowing to cancel the request
   * performed by the `performRequest` argument.
   * @returns {Promise.<Object>}
   */
  scheduleRequest : (
    performRequest : () => Promise< IRequestedData< Document | string > >,
    canceller : TaskCanceller
  ) =>  Promise< IRequestedData< Document | string > >;
}

/**
 * Function allowing a Manifest parser to perform a request needed for the
 * parsing of the Manifest.
 *
 * @param {Function} performRequest - Function performing the wanted request.
 * Note that this function might be called multiple times depending on the error
 * obtained at the last call.
 *
 * Should resolve with the requested data on success.
 *
 * Rejects in two cases:
 *   - The request has been cancelled through the `canceller` given.
 *     In that case, this Promise will reject with a `CancellationError`.
 *
 *   - The request failed.
 *     In that case, this Promise will reject with the corresponding Error.
 *
 * @param {TaskCanceller} canceller - Interface allowing to cancel the request
 * performed by the `performRequest` argument.
 *
 * When triggered, the request should be aborted and the Promise returned by
 * `performRequest` should reject the corresponding `CancellationError`.
 *
 * The Promise returned by that function should in consequence also reject the
 * same `CancellationError`.
 *
 * @returns {Promise.<Object>} - Promise resolving with the requested data on
 * success.
 *
 * Rejects in two cases:
 *   - The request has been cancelled through the `canceller` given.
 *     In that case, this Promise will reject with a `CancellationError`.
 *
 *   - All the attempts to perform the request failed.
 *     In that case, this Promise will reject with the Error corresponding to
 *     the last performed request.
 */
export type IManifestParserRequestScheduler =
  (
    performRequest : () => Promise< IRequestedData< ILoadedManifestFormat > >
  ) =>  Promise< IRequestedData< ILoadedManifestFormat > >;

// Either the Manifest can be parsed directly, in which case a
// IManifestParserResult is returned, either the Manifest parser needs to
// perform supplementary requests first

/** Event emitted when a Manifest has been parsed by a Manifest parser. */
export interface IManifestParserResult {
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
  url? : string | undefined;
}

/**
 * Allow the parser to ask for loading supplementary ressources while still
 * profiting from the same retries and error management than the loader.
 */
export interface IManifestParserRequestNeeded {
  resultType : "request-needed";
  performRequest : IManifestParserRequest;
}

/**
 * Time information for a single segment.
 * Those variables expose the best guess we have on the effective duration and
 * starting time that the corresponding segment should have at decoding time.
 */
export interface IChunkTimeInfo {
  /**
   * Difference between the latest and the earliest presentation time
   * available in that chunk, in seconds.
   *
   * If multiple chunks are present in a single segment (e.g. low-latency CMAF
   * chunks, this is only the duration of the current chunk).
   *
   * Either `undefined` or set to `0` for an initialization segment.
   */
  duration : number | undefined;
  /** Earliest presentation time available in that segment, in seconds. */
  time : number;
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
  language? : string | undefined;
  /** start time from which the segment apply, in seconds. */
  start? : number | undefined;
  /** end time until which the segment apply, in seconds. */
  end? : number | undefined;
}

/** Format under which image data is decodable by the RxPlayer. */
export interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

export type IManifestParserRequest1 = (
  (
    /**
     * Cancellation signal which will allow to cancel the request if the
     * Manifest is not needed anymore.
     *
     * When cancelled, this parser should stop any pending operation (such as an
     * HTTP request) and the Promise returned should reject immediately after with
     * a `CancellationError`.
     */
    cancelSignal : CancellationSignal,
  ) => Promise< IRequestedData< Document | string > >
);
export type IManifestParserRequest = (
  /**
   * Cancellation signal which will allow to cancel the request if the
   * Manifest is not needed anymore.
   *
   * When cancelled, this parser should stop any pending operation (such as an
   * HTTP request) and the Promise returned should reject immediately after with
   * a `CancellationError`.
   */
  cancelSignal : CancellationSignal,
) => Promise< IManifestParserResult |
              IManifestParserRequestNeeded >;

export interface ITransportAudioVideoSegmentPipeline {
  loadSegment : ISegmentLoader<ILoadedAudioVideoSegmentFormat>;
  parseSegment : ISegmentParser<ILoadedAudioVideoSegmentFormat,
                                Uint8Array | ArrayBuffer | null>;
}

export interface ITransportTextSegmentPipeline {
  loadSegment : ISegmentLoader<ILoadedTextSegmentFormat>;
  parseSegment : ISegmentParser<ILoadedTextSegmentFormat,
                                ITextTrackSegmentData | null>;
}

export interface ITransportImageSegmentPipeline {
  loadSegment : ISegmentLoader<ILoadedImageSegmentFormat>;
  parseSegment : ISegmentParser<ILoadedImageSegmentFormat,
                                IImageTrackSegmentData | null>;
}

export type ITransportSegmentPipeline = ITransportAudioVideoSegmentPipeline |
                                        ITransportTextSegmentPipeline |
                                        ITransportImageSegmentPipeline;

export type ITransportPipeline = ITransportManifestPipeline |
                                 ITransportSegmentPipeline;

interface IServerSyncInfos { serverTimestamp : number;
                             clientTime : number; }

export interface ITransportOptions {
  aggressiveMode? : boolean | undefined;
  checkMediaSegmentIntegrity? : boolean | undefined;
  lowLatencyMode : boolean;
  manifestLoader?: ICustomManifestLoader | undefined;
  manifestUpdateUrl? : string | undefined;
  referenceDateTime? : number | undefined;
  representationFilter? : IRepresentationFilter | undefined;
  segmentLoader? : ICustomSegmentLoader | undefined;
  serverSyncInfos? : IServerSyncInfos | undefined;
  /* eslint-disable import/no-deprecated */
  supplementaryImageTracks? : ISupplementaryImageTrack[] | undefined;
  supplementaryTextTracks? : ISupplementaryTextTrack[] | undefined;
  /* eslint-enable import/no-deprecated */

  __priv_patchLastSegmentInSidx? : boolean | undefined;
}

export type ICustomSegmentLoader = (
  // first argument: infos on the segment
  infos : { url : string;
            manifest : IExposedManifest;
            period : IExposedPeriod;
            adaptation : IExposedAdaptation;
            representation : IExposedRepresentation;
            segment : IExposedSegment; },

  // second argument: callbacks
  callbacks : { resolve : (rArgs : { data : ArrayBuffer | Uint8Array;
                                     sendingTime? : number | undefined;
                                     receivingTime? : number | undefined;
                                     size? : number | undefined;
                                     duration? : number | undefined; }) => void;

                 reject : (err? : unknown) => void;
                 fallback : () => void;
                 progress : (
                   info : { duration : number;
                            size : number;
                            totalSize? : number | undefined; }
                 ) => void;
  }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;

export type ICustomManifestLoader = (
  // first argument: url of the manifest
  url : string | undefined,

  // second argument: callbacks
  callbacks : { resolve : (args : { data : ILoadedManifestFormat;
                                    url? : string | undefined;
                                    sendingTime? : number | undefined;
                                    receivingTime? : number | undefined;
                                    size? : number | undefined;
                                    duration? : number | undefined; })
                          => void;

                 reject : (err? : Error) => void;
                 fallback : () => void; }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;

export interface ISegmentContext {
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
}

export interface ISegmentLoaderCallbacks<T> {
  /**
   * Callback called when new progress information on a segment request is
   * available.
   * The information emitted though this callback can be used to gather
   * metrics on a current, un-terminated, request.
   */
  onProgress : (info : ISegmentLoadingProgressInformation) => void;
  /**
   * Callback called when a decodable sub-part of the segment is available.
   *
   * Note that this callback is only called if the loader decides to load the
   * wanted segment in a "chunk" mode, that is, when the segment is loaded
   * decodable chunk by decodable chunk, each being a subpart of this same
   * segment.
   *
   * In that case, this callback might be called multiple times for subsequent
   * decodable chunks until the Promise resolves.
   *
   * Not all segments are loaded in a "chunk" mode.
   * The alternatives to this mode are:
   *
   *   - when the segment is created locally without needing to perform any
   *     request.
   *
   *   - when the segment is loaded as a whole.
   *
   * In both of those other cases, the segment data can be retrieved in the
   * Promise returned by the segment loader instead.
   */
  onNewChunk : (data : T) => void;
}

/** Information related to a pending Segment request progressing. */
export interface ISegmentLoadingProgressInformation {
  /** Time since the beginning of the request so far, in seconds. */
  duration : number;
  /** Size of the data already downloaded, in bytes. */
  size : number;
  /** Size of whole data to download (data already-loaded included), in bytes. */
  totalSize? : number | undefined;
}

/**
 * Result returned by a segment loader when a segment has been loaded in a
 * "chunk" mode.
 * In that mode, the segment has been divided into multiple decodable chunks
 * each sent in order through the `onNewChunk` callback of the corresponding
 * loader.
 */
export interface ISegmentLoaderResultChunkedComplete {
  resultType : "chunk-complete";
  /** Information on the request performed. */
  resultData : IChunkCompleteInformation;
}

/**
 * Result returned by a segment loader when a segment has been loaded
 * by performing a request.
 */
export interface ISegmentLoaderResultSegmentLoaded<T> {
  resultType : "segment-loaded";
  /** Segment data and information on the request. */
  resultData : IRequestedData<T>;
}

/**
 * Result returned by a segment loader when a segment has been fully
 * created locally and thus did not depend on a request.
 * TODO merge with ISegmentLoaderResultSegmentLoaded?
 */
export interface ISegmentLoaderResultSegmentCreated<T> {
  resultType : "segment-created";
  /** The data iself. */
  resultData : T;
}

/** Data emitted in a `ISegmentLoaderResultChunkedComplete`. */
export interface IChunkCompleteInformation {
  /** Duration the request took to be performed, in seconds. */
  requestDuration : number | undefined;
  /**
   * "Real" URL (post-redirection) at which the segment was loaded.
   *
   * Note that this doesn't always apply e.g. some segment might need multiple
   * URLs to be fetched, some other might need to fetch no URL.
   * This property should only be set when a unique URL is sufficient to
   * retrieve the whole data.
   */
  url? : string | undefined;
  /**
   * Time at which the request began in terms of `performance.now`.
   * If fetching the corresponding data necessitated to perform multiple
   * requests, this time corresponds to the first request made.
   */
  sendingTime? : number | undefined;
  /**
   * Time at which the request ended in terms of `performance.now`.
   * If fetching the corresponding data necessitated to perform multiple
   * requests, this time corresponds to the last request to end.
   */
  receivedTime? : number | undefined;
  /** Size in bytes of the loaded data.  `undefined` if we don't know.  */
  size : number | undefined;
}

/** Format of a loaded Manifest before parsing. */
export type ILoadedManifestFormat = Document |
                                    string |
                                    ArrayBuffer |
                                    IMetaPlaylist |
                                    ILocalManifest |
                                    Manifest;

/** Format of a loaded audio and video segment before parsing. */
export type ILoadedAudioVideoSegmentFormat = Uint8Array |
                                             ArrayBuffer |
                                             null;

/** Format of a loaded text segment before parsing. */
export type ILoadedTextSegmentFormat = Uint8Array |
                                       ArrayBuffer |
                                       string |
                                       null;

/** Format of a loaded image segment before parsing. */
export type ILoadedImageSegmentFormat = Uint8Array |
                                        ArrayBuffer |
                                        null;

/**
 * Result returned by a segment parser when it parsed a chunk from an init
 * segment (which does not contain media data).
 */
export interface ISegmentParserParsedInitChunk<DataType> {
  segmentType : "init";
  /**
   * Initialization segment that can be directly pushed to the corresponding
   * buffer.
   */
  initializationData : DataType | null;
  /**
   * Timescale metadata found inside this initialization segment.
   * That timescale might be useful when parsing further merdia segments.
   */
  initTimescale? : number | undefined;
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
  /**
   * Size in bytes of `initializationData`.
   * `undefined` if unknown.
   *
   * Note: In some cases, such as when `initializationData` is under a format
   * whose size is difficult to estimate (e.g. a JavaScript object), the
   * `initializationDataSize` may either be set to `undefined` or, if available,
   * to a sensible estimate (e.g. when a JavaScript object wraps large binary
   * data, `initializationDataSize` may refer to that binary data only).
   */
  initializationDataSize : number | undefined;
}

/**
 * Result returned by a segment parser when it parsed a chunk from a media
 * segment (which contains media data, unlike an initialization segment).
 */
export interface ISegmentParserParsedMediaChunk<DataType> {
  segmentType : "media";
  /**
   * Parsed chunk of data that can be decoded.
   * `null` if no data was parsed.
   */
  chunkData : DataType | null;
  /**
   * Time information on this parsed chunk.
   * `null` if unknown.
   */
  chunkInfos : IChunkTimeInfo | null;
  /**
   * Size in bytes of `chunkData`.
   * `undefined` if unknown.
   *
   * Note: In some cases, such as when `chunkData` is under a format whose size
   * is difficult to estimate (e.g. a JavaScript object), the `chunkSize` may
   * either be set to `undefined` or, if available, to a sensible estimate (e.g.
   * when a JavaScript object wraps large binary data, `chunkSize` may refer to
   * that binary data only).
   */
  chunkSize : number | undefined;
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
  inbandEvents? : IInbandEvent[] | undefined;
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

/** Describe data loaded through a request. */
export interface IRequestedData<T> {
  /** The loaded response data. */
  responseData : T;
  /** Duration the request took to be performed, in seconds. */
  requestDuration : number | undefined;
  /**
   * "Real" URL (post-redirection) at which the data can be loaded.
   *
   * Note that this doesn't always apply e.g. some data might need multiple
   * URLs to be fetched, some other might need to fetch no URL.
   * This property should only be set when a unique URL is sufficient to
   * retrieve the whole data.
   */
  url? : string | undefined;
  /**
   * Time at which the request began in terms of `performance.now`.
   * If fetching the corresponding data necessitated to perform multiple
   * requests, this time corresponds to the first request made.
   */
  sendingTime? : number | undefined;
  /**
   * Time at which the request ended in terms of `performance.now`.
   * If fetching the corresponding data necessitated to perform multiple
   * requests, this time corresponds to the last request to end.
   */
  receivedTime? : number | undefined;
  /** Size in bytes of the loaded data.  `undefined` if we don't know.  */
  size : number | undefined;
}
