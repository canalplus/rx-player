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

import MediaError from "../errors/MediaError";

interface ICompatMediaSourceConstructor {
  isTypeSupported? : (mimeType : string) => boolean;
  new() : MediaSource;
}

interface ICompatMediaKeysConstructor {
  // for IE11
  isTypeSupported? : (type : string) => boolean;

  // Argument for IE11
  new(keyType? : string) : MediaKeys;
}

interface ICompatHTMLElementConstructor {
  new() : HTMLElement;
}

interface ICompatVTTCueConstructor {
  new(start : number, end: number, text: string) : ICompatVTTCue;
}

declare class ICompatVTTCue {
  align : string;
  endTime : number;
  id : string;
  line : number|"auto";
  lineAlign : string;
  position : number|"auto";
  positionAlign : string;
  size : number|string;
  snapToLines : boolean;
  startTime : number;
  vertical : string;
  constructor(start : number, end : number, cueText : string);
}

// TODO Open issue on TypeScript
interface ICompatTextTrack extends TextTrack {
  addCue(cue: TextTrackCue|ICompatVTTCue) : void;
  removeCue(cue: TextTrackCue|ICompatVTTCue) : void;
}

interface ICompatDocument extends Document {
  msFullscreenElement? : HTMLElement;
  msExitFullscreen? : () => void;
  msHidden? : boolean;
  mozFullScreenElement? : HTMLElement;
  mozCancelFullScreen? : () => void;
  mozHidden? : boolean;
  webkitHidden? : boolean;
}

interface ICompatElement extends Element {
  msRequestFullscreen? : () => void;
  mozRequestFullScreen? : () => void;
}

// for some reasons, Typescript seem to forget about SessionTypes
// XXX TODO remove when the issue is resolved
// https://github.com/Microsoft/TypeScript/issues/19189
interface ICompatMediaKeySystemConfiguration {
  audioCapabilities?: MediaKeySystemMediaCapability[];
  distinctiveIdentifier?: MediaKeysRequirement;
  initDataTypes?: string[];
  persistentState?: MediaKeysRequirement;
  videoCapabilities?: MediaKeySystemMediaCapability[];
  sessionTypes: string[];
}

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

const global = window as any;
const HTMLElement_ : ICompatHTMLElementConstructor = global.HTMLElement;
const VTTCue_ : ICompatVTTCueConstructor|undefined = global.VTTCue ||
  global.TextTrackCue;

const MediaSource_ : ICompatMediaSourceConstructor|undefined = (
  global.MediaSource ||
  global.MozMediaSource ||
  global.WebKitMediaSource ||
  global.MSMediaSource
);

let MediaKeys_ : ICompatMediaKeysConstructor|undefined = (
  global.MediaKeys ||
  global.MozMediaKeys ||
  global.WebKitMediaKeys ||
  global.MSMediaKeys
);

if (!MediaKeys_) {
  const noMediaKeys = () => {
    throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", null, true);
  };

  MediaKeys_ = class {
    public readonly create : () => never;
    public readonly isTypeSupported : () => never;
    public readonly createSession : () => never;
    public readonly setServerCertificate : () => never;
    constructor() {
      this.create = noMediaKeys;
      this.createSession = noMediaKeys;
      this.isTypeSupported = noMediaKeys;
      this.setServerCertificate = noMediaKeys;
    }
  };
}

// true for IE / Edge
const isIE : boolean = (
  navigator.appName === "Microsoft Internet Explorer" ||
  navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent)
);

const isFirefox : boolean = (
  navigator.userAgent.toLowerCase().indexOf("firefox") !== -1
);

const READY_STATES = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
};

export {
  BROWSER_PREFIXES,
  HTMLElement_,
  MediaSource_,
  MediaKeys_,
  isIE,
  isFirefox,
  READY_STATES,
  VTTCue_,
  ICompatDocument,
  ICompatElement,
  ICompatHTMLElementConstructor,
  ICompatMediaKeySystemConfiguration,
  ICompatMediaKeysConstructor,
  ICompatMediaSourceConstructor,
  ICompatTextTrack,
  ICompatVTTCue,
  ICompatVTTCueConstructor,
};
