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

import { ICustomMediaKeySession } from "./compat";
import {
  IPersistentSessionInfoV0,
  IPersistentSessionInfoV1,
  IPersistentSessionInfoV2,
  IPersistentSessionInfoV3,
  IPersistentSessionInfoV4,
} from "./core/decrypt";
import { IBufferType } from "./core/segment_buffers";
import {
  EncryptedMediaError,
  MediaError,
  NetworkError,
  OtherError,
} from "./errors";
import Manifest from "./manifest";
import { ILocalManifest } from "./parsers/manifest/local";
import { IMetaPlaylist } from "./parsers/manifest/metaplaylist/metaplaylist_parser";

/**
 * This file defines and exports types we want to expose to library users.
 * Those types are considered as part of the API.
 */

/** Every options that can be given to the RxPlayer's constructor. */
export interface IConstructorOptions {
  maxBufferAhead? : number;
  maxBufferBehind? : number;
  wantedBufferAhead? : number;
  maxVideoBufferSize?: number;

  limitVideoWidth? : boolean;
  throttleVideoBitrateWhenHidden? : boolean;

  videoElement? : HTMLMediaElement;
  initialVideoBitrate? : number;
  initialAudioBitrate? : number;
  minAudioBitrate? : number;
  minVideoBitrate? : number;
  maxAudioBitrate? : number;
  maxVideoBitrate? : number;
}

/** Every options that can be given to the RxPlayer's `loadVideo` method. */
export interface ILoadVideoOptions {
  transport : string;

  url? : string;
  autoPlay? : boolean;
  keySystems? : IKeySystemOption[];
  transportOptions? : ITransportOptions|undefined;
  lowLatencyMode? : boolean;
  networkConfig? : INetworkConfigOption;
  startAt? : IStartAtOption;
  textTrackMode? : "native"|"html";
  textTrackElement? : HTMLElement;
  manualBitrateSwitchingMode? : "seamless"|"direct";
  enableFastSwitching? : boolean;
  onCodecSwitch? : "continue"|"reload";
}

/** Value of the `transportOptions` option of the `loadVideo` method. */
export interface ITransportOptions {
  /**
   * Whether we should check that an obtain segment is truncated and retry the
   * request if that's the case.
   */
  checkMediaSegmentIntegrity? : boolean;
  /** Manifest object that will be used initially. */
  initialManifest? : IInitialManifest;
  /** Custom implementation for performing Manifest requests. */
  manifestLoader? : IManifestLoader;
  /** Possible custom URL pointing to a shorter form of the Manifest. */
  manifestUpdateUrl? : string;
  /** Minimum bound for Manifest updates, in milliseconds. */
  minimumManifestUpdateInterval? : number;
  /** Custom implementation for performing segment requests. */
  segmentLoader? : ISegmentLoader;
  /** Custom logic to filter out unwanted qualities. */
  representationFilter? : IRepresentationFilter;
  /** Base time for the segments in case it is not found in the Manifest. */
  referenceDateTime? : number;
  /** Allows to synchronize the server's time with the client's. */
  serverSyncInfos? : IServerSyncInfos;
}

/** Value of the `serverSyncInfos` transport option. */
export interface IServerSyncInfos {
  /** The server timestamp at a given time. */
  serverTimestamp : number;
  /**
   * The client monotonic clock (performance.now) at which `serverTimestamp`
   * was valid.
   */
  clientTime : number;
}

/** Format of a loaded Manifest before parsing. */
export type IInitialManifest = Document |
                               string |
                               ArrayBuffer |
                               IMetaPlaylist |
                               ILocalManifest |
                               Manifest;

/** Type for the `representationFilter` API. */
export type IRepresentationFilter = (representation: IRepresentation,
                                     adaptationInfos: IRepresentationInfos) => boolean;

interface IRepresentationIndex {
  getSegments(up : number, duration : number) : IExposedSegment[];
}

/** Segment, as documented in the API documentation. */
export interface IExposedSegment {
  id : string;
  timescale : number;
  duration? : number | undefined;
  time : number;
  isInit? : boolean | undefined;
  range? : number[] | null | undefined;
  indexRange? : number[] | null | undefined;
  number? : number | undefined;
}

