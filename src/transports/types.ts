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
  ISegment,
} from "../manifest";
import {
  IAdaptationType,
  ILoadedManifestFormat,
  IManifestLoader,
  IRepresentationFilter,
  ISegmentLoader as ICustomSegmentLoader,
  IServerSyncInfos,
} from "../public_types";
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
    options : IManifestLoaderOptions,
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
}

/**
 * Options given to the `loadManifest` method of an
 * `ITransportManifestPipeline` to configure its behavior.
 */
export interface IManifestLoaderOptions {
  /**
   * Timeout, in milliseconds, after which a manifest request should be aborted
   * with the corresponding error.
   *
   * `undefined` means that no timeout will be enforced.
   */
  timeout? : number | undefined;
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
 * @param {string|null} url - URL at which the segment should be downloaded.
 * `null` if we do not have an URL (in which case the segment should be loaded
 * through other means, such as information taken from the segment's content).
 * @param {Object} context - Context linked to the wanted segment.
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
  context : ISegmentContext,
  options : ISegmentLoaderOptions,
  cancelSignal : CancellationSignal,
  callbacks : ISegmentLoaderCallbacks<TLoadedFormat>
) => Promise<ISegmentLoaderResultSegmentCreated<TLoadedFormat> |
             ISegmentLoaderResultSegmentLoaded<TLoadedFormat> |
             ISegmentLoaderResultChunkedComplete>;

/** Options given to an `ISegmentLoader` to configure its behavior. */
export interface ISegmentLoaderOptions {
  /**
   * Timeout, in milliseconds, after which a segment request should be aborted
   * with the corresponding error.
   *
   * `undefined` means that no timeout will be enforced.
   */
  timeout? : number | undefined;
}

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
  context : ISegmentContext,
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

export type ITransportSegmentPipeline = ITransportAudioVideoSegmentPipeline |
                                        ITransportTextSegmentPipeline;

export type ITransportPipeline = ITransportManifestPipeline |
                                 ITransportSegmentPipeline;

export interface ISegmentContext {
  /** Metadata about the wanted segment. */
  segment : ISegment;
  /** Type of the corresponding track. */
  type : IAdaptationType;
  /** Language of the corresponding track. */
  language? : string | undefined;
  /** If `true`, the corresponding `Manifest` if for a live content. */
  isLive : boolean;
  /** Start position in seconds of the Period in which that segment plays. */
  periodStart : number;
  /** End position in seconds of the Period in which that segment plays. */
  periodEnd : number | undefined;
  /** Mimetype of the corresponding Representation. */
  mimeType? : string | undefined;
  /** Codec(s) of the corresponding Representation. */
  codecs? : string | undefined;
  /**
   * Last published time for the Manifest file in which this segment has been
   * defined.
   *
   * This can be useful in cases where a loaded segment contains metadata that
   * could indicate a newer version of the Manifest.
   */
  manifestPublishTime? : number | undefined;
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

/** Format of a loaded audio and video segment before parsing. */
export type ILoadedAudioVideoSegmentFormat = Uint8Array |
                                             ArrayBuffer |
                                             null;

/** Format of a loaded text segment before parsing. */
export type ILoadedTextSegmentFormat = Uint8Array |
                                       ArrayBuffer |
                                       string |
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
   * Information on encryption that has been found in this segment.
   * Empty array if no such information was found.
   */
  protectionData : IProtectionDataInfo[];
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
  /**
   * When this property is set, a list of segments linked to this
   * `Representation` has been obtained when parsing this initialization
   * segment.
   *
   * This might then be used to communicate it to the corresponding
   * `RepresentationIndex`.
   */
  segmentList? : IIndexSegmentListItem[] | undefined;
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
   *   chunk begins at 32 seconds, and `chunkOffset` equals to `4`, then the
   *   chunk should really begin at 36 seconds (32 + 4).
   *
   * Note that `chunkInfos` needs not to be offseted as it should already
   * contain the correct time information.
   */
  chunkOffset : number;
  /**
   * start and end windows for the chunk (part of the chunk respectively
   * before and after that time will be ignored).
   * `undefined` when their is no such limitation.
   */
  appendWindow : [ number | undefined,
                   number | undefined ];
  /**
   * If set and not empty, then this property contains "events" have been
   * encountered in this parsed chunk.
   */
  inbandEvents? : IInbandEvent[] | undefined;
  /**
   * If set to `true`, then parsing this chunk revealed that the current
   * Manifest instance needs to be refreshed.
   */
  needsManifestRefresh?: boolean | undefined;
  /**
   * Information on encryption that has been found in this chunk.
   * Empty array if no such information was found.
   */
  protectionData : IProtectionDataInfo[];
}

/** Format of protection data found in a segment/chunk. */
export interface IProtectionDataInfo {
  /**
   * Format of the protection data.
   * "cenc" is the standart format for ISOBMFF-embedded protection information -
   * like in a PSSH box.
   */
  initDataType : "cenc";

  /** Optional key id found in the segment. */
  keyId: Uint8Array | undefined;

  /**
   * The protection data.
   */
  initData : Array<{
    /** Hex string identifying the key system concerned by this protection data. */
    systemId : string;
    /** The protection data itself. */
    data : Uint8Array;
  }>;
}

/**
 * Some `RepresentationIndex` await the initialization segment to be parsed before
 * knowing the list of media segments linked to it.
 *
 * This type describes the information obtained on a single segment when the
 * initialization segment has been parsed.
 */
export interface IIndexSegmentListItem {
  /** This segment start time, timescaled. */
  time : number;
  /** This segment difference between its end and start time, timescaled. */
  duration : number;
  /** Dividing `time` or `duration` with this value allows to obtain seconds. */
  timescale : number;
  /** Optional byte-range at which the segment should be loaded. */
  range? : [number, number];
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

export interface ITransportOptions {
  aggressiveMode? : boolean | undefined;
  checkMediaSegmentIntegrity? : boolean | undefined;
  lowLatencyMode : boolean;
  manifestLoader?: IManifestLoader | undefined;
  manifestUpdateUrl? : string | undefined;
  referenceDateTime? : number | undefined;
  representationFilter? : IRepresentationFilter | undefined;
  segmentLoader? : ICustomSegmentLoader | undefined;
  serverSyncInfos? : IServerSyncInfos | undefined;
  __priv_patchLastSegmentInSidx? : boolean | undefined;
}
