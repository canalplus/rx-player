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

/* tslint:disable:interface-name */
interface ObjectConstructor {
  /**
   * Creates an object that has the specified prototype or that has null prototype.
   * @param o Object to use as a prototype. May be null.
   */
  create(o: object | null) : any;

  /**
   * Sets the prototype of a specified object o to  object proto or null.
   * Returns the object o.
   * @param o The object to change its prototype.
   * @param proto The value of the new prototype or null.
   */
  setPrototypeOf(o: any, proto: object | null) : any;
}

// for some reasons, Typescript seem to forget about SessionTypes
// TODO remove when the issue is resolved
// https://github.com/Microsoft/TypeScript/issues/19189
interface MediaKeySystemConfiguration {
  audioCapabilities?: MediaKeySystemMediaCapability[];
  distinctiveIdentifier?: MediaKeysRequirement;
  initDataTypes?: string[];
  persistentState?: MediaKeysRequirement;
  videoCapabilities?: MediaKeySystemMediaCapability[];
  sessionTypes: string[];
}

// manually adding prefixed and other browser properties/functions

interface Window {
  HTMLElement : HTMLElementConstructor;
  VTTCue? : VTTCueConstructor;
  TextTrackCue? : VTTCueConstructor; // TODO we probably cheated a little there
  MediaSource? : MediaSourceConstructor;
  MozMediaSource? : MediaSourceConstructor;
  WebKitMediaSource? : MediaSourceConstructor;
  MSMediaSource? : MediaSourceConstructor;
  MediaKeys? : MediaKeysConstructor;
  MozMediaKeys? : MediaKeysConstructor;
  WebKitMediaKeys? : MediaKeysConstructor;
  MSMediaKeys? : MediaKeysConstructor;
  WebKitSourceBuffer? : WebKitSourceBufferConstructor;
}

interface WebKitSourceBufferConstructor {
  new() : WebKitSourceBuffer;
}

interface WebKitSourceBuffer {
  append(data : ArrayBuffer) : void;
  remove(from : number, to : number) : void;
}

interface HTMLElementConstructor {
  new() : HTMLElement;
}

interface VTTCueConstructor {
  new(start : number, end: number, text: string) : VTTCue;
}

// TODO Open issue on TypeScript
interface TextTrack {
  addCue(cue: TextTrackCue|VTTCue) : void;
  removeCue(cue: TextTrackCue|VTTCue) : void;
}

interface MediaSourceConstructor {
  isTypeSupported? : (mimeType : string) => boolean;
  new() : MediaSource;
}

interface MediaKeysConstructor {
  // for IE11
  isTypeSupported? : (type : string) => boolean;

  // Argument for IE11
  new(keyType? : string) : MediaKeys;
}

interface Element {
  msRequestFullscreen? : () => void;
  mozRequestFullScreen? : () => void;
}

type TypedArray =
  Int8Array |
  Int16Array |
  Int32Array |
  Uint8Array |
  Uint16Array |
  Uint32Array |
  Uint8ClampedArray |
  Float32Array |
  Float64Array;

interface HTMLVideoElement {
  webkitGenerateKeyRequest? : (keyType: string, initData : ArrayBuffer) => void;
  webkitAddKey? : (
    keyType: string,
    key : ArrayBuffer|TypedArray|DataView,
    kid : ArrayBuffer|TypedArray|DataView|null,
    sessionId : string
  ) => void;
}
interface HTMLMediaElement {
  webkitGenerateKeyRequest? : (key: string, initData : ArrayBuffer) => void;
  webkitAddKey? : (
    keyType: string,
    key : ArrayBuffer|TypedArray|DataView,
    kid : ArrayBuffer|TypedArray|DataView|null,
    sessionId : string
  ) => void;
}

interface Document {
  msFullscreenElement? : HTMLElement;
  msExitFullscreen? : () => void;
  msHidden? : boolean;
  mozFullScreenElement? : HTMLElement;
  mozCancelFullScreen? : () => void;
  mozHidden? : boolean;
  webkitHidden? : boolean;
}

// typescript does not seem to know that one
declare class VTTCue {
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

// TypeScript seems to have problems with its MediaKeys definition
// TODO Inspect why
interface MediaKeys {
  createSession(sessionType? : MediaKeySessionType) : MediaKeySession;
  setServerCertificate(setServerCertificate : ArrayBuffer|TypedArray) : Promise<void>;
}
/* tslint:enable:interface-name */
