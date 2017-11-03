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

import objectAssign = require("object-assign");

import config from "../../config";
import log from "../../utils/log";
import {
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../../utils/languages";

import {
  IKeySystemOption,
 } from "../eme/index";

const {
  DEFAULT_AUTO_PLAY,
  DEFAULT_INITIAL_BITRATES,
  DEFAULT_LIMIT_VIDEO_WIDTH,
  DEFAULT_MAX_BITRATES,
  DEFAULT_MAX_BUFFER_AHEAD,
  DEFAULT_MAX_BUFFER_BEHIND,
  DEFAULT_SHOW_NATIVE_SUBTITLE,
  DEFAULT_TEXT_TRACK_MODE,
  DEFAULT_THROTTLE_WHEN_HIDDEN,
  DEFAULT_WANTED_BUFFER_AHEAD,
} = config;

// XXX TODO
interface ITransportOption {
  [keyName : string] : any;
}

interface ISupplementaryTextTrackOption {
  url : string;
  language : string;
  closedCaption : boolean;
  mimeType : string;
  codecs? : string;
}

interface ISupplementaryAudioTrackOption {
  url : string;
  language : string;
  closedCaption : boolean;
  mimeType : string;
  codecs? : string;
}

interface IDefaultAudioTrackOption {
  language : string;
  normalized : string;
  audioDescription : boolean;
}

interface IDefaultTextTrackOption {
  language : string;
  normalized : string;
  closedCaption : boolean;
}

type IParsedStartAtOption = { position : number } | { wallClockTime : number } |
  { percentage : number } | { fromLastPosition : number } |
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
}

interface ILoadVideoOptionsBase {
  url : string;
  transport : string;
  autoPlay? : boolean;
  keySystems? : IKeySystemOption[];
  transportOptions? : ITransportOption|undefined;
  supplementaryTextTracks? : ISupplementaryTextTrackOption[];
  supplementaryImageTracks? : ISupplementaryAudioTrackOption[];
  defaultAudioTrack? : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack? : IDefaultTextTrackOption|null|undefined;
  startAt? : { position : number } | { wallClockTime : Date|number } |
    { percentage : number } | { fromLastPosition : number } |
    { fromFirstPosition : number };
}

interface ILoadVideoOptionsNative extends ILoadVideoOptionsBase {
  textTrackMode? : "native";
  hideNativeSubtitle? : boolean;
}

interface ILoadVideoOptionsHTML extends ILoadVideoOptionsBase {
  textTrackMode : "html";
  textTrackElement : HTMLElement;
}

export type ILoadVideoOptions = ILoadVideoOptionsNative | ILoadVideoOptionsHTML;

interface IParsedLoadVideoOptionsBase {
  url : string;
  transport : string;
  autoPlay : boolean;
  keySystems : IKeySystemOption[];
  transportOptions : ITransportOption|undefined;
  supplementaryTextTracks : ISupplementaryTextTrackOption[];
  supplementaryImageTracks : ISupplementaryAudioTrackOption[];
  defaultAudioTrack : IDefaultAudioTrackOption|null|undefined;
  defaultTextTrack : IDefaultTextTrackOption|null|undefined;
  startAt : IParsedStartAtOption|undefined;
}

interface IParsedLoadVideoOptionsNative extends IParsedLoadVideoOptionsBase {
  textTrackMode : "native";
  hideNativeSubtitle : boolean;
}

interface IParsedLoadVideoOptionsHTML extends IParsedLoadVideoOptionsBase {
  textTrackMode : "html";
  textTrackElement : HTMLElement;
}

export type IParsedLoadVideoOptions = IParsedLoadVideoOptionsNative |
  IParsedLoadVideoOptionsHTML;

/**
 * Parse options given to the API constructor and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object} [options={}]
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
  };
}

/**
 * Parse options given to loadVideo and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object} [options={}]
 * @param {Object} ctx - The player context, needed for some default values.
 * @returns {Object}
 */
function parseLoadVideoOptions(
  options : ILoadVideoOptions
) : IParsedLoadVideoOptions {
  let url : string;
  let transport : string;
  let autoPlay : boolean;
  let keySystems : IKeySystemOption[];
  let transportOptions : ITransportOption|undefined;
  let supplementaryTextTracks : ISupplementaryTextTrackOption[];
  let supplementaryImageTracks : ISupplementaryAudioTrackOption[];
  let textTrackMode : "native"|"html";
  let textTrackElement : HTMLElement|undefined;
  let defaultAudioTrack : IDefaultAudioTrackOption|null|undefined;
  let defaultTextTrack : IDefaultTextTrackOption|null|undefined;
  let hideNativeSubtitle : boolean;
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

  autoPlay = options.autoPlay == null ?
    DEFAULT_AUTO_PLAY : !!options.autoPlay;

  if (options.keySystems == null) {
    keySystems = [];
  } else {
    // XXX TODO check interface here
    if (Array.isArray(options.keySystems)) {
      keySystems = options.keySystems;
    } else {
      keySystems = [options.keySystems];
    }
  }

  transportOptions = options.transportOptions;

  if (options.supplementaryTextTracks == null) {
    supplementaryTextTracks = [];
  } else {
    // XXX TODO check interface here
    if (Array.isArray(options.supplementaryTextTracks)) {
      supplementaryTextTracks = options.supplementaryTextTracks;
    } else {
      supplementaryTextTracks = [options.supplementaryTextTracks];
    }
  }

  if (options.supplementaryImageTracks == null) {
    supplementaryImageTracks = [];
  } else {
    // XXX TODO check interface here
    if (Array.isArray(options.supplementaryImageTracks)) {
      supplementaryImageTracks = options.supplementaryImageTracks;
    } else {
      supplementaryImageTracks = [options.supplementaryImageTracks];
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

  defaultAudioTrack = normalizeAudioTrack(options.defaultAudioTrack);
  defaultTextTrack = normalizeTextTrack(options.defaultTextTrack);
  hideNativeSubtitle = (options as any).hideNativeSubtitle == null ?
    !DEFAULT_SHOW_NATIVE_SUBTITLE : !!(options as any).hideNativeSubtitle;

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

  return {
    url,
    transport,
    autoPlay,
    keySystems,
    transportOptions,
    supplementaryTextTracks,
    supplementaryImageTracks,
    textTrackMode,
    textTrackElement,
    defaultAudioTrack,
    defaultTextTrack,
    hideNativeSubtitle,
    startAt,
  } as IParsedLoadVideoOptions;
}

export {
  parseConstructorOptions,
  parseLoadVideoOptions,
};
