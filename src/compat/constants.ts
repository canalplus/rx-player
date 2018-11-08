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

// regular MediaKeys type + optional functions present in IE11
interface ICompatMediaKeysConstructor {
  isTypeSupported? : (type : string) => boolean; // IE11 only
  new(keyType? : string) : MediaKeys; // argument for IE11 only
}

// Regular VTTCue as present in most browsers
// TODO open TypeScript issue about it?
interface ICompatVTTCueConstructor {
  new(start : number, end : number, cueText : string) : ICompatVTTCue;
}

interface ICompatVTTCue {
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
}

// surcharge TextTrack to allow adding ICompatVTTCue to it
interface ICompatTextTrack extends TextTrack {
  addCue(cue: TextTrackCue|ICompatVTTCue) : void;
  removeCue(cue: TextTrackCue|ICompatVTTCue) : void;
}

// Document with added optional functions for old browsers
interface ICompatDocument extends Document {
  mozCancelFullScreen? : () => void;
  mozFullScreenElement? : HTMLElement;
  mozHidden? : boolean;
  msExitFullscreen? : () => void;
  webkitExitFullscreen : () => void;
  fullscreenElement : Element|null;
  msFullscreenElement? : Element|null;
  webkitFullscreenElement : Element|null;
  msHidden? : boolean;
  webkitHidden? : boolean;
}

// Element with added optional functions for old browsers
interface ICompatHTMLMediaElement extends HTMLMediaElement {
  mozRequestFullScreen? : () => void;
  msRequestFullscreen? : () => void;
  webkitRequestFullscreen : () => void;
}

// for some reasons, Typescript seem to forget about SessionTypes
// XXX TODO remove when the issue is resolved
// https://github.com/Microsoft/TypeScript/issues/19189
interface ICompatMediaKeySystemAccess extends MediaKeySystemAccess {
  getConfiguration() : ICompatMediaKeySystemConfiguration;
}
interface ICompatMediaKeySystemConfiguration {
  audioCapabilities?: MediaKeySystemMediaCapability[];
  distinctiveIdentifier?: MediaKeysRequirement;
  initDataTypes?: string[];
  persistentState?: MediaKeysRequirement;
  videoCapabilities?: MediaKeySystemMediaCapability[];
  sessionTypes?: string[];
}

const win = window as any;
const HTMLElement_ : typeof HTMLElement = win.HTMLElement;
const VTTCue_ : ICompatVTTCueConstructor|undefined =
  win.VTTCue ||
  win.TextTrackCue;

const MediaSource_ : typeof MediaSource|undefined =
  win.MediaSource ||
  win.MozMediaSource ||
  win.WebKitMediaSource ||
  win.MSMediaSource;

const MediaKeys_ : ICompatMediaKeysConstructor|undefined =
  win.MediaKeys ||
  win.MozMediaKeys ||
  win.WebKitMediaKeys ||
  win.MSMediaKeys ||
  class {
    public readonly create : () => never;
    public readonly isTypeSupported : () => never;
    public readonly createSession : () => never;
    public readonly setServerCertificate : () => never;
    constructor() {
      const noMediaKeys = () => {
        throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", null, true);
      };
      this.create = noMediaKeys;
      this.createSession = noMediaKeys;
      this.isTypeSupported = noMediaKeys;
      this.setServerCertificate = noMediaKeys;
    }
  };

// true for IE / Edge
const isIE : boolean =
  navigator.appName === "Microsoft Internet Explorer" ||
  navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent);

const isFirefox : boolean =
  navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;

const READY_STATES = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
};

export {
  HTMLElement_,
  ICompatDocument,
  ICompatHTMLMediaElement,
  ICompatMediaKeySystemAccess,
  ICompatMediaKeySystemConfiguration,
  ICompatMediaKeysConstructor,
  ICompatTextTrack,
  ICompatVTTCue,
  ICompatVTTCueConstructor,
  MediaKeys_,
  MediaSource_,
  READY_STATES,
  VTTCue_,
  isFirefox,
  isIE,
};
