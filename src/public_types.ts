/**
 * This file defines and exports types we want to expose to library users.
 * Those types are considered as part of the API.
 */

import type { IPreferredEmeApiType } from "./compat/eme";
import type { EncryptedMediaError, MediaError, NetworkError, OtherError } from "./errors";
import type {
  IPersistentSessionInfoV0,
  IPersistentSessionInfoV1,
  IPersistentSessionInfoV2,
  IPersistentSessionInfoV3,
  IPersistentSessionInfoV4,
} from "./main_thread/decrypt";
import type { IManifest, ITaggedTrack } from "./manifest";
import type { ILocalManifest } from "./parsers/manifest/local";
import type { IMetaPlaylist } from "./parsers/manifest/metaplaylist/metaplaylist_parser";

export type { ITaggedTrack as IMediaErrorTrackContext };

export type { IPreferredEmeApiType };

/** `mode` option for the `loadVideo` method */
export type IRxPlayerMode = "auto" | "main" | "multithread";

/** Argument of the `attachWorker` method. */
export interface IWorkerSettings {
  workerUrl: string | Blob;
  dashWasmUrl?: string | ArrayBuffer | undefined;
}

/** Object that defines Common Media Client Data (CMCD) options. */
export interface ICmcdOptions {
  /**
   * Content ID delivered by CMCD metadata for that content.
   * If not specified, a default one will be generated.
   */
  contentId?: string;
  /**
   * Session ID delivered by CMCD metadata.
   * If not specified, a default one will be generated.
   */
  sessionId?: string;
  /**
   * Allow to force the way in which the CMCD payload should be communicated.
   *
   * If not set, the most appropriate type will be relied on.
   */
  communicationType?: "headers" | "query";
}

/** Every options that can be given to the RxPlayer's constructor. */
export interface IConstructorOptions {
  maxBufferAhead?: number;
  maxBufferBehind?: number;
  wantedBufferAhead?: number;
  maxVideoBufferSize?: number;
  videoResolutionLimit?: "videoElement" | "screen" | "none";
  throttleVideoBitrateWhenHidden?: boolean;

  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  videoElement?: HTMLMediaElement;
  baseBandwidth?: number;
}

/** Every options that can be given to the RxPlayer's `loadVideo` method. */
export interface ILoadVideoOptions {
  /**
   * Streaming protocol used (e.g. "dash" or "smooth").
   *
   * It is a mandatory property.
   */
  transport: string;

  /** Main URL to the content (Manifest or video file for directfile contents. */
  url?: string;
  /** If `true` the Content will automatically play once loaded. */
  autoPlay?: boolean;

  /**
   * Decryption-related options.
   * Can be left to undefined if no decryption is wanted.
   */
  keySystems?: IKeySystemOption[];

  /**
   * If set to `true`, and if the content is compatible, it will be played in a
   * special mode where the latency is greatly reduced.
   *
   * Should only be set for known to be compatible contents.
   */
  lowLatencyMode?: boolean;

  requestConfig?: IRequestConfig;

  /** Indicate the position the RxPlayer should start at on the loaded content. */
  startAt?: IStartAtOption;

  /**
   * The "mode" in which the text tracks will be displayed.
   *
   * The default `"native"` mode will use HTMLMediaElement's `track`elements and
   * poor stylization capabilities.
   *
   * The `"html"` mode use the `textTrackElement` option to display subtitles
   * with rich stylization capabilities inside that `HTMLElement`.
   */
  textTrackMode?: "native" | "html";

  /**
   * The HTMLElement in which text track will be pushed in a `"html"`
   * `textTrackMode`.
   *
   * Mandatory if `textTrackMode` is set to `"html"`.
   *
   * Has no effect when `textTrackMode` is not set or set to `"native"`.
   */
  textTrackElement?: HTMLElement;

  /**
   * `true` by default.
   *
   * If set to `false`, the RxPlayer won't use the "fast-switching" optimization
   * that allows to see raise in qualities quicker.
   *
   * You might want to set to `false` when the current device does not support
   * segment replacement well.
   */
  enableFastSwitching?: boolean;

  /** Default behavior when switching to a different audio track. */
  defaultAudioTrackSwitchingMode?: IAudioTrackSwitchingMode;

  /**
   * Behavior when a audio or video codec just switched to another
   * non-compatible one.
   *
   * This value might depend on the device's capabilities.
   */
  onCodecSwitch?: "continue" | "reload";

  /**
   * Whether we should check that an obtain segment is truncated and retry the
   * request if that's the case.
   */
  checkMediaSegmentIntegrity?: boolean;

  /**
   * Whether we should check that an obtained Manifest is truncated and retry
   * the request if that's the case.
   */
  checkManifestIntegrity?: boolean | undefined;

  /** Manifest object that may be used initially. */
  initialManifest?: IInitialManifest;

  /** Custom implementation for performing Manifest requests. */
  manifestLoader?: IManifestLoader;

  /** Minimum bound for Manifest updates, in milliseconds. */
  minimumManifestUpdateInterval?: number;

  /** Custom implementation for performing segment requests. */
  segmentLoader?: ISegmentLoader;

