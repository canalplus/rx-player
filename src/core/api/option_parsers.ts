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

import objectAssign from "object-assign";
import config from "../../config";
import log from "../../log";
import {
  CustomManifestLoader,
  CustomSegmentLoader,
} from "../../net/types";
import {
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../../utils/languages";
import { IKeySystemOption } from "../eme";

const {
  DEFAULT_AUTO_PLAY,
  DEFAULT_INITIAL_BITRATES,
  DEFAULT_LIMIT_VIDEO_WIDTH,
  DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
  DEFAULT_MAX_BITRATES,
  DEFAULT_MAX_BUFFER_AHEAD,
  DEFAULT_MAX_BUFFER_BEHIND,
  DEFAULT_SHOW_NATIVE_SUBTITLE,
  DEFAULT_TEXT_TRACK_MODE,
  DEFAULT_THROTTLE_WHEN_HIDDEN,
  DEFAULT_WANTED_BUFFER_AHEAD,
} = config;

export { IKeySystemOption };

export interface ITransportOptions {
  manifestLoader? : CustomManifestLoader;
  segmentLoader? : CustomSegmentLoader;
}

export interface ISupplementaryTextTrackOption {
  url : string;
  language : string;
  closedCaption : boolean;
  mimeType : string;
  codecs? : string;
}

export interface ISupplementaryImageTrackOption {
  url : string;
  mimeType : string;
}

export interface IDefaultAudioTrackOption {
  language : string;
  normalized : string;
  audioDescription : boolean;
}

export interface IDefaultTextTrackOption {
  language : string;
  normalized : string;
  closedCaption : boolean;
}

export interface INetworkConfigOption {
  manifestRetry? : number;
  offlineRetry? : number;
  segmentRetry? : number;
}

export type IStartAtOption =
  { position : number } |
  { wallClockTime : Date|number } |
  { percentage : number } |
  { fromLastPosition : number } |
  { fromFirstPosition : number };

type IParsedStartAtOption =
  { position : number } |
  { wallClockTime : number } |
  { percentage : number } |
  { fromLastPosition : number } |
  { fromFirstPosition : number };

export interface IConstructorOptions {
  maxBufferAhead? : number;
  maxBufferBehind? : number;
  wantedBufferAhead? : number;

  limitVideoWidth? : boolean;
  throttleWhenHidden? : boolean;

  videoElement? : HTMLMediaElement;
  initialVideoBitrate? : number;
  initialAudioBitrate? : number;
  maxAudioBitrate? : number;
  maxVideoBitrate? : number;
  stopAtEnd? : boolean;
}

export interface IParsedConstructorOptions {
  maxBufferAhead : number;
  maxBufferBehind : number;
  wantedBufferAhead : number;

  limitVideoWidth : boolean;
  throttleWhenHidden : boolean;

  videoElement : HTMLMediaElement;
  initialVideoBitrate : number;
  initialAudioBitrate : number;
  maxAudioBitrate : number;
  maxVideoBitrate : number;
  stopAtEnd : boolean;
}

export interface ILoadVideoOptions {
  url : string;
  transport : string;

  autoPlay? : boolean;
  keySystems? : IKeySystemOption[];
  transportOptions? : ITransportOptions|undefined;
  supplementaryTextTracks? : ISupplementaryTextTrackOption[];
  supplementaryImageTracks? : ISupplementaryImageTrackOption[];
  defaultAudioTrack? : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack? : IDefaultTextTrackOption|null|undefined;
  networkConfig? : INetworkConfigOption;
  startAt? : IStartAtOption;
  textTrackMode? : "native"|"html";
  hideNativeSubtitle? : boolean;
  textTrackElement? : HTMLElement;
  manualBitrateSwitchingMode : "seamless"|"direct";
}

interface IParsedLoadVideoOptionsBase {
  url : string;
  transport : string;
  autoPlay : boolean;
  keySystems : IKeySystemOption[];
  networkConfig: INetworkConfigOption;
  transportOptions : ITransportOptions|undefined;
  supplementaryTextTracks : ISupplementaryTextTrackOption[];
  supplementaryImageTracks : ISupplementaryImageTrackOption[];
  defaultAudioTrack : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack : IDefaultTextTrackOption|null|undefined;
  startAt : IParsedStartAtOption|undefined;
  manualBitrateSwitchingMode : "seamless"|"direct";
}

interface IParsedLoadVideoOptionsNative extends IParsedLoadVideoOptionsBase {
  textTrackMode : "native";
  hideNativeSubtitle : boolean;
}

interface IParsedLoadVideoOptionsHTML extends IParsedLoadVideoOptionsBase {
  textTrackMode : "html";
  textTrackElement : HTMLElement;
}

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

  limitVideoWidth = options.limitVideoWidth == null ?
    DEFAULT_LIMIT_VIDEO_WIDTH : !!options.limitVideoWidth;

  throttleWhenHidden = options.throttleWhenHidden == null ?
    DEFAULT_THROTTLE_WHEN_HIDDEN : !!options.throttleWhenHidden;

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

  if (options.stopAtEnd == null) {
    stopAtEnd = true;
  } else if (typeof options.stopAtEnd === "boolean") {
    stopAtEnd = options.stopAtEnd;
  } else {
    throw new Error("Invalid stopAtEnd parameter. Should be a boolean.");
  }

  return {
    maxBufferAhead,
    maxBufferBehind,
    limitVideoWidth,
    videoElement,
    wantedBufferAhead,
    throttleWhenHidden,
    initialAudioBitrate,
    initialVideoBitrate,
    maxAudioBitrate,
    maxVideoBitrate,
    stopAtEnd,
  };
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
  let url : string;
  let transport : string;
  let keySystems : IKeySystemOption[];
  let supplementaryTextTracks : ISupplementaryTextTrackOption[];
  let supplementaryImageTracks : ISupplementaryImageTrackOption[];
  let textTrackMode : "native"|"html";
  let textTrackElement : HTMLElement|undefined;
  let startAt : IParsedStartAtOption|undefined;

  if (!options || options.url == null) {
    throw new Error("No url set on loadVideo");
  } else {
    url = String(options.url);
  }

  if (options.transport == null) {
    throw new Error("No transport set on loadVideo");
  } else {
    transport = String(options.transport);
  }

  const autoPlay = options.autoPlay == null ?
    DEFAULT_AUTO_PLAY : !!options.autoPlay;

  if (options.keySystems == null) {
    keySystems = [];
  } else {
    keySystems = Array.isArray(options.keySystems) ?
      options.keySystems : [options.keySystems];
    for (const keySystem of keySystems) {
      if (
        typeof keySystem.type !== "string" ||
        typeof keySystem.getLicense !== "function"
      ) {
        throw new Error("Invalid key system given: Missing type string or " +
          "getLicense callback");
      }
    }
  }

  const transportOptions = options.transportOptions;

  if (options.supplementaryTextTracks == null) {
    supplementaryTextTracks = [];
  } else {
    supplementaryTextTracks =
      Array.isArray(options.supplementaryTextTracks) ?
        options.supplementaryTextTracks : [options.supplementaryTextTracks];

    for (const supplementaryTextTrack of supplementaryTextTracks) {
      if (typeof supplementaryTextTrack.closedCaption !== "boolean") {
        supplementaryTextTrack.closedCaption = !!supplementaryTextTrack.closedCaption;
      }
      if (
        typeof supplementaryTextTrack.language !== "string" ||
        typeof supplementaryTextTrack.mimeType !== "string" ||
        typeof supplementaryTextTrack.url !== "string"
      ) {
        /* tslint:disable:max-line-length */
        throw new Error("Invalid supplementary text track given. Missing either language, mimetype or url");
        /* tslint:enable:max-line-length */
      }
    }
  }

  if (options.supplementaryImageTracks == null) {
    supplementaryImageTracks = [];
  } else {
    supplementaryImageTracks =
      Array.isArray(options.supplementaryImageTracks) ?
        options.supplementaryImageTracks : [options.supplementaryImageTracks];
    for (const supplementaryImageTrack of supplementaryImageTracks) {
      if (
        typeof supplementaryImageTrack.mimeType !== "string" ||
        typeof supplementaryImageTrack.url !== "string"
      ) {
        /* tslint:disable:max-line-length */
        throw new Error("Invalid supplementary image track given. Missing either mimetype or url");
        /* tslint:enable:max-line-length */
      }
    }
  }

  if (options.textTrackMode == null) {
    textTrackMode = DEFAULT_TEXT_TRACK_MODE;
  } else {
    if (
      options.textTrackMode !== "native" && options.textTrackMode !== "html"
    ) {
      throw new Error("Invalid textTrackMode.");
    }
    textTrackMode = options.textTrackMode;
  }

  const defaultAudioTrack = normalizeAudioTrack(options.defaultAudioTrack);
  const defaultTextTrack = normalizeTextTrack(options.defaultTextTrack);
  const hideNativeSubtitle = (options as any).hidenativeSubtitle == null ?
    !DEFAULT_SHOW_NATIVE_SUBTITLE : !!(options as any).hideNativeSubtitle;
  const manualBitrateSwitchingMode =
    (options as any).manualBitrateSwitchingMode == null ?
      !DEFAULT_MANUAL_BITRATE_SWITCHING_MODE :
      (options as any).manualBitrateSwitchingMode;

  if (textTrackMode === "html") {
    // TODO Better way to express that in TypeScript?
    if ((options as any).textTrackElement == null) {
      /* tslint:disable:max-line-length */
      throw new Error("You have to provide a textTrackElement in \"html\" textTrackMode.");
      /* tslint:enable:max-line-length */
    } else if (!((options as any).textTrackElement instanceof HTMLElement)) {
      throw new Error("textTrackElement should be an HTMLElement.");
    } else {
      textTrackElement = (options as any).textTrackElement;
    }
  } else if ((options as any).textTrackElement != null) {
    /* tslint:disable:max-line-length */
    log.warn("You have set a textTrackElement without being in an \"html\" textTrackMode. It will be ignored.");
    /* tslint:enable:max-line-length */
  }

  if (options.startAt != null) {
    // TODO Better way to express that in TypeScript?
    if (
      (options.startAt as { wallClockTime? : Date|number }).wallClockTime
      instanceof Date
    ) {
      const wallClockTime = (options.startAt as { wallClockTime : Date })
        .wallClockTime.getTime() / 1000;
      startAt = objectAssign({}, options.startAt, { wallClockTime });
    } else {
      startAt = options.startAt as IParsedStartAtOption;
    }
  }

  const networkConfig = options.networkConfig == null ? {} : {
    manifestRetry: options.networkConfig.manifestRetry,
    offlineRetry: options.networkConfig.offlineRetry,
    segmentRetry: options.networkConfig.segmentRetry,
  };

  // TODO without cast
  /* tslint:disable no-object-literal-type-assertion */
  return {
    autoPlay,
    defaultAudioTrack,
    defaultTextTrack,
    hideNativeSubtitle,
    keySystems,
    manualBitrateSwitchingMode,
    networkConfig,
    startAt,
    supplementaryImageTracks,
    supplementaryTextTracks,
    textTrackElement,
    textTrackMode,
    transport,
    transportOptions,
    url,
  } as IParsedLoadVideoOptions;
  /* tslint:enable no-object-literal-type-assertion */
}

export {
  parseConstructorOptions,
  parseLoadVideoOptions,
};