/** Representation (represents a quality), as documented in the API documentation. */
export interface IRepresentation {
  /** String identifying the Representation, unique per Adaptation. */
  id : string;
  bitrate? : number | undefined;
  /** Codec used by the segment in that Representation. */
  codec? : string | undefined;
  /**
   * Whether we are able to decrypt this Representation / unable to decrypt it or
   * if we don't know yet:
   *   - if `true`, it means that we know we were able to decrypt this
   *     Representation in the current content.
   *   - if `false`, it means that we know we were unable to decrypt this
   *     Representation
   *   - if `undefined` there is no certainty on this matter
   */
  decipherable? : boolean | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  height? : number | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  width? : number | undefined;
  /** The frame rate for this Representation, in frame per seconds. */
  frameRate? : number | undefined;
  /** If the track is HDR, gives the HDR characteristics of the content */
  hdrInfo? : IHDRInformation;
  index : IRepresentationIndex;
}

export interface IHDRInformation {
  /**
   * It is the bit depth used for encoding color for a pixel.
   *
   * It is used to ask to the user agent if the color depth is supported by the
   * output device.
   */
  colorDepth? : number | undefined;
  /**
   * It is the HDR eotf. It is the transfer function having the video signal as
   * input and converting it into the linear light output of the display. The
   * conversion is done within the display device.
   *
   * It may be used here to ask the MediaSource if it supported.
   */
  eotf? : string | undefined;
  /**
   * It is the video color space used for encoding. An HDR content may not have
   * a wide color gamut.
   *
   * It may be used to ask about output device color space support.
   */
  colorSpace? : string | undefined;
}

/** Possible values for the `startAt` option of the `loadVideo` method. */
export type IStartAtOption =
  {
    /** If set, we should begin at this position, in seconds. */
    position : number;
  } | {
    /** If set, we should begin at this unix timestamp, in seconds. */
    wallClockTime : Date|number;
  } | {
    /**
     * If set, we should begin at this position relative to the whole duration of
     * the content, in percentage.
     */
    percentage : number;
  } | {
    /**
     * If set, we should begin at this position relative to the content's end,
     * in seconds.
     */
    fromLastPosition : number;
  } | {
    /**
     * If set, we should begin at this position relative to the content's start,
     * in seconds.
     */
    fromFirstPosition : number;
  };

/** Value for the `networkConfig` option of the `loadVideo` method. */
export interface INetworkConfigOption {
  /**
   * The amount of time maximum we should retry a Manifest or Manifest-related
   * request before failing on Error.
   * Set to `Infinity` for an infinite number of requests.
   */
  manifestRetry? : number;
  /**
   * The amount of time maximum we should retry a request in general when the
   * user is offline.
   * Set to `Infinity` for an infinite number of requests.
   */
  offlineRetry? : number;
  /**
   * The amount of time maximum we should retry a segment or segment-related
   * request before failing on Error.
   * Set to `Infinity` for an infinite number of requests.
   */
  segmentRetry? : number;
}