  /** Custom logic to filter out unwanted qualities. */
  representationFilter?: IRepresentationFilter | string;

  /** Base time for the segments in case it is not found in the Manifest. */
  referenceDateTime?: number;

  /** Allows to synchronize the server's time with the client's. */
  serverSyncInfos?: IServerSyncInfos;

  /**
   * Allows to force the RxPlayer to run in a specific "mode" (e.g.
   * in "multithread" mode) for that content.
   */
  mode?: IRxPlayerMode | undefined;

  /**
   * When set to an object, enable "Common Media Client Data", or "CMCD".
   */
  cmcd?: ICmcdOptions | undefined;

  /**
   * Options which may be removed or updated at any RxPlayer release.
   *
   * Most of those are options which we temporarily test before making
   * them part of the RxPlayer API.
   */
  experimentalOptions?:
    | {
        /**
         * If `true`, we will try to detect what's the highest supported video
         * resolution on the current device and if found, we will avoid playing
         * video Representation (i.e. qualities) with an higher resolution.
         *
         * An exception is made when the currently-chosen track only has seemlingly
         * unsupported Representations, in which case we'll still atempt to play them.
         */
        enableResolutionChecks?: boolean | undefined;
      }
    | undefined;
}

/** Value of the `serverSyncInfos` transport option. */
export interface IServerSyncInfos {
  /** The server timestamp at a given time. */
  serverTimestamp: number;
  /** The client's monotonic clock at which `serverTimestamp` was valid. */
  clientTime: number;
}

/** Format of a loaded Manifest before parsing. */
export type IInitialManifest =
  | Document
  | string
  | ArrayBuffer
  | IMetaPlaylist
  | ILocalManifest
  | IManifest;

/** Type for the `representationFilter` API. */
export type IRepresentationFilter = (
  representation: IRepresentationFilterRepresentation,
  context: IRepresentationContext,
) => boolean;

/** Representation object given to the `representationFilter` API. */
export interface IRepresentationFilterRepresentation {
  /** String identifying the Representation, unique per Adaptation. */
  id: string;
  bitrate?: number | undefined;
  /**
   * Codec(s) relied on by the media segments of that Representation.
   *
   * For the great majority of cases, this value will be set to either
   * `undefined` (meaning the codec is unknown) or to an array with a
   * single element which will be the actual codec relied on when the
   * corresponding Representation will be played.
   *
   * However in some very rare scenarios, this value might be set to an array
   * with multiple codecs, itself being a list of its candidate codecs from the
   * most wanted to the most compatible.
   * The conditions for this more complex format are very specific:
   *
   *   - It can only happen if the `representationFilter` callback is called in
   *     an environment where it hasn't yet been possible for the RxPlayer to
   *     check for codec support (mainly when running through the RxPlayer's
   *     `MULTI_THREAD` feature in a browser without MSE-in-worker
   *     capabilities).
   *
   *   - The corresponding Representation is compatible to a restrictive codec
   *     yet also retro-compatible to a less restrictive one.
   *
   *     The main example being Dolby Vision Representations which are
   *     retro-compatible to HDR10 HEVC codecs.
   *     In that very specific case, we could have an array with two elements:
   *       1. The Dolby Vision codec
   *       2. The base HDR10 codec
   */
  codecs?: string[] | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  height?: number | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  width?: number | undefined;
  /** The frame rate for this Representation, in frame per seconds. */
  frameRate?: number | undefined;
  /** If the track is HDR, gives the HDR characteristics of the content */
  hdrInfo?: IHDRInformation | undefined;
  /**
   * Encryption information linked to this content.
   * If set to an Object, the Representation is known to be encrypted.
   * If unset or set to `undefined` the Representation is either unencrypted or
   * we don't know if it is.
   */
  contentProtections?:
    | {
        /** Known key ids linked to that Representation. */
        keyIds?: Uint8Array[] | undefined;
      }
    | undefined;
}

export interface IHDRInformation {
  /**
   * It is the bit depth used for encoding color for a pixel.
   *
   * It is used to ask to the user agent if the color depth is supported by the
   * output device.
   */
  colorDepth?: number | undefined;
  /**
   * It is the HDR eotf. It is the transfer function having the video signal as
   * input and converting it into the linear light output of the display. The
   * conversion is done within the display device.
   *
   * It may be used here to ask the MediaSource if it supported.
   */
  eotf?: string | undefined;
  /**
   * It is the video color space used for encoding. An HDR content may not have
   * a wide color gamut.
   *
   * It may be used to ask about output device color space support.
   */
  colorSpace?: string | undefined;
}

/** Possible values for the `startAt` option of the `loadVideo` method. */
export type IStartAtOption =
  | {
      /** If set, we should begin at this position, in seconds. */
      position: number;
    }
  | {
      /** If set, we should begin at this unix timestamp, in seconds. */
      wallClockTime: Date | number;
    }
  | {
      /**
       * If set, we should begin at this position relative to the whole duration of
       * the content, in percentage.
       */
      percentage: number;
    }
  | {
      /**
       * If set, we should begin at this position relative to the content's maximum
       * seekable position, in seconds.
       */
      fromLastPosition: number;
    }
  | {
      /**
       * If set, we should begin at this position relative to the content's live
       * edge if it makes sense, in seconds.
       *
       * If the live edge is unknown or if it does not make sense for the current
       * content, that position is relative to the content's maximum position
       * instead.
       */
      fromLivePosition: number;
    }
  | {
      /**
       * If set, we should begin at this position relative to the content's start,
       * in seconds.
       */
      fromFirstPosition: number;
    };

