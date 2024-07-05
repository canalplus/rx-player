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

import type { IListener } from "../utils/event_emitter";
import globalScope from "../utils/global_scope";
import isNullOrUndefined from "../utils/is_null_or_undefined";

/**
 * Browser implementation of a VTTCue constructor.
 * TODO open TypeScript issue about it?
 */
type ICompatVTTCueConstructor = new (
  start: number,
  end: number,
  cueText: string,
) => ICompatVTTCue;

/** Browser implementation for a single VTTCue. */
interface ICompatVTTCue {
  align: string;
  endTime: number;
  id: string;
  line: number | "auto";
  lineAlign: string;
  position: number | "auto";
  positionAlign: string;
  size: number | string;
  snapToLines: boolean;
  startTime: number;
  vertical: string;
}

/**
 * Overriden TextTrack browser implementation, to also include our own
 * definition of a VTTCue.
 */
interface ICompatTextTrack extends TextTrack {
  addCue(cue: TextTrackCue | ICompatVTTCue): void;
  removeCue(cue: TextTrackCue | ICompatVTTCue): void;
  HIDDEN?: "hidden";
  SHOWING?: "showing";
}

/**
 * Browser implementation of the `document` object with added optional vendored
 * functions for some "old" browsers.
 */
interface ICompatDocument extends Document {
  mozHidden?: boolean;
  msHidden?: boolean;
  webkitHidden?: boolean;
}

/**
 * Simpler re-definition of an `EventTarget`, allowing more straightforward
 * TypeScript exploitation in the RxPlayer.
 */
export interface IEventTarget<TEventMap> {
  addEventListener<TEventName extends keyof TEventMap>(
    evt: TEventName,
    fn: IListener<TEventMap, TEventName>,
  ): void;
  removeEventListener<TEventName extends keyof TEventMap>(
    evt?: TEventName,
    fn?: IListener<TEventMap, TEventName>,
  ): void;
}

/** Events potentially dispatched by an `ISourceBufferList` */
export interface ISourceBufferListEventMap {
  addsourcebuffer: Event;
  removesourcebuffer: Event;
}

/**
 * Type-compatible with the `SourceBufferList` type (i.e. a `SourceBufferList`
 * is a valid `ISourceBufferList`), the `ISourceBufferList` type allows to:
 *
 *   - re-define some attributes or methods in cases where we detected that some
 *     platforms have a different implementation.
 *
 *   - list all `SourceBufferList` attributes, methods and events that are
 *     relied on by the RxPlayer.
 *
 *   - Allow an easier re-definition of that API for tests or for platforms
 *     which do not implement it.
 */
export interface ISourceBufferList extends IEventTarget<ISourceBufferListEventMap> {
  readonly length: number;
  onaddsourcebuffer: ((evt: Event) => void) | null;
  onremovesourcebuffer: ((evt: Event) => void) | null;
  [index: number]: ISourceBuffer;
}

/** Events potentially dispatched by an `IMediaSource` */
export interface IMediaSourceEventMap {
  sourceopen: Event;
  sourceended: Event;
  sourceclose: Event;
}

/**
 * Type-compatible with the `MediaSource` type (i.e. a `MediaSource` is a valid
 * `IMediaSource`), the `IMediaSource` type allows to:
 *
 *   - re-define some attributes or methods in cases where we detected that some
 *     platforms have a different implementation.
 *
 *   - list all `MediaSource` attributes, methods and events that are relied on
 *     by the RxPlayer.
 *
 *   - Allow an easier re-definition of that API for tests or for platforms
 *     which do not implement it.
 */
export interface IMediaSource extends IEventTarget<IMediaSourceEventMap> {
  duration: number;
  handle?: MediaProvider | IMediaSource | undefined;
  readyState: "closed" | "open" | "ended";
  sourceBuffers: ISourceBufferList;

  addSourceBuffer(type: string): ISourceBuffer;
  clearLiveSeekableRange(): void;
  endOfStream(): void;
  removeSourceBuffer(sb: ISourceBuffer): void;
  setLiveSeekableRange(start: number, end: number): void;

  onsourceopen: ((evt: Event) => void) | null;
  onsourceended: ((evt: Event) => void) | null;
  onsourceclose: ((evt: Event) => void) | null;
}

/** Events potentially dispatched by an `ISourceBuffer` */
export interface ISourceBufferEventMap {
  abort: Event;
  error: Event;
  update: Event;
  updateend: Event;
  updatestart: Event;
}

/**
 * Type-compatible with the `SourceBuffer` type (i.e. a `SourceBuffer` is a valid
 * `ISourceBuffer`), the `ISourceBuffer` type allows to:
 *
 *   - re-define some attributes or methods in cases where we detected that some
 *     platforms have a different implementation.
 *
 *   - list all `SourceBuffer` attributes, methods and events that are relied on
 *     by the RxPlayer.
 *
 *   - Allow an easier re-definition of that API for tests or for platforms
 *     which do not implement it.
 */
export interface ISourceBuffer extends IEventTarget<ISourceBufferEventMap> {
  appendWindowEnd: number;
  appendWindowStart: number;
  buffered: TimeRanges;
  timestampOffset: number;
  updating: boolean;

