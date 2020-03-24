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

import { MediaError } from "../errors";
import isNode from "./is_node";

// regular MediaKeys type + optional functions present in IE11
interface ICompatMediaKeysConstructor {
  isTypeSupported? : (type : string) => boolean; // IE11 only
  new(keyType? : string) : MediaKeys; // argument for IE11 only
}

// Regular VTTCue as present in most browsers
// TODO open TypeScript issue about it?
type ICompatVTTCueConstructor = new(start : number,
                                    end : number,
                                    cueText : string) => ICompatVTTCue;

interface ICompatVTTCue { align : string;
                          endTime : number;
                          id : string;
                          line : number|"auto";
                          lineAlign : string;
                          position : number|"auto";
                          positionAlign : string;
                          size : number|string;
                          snapToLines : boolean;
                          startTime : number;
                          vertical : string; }

// surcharge TextTrack to allow adding ICompatVTTCue to it
interface ICompatTextTrack extends TextTrack {
  addCue(cue: TextTrackCue|ICompatVTTCue) : void;
  removeCue(cue: TextTrackCue|ICompatVTTCue) : void;
}

// Document with added optional functions for old browsers
interface ICompatDocument extends Document { mozCancelFullScreen? : () => void;
                                             mozFullScreenElement? : HTMLElement;
                                             mozHidden? : boolean;
                                             msExitFullscreen? : () => void;
                                             webkitExitFullscreen : () => void;
                                             fullscreenElement : Element|null;
                                             msFullscreenElement? : Element|null;
                                             webkitFullscreenElement : Element|null;
                                             msHidden? : boolean;
                                             webkitHidden? : boolean; }

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

// Draft from W3C https://wicg.github.io/picture-in-picture/#pictureinpicturewindow
export interface ICompatPictureInPictureWindow
  extends EventTarget { width: number;
                        height: number; }

const win = isNode ? {} :
                     window as any;
/* tslint:disable no-unsafe-any */
const HTMLElement_ : typeof HTMLElement = win.HTMLElement;
const VTTCue_ : ICompatVTTCueConstructor|undefined =
  win.VTTCue != null ? win.VTTCue :
                       win.TextTrackCue;
/* tslint:enable no-unsafe-any */

/* tslint:disable no-unsafe-any */
const MediaSource_ : typeof MediaSource|undefined =
  win.MediaSource != null ? win.MediaSource :
  win.MozMediaSource != null ? win.MozMediaSource :
  win.WebKitMediaSource != null ? win.WebKitMediaSource :
                                  win.MSMediaSource;
/* tslint:enable no-unsafe-any */

const MediaKeys_ : ICompatMediaKeysConstructor = (() => {
  /* tslint:disable no-unsafe-any */
  return win.MediaKeys != null ? win.MediaKeys :
         win.MozMediaKeys != null ? win.MozMediaKeys :
         class {
           public readonly create : () => never;
           public readonly isTypeSupported : () => never;
           public readonly createSession : () => never;
           public readonly setServerCertificate : () => never;
           constructor() {
            const noMediaKeys = () => {
              throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED",
                                   "No `MediaKeys` implementation found " +
                                   "in the current browser.");
            };
             this.create = noMediaKeys;
             this.createSession = noMediaKeys;
             this.isTypeSupported = noMediaKeys;
             this.setServerCertificate = noMediaKeys;
           }
         };
  /* tslint:enable no-unsafe-any */
})();

const READY_STATES = { HAVE_NOTHING: 0,
                       HAVE_METADATA: 1,
                       HAVE_CURRENT_DATA: 2,
                       HAVE_FUTURE_DATA: 3,
                       HAVE_ENOUGH_DATA: 4 };

// TODO w3c defines onremovetrack and onchange attributes which are not present on
// ts type definition
export interface ICompatTextTrackList extends TextTrackList {
  onremovetrack: ((ev: TrackEvent) => void) | null;
  onchange: (() => void) | null;
}

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
};