export interface RequestRetryParameters {
  /**
   * The amount of time maximum we should retry a request before failing on Error.
   * Set to `Infinity` for an infinite number of requests.
   */
  maxRetry?: number | undefined;
  /**
   * Amount of time, in milliseconds, after which a request should be
   * aborted and optionally retried, depending on the maxRetry configuration.
   *
   * Setting it to `-1` allows to disable any timeout.
   * `undefined` means that a default, large, timeout will be used instead.
   */
  timeout?: number | undefined;
  /**
   * Amount of time, in milliseconds, after which a request that hasn't receive
   * the headers and status code should be aborted and optionnaly retried,
   * depending on the maxRetry configuration.
   */
  connectionTimeout?: number | undefined;
}

/** Value for the `requestConfig` option of the `loadVideo` method. */
export interface IRequestConfig {
  /**
   * Defines the retry parameters when requesting manifest
   */
  manifest?: RequestRetryParameters | undefined;
  /**
   * Defines the retry parameters when requesting a segment
   */
  segment?: RequestRetryParameters | undefined;
}

export type ISegmentLoader = (
  /** Information on the segment to request */
  context: ISegmentLoaderContext,

  // second argument: callbacks
  callbacks: {
    resolve: (rArgs: {
      data: ArrayBuffer | Uint8Array;
      sendingTime?: number | undefined;
      receivingTime?: number | undefined;
      size?: number | undefined;
      duration?: number | undefined;
    }) => void;

    reject: (err?: unknown) => void;
    fallback: () => void;
    progress: (info: {
      duration: number;
      size: number;
      totalSize?: number | undefined;
    }) => void;
  },
) => (() => void) | void; // returns either the aborting callback or nothing

/** Context given to a segment loader. */
export interface ISegmentLoaderContext {
  /** URL where the segment should be loaded. */
  url: string | undefined;
  /**
   * Indicative request timeout as configured on the RxPlayer.
   */
  timeout: number | undefined;
  /**
   * If true, this segment is an initialization segment with no decodable data.
   *
   * Those types of segment contain no decodable data and are only there for
   * initialization purposes, such as giving initial infos to the decoder on
   * subsequent media segments that will be pushed.
   *
   * Note that if `isInit` is false, it only means that the segment contains
   * decodable media, it can also contain important initialization information.
   *
   * Also, a segment which would contain both all initialization data and the
   * decodable data would have `isInit` set to `false` as it is not purely an
   * initialization segment.
   *
   * Segments which are not purely an initialization segment are called "media
   * segments" in the RxPlayer.
   */
  isInit: boolean | undefined;
  /**
   * If set, only the corresponding byte-ranges, which are subsets in bytes of
   * the loaded data, should be loaded.
   * If multiple non-contiguous byte-ranges are given, the result should be
   * the concatenation of those byte-ranges, in the same order.
   *
   * For example `[[0, 100], [150, 180]]` means that the bytes of both 0 to 100
   * (included) and from 150 to 180 (included) should be requested.
   * The communicated result should then be a concatenation of both in the same
   * order.
   */
  byteRanges?: Array<[number, number]> | undefined;
  /** Type of the corresponding track. */
  trackType: ITrackType;
  /**
   * Optional "Common Media Client Data" (CMCD) payload that may be added to
   * the request.
   */
  cmcdPayload?: ICmcdPayload | undefined;
}

/** Every possible value for the Adaptation's `type` property. */
export type ITrackType = "video" | "audio" | "text";

/**
 * Payload to add to a request to provide CMCD metadata through HTTP request
 * headers.
 *
 * This is an object where keys are header names and values are header contents.
 */
export type ICmcdHeadersData = Record<string, string>;

/**
 * Payload to add to a request to provide CMCD metadata through an URL's query
 * string.
 *
 * This is an array of all fields and corresponding values that should be
 * added to the query string, the order should be kept.
 *
 * `null` indicates that the field has no value and should be added as is.
 */
export type ICmcdQueryData = Array<[string, string | null]>;

/**
 * Type when CMCD metadata should be added through headers to the HTTP request
 * for the corresponding resource.
 */
export interface ICmcdHeadersPayload {
  type: "headers";
  value: ICmcdHeadersData;
}

/**
 * Type when CMCD metadata should be added through the query string to the HTTP
 * request for the corresponding resource.
 */
export interface ICmcdQueryPayload {
  type: "query";
  value: ICmcdQueryData;
}

/**
 * Type to indicate that CMCD metadata should be added to the request for the
 * corresponding resource.
 */
export type ICmcdPayload = ICmcdHeadersPayload | ICmcdQueryPayload;

export type ILoadedManifestFormat = IInitialManifest;

