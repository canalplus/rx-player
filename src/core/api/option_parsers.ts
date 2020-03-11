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
} from "./track_choice_manager";

const { DEFAULT_AUTO_PLAY,
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

interface IServerSyncInfos { serverTimestamp : number;
                             clientTime : number; }

export interface ITransportOptions { aggressiveMode? : boolean;
                                     checkMediaSegmentIntegrity? : boolean;
                                     manifestLoader? : CustomManifestLoader;
                                     manifestUpdateUrl? : string;
                                     minimumManifestUpdateInterval? : number;
                                     segmentLoader? : CustomSegmentLoader;
                                     representationFilter? : IRepresentationFilter;
                                     referenceDateTime? : number;
                                     serverSyncInfos? : IServerSyncInfos; }

export interface ISupplementaryTextTrackOption { url : string;
                                                 language : string;
                                                 closedCaption : boolean;
                                                 mimeType : string;
                                                 codecs? : string; }

export interface ISupplementaryImageTrackOption { url : string;
                                                  mimeType : string; }

export interface IDefaultAudioTrackOption { language : string;
                                            normalized : string;
                                            audioDescription : boolean; }

export interface IDefaultTextTrackOption { language : string;
                                           normalized : string;
                                           closedCaption : boolean; }

export interface INetworkConfigOption { manifestRetry? : number;
                                        offlineRetry? : number;
                                        segmentRetry? : number; }

export type IStartAtOption = { position : number } |
                             { wallClockTime : Date|number } |
                             { percentage : number } |
                             { fromLastPosition : number } |
                             { fromFirstPosition : number };

type IParsedStartAtOption = { position : number } |
                            { wallClockTime : number } |
                            { percentage : number } |
                            { fromLastPosition : number } |
                            { fromFirstPosition : number };

export interface IConstructorOptions { maxBufferAhead? : number;
                                       maxBufferBehind? : number;
                                       wantedBufferAhead? : number;

                                       limitVideoWidth? : boolean;
                                       throttleWhenHidden? : boolean;
                                       throttleVideoBitrateWhenHidden? : boolean;

                                       preferredAudioTracks? : IAudioTrackPreference[];
                                       preferredTextTracks? : ITextTrackPreference[];

                                       videoElement? : HTMLMediaElement;
                                       initialVideoBitrate? : number;
                                       initialAudioBitrate? : number;
                                       maxAudioBitrate? : number;
                                       maxVideoBitrate? : number;
                                       stopAtEnd? : boolean; }

export interface IParsedConstructorOptions {
  maxBufferAhead : number;
  maxBufferBehind : number;
  wantedBufferAhead : number;

  limitVideoWidth : boolean;
  throttleWhenHidden : boolean;
  throttleVideoBitrateWhenHidden : boolean;

  preferredAudioTracks : IAudioTrackPreference[];
  preferredTextTracks : ITextTrackPreference[];

  videoElement : HTMLMediaElement;
  initialVideoBitrate : number;
  initialAudioBitrate : number;
  maxAudioBitrate : number;
  maxVideoBitrate : number;
  stopAtEnd : boolean;
}

export interface ILoadVideoOptions {
  transport : string;

  url? : string;
  autoPlay? : boolean;
  keySystems? : IKeySystemOption[];
  transportOptions? : ITransportOptions|undefined;
  supplementaryTextTracks? : ISupplementaryTextTrackOption[];
  supplementaryImageTracks? : ISupplementaryImageTrackOption[];
  defaultAudioTrack? : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack? : IDefaultTextTrackOption|null|undefined;
  lowLatencyMode? : boolean;
  networkConfig? : INetworkConfigOption;
  startAt? : IStartAtOption;
  textTrackMode? : "native"|"html";
  hideNativeSubtitle? : boolean;
  textTrackElement? : HTMLElement;
  manualBitrateSwitchingMode? : "seamless"|"direct";
}

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
}

interface IParsedLoadVideoOptionsNative
          extends IParsedLoadVideoOptionsBase { textTrackMode : "native";
                                                hideNativeSubtitle : boolean; }

