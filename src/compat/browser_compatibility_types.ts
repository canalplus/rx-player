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

import isNullOrUndefined from "../utils/is_null_or_undefined";
import isNode from "./is_node";

/** Regular MediaKeys type + optional functions present in IE11. */
interface ICompatMediaKeysConstructor {
  isTypeSupported? : (type : string) => boolean; // IE11 only
  new(keyType? : string) : MediaKeys; // argument for IE11 only
}

/**
 * Browser implementation of a VTTCue constructor.
 * TODO open TypeScript issue about it?
 */
type ICompatVTTCueConstructor = new(start : number,
                                    end : number,
                                    cueText : string) => ICompatVTTCue;

/** Browser implementation for a single VTTCue. */
interface ICompatVTTCue { align : string;
                          endTime : number;
                          id : string;
                          line : number | "auto";
                          lineAlign : string;
                          position : number | "auto";
                          positionAlign : string;
                          size : number | string;
                          snapToLines : boolean;
                          startTime : number;
                          vertical : string; }

/**
 * Overriden TextTrack browser implementation, to also include our own
 * definition of a VTTCue.
 */
interface ICompatTextTrack extends TextTrack {
  addCue(cue: TextTrackCue | ICompatVTTCue) : void;
  removeCue(cue: TextTrackCue | ICompatVTTCue) : void;
  HIDDEN? : "hidden";
  SHOWING? :  "showing";
}

/**
 * Browser implementation of the `document` object with added optional vendored
 * functions for some "old" browsers.
 */
interface ICompatDocument extends Document {
  mozHidden? : boolean;
  msHidden? : boolean;
  webkitHidden? : boolean;
}

/**
 * HTMLMediaElement with added optional vendored functions used by "old"
 * browsers.
 * And TypeScript forgot to add assiociated AudioTrackList and VideoTrackList
 * (and yes apparently a HTMLAudioElement can have an assiociated
 * VideoTrackList).
 *
 * Note: I prefer to define my own `ICompatHTMLMediaElement` rather to extend
 * the original definition to better detect which types have been extended and
 * are not actually valid TypeScript types.
 */
interface ICompatHTMLMediaElement extends HTMLMediaElement {
  mozRequestFullScreen? : () => void;
  msRequestFullscreen? : () => void;
  webkitRequestFullscreen? : () => void;
  webkitSupportsPresentationMode? : boolean;
  webkitSetPresentationMode? : () => void;
  webkitPresentationMode? : string;
  mozSetMediaKeys? : (mediaKeys: unknown) => void;
  msSetMediaKeys? : (mediaKeys: unknown) => void;
  webkitSetMediaKeys? : (mediaKeys: unknown) => void;
  webkitKeys? : {
    createSession? : (
      mimeType : string,
      initData : BufferSource
    ) => MediaKeySession;
  };
  readonly audioTracks? : ICompatAudioTrackList;
  readonly videoTracks? : ICompatVideoTrackList;
}

/**
 * AudioTrackList implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatAudioTrackList extends EventTarget {
  readonly length : number;
  getTrackById(id : string) : ICompatAudioTrack;
  onchange? : ((n : Event) => void) | null;
  onaddtrack? : ((n : Event) => void) | null;
  onremovetrack? : ((n : Event) => void) | null;

  // It can be indexed
  [x : number] : ICompatAudioTrack;
}

/**
 * AudioTrack implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatAudioTrack {
  id : string;
  kind : string;
  label : string;
  language : string;
  enabled : boolean;
}

/**
 * VideoTrackList implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatVideoTrackList extends EventTarget {
  readonly length : number;
  selectedIndex : number;
  getTrackById(id : string) : ICompatVideoTrack;
  onchange? : ((n : Event) => void) | null;
  onaddtrack? : ((n : Event) => void) | null;
  onremovetrack? : ((n : Event) => void) | null;

  // It can be indexed
  [x : number] : ICompatVideoTrack;
}

/**
 * VideoTrack implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatVideoTrack {
  id : string;
  kind : string;
  label : string;
  language : string;
  selected : boolean;
}

/**
 * Browser implementation of a Picture in picture window, as defined in the the
 * draft from the W3C:
 * https://wicg.github.io/picture-in-picture/#pictureinpicturewindow
 */
export interface ICompatPictureInPictureWindow
  extends EventTarget { width: number;
                        height: number; }

interface WindowsWithMediaSourceImplems extends Window {
  MediaSource? : typeof MediaSource;
  MozMediaSource? : typeof MediaSource;
  WebKitMediaSource? : typeof MediaSource;
  MSMediaSource? : typeof MediaSource;
}

const win : WindowsWithMediaSourceImplems | undefined = isNode ? undefined :
                                                                 window;

/** MediaSource implementation, including vendored implementations. */
const MediaSource_ : typeof MediaSource | undefined =
  win === undefined                            ? undefined :
  !isNullOrUndefined(win.MediaSource)          ? win.MediaSource :
  !isNullOrUndefined(win.MozMediaSource)       ? win.MozMediaSource :
  !isNullOrUndefined(win.WebKitMediaSource)    ? win.WebKitMediaSource :
                                                 win.MSMediaSource;

/** List an HTMLMediaElement's possible values for its readyState property. */
const READY_STATES = { HAVE_NOTHING: 0,
                       HAVE_METADATA: 1,
                       HAVE_CURRENT_DATA: 2,
                       HAVE_FUTURE_DATA: 3,
                       HAVE_ENOUGH_DATA: 4 };

/**
 * TextTrackList browser implementation.
 * TODO W3C defines onremovetrack and onchange attributes which are not present on
 * ts type definition, open a TS issue?
 */
export interface ICompatTextTrackList extends TextTrackList {
  onremovetrack: ((ev: TrackEvent) => void) | null;
  onchange: (() => void) | null;
}

export {
  ICompatDocument,
  ICompatHTMLMediaElement,
  ICompatAudioTrackList,
  ICompatVideoTrackList,
  ICompatAudioTrack,
  ICompatVideoTrack,
  ICompatMediaKeysConstructor,
  ICompatTextTrack,
  ICompatVTTCue,
  ICompatVTTCueConstructor,
  MediaSource_,
  READY_STATES,
};