export type IManifestLoader = (
  /** Information on the wanted Manifest. */
  info: IManifestLoaderInfo,

  // second argument: callbacks
  callbacks: {
    resolve: (args: {
      data: ILoadedManifestFormat;
      url?: string | undefined;
      sendingTime?: number | undefined;
      receivingTime?: number | undefined;
      size?: number | undefined;
      duration?: number | undefined;
    }) => void;

    reject: (err?: Error) => void;
    fallback: () => void;
  },
) => (() => void) | void; // returns either the aborting callback or nothing

export interface IManifestLoaderInfo {
  /** URL at which the wanted Manifest can be accessed. */
  url: string | undefined;
  timeout: number | undefined;
  /**
   * Optional "Common Media Client Data" (CMCD) payload that may be added to
   * the request.
   */
  cmcdPayload: ICmcdPayload | undefined;
}

/** Options related to a single key system. */
export interface IKeySystemOption {
  /**
   * Key system wanted.
   *
   * Either as a canonical name (like "widevine" or "playready") or as  the
   * complete reverse domain name denomination (e.g. "com.widevine.alpha").
   */
  type: string;
  /** Logic used to fetch the license */
  getLicense: (
    message: Uint8Array,
    messageType: string,
  ) => Promise<BufferSource | null> | BufferSource | null;
  /** Supplementary optional configuration for the getLicense call. */
  getLicenseConfig?:
    | { retry?: number | undefined; timeout?: number | undefined }
    | undefined;
  /**
   * Optional `serverCertificate` we will try to set to speed-up the
   * license-fetching process.
   * `null` or `undefined` indicates that no serverCertificate should be
   * set.
   */
  serverCertificate?: BufferSource | null;
  /** Storage mechanism used to store and retrieve information on stored licenses. */
  persistentLicenseConfig?: IPersistentLicenseConfig;
  /**
   * Wanted value for the `persistentState` property of this
   * `MediaKeySystemConfiguration` according to the EME API.
   */
  persistentState?: MediaKeysRequirement | undefined;
  /**
   * Wanted value for the `distinctiveIdentifier` property of this
   * `MediaKeySystemConfiguration` according to the EME API.
   */
  distinctiveIdentifier?: MediaKeysRequirement | undefined;
  /**
   * If true, all open MediaKeySession (used to decrypt the content) will be
   * closed when the current playback stops.
   */
  closeSessionsOnStop?: boolean;

  singleLicensePer?: "content" | "periods" | "init-data";
  /**
   * Maximum number of `MediaKeySession` that should be created on the same
   * MediaKeys.
   */
  maxSessionCacheSize?: number;
  videoCapabilitiesConfig?: IVideoCapabilitiesConfiguration;
  audioCapabilitiesConfig?: IAudioCapabilitiesConfiguration;
  /**
   * If set to `true`, we will not wait until the MediaKeys instance is attached
   * to the media element before pushing segments to it.
   * Setting it to `true` might be needed on some targets to work-around a
   * deadlock in the browser-side logic (or most likely the CDM implementation)
   * but it can also break playback of contents with both encrypted and
   * unencrypted data, most especially on Chromium and Chromium-derived browsers.
   */
  disableMediaKeysAttachmentLock?: boolean;

  /**
   * Behavior the RxPlayer should have when one of the key has the
   * `MediaKeyStatus` `"internal-error"`.
   *
   * `onKeyInternalError` can be set to a string, each describing a different
   * behavior, the default one if not is defined being `"error"`:
   *
   *   - `"error"`: The RxPlayer will stop on an error.
   *     This is the default behavior.
   *
   *   - `"continue"`: The RxPlayer will not do anything.
   *     This may lead in many cases to infinite rebuffering.
   *
   *   - `"fallback"`: The Representation(s) linked to those key(s) will
   *     be fallbacked from, meaning the RxPlayer will switch to other
   *     representation.
   *
   *   - `"close-session"`: The RxPlayer will close and re-create a DRM session
   *     (and thus re-download the corresponding license).
   */
  onKeyInternalError?: "error" | "continue" | "fallback" | "close-session";

  /**
   * Behavior the RxPlayer should have when one of the key has the
   * `MediaKeyStatus` `"output-restricted"`.
   *
   * `onKeyOutputRestricted` can be set to a string, each describing a different
   * behavior, the default one if not is defined being `"error"`:
   *
   *   - `"error"`: The RxPlayer will stop on an error.
   *     This is the default behavior.
   *
   *   - `"continue"`: The RxPlayer will not do anything.
   *     This may lead in many cases to infinite rebuffering.
   *
   *   - `"fallback"`: The Representation(s) linked to those key(s) will
   *     be fallbacked from, meaning the RxPlayer will switch to other
   *     representation.
   */
  onKeyOutputRestricted?: "error" | "continue" | "fallback";

  /**
   * Behavior the RxPlayer should have when one of the key is known to be
   * expired.
   *
   * `onKeyExpiration` can be set to a string, each describing a different
   * behavior, the default one if not is defined being `"error"`:
   *
   *   - `"error"`: The RxPlayer will stop on an error when any key is expired.
   *     This is the default behavior.
   *
   *   - `"continue"`: The RxPlayer will not do anything when a key expires.
   *     This may lead in many cases to infinite rebuffering.
   *
   *   - `"fallback"`: The Representation(s) linked to the expired key(s) will
   *     be fallbacked from, meaning the RxPlayer will switch to other
   *     representation without expired keys.
   *
   *   - `"close-session"`: The RxPlayer will close and re-create a DRM session
   *     (and thus re-download the corresponding license) if any of the key
   *     associated to this session expired.
   */
  onKeyExpiration?: "error" | "continue" | "fallback" | "close-session";
}