  abort(): void;
  appendBuffer(data: BufferSource): void;
  changeType(type: string): void;
  remove(start: number, end: number): void;

  onabort: ((evt: Event) => void) | null;
  onerror: ((evt: Event) => void) | null;
  onupdate: ((evt: Event) => void) | null;
  onupdateend: ((evt: Event) => void) | null;
  onupdatestart: ((evt: Event) => void) | null;
}

export interface IMediaEncryptedEvent extends MediaEncryptedEvent {
  forceSessionRecreation?: boolean;
}

/** Events potentially dispatched by an `IMediaElement` */
export interface IMediaElementEventMap {
  canplay: Event;
  canplaythrough: Event;
  encrypted: IMediaEncryptedEvent;
  ended: Event;
  enterpictureinpicture: Event;
  error: Event;
  leavepictureinpicture: Event;
  loadeddata: Event;
  loadedmetadata: Event;
  needkey: IMediaEncryptedEvent;
  pause: Event;
  play: Event;
  playing: Event;
  ratechange: Event;
  seeked: Event;
  seeking: Event;
  stalled: Event;
  timeupdate: Event;
  visibilitychange: Event;
  volumechange: Event;
  waiting: Event;
  webkitneedkey: IMediaEncryptedEvent;
}

/**
 * Type-compatible with the `HTMLMediaElement` type (i.e. a `HTMLMediaElement` is
 * a valid `IMediaElement`), the `IMediaElement` type allows to:
 *
 *   - re-define some attributes or methods in cases where we detected that some
 *     platforms have a different implementation.
 *
 *   - list all `HTMLMediaElement` attributes, methods and events that are
 *     relied on by the RxPlayer.
 *
 *   - Allow a re-definition of that API for tests or for platforms which do not
 *     implement it.
 */
export interface IMediaElement extends IEventTarget<IMediaElementEventMap> {
  /* From `HTMLMediaElement`: */
  autoplay: boolean;
  buffered: TimeRanges;
  childNodes: NodeList | never[];
  clientHeight: number | undefined;
  clientWidth: number | undefined;
  currentTime: number;
  duration: number;
  ended: boolean;
  error: MediaError | null;
  mediaKeys: null | IMediaKeys;
  muted: boolean;
  nodeName: string;
  paused: boolean;
  playbackRate: number;
  preload: "none" | "metadata" | "auto" | "";
  readyState: number;
  seekable: TimeRanges;
  seeking: boolean;
  src: string;
  srcObject?: undefined | null | MediaProvider;
  textTracks: TextTrackList | never[];
  volume: number;

  addTextTrack: (kind: TextTrackKind) => TextTrack;
  appendChild<T extends Node>(x: T): void;
  hasAttribute(attr: string): boolean;
  hasChildNodes(): boolean;
  pause(): void;
  play(): Promise<void>;
  removeAttribute(attr: string): void;
  removeChild(x: unknown): void;
  setMediaKeys(x: IMediaKeys | null): Promise<void>;

  onencrypted: ((evt: IMediaEncryptedEvent) => void) | null;
  oncanplay: ((evt: Event) => void) | null;
  oncanplaythrough: ((evt: Event) => void) | null;
  onended: ((evt: Event) => void) | null;
  onenterpictureinpicture?: ((evt: Event) => void) | null;
  onleavepictureinpicture?: ((evt: Event) => void) | null;
  onerror: ((evt: Event) => void) | null;
  onloadeddata: ((evt: Event) => void) | null;
  onloadedmetadata: ((evt: Event) => void) | null;
  onpause: ((evt: Event) => void) | null;
  onplay: ((evt: Event) => void) | null;
  onplaying: ((evt: Event) => void) | null;
  onratechange: ((evt: Event) => void) | null;
  onseeked: ((evt: Event) => void) | null;
  onseeking: ((evt: Event) => void) | null;
  onstalled: ((evt: Event) => void) | null;
  ontimeupdate: ((evt: Event) => void) | null;
  onvolumechange: ((evt: Event) => void) | null;
  onwaiting: ((evt: Event) => void) | null;

  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
  webkitRequestFullscreen?: () => void;
  webkitSupportsPresentationMode?: boolean;
  webkitSetPresentationMode?: () => void;
  webkitPresentationMode?: string;
  mozSetMediaKeys?: (mediaKeys: unknown) => void;
  msSetMediaKeys?: (mediaKeys: unknown) => void;
  webkitSetMediaKeys?: (mediaKeys: unknown) => void;
  webkitKeys?: {
    createSession?: (mimeType: string, initData: BufferSource) => IMediaKeySession;
  };
  audioTracks?: ICompatAudioTrackList;
  videoTracks?: ICompatVideoTrackList;
}

export interface IMediaKeySystemAccess {
  readonly keySystem: string;
  getConfiguration(): MediaKeySystemConfiguration;
  createMediaKeys(): Promise<IMediaKeys>;
}

export interface IMediaKeys {
  isTypeSupported?: (type: string) => boolean; // IE11 only
  createSession(sessionType?: MediaKeySessionType): IMediaKeySession;
  setServerCertificate(serverCertificate: BufferSource): Promise<boolean>;
}

