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

// deprecated browser API
// typescript does not seem to know that one
declare const escape : (str : string) => string;

/* tslint:disable:interface-name */
interface ObjectConstructor {
  /**
   * Creates an object that has the specified prototype or that has null prototype.
   * @param o Object to use as a prototype. May be null.
   */
  create(o: object | null): any;

  /**
   * Sets the prototype of a specified object o to  object proto or null.
   * Returns the object o.
   * @param o The object to change its prototype.
   * @param proto The value of the new prototype or null.
   */
  setPrototypeOf(o: any, proto: object | null): any;
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
  new(): HTMLElement;
}

interface VTTCueConstructor {
  new(start : number, end: number, text: string): VTTCue;
}

// TODO Open issue on TypeScript
interface TextTrack {
  addCue(cue: TextTrackCue|VTTCue): void;
  removeCue(cue: TextTrackCue|VTTCue): void;
}

interface MediaSourceConstructor {
  isTypeSupported? : (mimeType : string) => boolean;
  new(): MediaSource;
}

interface MediaKeysConstructor {
  new(): MediaKeys;
}

interface Element {
  msRequestFullscreen? : () => void;
  mozRequestFullScreen? : () => void;
}

interface HTMLVideoElement {
  webkitGenerateKeyRequest? : (key: string, initData : ArrayBuffer) => void;
}

interface IVideoPlaybackQuality {
  readonly creationTime: number;
  readonly totalVideoFrames: number;
  readonly droppedVideoFrames: number;
  readonly corruptedVideoFrames?: number;
  readonly totalFrameDelay?: number;
}

interface HTMLMediaElement {
  webkitGenerateKeyRequest? : (key: string, initData : ArrayBuffer) => void;
  webkitDroppedFrameCount?: number;
  webkitDecodedFrameCount?: number;
  getVideoPlaybackQuality?: () => IVideoPlaybackQuality;
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
  line : string;
  lineAlign : string;
  position : number|string;
  positionAlign : string;
  size : number|string;
  snapToLines : boolean;
  startTime : number;
  vertical : string;
  constructor(start : number, end : number, cueText : string);
}
/* tslint:enable:interface-name */