/** Values that can be given to the `videoCapabilitiesConfig` `keySystems`'s property. */
export type IVideoCapabilitiesConfiguration =
  | IRobustnessMediaKeySystemCapabilities
  | IContentTypeMediaKeySystemCapabilities
  | IFullMediaKeySystemCapabilities;

/** Values that can be given to the `audioCapabilitiesConfig` `keySystems`'s property. */
export type IAudioCapabilitiesConfiguration =
  | IRobustnessMediaKeySystemCapabilities
  | IContentTypeMediaKeySystemCapabilities
  | IFullMediaKeySystemCapabilities;

/**
 * Value that can be given to either the `audioCapabilitiesConfig` or to the
 * `videoCapabilitiesConfig` `keySystems`'s property when the application only
 * wants to specify the "robustness" part of the `MediaKeySystemMediaCapability`
 * sent through the corresponding `MediaKeySystemConfiguration` used to decrypt
 * the content.
 *
 * In this case, the RxPlayer will define potentially default values for
 * other capability-related properties (such as the "contentType").
 */
export interface IRobustnessMediaKeySystemCapabilities {
  type: "robustness";
  value: Array<string | undefined>;
}

/**
 * Value that can be given to either the `audioCapabilitiesConfig` or to the
 * `videoCapabilitiesConfig` `keySystems`'s property when the application only
 * wants to specify the "contentType" part of the
 * `MediaKeySystemMediaCapability` sent through the corresponding
 * `MediaKeySystemConfiguration` used to decrypt the content.
 *
 * In this case, the RxPlayer will define potentially default values for
 * other capability-related properties (such as the "robustness").
 */
export interface IContentTypeMediaKeySystemCapabilities {
  type: "contentType";
  value: string[];
}

/**
 * Value that can be given to either the `audioCapabilitiesConfig` or to the
 * `videoCapabilitiesConfig` `keySystems`'s property when the application wants
 * to specify the full `MediaKeySystemMediaCapability` object sent through the
 * corresponding `MediaKeySystemConfiguration` used to decrypt the content.
 */
export interface IFullMediaKeySystemCapabilities {
  type: "full";
  value: MediaKeySystemMediaCapability[];
}

/**
 * Data stored in a persistent MediaKeySession storage.
 * Has to be versioned to be able to play MediaKeySessions persisted in an old
 * RxPlayer version when in a new one.
 */
export type IPersistentSessionInfo =
  | IPersistentSessionInfoV4
  | IPersistentSessionInfoV3
  | IPersistentSessionInfoV2
  | IPersistentSessionInfoV1
  | IPersistentSessionInfoV0;

/** Persistent MediaKeySession storage interface. */
export interface IPersistentLicenseConfig {
  /** Load persistent MediaKeySessions previously saved through the `save` callback. */
  load(): IPersistentSessionInfo[] | undefined | null;
  /**
   * Save new persistent MediaKeySession information.
   * The given argument should be returned by the next `load` call.
   */
  save(x: IPersistentSessionInfo[]): void;
  /**
   * By default, MediaKeySessions persisted through an older version of the
   * RxPlayer will still be available under this version.
   *
   * By setting this value to `true`, we can disable that condition in profit of
   * multiple optimizations (to load a content faster, use less CPU resources
   * etc.).
   *
   * As such, if being able to load MediaKeySession persisted via older version
   * is not important to you, we recommend setting that value to `true`.
   */
  disableRetroCompatibility?: boolean;
}

/** Payload emitted with a `positionUpdate` event. */
export interface IPositionUpdate {
  /** current position the player is in, in seconds. */
  position: number;
  /** Last position set for the current media currently, in seconds. */
  duration: number;
  /** Playback rate (i.e. speed) at which the current media is played. */
  playbackRate: number;
  /** Amount of buffer available for now in front of the current position, in seconds. */
  bufferGap: number;
  /** Current maximum seekable position. */
  maximumPosition?: number | undefined;
  wallClockTime?: number | undefined;
  /**
   * Only for live contents. Difference between the "live edge" and the current
   * position, in seconds.
   */
  liveGap?: number | undefined;
}

export type IPlayerState =
  | "STOPPED"
  | "LOADED"
  | "LOADING"
  | "PLAYING"
  | "PAUSED"
  | "ENDED"
  | "BUFFERING"
  | "FREEZING"
  | "SEEKING"
  | "RELOADING";

export interface IPeriodChangeEvent {
  start: number;
  id: string;
  end?: number | undefined;
}

export type IStreamEvent =
  | { data: IStreamEventData; start: number; end: number; onExit?: () => void }
  | { data: IStreamEventData; start: number };

export interface IStreamEventData {
  type: "dash-event-stream";
  value: { schemeIdUri: string; timescale: number; element: Element };
}

