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
  throttleWhenHidden? : boolean;
  throttleVideoBitrateWhenHidden? : boolean;

  preferredAudioTracks? : IAudioTrackPreference[];
  preferredTextTracks? : ITextTrackPreference[];
  preferredVideoTracks? : IVideoTrackPreference[];

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
  hideNativeSubtitle? : boolean;
  textTrackElement? : HTMLElement;
  manualBitrateSwitchingMode? : "seamless"|"direct";
  enableFastSwitching? : boolean;
  audioTrackSwitchingMode? : IAudioTrackSwitchingMode;
  onCodecSwitch? : "continue"|"reload";

  /* eslint-disable import/no-deprecated */
  supplementaryTextTracks? : ISupplementaryTextTrackOption[];
  supplementaryImageTracks? : ISupplementaryImageTrackOption[];
  defaultAudioTrack? : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack? : IDefaultTextTrackOption|null|undefined;
  /* eslint-enable import/no-deprecated */
}

/**
 * Value for the `defaultAudioTrack` option of the `loadVideo` method.
 * @deprecated
 */
export interface IDefaultAudioTrackOption {
  /** The language wanted for the audio track. */
  language : string;
  /** The language normalized into ISO639-3 */
  normalized : string;
  /** If `true`, this is an audio description for the visually impaired. */
  audioDescription : boolean;
}

/**
 * Value for the `defaultTextTrack` option of the `loadVideo` method.
 * @deprecated
 */
export interface IDefaultTextTrackOption {
  /** The language wanted for the text track. */
  language : string;
  /** The language normalized into ISO639-3 */
  normalized : string;
  /** If `true`, this is closed captions for the hard of hearing. */
  closedCaption : boolean;
}

/**
 * External text track we have to add to the Manifest once downloaded.
 * @deprecated
 */
export interface ISupplementaryTextTrackOption {
  /** URL the external text track can be found at. */
  url : string;
  /** Language the text track is in. */
  language : string;
  /** If `true` the text track contains closed captions. */
  closedCaption : boolean;
  /** Mime-type used to know the container and/or format of the text track. */
  mimeType : string;
  /** Codec used to know the format of the text track. */
  codecs? : string;
}

/**
 * External image (".bif") track we have to add to the Manifest once downloaded.
 * @deprecated
 */
export interface ISupplementaryImageTrackOption {
  /** URL the external image track can be found at. */
  url : string;
  /** Mime-type used to know the format of the image track. */
  mimeType : string;
}

/**
 * Strategy to adopt when manually switching of audio adaptation.
 * Can be either:
 *    - "seamless": transitions are smooth but could be not immediate.
 *    - "direct": strategy will be "smart", if the mimetype and the codec,
 *    change, we will perform a hard reload of the media source, however, if it
 *    doesn't change, we will just perform a small flush by removing buffered range
 *    and performing, a small seek on the media element.
 *    Transitions are faster, but, we could see appear a BUFFERING state.
 *    - "reload": completely reload the content. This allows a direct switch
 *    compatible with most device but may necessitate a RELOADING phase.
 */
export type IAudioTrackSwitchingMode = "seamless" |
                                       "direct" |
                                       "reload";

/** Value of the `transportOptions` option of the `loadVideo` method. */
export interface ITransportOptions {
  /** Whether we can perform request for segments in advance. */
  aggressiveMode? : boolean;
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

/** Manifest, as documented in the API documentation. */
export interface IManifest {
  periods : IPeriod[];
  /**
   * @deprecated
   */
  adaptations : { audio? : IAdaptation[];
                  video? : IAdaptation[];
                  text? : IAdaptation[];
                  image? : IAdaptation[]; };
  isLive : boolean;
  transport : string;
}

/** Period, as documented in the API documentation. */
export interface IPeriod {
  id : string;
  start : number;
  end? : number | undefined;
  adaptations : { audio? : IAdaptation[];
                  video? : IAdaptation[];
                  text? : IAdaptation[];
                  image? : IAdaptation[]; };
}

/** Adaptation (represents a track), as documented in the API documentation. */
export interface IAdaptation {
  /** String identifying the Adaptation, unique per Period. */
  id : string;
  type : "video" | "audio" | "text" | "image";
  language? : string | undefined;
  normalizedLanguage? : string | undefined;
  isAudioDescription? : boolean | undefined;
  isClosedCaption? : boolean | undefined;
  isTrickModeTrack? : boolean | undefined;
  representations : IRepresentation[];