interface IParsedLoadVideoOptionsHTML
          extends IParsedLoadVideoOptionsBase { textTrackMode : "html";
                                                textTrackElement : HTMLElement; }

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

  let videoElement : HTMLMediaElement;
  let initialVideoBitrate : number;
  let initialAudioBitrate : number;
  let maxAudioBitrate : number;
  let maxVideoBitrate : number;
  let stopAtEnd : boolean;

  if (options.maxBufferAhead == null) {
    maxBufferAhead = DEFAULT_MAX_BUFFER_AHEAD;
  } else {
    maxBufferAhead = Number(options.maxBufferAhead);
    if (isNaN(maxBufferAhead)) {
      throw new Error("Invalid maxBufferAhead parameter. Should be a number.");
    }
  }

  if (options.maxBufferBehind == null) {
    maxBufferBehind = DEFAULT_MAX_BUFFER_BEHIND;
  } else {
    maxBufferBehind = Number(options.maxBufferBehind);
    if (isNaN(maxBufferBehind)) {
      throw new Error("Invalid maxBufferBehind parameter. Should be a number.");
    }
  }

  if (options.wantedBufferAhead == null) {
    wantedBufferAhead = DEFAULT_WANTED_BUFFER_AHEAD;
  } else {
    wantedBufferAhead = Number(options.wantedBufferAhead);
    if (isNaN(wantedBufferAhead)) {
      /* tslint:disable:max-line-length */
      throw new Error("Invalid wantedBufferAhead parameter. Should be a number.");
      /* tslint:enable:max-line-length */
    }
  }

  limitVideoWidth = options.limitVideoWidth == null ? DEFAULT_LIMIT_VIDEO_WIDTH :
                                                      !!options.limitVideoWidth;

  if (options.throttleWhenHidden != null) {
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
    throttleVideoBitrateWhenHidden = options.throttleVideoBitrateWhenHidden == null ?
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

  if (options.videoElement == null) {
    videoElement = document.createElement("video");
  } else if (options.videoElement instanceof HTMLMediaElement) {
    videoElement = options.videoElement;
  } else {
    /* tslint:disable:max-line-length */
    throw new Error("Invalid videoElement parameter. Should be a HTMLMediaElement.");
    /* tslint:enable:max-line-length */
  }

  if (options.initialVideoBitrate == null) {
    initialVideoBitrate = DEFAULT_INITIAL_BITRATES.video;
  } else {
    initialVideoBitrate = Number(options.initialVideoBitrate);
    if (isNaN(initialVideoBitrate)) {
      /* tslint:disable:max-line-length */
      throw new Error("Invalid initialVideoBitrate parameter. Should be a number.");
      /* tslint:enable:max-line-length */
    }
  }

  if (options.initialAudioBitrate == null) {
    initialAudioBitrate = DEFAULT_INITIAL_BITRATES.audio;
  } else {
    initialAudioBitrate = Number(options.initialAudioBitrate);
    if (isNaN(initialAudioBitrate)) {
      /* tslint:disable:max-line-length */
      throw new Error("Invalid initialAudioBitrate parameter. Should be a number.");
      /* tslint:enable:max-line-length */
    }
  }

  if (options.maxVideoBitrate == null) {
    maxVideoBitrate = DEFAULT_MAX_BITRATES.video;
  } else {
    maxVideoBitrate = Number(options.maxVideoBitrate);
    if (isNaN(maxVideoBitrate)) {
      throw new Error("Invalid maxVideoBitrate parameter. Should be a number.");
    }
  }

  if (options.maxAudioBitrate == null) {
    maxAudioBitrate = DEFAULT_MAX_BITRATES.audio;
  } else {
    maxAudioBitrate = Number(options.maxAudioBitrate);
    if (isNaN(maxAudioBitrate)) {
      throw new Error("Invalid maxAudioBitrate parameter. Should be a number.");
    }
  }

  stopAtEnd = options.stopAtEnd == null ? DEFAULT_STOP_AT_END :
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

  if (options == null) {
    throw new Error("No option set on loadVideo");
  }

  if (options.url != null) {
    url = String(options.url);
  } else if (
    options.transportOptions == null ||
    options.transportOptions.manifestLoader == null
  ) {
    throw new Error("No url set on loadVideo");
  }

  if (options.transport == null) {
    throw new Error("No transport set on loadVideo");
  } else {
    transport = String(options.transport);
  }

  const autoPlay = options.autoPlay == null ? DEFAULT_AUTO_PLAY :
                                              !!options.autoPlay;

  if (options.keySystems == null) {
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

  const transportOptions : IParsedTransportOptions = {
    aggressiveMode: transportOptsArg.aggressiveMode,
    checkMediaSegmentIntegrity: transportOptsArg.checkMediaSegmentIntegrity,
    lowLatencyMode,
    manifestLoader: transportOptsArg.manifestLoader,
    referenceDateTime: transportOptsArg.referenceDateTime,
    representationFilter: transportOptsArg.representationFilter,
    segmentLoader: transportOptsArg.segmentLoader,
    serverSyncInfos: transportOptsArg.serverSyncInfos,
    supplementaryImageTracks: [],
    supplementaryTextTracks: [],
  };
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

  if (options.textTrackMode == null) {
    textTrackMode = DEFAULT_TEXT_TRACK_MODE;
  } else {
    if (options.textTrackMode !== "native" && options.textTrackMode !== "html") {
      throw new Error("Invalid textTrackMode.");
    }
    textTrackMode = options.textTrackMode;
  }

  if (options.defaultAudioTrack != null) {
    warnOnce("The `defaultAudioTrack` loadVideo option is deprecated.\n" +
             "Please use the `preferredAudioTracks` constructor option or the" +
             "`setPreferredAudioTracks` method instead");
  }
  const defaultAudioTrack = normalizeAudioTrack(options.defaultAudioTrack);

  if (options.defaultTextTrack != null) {
    warnOnce("The `defaultTextTrack` loadVideo option is deprecated.\n" +
             "Please use the `preferredTextTracks` constructor option or the" +
             "`setPreferredTextTracks` method instead");
  }
  const defaultTextTrack = normalizeTextTrack(options.defaultTextTrack);

  let hideNativeSubtitle = !DEFAULT_SHOW_NATIVE_SUBTITLE;
  if (options.hideNativeSubtitle != null) {
    warnOnce("The `hideNativeSubtitle` loadVideo option is deprecated");
    hideNativeSubtitle = !!options.hideNativeSubtitle;
  }
  const manualBitrateSwitchingMode = options.manualBitrateSwitchingMode == null ?
      DEFAULT_MANUAL_BITRATE_SWITCHING_MODE :
      options.manualBitrateSwitchingMode;

  if (textTrackMode === "html") {
    // TODO Better way to express that in TypeScript?
    if (options.textTrackElement == null) {
      throw new Error("You have to provide a textTrackElement " +
                      "in \"html\" textTrackMode.");
    } else if (!(options.textTrackElement instanceof HTMLElement)) {
      throw new Error("textTrackElement should be an HTMLElement.");
    } else {
      textTrackElement = options.textTrackElement;
    }
  } else if (options.textTrackElement != null) {
    log.warn("API: You have set a textTrackElement without being in " +
             "an \"html\" textTrackMode. It will be ignored.");
  }

  if (options.startAt != null) {
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

  const manifestUpdateUrl = options.transportOptions?.manifestUpdateUrl;
  const minimumManifestUpdateInterval =
    options.transportOptions?.minimumManifestUpdateInterval ?? 0;

  const networkConfig = options.networkConfig == null ?
    {} :
    { manifestRetry: options.networkConfig.manifestRetry,
      offlineRetry: options.networkConfig.offlineRetry,
      segmentRetry: options.networkConfig.segmentRetry };

  // TODO without cast
  /* tslint:disable no-object-literal-type-assertion */
  return { autoPlay,
           defaultAudioTrack,
           defaultTextTrack,
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