export type IPlayerError = EncryptedMediaError | MediaError | OtherError | NetworkError;

/**
 * Information describing a single Representation from an Adaptation, to be used
 * in the `representationFilter` API.
 */
export interface IRepresentationContext {
  trackType: string;
  language?: string | undefined;
  isAudioDescription?: boolean | undefined;
  isClosedCaption?: boolean | undefined;
  isDub?: boolean | undefined;
  isSignInterpreted?: boolean | undefined;
  normalizedLanguage?: string | undefined;
}

/**
 * Definition of a single audio Representation as represented by the
 * RxPlayer.
 */
export interface IAudioRepresentation {
  /**
   * Identifier for that Representation.
   * Might e.g. be used with the `lockVideoRepresentation` API.
   */
  id: string | number;
  /** Optional maximum bitrate, in bits per seconds, for this Representation. */
  bitrate?: number | undefined;
  /** Codec(s) relied on by the media segments of that Representation. */
  codec?: string | undefined;
  /**
   * If `true`, this Representation is linked to "spatial audio" technology, such as
   * Dolby Atmos.
   * If `false`, it is not linked to such technology.
   *
   * If `undefined`, we don't if it is linked to a spatial audio technology or not.
   */
  isSpatialAudio?: boolean | undefined;
  /**
   * If `true`, the codec is known to be supported on the current device.
   * If `false`, it is known to be unsupported.
   *
   * If `undefined`, we don't know yet if it is supported or not.
   */
  isCodecSupported?: boolean | undefined;
  /**
   * If `true`, this Representation is known to be decipherable.
   * If `false`, it is known to be encrypted and not decipherable.
   *
   * If `undefined`, we don't know yet if it is decipherable or not (or if it is
   * encrypted or not in some cases).
   */
  decipherable?: boolean | undefined;
  /**
   * Encryption information linked to this content.
   * If set to an Object, the Representation is known to be encrypted.
   * If unset or set to `undefined` the Representation is either unencrypted or
   * we don't know if it is.
   */
  contentProtections?:
    | {
        /** Known key ids linked to that Representation. */
        keyIds?: Uint8Array[] | undefined;
      }
    | undefined;
}

/** Audio track returned by the RxPlayer. */
export interface IAudioTrack {
  /** The language the audio track is in, as it is named in the Manifest. */
  language: string;
  /**
   * An attempt to translate `language` into a valid ISO639-3 language code.
   * Kept equal to `language` if the attempt failed.
   */
  normalized: string;
  audioDescription: boolean;
  dub?: boolean | undefined;
  id: string;
  label?: string | undefined;
  representations: IAudioRepresentation[];
}

/** Text track returned by the RxPlayer. */
export interface ITextTrack {
  /** The language the text track is in, as it is named in the Manifest. */
  language: string;
  /**
   * An attempt to translate `language` into a valid ISO639-3 language code.
   * Kept equal to `language` if the attempt failed.
   */
  normalized: string;
  forced: boolean | undefined;
  closedCaption: boolean;
  label?: string | undefined;
  id: number | string;
}

/**
 * Definition of a single video Representation as represented by the
 * RxPlayer.
 */
export interface IVideoRepresentation {
  /**
   * Identifier for that Representation.
   * Might e.g. be used with the `lockVideoRepresentation` API.
   */
  id: string;
  /** Optional maximum bitrate, in bits per seconds, for this Representation. */
  bitrate?: number | undefined;
  /** Defines the width of the Representation in pixels. */
  width?: number | undefined;
  /** Defines the height of the Representation in pixels. */
  height?: number | undefined;
  /** Codec(s) relied on by the media segments of that Representation. */
  codec?: string | undefined;
  /** The frame rate for this Representation, in frame per seconds. */
  frameRate?: number | undefined;
  /** If the track is HDR, gives the HDR characteristics of the content */
  hdrInfo?: IHDRInformation | undefined;
  /**
   * If `true`, the codec is known to be supported on the current device.
   * If `false`, it is known to be unsupported.
   *
   * If `undefined`, we don't know yet if it is supported or not.
   */
  isCodecSupported?: boolean | undefined;
  /**
   * `true` if the resolution of this Representation is known to e supported on
   * the current device.
   *
   * `false` if it is known to be unsupported and should thus not be played.
   *
   * `undefined` if we don't know if it is supported or not on the current
   * device.
   */
  isResolutionSupported?: boolean | undefined;
  /**
   * If `true`, this Representation is known to be decipherable.
   * If `false`, it is known to be encrypted and not decipherable.
   *
   * If `undefined`, we don't know yet if it is decipherable or not (or if it is
   * encrypted or not in some cases).
   */
  decipherable?: boolean | undefined;
  /**
   * Encryption information linked to this content.
   * If set to an Object, the Representation is known to be encrypted.
   * If unset or set to `undefined` the Representation is either unencrypted or
   * we don't know if it is.
   */
  contentProtections?:
    | {
        /** Known key ids linked to that Representation. */
        keyIds?: Uint8Array[] | undefined;
      }
    | undefined;
}