  getAvailableBitrates() : number[];
}

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
  bitrate : number;
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
  /**
   * The represesentation frame rate for this Representation. It defines either
   * the number of frames per second as an integer (24), or as a ratio
   * (24000 / 1000).
   */
  frameRate? : string | undefined;
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
  // first argument: infos on the segment
  infos : { url : string;
            manifest : IManifest;
            period : IPeriod;
            adaptation : IAdaptation;
            representation : IRepresentation;
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

export type ILoadedManifestFormat = IInitialManifest;

export type IManifestLoader = (
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

/** Single preference for an audio track Adaptation. */
export type IAudioTrackPreference = null |
                                    { language? : string;
                                      audioDescription? : boolean;
                                      codec? : { all: boolean;
                                                 test: RegExp; }; };

/** Single preference for a text track Adaptation. */
export type ITextTrackPreference = null |
                                   { language : string;
                                     closedCaption : boolean; };

/** Single preference for a video track Adaptation. */
export type IVideoTrackPreference = null |
                                    IVideoTrackPreferenceObject;

/** Preference for a video track Adaptation for when it is not set to `null`. */
interface IVideoTrackPreferenceObject {
  codec? : { all: boolean;
             test: RegExp; };
  signInterpreted? : boolean;
}

/** Payload emitted with a `bitrateEstimationChange` event. */
export interface IBitrateEstimate {
  /** The type of buffer this estimate was done for (e.g. "audio). */
  type : IBufferType;
  /** The calculated bitrate, in bits per seconds. */
  bitrate : number | undefined;
}

export interface IDecipherabilityUpdateContent {
  manifest : IManifest;
  period : IPeriod;
  adaptation : IAdaptation;
  representation : IRepresentation;
}

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
  maximumBufferTime? : number | undefined;
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

export interface IBifThumbnail { index : number;
                                 duration : number;
                                 ts : number;
                                 data : Uint8Array; }

export interface IBifObject { fileFormat : string;
                              version : string;
                              imageCount : number;
                              timescale : number;
                              format : string;
                              width : number;
                              height : number;
                              aspectRatio : string;
                              isVod : boolean;
                              thumbs : IBifThumbnail[];
}

/**
 * Definition of a single audio Representation as represented by the
 * RxPlayer.
 */
export interface IAudioRepresentation { id : string|number;
                                        bitrate : number;
                                        codec? : string | undefined; }

/** Audio track returned by the RxPlayer. */
export interface IAudioTrack { language : string;
                               normalized : string;
                               audioDescription : boolean;
                               dub? : boolean;
                               id : number|string;
                               label? : string | undefined;
                               representations: IAudioRepresentation[]; }

/** Text track returned by the RxPlayer. */
export interface ITextTrack { language : string;
                              normalized : string;
                              closedCaption : boolean;
                              label? : string | undefined;
                              id : number|string; }

/**
 * Definition of a single video Representation as represented by the
 * RxPlayer.
 */
export interface IVideoRepresentation { id : string|number;
                                        bitrate : number;
                                        width? : number | undefined;
                                        height? : number | undefined;
                                        codec? : string | undefined;
                                        frameRate? : string | undefined;
                                        hdrInfo?: IHDRInformation | undefined; }

/** Video track returned by the RxPlayer. */
export interface IVideoTrack { id : number|string;
                               signInterpreted?: boolean;
                               isTrickModeTrack?: boolean;
                               trickModeTracks?: IVideoTrack[];
                               label? : string | undefined;
                               representations: IVideoRepresentation[]; }

/** Audio track from a list of audio tracks returned by the RxPlayer. */
export interface IAvailableAudioTrack
  extends IAudioTrack { active : boolean }

/** Text track from a list of text tracks returned by the RxPlayer. */
export interface IAvailableTextTrack
  extends ITextTrack { active : boolean }

/** Video track from a list of video tracks returned by the RxPlayer. */
export interface IAvailableVideoTrack
  extends IVideoTrack { active : boolean }