export interface IMediaKeySession extends IEventTarget<MediaKeySessionEventMap> {
  readonly closed: Promise<MediaKeySessionClosedReason>;
  readonly expiration: number;
  readonly keyStatuses: MediaKeyStatusMap;
  readonly sessionId: string;
  close(): Promise<void>;
  generateRequest(_initDataType: string, _initData: BufferSource): Promise<void>;
  load(sessionId: string): Promise<boolean>;
  remove(): Promise<void>;
  update(response: BufferSource): Promise<void>;
}

// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testMediaElement(x: HTMLMediaElement) {
  assertCompatibleIMediaElement(x);
}
function assertCompatibleIMediaElement(_x: IMediaElement) {
  // Noop
}
// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testMediaSource(x: MediaSource) {
  assertCompatibleIMediaSource(x);
}
function assertCompatibleIMediaSource(_x: IMediaSource) {
  // Noop
}
// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testSourceBuffer(x: SourceBuffer) {
  assertCompatibleISourceBuffer(x);
}
function assertCompatibleISourceBuffer(_x: ISourceBuffer) {
  // Noop
}
// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testSourceBufferList(x: SourceBufferList) {
  assertCompatibleISourceBufferList(x);
}
function assertCompatibleISourceBufferList(_x: ISourceBufferList) {
  // Noop
}
// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testMediaKeySystemAccess(x: MediaKeySystemAccess) {
  assertCompatibleIMediaKeySystemAccess(x);
}
function assertCompatibleIMediaKeySystemAccess(_x: IMediaKeySystemAccess) {
  // Noop
}
// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testMediaKeys(x: MediaKeys) {
  assertCompatibleIMediaKeys(x);
}
function assertCompatibleIMediaKeys(_x: IMediaKeys) {
  // Noop
}
// @ts-expect-error unused function, just used for compile-time typechecking
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-restricted-types
function testMediaKeySession(x: MediaKeySession) {
  assertCompatibleIMediaKeySession(x);
}
function assertCompatibleIMediaKeySession(_x: IMediaKeySession) {
  // Noop
}

/**
 * AudioTrackList implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatAudioTrackList extends EventTarget {
  readonly length: number;
  getTrackById(id: string): ICompatAudioTrack;
  onchange?: ((n: Event) => void) | null;
  onaddtrack?: ((n: Event) => void) | null;
  onremovetrack?: ((n: Event) => void) | null;

  // It can be indexed
  [x: number]: ICompatAudioTrack;
}

/**
 * AudioTrack implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatAudioTrack {
  id: string;
  kind: string;
  label: string;
  language: string;
  enabled: boolean;
}

/**
 * VideoTrackList implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatVideoTrackList extends EventTarget {
  readonly length: number;
  selectedIndex: number;
  getTrackById(id: string): ICompatVideoTrack;
  onchange?: ((n: Event) => void) | null;
  onaddtrack?: ((n: Event) => void) | null;
  onremovetrack?: ((n: Event) => void) | null;

  // It can be indexed
  [x: number]: ICompatVideoTrack;
}

/**
 * VideoTrack implementation (that TS forgot).
 * Directly taken from the WHATG spec:
 * https://html.spec.whatwg.org/multipage/media.html#audiotracklist
 */
interface ICompatVideoTrack {
  id: string;
  kind: string;
  label: string;
  language: string;
  selected: boolean;
}

/**
 * Browser implementation of a Picture in picture window, as defined in the the
 * draft from the W3C:
 * https://wicg.github.io/picture-in-picture/#pictureinpicturewindow
 */
export interface ICompatPictureInPictureWindow extends EventTarget {
  width: number;
  height: number;
}

/* eslint-disable */
/** MediaSource implementation, including vendored implementations. */
const gs = globalScope as any;
const MediaSource_:
  | { new (): IMediaSource; isTypeSupported(type: string): boolean }
  | undefined =
  gs === undefined
    ? undefined
    : !isNullOrUndefined(gs.MediaSource)
      ? gs.MediaSource
      : !isNullOrUndefined(gs.MozMediaSource)
        ? gs.MozMediaSource
        : !isNullOrUndefined(gs.WebKitMediaSource)
          ? gs.WebKitMediaSource
          : gs.MSMediaSource;
/* eslint-enable */

/** List an HTMLMediaElement's possible values for its readyState property. */
const READY_STATES = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
};

/**
 * TextTrackList browser implementation.
 * TODO W3C defines onremovetrack and onchange attributes which are not present on
 * ts type definition, open a TS issue?
 */
export interface ICompatTextTrackList extends TextTrackList {
  onremovetrack: ((ev: TrackEvent) => void) | null;
  onchange: (() => void) | null;
}

export type {
  ICompatDocument,
  ICompatAudioTrackList,
  ICompatVideoTrackList,
  ICompatAudioTrack,
  ICompatVideoTrack,
  ICompatTextTrack,
  ICompatVTTCue,
  ICompatVTTCueConstructor,
};
export { MediaSource_, READY_STATES };