/** Video track returned by the RxPlayer. */
export interface IVideoTrack {
  id: string;
  signInterpreted?: boolean | undefined;
  isTrickModeTrack?: boolean | undefined;
  trickModeTracks?: IVideoTrack[] | undefined;
  label?: string | undefined;
  representations: IVideoRepresentation[];
}

/** Output of the `getKeySystemConfiguration` method. */
export interface IKeySystemConfigurationOutput {
  /** Key system string. */
  keySystem: string;
  /** `MediaKeySystemConfiguration` actually used by the key system. */
  configuration: MediaKeySystemConfiguration;
}

/** Period from a list of Periods as returned by the RxPlayer. */
export interface IPeriod {
  /** Start time in seconds at which the Period starts. */
  start: number;
  /**
   * End time in seconds at which the Period ends.
   * `undefined` if that end is unknown for now.
   */
  end: number | undefined;
  /** Identifier for this Period allowing to perform track modification for it. */
  id: string;
}

/** Audio track from a list of audio tracks returned by the RxPlayer. */
export interface IAvailableAudioTrack extends IAudioTrack {
  active: boolean;
}

/** Text track from a list of text tracks returned by the RxPlayer. */
export interface IAvailableTextTrack extends ITextTrack {
  active: boolean;
}

/** Video track from a list of video tracks returned by the RxPlayer. */
export interface IAvailableVideoTrack extends IVideoTrack {
  active: boolean;
}

/**
 * Type of a single object from the optional `EncryptedMediaError`'s
 * `keyStatuses` property.
 */
export interface IEncryptedMediaErrorKeyStatusObject {
  /** Corresponding keyId which encountered the problematic MediaKeyStatus. */
  keyId: ArrayBuffer;

  /** Problematic MediaKeyStatus encountered. */
  keyStatus: MediaKeyStatus;
}

/**
 * Behavior wanted when replacing an audio track / Adaptation by another:
 *
 *   - direct: Switch audio track immediately by removing all the previous
 *     track's data.
 *
 *     This might interrupt playback while data for any of the new
 *     track wanted is loaded.
 *
 *   - seamless: Switch audio track without interrupting playback by still
 *     keeping data from the previous track around the current
 *     position.
 *
 *     This could have the disadvantage of still playing the previous
 *     track during a short time (not more than a few seconds in
 *     most cases).
 *
 *   - reload: Reload content to provide an immediate interruption of the
 *     previous audio track before switching to the new one.
 *
 *     Some targets might not handle "direct" mode properly. The "reload"
 *     mode is kind of a more compatible attempt of immediately switching the
 *     audio track.
 */
export type IAudioTrackSwitchingMode = "direct" | "seamless" | "reload";

/**
 * Behavior wanted when replacing a video track / Adaptation by another:
 *
 *   - direct: Switch video track immediately by removing all the previous
 *     track's data.
 *
 *     This might interrupt playback while data for any of the new
 *     track wanted is loaded.
 *     Moreover, the previous video frame at the time of the switch will
 *     probably still be on display while this is happening. If this is
 *     not something you want, you might prefer the "reload" mode.
 *
 *   - seamless: Switch video track without interrupting playback by still
 *     keeping data from the previous track around the current
 *     position.
 *     This could have the disadvantage of still playing the previous
 *     track during a short time (not more than a few seconds in
 *     most cases).
 *
 *   - reload: Reload content to provide an immediate interruption of the
 *     previous video track before switching to the new one.
 *
 *     This can be seen like the "direct" mode with two differences:
 *
 *       - The "direct" mode might rebuffer for a time with the previous
 *       frame displaying. With "reload" a black screen will probably be shown
 *       instead.
 *
 *       - some targets might not handle "direct" mode properly. The "reload"
 *       mode is kind of a more compatible attempt of immediately switching the
 *       Adaptation.
 */
export type IVideoTrackSwitchingMode = "direct" | "seamless" | "reload";

export type IVideoRepresentationsSwitchingMode = IRepresentationsSwitchingMode;
export type IAudioRepresentationsSwitchingMode = IRepresentationsSwitchingMode;

/**
 * Behavior wanted when replacing active Representations by others:
 *
 *   - direct: Switch Representation immediately by removing all the previous
 *     Representations's data.
 *     This might interrupt playback while data for any of the new
 *     Representations wanted is loaded.
 *
 *     If talking about video Representations, the previous video frame at the
 *     time of the switch will probably still be on display while this is
 *     happening.
 *     If this is not something you want, you might prefer the "reload" mode.
 *
 *   - seamless: Switch Representation without interrupting playback by still
 *     keeping data from the previous Representations around the current
 *     position.
 *     This could have the disadvantage of still playing the previous
 *     Representations during a short time (not more than a few seconds in
 *     most cases).
 *
 *   - reload: Reload `MediaSource` to provide an immediate interruption of the
 *     previous interruption before switching to the new Representation.
 *
 *     This can be seen like the "direct" mode with two differences:
 *
 *       - in case of video contents, the "direct" mode might rebuffer for a
 *       time with the previous frame displaying. With "reload" a black screen
 *       will probably be shown instead.
 *
 *       - some targets might not handle "direct" mode properly. The "reload"
 *       mode is kind of a more compatible attempt of immediately switching the
 *       Representation.
 *
 *   - lazy: Keep data from the previous Representation in the buffer.
 *     It still might eventually be replaced by Representation of a better
 *     quality when depending on future playback condition.
 */
