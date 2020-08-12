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

/**
 * This file exports various helpers to parse options given to various APIs,
 * throw if something is wrong, and return a normalized option object.
 */

import config from "../../config";
import log from "../../log";
import { IRepresentationFilter } from "../../manifest";
import {
  CustomManifestLoader,
  CustomSegmentLoader,
  ITransportOptions as IParsedTransportOptions,
} from "../../transports";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import {
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../../utils/languages";
import objectAssign from "../../utils/object_assign";
import warnOnce from "../../utils/warn_once";
import { IKeySystemOption } from "../eme";
import {
  IAudioTrackPreference,
  ITextTrackPreference,
  IVideoTrackPreference,
} from "./track_choice_manager";

const { DEFAULT_AUTO_PLAY,
        DEFAULT_ENABLE_FAST_SWITCHING,
        DEFAULT_INITIAL_BITRATES,
        DEFAULT_LIMIT_VIDEO_WIDTH,
        DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
        DEFAULT_MAX_BITRATES,
        DEFAULT_MAX_BUFFER_AHEAD,
        DEFAULT_MAX_BUFFER_BEHIND,
        DEFAULT_SHOW_NATIVE_SUBTITLE,
        DEFAULT_STOP_AT_END,
        DEFAULT_TEXT_TRACK_MODE,
        DEFAULT_THROTTLE_WHEN_HIDDEN,
        DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN,
        DEFAULT_WANTED_BUFFER_AHEAD } = config;

export { IKeySystemOption };

/** Value of the `serverSyncInfos` transport option. */
interface IServerSyncInfos {
  /** The server timestamp at a given time. */
  serverTimestamp : number;
  /**
   * The client monotonic clock (performance.now) at which `serverTimestamp`
   * was valid.
   */
  clientTime : number;
}

/** Value of the `transportOptions` option of the `loadVideo` method. */
export interface ITransportOptions {
  /** Whether we can perform request for segments in advance. */
  aggressiveMode? : boolean;
  /**
   * Whether we should check that an obtain segment is truncated and retry the
   * request if that's the case.
   */
  checkMediaSegmentIntegrity? : boolean;
  /** Custom implementation for performing Manifest requests. */
  manifestLoader? : CustomManifestLoader;
  /** Possible custom URL pointing to a shorter form of the Manifest. */
  manifestUpdateUrl? : string;
  /** Minimum bound for Manifest updates, in milliseconds. */
  minimumManifestUpdateInterval? : number;
  /** Custom implementation for performing segment requests. */
  segmentLoader? : CustomSegmentLoader;
  /** Custom logic to filter out unwanted qualities. */
  representationFilter? : IRepresentationFilter;
  /** Base time for the segments in case it is not found in the Manifest. */
  referenceDateTime? : number;
  /** Allows to synchronize the server's time with the client's. */
  serverSyncInfos? : IServerSyncInfos;
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

/** Possible values for the `startAt` option of the `loadVideo` method. */
export type IStartAtOption = { position : number } |
                             { wallClockTime : Date|number } |
                             { percentage : number } |
                             { fromLastPosition : number } |
                             { fromFirstPosition : number };

/** Value once parsed for the `startAt` option of the `loadVideo` method. */
type IParsedStartAtOption = { position : number } |
                            { wallClockTime : number } |
                            { percentage : number } |
                            { fromLastPosition : number } |
                            { fromFirstPosition : number };

/** Every options that can be given to the RxPlayer's constructor. */
export interface IConstructorOptions { maxBufferAhead? : number;
                                       maxBufferBehind? : number;
                                       wantedBufferAhead? : number;

                                       limitVideoWidth? : boolean;
                                       throttleWhenHidden? : boolean;
                                       throttleVideoBitrateWhenHidden? : boolean;

                                       preferredAudioTracks? : IAudioTrackPreference[];
                                       preferredTextTracks? : ITextTrackPreference[];
                                       preferredVideoTracks? : IVideoTrackPreference[];

                                       videoElement? : HTMLMediaElement;
                                       initialVideoBitrate? : number;
                                       initialAudioBitrate? : number;
                                       maxAudioBitrate? : number;
                                       maxVideoBitrate? : number;
                                       stopAtEnd? : boolean; }

/** Options of the RxPlayer's constructor once parsed. */
export interface IParsedConstructorOptions {
  maxBufferAhead : number;
  maxBufferBehind : number;
  wantedBufferAhead : number;

  limitVideoWidth : boolean;
  throttleWhenHidden : boolean;
  throttleVideoBitrateWhenHidden : boolean;

  preferredAudioTracks : IAudioTrackPreference[];
  preferredTextTracks : ITextTrackPreference[];
  preferredVideoTracks : IVideoTrackPreference[];

  videoElement : HTMLMediaElement;
  initialVideoBitrate : number;
  initialAudioBitrate : number;
  maxAudioBitrate : number;
  maxVideoBitrate : number;
  stopAtEnd : boolean;
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

  /* tslint:disable deprecation */
  supplementaryTextTracks? : ISupplementaryTextTrackOption[];
  supplementaryImageTracks? : ISupplementaryImageTrackOption[];
  defaultAudioTrack? : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack? : IDefaultTextTrackOption|null|undefined;
  /* tslint:enable deprecation */
}

/**
 * Base type which the types for the parsed options of the RxPlayer's
 * `loadVideo` method exend.
 */
interface IParsedLoadVideoOptionsBase {
  url? : string;
  transport : string;
  autoPlay : boolean;
  keySystems : IKeySystemOption[];
  lowLatencyMode : boolean;
  manifestUpdateUrl : string | undefined;
  minimumManifestUpdateInterval : number;
  networkConfig: INetworkConfigOption;
  transportOptions : IParsedTransportOptions;
  defaultAudioTrack : IAudioTrackPreference|null|undefined;
  defaultTextTrack : ITextTrackPreference|null|undefined;
  startAt : IParsedStartAtOption|undefined;
  manualBitrateSwitchingMode : "seamless"|"direct";
  enableFastSwitching : boolean;
}

/**
 * Options of the RxPlayer's `loadVideo` method once parsed when a "native"
 * `textTrackMode` is asked.
 */
interface IParsedLoadVideoOptionsNative
          extends IParsedLoadVideoOptionsBase { textTrackMode : "native";
                                                hideNativeSubtitle : boolean; }

/**
 * Options of the RxPlayer's `loadVideo` method once parsed when an "html"
 * `textTrackMode` is asked.
 */
interface IParsedLoadVideoOptionsHTML
          extends IParsedLoadVideoOptionsBase { textTrackMode : "html";
                                                textTrackElement : HTMLElement; }

/**
 * Type enumerating all possible forms for the parsed options of the RxPlayer's
 * `loadVideo` method.
 */
export type IParsedLoadVideoOptions =
  IParsedLoadVideoOptionsNative |
  IParsedLoadVideoOptionsHTML;

/**
 * Parse options given to the API constructor and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object|undefined} options
 * @returns {Object}
 */
function parseConstructorOptions(
  options : IConstructorOptions
) : IParsedConstructorOptions {
  let maxBufferAhead : number;
  let maxBufferBehind : number;
  let wantedBufferAhead : number;

  let limitVideoWidth : boolean;
  let throttleWhenHidden : boolean;
  let throttleVideoBitrateWhenHidden : boolean;

  let preferredAudioTracks : IAudioTrackPreference[];
  let preferredTextTracks : ITextTrackPreference[];
  let preferredVideoTracks : IVideoTrackPreference[];

  let videoElement : HTMLMediaElement;
  let initialVideoBitrate : number;
  let initialAudioBitrate : number;
  let maxAudioBitrate : number;
  let maxVideoBitrate : number;
  let stopAtEnd : boolean;

  if (isNullOrUndefined(options.maxBufferAhead)) {
    maxBufferAhead = DEFAULT_MAX_BUFFER_AHEAD;
  } else {
    maxBufferAhead = Number(options.maxBufferAhead);
    if (isNaN(maxBufferAhead)) {
      throw new Error("Invalid maxBufferAhead parameter. Should be a number.");
    }
  }

  if (isNullOrUndefined(options.maxBufferBehind)) {
    maxBufferBehind = DEFAULT_MAX_BUFFER_BEHIND;
  } else {
    maxBufferBehind = Number(options.maxBufferBehind);
    if (isNaN(maxBufferBehind)) {
      throw new Error("Invalid maxBufferBehind parameter. Should be a number.");
    }
  }

  if (isNullOrUndefined(options.wantedBufferAhead)) {
    wantedBufferAhead = DEFAULT_WANTED_BUFFER_AHEAD;
  } else {
    wantedBufferAhead = Number(options.wantedBufferAhead);
    if (isNaN(wantedBufferAhead)) {
      /* tslint:disable:max-line-length */
      throw new Error("Invalid wantedBufferAhead parameter. Should be a number.");
      /* tslint:enable:max-line-length */
    }
  }

  limitVideoWidth = isNullOrUndefined(options.limitVideoWidth) ?
    DEFAULT_LIMIT_VIDEO_WIDTH :
    !!options.limitVideoWidth;

  if (!isNullOrUndefined(options.throttleWhenHidden)) {
    warnOnce("`throttleWhenHidden` API is deprecated. Consider using " +
             "`throttleVideoBitrateWhenHidden` instead.");

    throttleWhenHidden = !!options.throttleWhenHidden;
  } else {
    throttleWhenHidden = DEFAULT_THROTTLE_WHEN_HIDDEN;
  }

  // `throttleWhenHidden` and `throttleVideoBitrateWhenHidden` can be in conflict
  // Do not activate the latter if the former is
  if (throttleWhenHidden) {
    throttleVideoBitrateWhenHidden = false;
  } else {
    throttleVideoBitrateWhenHidden =
      isNullOrUndefined(options.throttleVideoBitrateWhenHidden) ?
        DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN :
        !!options.throttleVideoBitrateWhenHidden;
  }

  if (options.preferredTextTracks !== undefined) {
    if (!Array.isArray(options.preferredTextTracks)) {
      warnOnce("Invalid `preferredTextTracks` option, it should be an Array");
      preferredTextTracks = [];
    } else {
      preferredTextTracks = options.preferredTextTracks;
    }
  } else {
    preferredTextTracks = [];
  }

  if (options.preferredAudioTracks !== undefined) {
    if (!Array.isArray(options.preferredAudioTracks)) {
      warnOnce("Invalid `preferredAudioTracks` option, it should be an Array");
      preferredAudioTracks = [];
    } else {
      preferredAudioTracks = options.preferredAudioTracks;
    }
  } else {
    preferredAudioTracks = [];
  }

  if (options.preferredVideoTracks !== undefined) {
    if (!Array.isArray(options.preferredVideoTracks)) {
      warnOnce("Invalid `preferredVideoTracks` option, it should be an Array");
      preferredVideoTracks = [];
    } else {
      preferredVideoTracks = options.preferredVideoTracks;
    }
  } else {
    preferredVideoTracks = [];
  }

  if (isNullOrUndefined(options.videoElement)) {
    videoElement = document.createElement("video");
  } else if (options.videoElement instanceof HTMLMediaElement) {
    videoElement = options.videoElement;
  } else {
    /* tslint:disable:max-line-length */
    throw new Error("Invalid videoElement parameter. Should be a HTMLMediaElement.");
    /* tslint:enable:max-line-length */
  }

  if (isNullOrUndefined(options.initialVideoBitrate)) {
    initialVideoBitrate = DEFAULT_INITIAL_BITRATES.video;
  } else {
    initialVideoBitrate = Number(options.initialVideoBitrate);
    if (isNaN(initialVideoBitrate)) {
      /* tslint:disable:max-line-length */
      throw new Error("Invalid initialVideoBitrate parameter. Should be a number.");
      /* tslint:enable:max-line-length */
    }
  }

  if (isNullOrUndefined(options.initialAudioBitrate)) {
    initialAudioBitrate = DEFAULT_INITIAL_BITRATES.audio;
  } else {
    initialAudioBitrate = Number(options.initialAudioBitrate);
    if (isNaN(initialAudioBitrate)) {
      /* tslint:disable:max-line-length */
      throw new Error("Invalid initialAudioBitrate parameter. Should be a number.");
      /* tslint:enable:max-line-length */
    }
  }

  if (isNullOrUndefined(options.maxVideoBitrate)) {
    maxVideoBitrate = DEFAULT_MAX_BITRATES.video;
  } else {
    maxVideoBitrate = Number(options.maxVideoBitrate);
    if (isNaN(maxVideoBitrate)) {
      throw new Error("Invalid maxVideoBitrate parameter. Should be a number.");
    }
  }

  if (isNullOrUndefined(options.maxAudioBitrate)) {
    maxAudioBitrate = DEFAULT_MAX_BITRATES.audio;
  } else {
    maxAudioBitrate = Number(options.maxAudioBitrate);
    if (isNaN(maxAudioBitrate)) {
      throw new Error("Invalid maxAudioBitrate parameter. Should be a number.");
    }
  }

  stopAtEnd = isNullOrUndefined(options.stopAtEnd) ? DEFAULT_STOP_AT_END :
                                                     !!options.stopAtEnd;

  return { maxBufferAhead,
           maxBufferBehind,
           limitVideoWidth,
           videoElement,
           wantedBufferAhead,
           throttleWhenHidden,
           throttleVideoBitrateWhenHidden,
           preferredAudioTracks,
           preferredTextTracks,
           preferredVideoTracks,
           initialAudioBitrate,
           initialVideoBitrate,
           maxAudioBitrate,
           maxVideoBitrate,
           stopAtEnd };
}

/**
 * Parse options given to loadVideo and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 *
 * Throws if any mandatory option is not set.
 * @param {Object|undefined} options
 * @param {Object} ctx - The player context, needed for some default values.
 * @returns {Object}
 */
function parseLoadVideoOptions(
  options : ILoadVideoOptions
) : IParsedLoadVideoOptions {
  let url : string|undefined;
  let transport : string;
  let keySystems : IKeySystemOption[];
  let textTrackMode : "native"|"html";
  let textTrackElement : HTMLElement|undefined;
  let startAt : IParsedStartAtOption|undefined;

  if (isNullOrUndefined(options)) {
    throw new Error("No option set on loadVideo");
  }

  if (!isNullOrUndefined(options.url)) {
    url = String(options.url);
  } else if (isNullOrUndefined(options.transportOptions?.manifestLoader)) {
    throw new Error("No url set on loadVideo");
  }

  if (isNullOrUndefined(options.transport)) {
    throw new Error("No transport set on loadVideo");
  } else {
    transport = String(options.transport);
  }

  const autoPlay = isNullOrUndefined(options.autoPlay) ? DEFAULT_AUTO_PLAY :
                                                         !!options.autoPlay;

  if (isNullOrUndefined(options.keySystems)) {
    keySystems = [];
  } else {
    keySystems = Array.isArray(options.keySystems) ? options.keySystems :
                                                     [options.keySystems];
    for (const keySystem of keySystems) {
      if (typeof keySystem.type !== "string" ||
          typeof keySystem.getLicense !== "function"
      ) {
        throw new Error("Invalid key system given: Missing type string or " +
                        "getLicense callback");
      }
    }
  }

  const lowLatencyMode = options.lowLatencyMode === undefined ?
    false :
    !!options.lowLatencyMode;
  const transportOptsArg = typeof options.transportOptions === "object" &&
                                  options.transportOptions !== null ?
    options.transportOptions :
    {};

  const manifestUpdateUrl = options.transportOptions?.manifestUpdateUrl;
  const minimumManifestUpdateInterval =
    options.transportOptions?.minimumManifestUpdateInterval ?? 0;

  const transportOptions = objectAssign({}, transportOptsArg, {
    /* tslint:disable deprecation */
    supplementaryImageTracks: [] as ISupplementaryImageTrackOption[],
    supplementaryTextTracks: [] as ISupplementaryTextTrackOption[],
    /* tslint:enable deprecation */
    lowLatencyMode,
  });

  // remove already parsed data to simplify the `transportOptions` object
  delete transportOptions.manifestUpdateUrl;
  delete transportOptions.minimumManifestUpdateInterval;

  if (options.supplementaryTextTracks !== undefined) {
    warnOnce("The `supplementaryTextTracks` loadVideo option is deprecated.\n" +
             "Please use the `TextTrackRenderer` tool instead.");
    const supplementaryTextTracks =
      Array.isArray(options.supplementaryTextTracks) ?
        options.supplementaryTextTracks : [options.supplementaryTextTracks];

    for (const supplementaryTextTrack of supplementaryTextTracks) {
      if (typeof supplementaryTextTrack.language !== "string" ||
          typeof supplementaryTextTrack.mimeType !== "string" ||
          typeof supplementaryTextTrack.url !== "string"
      ) {
        throw new Error("Invalid supplementary text track given. " +
                        "Missing either language, mimetype or url");
      }
    }
    transportOptions.supplementaryTextTracks = supplementaryTextTracks;
  }
  if (options.supplementaryImageTracks !== undefined) {
    warnOnce("The `supplementaryImageTracks` loadVideo option is deprecated.\n" +
             "Please use the `parseBifThumbnails` tool instead.");
    const supplementaryImageTracks =
      Array.isArray(options.supplementaryImageTracks) ?
        options.supplementaryImageTracks : [options.supplementaryImageTracks];
    for (const supplementaryImageTrack of supplementaryImageTracks) {
      if (typeof supplementaryImageTrack.mimeType !== "string" ||
          typeof supplementaryImageTrack.url !== "string"
      ) {
        throw new Error("Invalid supplementary image track given. " +
                        "Missing either mimetype or url");
      }
    }
    transportOptions.supplementaryImageTracks = supplementaryImageTracks;
  }

  if (isNullOrUndefined(options.textTrackMode)) {
    textTrackMode = DEFAULT_TEXT_TRACK_MODE;
  } else {
    if (options.textTrackMode !== "native" && options.textTrackMode !== "html") {
      throw new Error("Invalid textTrackMode.");
    }
    textTrackMode = options.textTrackMode;
  }

  if (!isNullOrUndefined(options.defaultAudioTrack)) {
    warnOnce("The `defaultAudioTrack` loadVideo option is deprecated.\n" +
             "Please use the `preferredAudioTracks` constructor option or the" +
             "`setPreferredAudioTracks` method instead");
  }
  const defaultAudioTrack = normalizeAudioTrack(options.defaultAudioTrack);

  if (!isNullOrUndefined(options.defaultTextTrack)) {
    warnOnce("The `defaultTextTrack` loadVideo option is deprecated.\n" +
             "Please use the `preferredTextTracks` constructor option or the" +
             "`setPreferredTextTracks` method instead");
  }
  const defaultTextTrack = normalizeTextTrack(options.defaultTextTrack);

  let hideNativeSubtitle = !DEFAULT_SHOW_NATIVE_SUBTITLE;
  if (!isNullOrUndefined(options.hideNativeSubtitle)) {
    warnOnce("The `hideNativeSubtitle` loadVideo option is deprecated");
    hideNativeSubtitle = !!options.hideNativeSubtitle;
  }
  const manualBitrateSwitchingMode = options.manualBitrateSwitchingMode ??
                                     DEFAULT_MANUAL_BITRATE_SWITCHING_MODE;

  const enableFastSwitching = isNullOrUndefined(options.enableFastSwitching) ?
    DEFAULT_ENABLE_FAST_SWITCHING :
    options.enableFastSwitching;

  if (textTrackMode === "html") {
    // TODO Better way to express that in TypeScript?
    if (isNullOrUndefined(options.textTrackElement)) {
      throw new Error("You have to provide a textTrackElement " +
                      "in \"html\" textTrackMode.");
    } else if (!(options.textTrackElement instanceof HTMLElement)) {
      throw new Error("textTrackElement should be an HTMLElement.");
    } else {
      textTrackElement = options.textTrackElement;
    }
  } else if (!isNullOrUndefined(options.textTrackElement)) {
    log.warn("API: You have set a textTrackElement without being in " +
             "an \"html\" textTrackMode. It will be ignored.");
  }

  if (!isNullOrUndefined(options.startAt)) {
    // TODO Better way to express that in TypeScript?
    if ((options.startAt as { wallClockTime? : Date|number }).wallClockTime
           instanceof Date
    ) {
      const wallClockTime = (options.startAt as { wallClockTime : Date })
        .wallClockTime.getTime() / 1000;
      startAt = objectAssign({},
                             options.startAt,
                             { wallClockTime });
    } else {
      startAt = options.startAt as IParsedStartAtOption;
    }
  }

  const networkConfig = isNullOrUndefined(options.networkConfig) ?
    {} :
    { manifestRetry: options.networkConfig.manifestRetry,
      offlineRetry: options.networkConfig.offlineRetry,
      segmentRetry: options.networkConfig.segmentRetry };

  // TODO without cast
  /* tslint:disable no-object-literal-type-assertion */
  return { autoPlay,
           defaultAudioTrack,
           defaultTextTrack,
           enableFastSwitching,
           hideNativeSubtitle,
           keySystems,
           lowLatencyMode,
           manualBitrateSwitchingMode,
           manifestUpdateUrl,
           minimumManifestUpdateInterval,
           networkConfig,
           startAt,
           textTrackElement,
           textTrackMode,
           transport,
           transportOptions,
           url } as IParsedLoadVideoOptions;
  /* tslint:enable no-object-literal-type-assertion */
}

export {
  parseConstructorOptions,
  parseLoadVideoOptions,
};