export type ISegmentLoader = (
  /** Information on the segment to request */
  context : ISegmentLoaderContext,

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

/** Context given to a segment loader. */
export interface ISegmentLoaderContext {
  /** URL where the segment should be loaded. */
  url : string | undefined;
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
  isInit : boolean | undefined;
  /**
   * If set, the corresponding byte-range in the downloaded segment will
   * contain an index describing other segments.
   * XXX TODO include in range here?
   */
  indexRange? : [number, number] | undefined;
  /**
   * If set, the corresponding byte-range is the subset in bytes of the loaded
   * data where the segment actually is.
   */
  range? : [number, number] | undefined;
  /** Type of the corresponding track. */
  type : IAdaptationType;
}

/** Every possible value for the Adaptation's `type` property. */
export type IAdaptationType = "video" | "audio" | "text";

export type ILoadedManifestFormat = IInitialManifest;

export type IManifestLoader = (
  /** Information on the wanted Manifest. */
  info : IManifestLoaderInfo,

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

export interface IManifestLoaderInfo {
  url : string | undefined;
}

/** Options related to a single key system. */
export interface IKeySystemOption {
  /**
   * Key system wanted.
   *
   * Either as a canonical name (like "widevine" or "playready") or as  the
   * complete reverse domain name denomination (e.g. "com.widevine.alpha").
   */
  type : string;
  /** Logic used to fetch the license */
  getLicense : (message : Uint8Array, messageType : string)
                 => Promise<BufferSource | null> |
                    BufferSource |
                    null;
  /** Supplementary optional configuration for the getLicense call. */
  getLicenseConfig? : { retry? : number;
                        timeout? : number; };
  /**
   * Optional `serverCertificate` we will try to set to speed-up the
   * license-fetching process.
   * `null` or `undefined` indicates that no serverCertificate should be
   * set.
   */
  serverCertificate? : BufferSource | null;
  /**
   * If `true`, we will try to persist the licenses obtained as well as try to
   * load already-persisted licenses.
   */
  persistentLicense? : boolean;
  /** Storage mechanism used to store and retrieve information on stored licenses. */
  licenseStorage? : IPersistentSessionStorage;
  /**
   * If true, we will require that the CDM is able to persist state.
   * See EME specification related to the `persistentState` configuration.
   */
  persistentStateRequired? : boolean;
  /**
   * If true, we will require that the CDM should use distinctive identyfiers.
   * See EME specification related to the `distinctiveIdentifier` configuration.
   */
  distinctiveIdentifierRequired? : boolean;
  /**
   * If true, all open MediaKeySession (used to decrypt the content) will be
   * closed when the current playback stops.
   */
  closeSessionsOnStop? : boolean;

  singleLicensePer? : "content" |
                      "periods" |
                      "init-data";
  /**
   * Maximum number of `MediaKeySession` that should be created on the same
   * MediaKeys.
   */
  maxSessionCacheSize? : number;
  /** Callback called when one of the key's status change. */
  onKeyStatusesChange? : (evt : Event, session : MediaKeySession |
                                                 ICustomMediaKeySession)
                           => Promise<BufferSource | null> |
                              BufferSource |
                              null;
  /** Allows to define custom robustnesses value for the video data. */
  videoRobustnesses?: Array<string|undefined>;
  /** Allows to define custom robustnesses value for the audio data. */
  audioRobustnesses?: Array<string|undefined>;
  /**
   * If explicitely set to `false`, we won't throw on error when a used license
   * is expired.
   */
  throwOnLicenseExpiration? : boolean;
  /**
   * If set to `true`, we will not wait until the MediaKeys instance is attached
   * to the media element before pushing segments to it.
   * Setting it to `true` might be needed on some targets to work-around a
   * deadlock in the browser-side logic (or most likely the CDM implementation)
   * but it can also break playback of contents with both encrypted and
   * unencrypted data, most especially on Chromium and Chromium-derived browsers.
   */
  disableMediaKeysAttachmentLock? : boolean;
  /**
   * Enable fallback logic, to switch to other Representations when a key linked
   * to another one fails with an error.
   * Configure only this if you have contents with multiple keys depending on
   * the Representation (also known as qualities/profiles).
   */
  fallbackOn? : {
    /**
     * If `true`, we will fallback when a key obtain the "internal-error" status.
     * If `false`, we fill just throw a fatal error instead.
     */
    keyInternalError? : boolean;
    /**
     * If `true`, we will fallback when a key obtain the "internal-error" status.
     * If `false`, we fill just throw a fatal error instead.
     */
    keyOutputRestricted? : boolean;
  };
}

/**
 * Data stored in a persistent MediaKeySession storage.
 * Has to be versioned to be able to play MediaKeySessions persisted in an old
 * RxPlayer version when in a new one.
 */
export type IPersistentSessionInfo = IPersistentSessionInfoV4 |
                                     IPersistentSessionInfoV3 |
                                     IPersistentSessionInfoV2 |
                                     IPersistentSessionInfoV1 |
                                     IPersistentSessionInfoV0;

/** Persistent MediaKeySession storage interface. */
export interface IPersistentSessionStorage {
  /** Load persistent MediaKeySessions previously saved through the `save` callback. */
  load() : IPersistentSessionInfo[] | undefined | null;
  /**
   * Save new persistent MediaKeySession information.
   * The given argument should be returned by the next `load` call.
   */
  save(x : IPersistentSessionInfo[]) : void;
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
  disableRetroCompatibility? : boolean;
}

/** Payload emitted with a `bitrateEstimationChange` event. */
export interface IBitrateEstimate {
  /** The type of buffer this estimate was done for (e.g. "audio). */
  type : IBufferType;
  /** The calculated bitrate, in bits per seconds. */
  bitrate : number | undefined;
}

export interface IDecipherabilityUpdateContent {
  trackType : IBufferType;
  trackId : string;
  representationId : string;
  isDecipherable? : boolean | undefined;
  periodInfo : IDecipherabilityUpdatePeriodInfo;
}

export type IDecipherabilityUpdatePeriodInfo = IPeriod;

/** Payload emitted with a `positionUpdate` event. */
export interface IPositionUpdate {
  /** current position the player is in, in seconds. */
  position : number;
  /** Last position set for the current media currently, in seconds. */
  duration : number;
  /** Playback rate (i.e. speed) at which the current media is played. */
  playbackRate : number;
  /** Amount of buffer available for now in front of the current position, in seconds. */
  bufferGap : number;
  /** Current maximum seekable position. */
  maximumPosition? : number | undefined;
  wallClockTime? : number | undefined;
  /**
   * Only for live contents. Difference between the "live edge" and the current
   * position, in seconds.
   */
  liveGap? : number | undefined;
}

export type IPlayerState = "STOPPED" |
                           "LOADED" |
                           "LOADING" |
                           "PLAYING" |
                           "PAUSED" |
                           "ENDED" |
                           "BUFFERING" |
                           "SEEKING" |
                           "RELOADING";

export interface IPeriodChangeEvent {
  start : number;
  id : string;
  end? : number | undefined;
}

export type IStreamEvent = { data: IStreamEventData;
                             start: number;
                             end: number;
                             onExit?: () => void; } |
                           { data: IStreamEventData;
                             start: number; };

export interface IStreamEventData {
  type: "dash-event-stream";
  value: { schemeIdUri: string;
           timescale: number;
           element: Element; };
}

export type IPlayerError = EncryptedMediaError |
                           MediaError |
                           OtherError |
                           NetworkError;

/**
 * Information describing a single Representation from an Adaptation, to be used
 * in the `representationFilter` API.
 */
export interface IRepresentationInfos { bufferType: string;
                                        language?: string | undefined;
                                        isAudioDescription? : boolean | undefined;
                                        isClosedCaption? : boolean | undefined;
                                        isDub? : boolean | undefined;
                                        isSignInterpreted?: boolean | undefined;
                                        normalizedLanguage? : string | undefined; }

/**
 * Definition of a single audio Representation as represented by the
 * RxPlayer.
 */
export interface IAudioRepresentation {
  id : string|number;
  bitrate? : number | undefined;
  codec? : string | undefined;
}

/** Audio track returned by the RxPlayer. */
export interface IAudioTrack {
  /** The language the audio track is in, as it is named in the Manifest. */
  language : string;
  /**
   * An attempt to translate `language` into a valid ISO639-3 language code.
   * Kept equal to `language` if the attempt failed.
   */
  normalized : string;
  audioDescription : boolean;
  dub? : boolean | undefined;
  id : number | string;
  label? : string | undefined;
  representations: IAudioRepresentation[];
}

/** Text track returned by the RxPlayer. */
export interface ITextTrack {
  /** The language the text track is in, as it is named in the Manifest. */
  language : string;
  /**
   * An attempt to translate `language` into a valid ISO639-3 language code.
   * Kept equal to `language` if the attempt failed.
   */
  normalized : string;
  closedCaption : boolean;
  label? : string | undefined;
  id : number|string;
}

/**
 * Definition of a single video Representation as represented by the
 * RxPlayer.
 */
export interface IVideoRepresentation {
  id : string;
  bitrate? : number | undefined;
  width? : number | undefined;
  height? : number | undefined;
  codec? : string | undefined;
  frameRate? : number | undefined;
  hdrInfo?: IHDRInformation | undefined;
}

/** Video track returned by the RxPlayer. */
export interface IVideoTrack {
  id : string;
  signInterpreted?: boolean | undefined;
  isTrickModeTrack?: boolean | undefined;
  trickModeTracks?: IVideoTrack[] | undefined;
  label? : string | undefined;
  representations: IVideoRepresentation[];
}

/** Period from a list of Periods as returned by the RxPlayer. */
export interface IPeriod {
  /** Start time in seconds at which the Period starts. */
  start : number;
  /**
   * End time in seconds at which the Period ends.
   * `undefined` if that end is unknown for now.
   */
  end : number | undefined;
  /** Identifier for this Period allowing to perform track modification for it. */
  id : string;
}

/** Audio track from a list of audio tracks returned by the RxPlayer. */
export interface IAvailableAudioTrack
  extends IAudioTrack { active : boolean }

/** Text track from a list of text tracks returned by the RxPlayer. */
export interface IAvailableTextTrack
  extends ITextTrack { active : boolean }

/** Video track from a list of video tracks returned by the RxPlayer. */
export interface IAvailableVideoTrack
  extends IVideoTrack { active : boolean }

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
export type IAudioTrackSwitchingMode = "direct" |
                                       "seamless" |
                                       "reload";

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
export type IVideoTrackSwitchingMode = "direct" |
                                       "seamless" |
                                       "reload";

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
type IRepresentationsSwitchingMode = "direct" |
                                     "seamless" |
                                     "reload" |
                                     "lazy";