type IRepresentationsSwitchingMode = "direct" | "seamless" | "reload" | "lazy";

export interface IBrokenRepresentationsLockContext {
  period: IPeriod;
  trackType: ITrackType;
}

export interface ITrackUpdateEventPayload {
  period: IPeriod;
  trackType: ITrackType;
  /* eslint-disable @typescript-eslint/no-redundant-type-constituents */
  reason:
    | "missing" // Missing from Manifest update
    | "manual" // Manually and explicitely updated
    | "trickmode-enabled" // Video trickmode tracks being enabled
    | "trickmode-disabled" // Video trickmode tracks being disabled
    | "no-playable-representation" // Previous track had no playable Representation
    | string;
  /* eslint-enable @typescript-eslint/no-redundant-type-constituents */
}

export interface IRepresentationListUpdateContext {
  period: IPeriod;
  trackType: ITrackType;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  reason: "decipherability-update" | string;
}

export interface ILockedVideoRepresentationsSettings {
  representations: string[];
  periodId?: string | undefined;
  switchingMode?: IVideoRepresentationsSwitchingMode | undefined;
}

export interface ILockedAudioRepresentationsSettings {
  representations: string[];
  periodId?: string | undefined;
  switchingMode?: IAudioRepresentationsSwitchingMode | undefined;
}

export interface IAudioTrackSetting {
  /** `id` of the audio track you want to set. */
  trackId: string;
  /**
   * `id` of the Period for which you want that setting applied.
   * Keeping it undefined means it will apply to the currently-playing Period.
   */
  periodId?: string | undefined;
  /**
   * Behavior wanted when replacing an audio track / Adaptation by another.
   * @see IAudioTrackSwitchingMode
   *
   * Keeping it undefined means that the RxPlayer will automatically select
   * the most adapted choice.
   */
  switchingMode?: IAudioTrackSwitchingMode | undefined;
  /**
   * Representations (a.k.a. qualities) you want to play in that new track.
   * Keeping it undefined means that all compatible qualities may be played.
   */
  lockedRepresentations?: string[] | undefined;
  /**
   * This only has an effect if the track switching operation lead to a small
   * playback interruption (which can only happen if `switchingMode` is either
   * set to `"reload"` or in some cases when it is undefined).
   *
   * `relativeResumingPosition` corresponds to the relative time in seconds at
   * which we will resume playback with the new track.
   *
   * For example if switching from an audio track `A` to an audio track `B` at
   * position `20` (seconds) and setting `relativeResumingPosition` to `-1`, we
   * will resume playback with the audio track `B` at position `19`.
   *
   * You might want to set this value generally either because you want to
   * replay some audio content after switching the audio track to give back
   * context (e.g. picking back at the same sentence in the language of the new
   * audio track) or to ensure the exact same position is played by setting it
   * to `0`.
   *
   * If not set or set to `undefined`, the RxPlayer will automatically choose
   * a suitable default value instead.
   */
  relativeResumingPosition?: number | undefined;
}

export interface IVideoTrackSetting {
  /** `id` of the video track you want to set. */
  trackId: string;
  /**
   * `id` of the Period for which you want that setting applied.
   * Keeping it undefined means it will apply to the currently-playing Period.
   */
  periodId?: string | undefined;
  /**
   * Behavior wanted when replacing an video track / Adaptation by another.
   * @see IVideoTrackSwitchingMode
   *
   * Keeping it undefined means that the RxPlayer will automatically select
   * the most adapted choice.
   */
  switchingMode?: IVideoTrackSwitchingMode | undefined;
  /**
   * Representations (a.k.a. qualities) you want to play in that new track.
   * Keeping it undefined means that all compatible qualities may be played.
   */
  lockedRepresentations?: string[] | undefined;
  /**
   * This only has an effect if the track switching operation lead to a small
   * playback interruption (which can only happen if `switchingMode` is either
   * set to `"reload"`, `"flush"` or in some cases when it is undefined).
   *
   * `relativeResumingPosition` corresponds to the relative time in seconds at
   * which we will resume playback with the new track.
   *
   * For example if switching from a video track `A` to a video track `B` at
   * position `20` (seconds) and setting `relativeResumingPosition` to `-1`, we
   * will resume playback with the video track `B` at position `19` (only if the
   * track switch operation led to a playback interruption, see top of comment).
   *
   * You might want to set this value generally either because you want to
   * replay some video content after switching the video track to give back
   * context or to ensure the exact same position is played by setting it to
   * `0`.
   *
   * If not set or set to `undefined`, the RxPlayer will automatically choose
   * a suitable default value instead.
   */
  relativeResumingPosition?: number | undefined;
}

export interface ITextTrackSetting {
  /** `id` of the text track you want to set. */
  trackId: string;
  /**
   * `id` of the Period for which you want that setting applied.
   * Keeping it undefined means it will apply to the currently-playing Period.
   */
  periodId?: string | undefined;
}

export interface IModeInformation {
  isDirectFile: boolean;
  useWorker: boolean;
}
