import ManualTimeRanges from "../main_thread/text_displayer/manual_time_ranges";
import {
  findCompleteBox,
  getDurationFromTrun,
  getMDHDTimescale,
  getTrackFragmentDecodeTime,
  extractCompleteChunks,
} from "../parsers/containers/isobmff";
import arrayIncludes from "../utils/array_includes";
import EventEmitter from "../utils/event_emitter";
import noop from "../utils/noop";
import type { IRange } from "../utils/ranges";
import { convertToRanges, isTimeInRanges, keepRangeIntersection } from "../utils/ranges";
import type { CancellationSignal } from "../utils/task_canceller";
import TaskCanceller from "../utils/task_canceller";
import type {
  IMediaElement,
  IMediaElementEventMap,
  IMediaSource,
  IMediaSourceEventMap,
  ISourceBuffer,
  ISourceBufferEventMap,
} from "./browser_compatibility_types";

export interface IStoredMediaSourceInfo {
  sourceBuffers: IStoredSourceBufferInfo[];
}

export const enum SourceBufferOperation {
  Append = 0,
  Remove,
}

export interface ISourceBufferAppendOperation {
  type: SourceBufferOperation.Append;
  segment: BufferSource;
  timestampOffset: number;
  appendWindowStart: number;
  appendWindowEnd: number;
  mimeType: string;
}

export interface ISourceBufferRemoveOperation {
  type: SourceBufferOperation.Remove;
  start: number;
  end: number;
}

export type ISourceBufferOperation =
  | ISourceBufferRemoveOperation
  | ISourceBufferAppendOperation;

export interface IStoredSourceBufferInfo {
  type: string;
  operations: ISourceBufferOperation[];
}

interface IDummyMediaSourceCallbacks {
  hasMediaElementErrored: () => boolean;
  onBufferedUpdate: () => void;
  updateMediaElementDuration: (duration: number) => void;
}

export class DummyMediaSource
  extends EventEmitter<IMediaSourceEventMap>
  implements IMediaSource
{
  public readonly isDummy: true;
  public handle: DummyMediaSource;
  public sourceBuffers: ISourceBuffer[];
  public activeSourceBuffers: ISourceBuffer[];
  public readyState: "closed" | "open" | "ended";
  public destroyed: boolean;
  private _duration: number;
  public liveSeekableRange: ManualTimeRanges;

  public onsourceopen: ((evt: Event) => void) | null;
  public onsourceended: ((evt: Event) => void) | null;
  public onsourceclose: ((evt: Event) => void) | null;

  public eventScheduler: EventScheduler;
  private _stored: IStoredMediaSourceInfo;
  private _callbacks: IDummyMediaSourceCallbacks;

  constructor() {
    super();
    this.isDummy = true;
    this.sourceBuffers = [];
    this.activeSourceBuffers = [];
    this.readyState = "closed";
    this.handle = this;
    this.onsourceopen = null;
    this.onsourceended = null;
    this.onsourceclose = null;
    this.destroyed = false;
    this._stored = { sourceBuffers: [] };
    this._callbacks = {
      hasMediaElementErrored: () => false,
      onBufferedUpdate: noop,
      updateMediaElementDuration: noop,
    };
    this._duration = NaN;
    this.liveSeekableRange = new ManualTimeRanges();
    this.eventScheduler = new EventScheduler();
  }

  public get duration(): number {
    if (this.readyState === "closed") {
      return NaN;
    }
    return this._duration;
  }

  public set duration(givenDuration: number) {
    const duration = Number(givenDuration);
    if (isNaN(duration) || duration < 0) {
      throw new TypeError("Invalid duration");
    }
    if (this.readyState !== "open") {
      const err = new Error("`duration` updated on a non-open DummyMediaSource");
      err.name = "InvalidStateError";
      throw err;
    }
    if (this.sourceBuffers.some((s) => s.updating)) {
      const err = new Error("`duration` updated on an updating DummyMediaSource");
      err.name = "InvalidStateError";
      throw err;
    }

    if (duration === this.duration) {
      return;
    }

    const highestBuffered = this.sourceBuffers.reduce((acc, sb) => {
      if (sb.buffered.length === 0) {
        return acc;
      }
      return Math.max(sb.buffered.end(sb.buffered.length - 1), acc);
    }, 0);

    if (duration < highestBuffered) {
      const err = new Error("`duration` update lower than latest buffered coded frame");
      err.name = "InvalidStateError";
      throw err;
    }

    this._duration = duration;

    this._callbacks.updateMediaElementDuration(duration);
  }

  public addSourceBuffer(givenType: string): ISourceBuffer {
    const type = String(givenType);
    if (type === "") {
      throw new TypeError("`addSourceBuffer` error: empty string");
    }
    if (this.readyState !== "open") {
      const err = new Error("`addSourceBuffer` called on a non-open DummyMediaSource");
      err.name = "InvalidStateError";
      throw err;
    }
    const operations: ISourceBufferOperation[] = [];
    const sb = new DummySourceBuffer(type, operations, {
      hasMediaElementErrored: () => {
        return this._callbacks.hasMediaElementErrored();
      },
      getMediaSourceDuration: () => {
        return this.duration;
      },
      getMediaSourceReadyState: () => {
        return this.readyState;
      },
      openMediaSource: () => {
        this.readyState = "open";
        this.eventScheduler.schedule(this, "sourceopen", null).catch(noop);
      },
      onBufferedUpdate: () => {
        this._callbacks.onBufferedUpdate();
      },
    });
    this._stored.sourceBuffers.push({ type, operations });
    this.sourceBuffers.push(sb);
    this.activeSourceBuffers.push(sb);
    return sb;
  }

  public removeSourceBuffer(sb: ISourceBuffer): void {
    if (!arrayIncludes(this.sourceBuffers, sb)) {
      const err = new Error("`removeSourceBuffer` called on an unknown SourceBuffer");
      err.name = "NotFoundError";
      throw err;
    }

    if (sb.updating) {
      sb.updating = false;
      if (sb instanceof DummySourceBuffer) {
        if (sb.currentAppendCanceller !== null) {
          sb.currentAppendCanceller.cancel();
          sb.currentAppendCanceller = null;
          sb.eventScheduler
            .schedule(sb, "abort", null)
            .then(() => sb.eventScheduler.schedule(sb, "updateend", null))
            .catch(noop);
        }
        sb.canceller.cancel();
        sb.removed = true;
      }
    }

    const indexOfActive = this.activeSourceBuffers.indexOf(sb);
    if (indexOfActive >= 0) {
      this.activeSourceBuffers.splice(indexOfActive, 1);
    }

    const index = this.sourceBuffers.indexOf(sb);
    if (index >= 0) {
      this.sourceBuffers.splice(index, 1);
    }
  }

  public destroy(): void {
    this.readyState = "closed";
    this._duration = NaN;
    this.activeSourceBuffers.forEach((sb) => this.removeSourceBuffer(sb));
    this.sourceBuffers.forEach((sb) => this.removeSourceBuffer(sb));
    this.destroyed = true;
    this.eventScheduler.schedule(this, "sourceclose", null).catch(noop);
  }

  public endOfStream(): void {
    if (this.readyState !== "open") {
      const err = new Error("`endOfStream` called on a non-open DummyMediaSource");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this.sourceBuffers.some((s) => s.updating)) {
      const err = new Error("`endOfStream` called on an updating DummyMediaSource");
      err.name = "InvalidStateError";
      throw err;
    }

    this.readyState = "ended";
    const end = this.sourceBuffers.reduce((acc, sb) => {
      if (sb.buffered.length === 0) {
        return acc;
      }
      const lastPos = sb.buffered.end(sb.buffered.length - 1);
      return Math.max(lastPos, acc);
    }, 0);
    this.duration = end;
    this.eventScheduler.schedule(this, "sourceended", null).catch(noop);
  }

  public updateCallbacks(cb: IDummyMediaSourceCallbacks): void {
    this._callbacks = cb;
  }

  public setLiveSeekableRange(start: number, end: number): void {
    if (this.readyState !== "open") {
      const err = new Error(
        "`setLiveSeekableRange` called on a non-open DummyMediaSource",
      );
      err.name = "InvalidStateError";
      throw err;
    }
    if (start < 0 || start > end) {
      const err = new Error("Invalid arguments given to `setLiveSeekableRange`");
      err.name = "InvalidStateError";
      throw err;
    }
    this.liveSeekableRange = new ManualTimeRanges();
    this.liveSeekableRange.insert(start, end);
  }

  public clearLiveSeekableRange(): void {
    if (this.readyState !== "open") {
      const err = new Error(
        "`setLiveSeekableRange` called on a non-open DummyMediaSource",
      );
      err.name = "InvalidStateError";
      throw err;
    }
    this.liveSeekableRange = new ManualTimeRanges();
  }
}

interface IDummySourceBufferInternalCallbacks {
  hasMediaElementErrored: () => boolean;
  getMediaSourceDuration: () => number;
  getMediaSourceReadyState: () => "open" | "ended" | "closed";
  openMediaSource: () => void;
  onBufferedUpdate: () => void;
}

export class DummySourceBuffer
  extends EventEmitter<ISourceBufferEventMap>
  implements ISourceBuffer
{
  public updating: boolean;
  public removed: boolean;
  public canceller: TaskCanceller;
  public currentAppendCanceller: TaskCanceller | null;
  public eventScheduler: EventScheduler;

  public onupdatestart: ((evt: Event) => void) | null;
  public onupdate: ((evt: Event) => void) | null;
  public onupdateend: ((evt: Event) => void) | null;
  public onerror: ((evt: Event) => void) | null;
  public onabort: ((evt: Event) => void) | null;

  private _timestampOffset: number;
  private _buffered: ManualTimeRanges;
  private _appendWindowStart: number;
  private _appendWindowEnd: number;
  private _operations: ISourceBufferOperation[];
  private _currentType: string;
  private _isRemoving: boolean;
  private _callbacks: IDummySourceBufferInternalCallbacks;
  private _lastInitTimescale: number | null;

  constructor(
    type: string,
    operations: ISourceBufferOperation[],
    callbacks: IDummySourceBufferInternalCallbacks,
  ) {
    super();
    this.updating = false;
    this.removed = false;

    this.onupdatestart = null;
    this.onupdate = null;
    this.onupdateend = null;
    this.onerror = null;
    this.onabort = null;
    this.canceller = new TaskCanceller();
    this.currentAppendCanceller = null;
    this._callbacks = callbacks;
    this._buffered = new ManualTimeRanges();
    this._appendWindowStart = 0;
    this._appendWindowEnd = Infinity;
    this._timestampOffset = 0;
    this._operations = operations;
    this._currentType = type;
    this._isRemoving = false;
    this._lastInitTimescale = null;
    this.eventScheduler = new EventScheduler();
  }

  public set mode(mode: "segments" | "sequence" | "dummy") {
    this._checkProp("mode", true);
    if (mode === "sequence") {
      throw new Error("Trying to update mode of DummySourceBuffer");
    }
  }

  public get mode(): "dummy" {
    return "dummy";
  }

  public set timestampOffset(timestampOffset: number) {
    this._checkProp("timestampOffset", true);
    this._timestampOffset = timestampOffset;
  }

  public get timestampOffset(): number {
    return this._timestampOffset;
  }

  public set appendWindowStart(appendWindowStart: number) {
    this._checkProp("appendWindowStart", false);
    if (appendWindowStart < 0 || appendWindowStart >= this._appendWindowEnd) {
      const err = new TypeError("Invalid `appendWindowStart` set");
      throw err;
    }
    this._appendWindowStart = appendWindowStart;
  }

  public get appendWindowStart(): number {
    return this._appendWindowStart;
  }

  public set appendWindowEnd(appendWindowEnd: number) {
    this._checkProp("appendWindowEnd", false);
    if (isNaN(appendWindowEnd) || appendWindowEnd <= this._appendWindowStart) {
      const err = new TypeError("Invalid `appendWindowStart` set");
      throw err;
    }
    this._appendWindowEnd = appendWindowEnd;
  }

  public get appendWindowEnd(): number {
    return this._appendWindowEnd;
  }

  public get buffered(): ManualTimeRanges {
    if (this.removed) {
      const err = new Error("buffered updated on a removed DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }
    return this._buffered;
  }

  public appendBuffer(data: BufferSource): void {
    if (this.removed) {
      const err = new Error("`appendBuffer` called on a removed DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this.updating) {
      const err = new Error("`appendBuffer` called on an updating DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this._callbacks.hasMediaElementErrored()) {
      const err = new Error("`appendBuffer` called on an errored HTMLMediaElement");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this._callbacks.getMediaSourceReadyState() === "ended") {
      this._callbacks.openMediaSource();
    }

    // TODO replace and/or evict?
    // if (bufferFull) {
    //   const err = new Error("`appendBuffer` called on a full DummySourceBuffer");
    //   err.name = "QuotaExceededError";
    //   throw err;
    // }

    this._operations.push({
      type: SourceBufferOperation.Append,
      segment: data,
      timestampOffset: this.timestampOffset,
      appendWindowStart: this.appendWindowStart,
      appendWindowEnd: this.appendWindowEnd,
      mimeType: this._currentType,
    });

    this.updating = true;

    const canceller = new TaskCanceller();
    canceller.linkToSignal(this.canceller.signal);
    this.currentAppendCanceller = canceller;
    this.eventScheduler
      .schedule(this, "updatestart", canceller.signal)
      .then(() => {
        let u8data;
        if (data instanceof Uint8Array) {
          u8data = data;
        } else if (data instanceof ArrayBuffer) {
          u8data = new Uint8Array(data);
        } else {
          u8data = new Uint8Array(data.buffer);
        }

        const segmentRanges: IRange[] = [];
        const chunks = extractCompleteChunks(u8data);
        if (chunks[0] === null) {
          this.updating = false;
          return this.eventScheduler.schedule(this, "error", null);
        }
        for (const chunk of chunks[0]) {
          const moovIndex = findCompleteBox(chunk, 0x6d6f6f76);
          if (moovIndex >= 0) {
            this._lastInitTimescale = getMDHDTimescale(chunk) ?? null;
          } else {
            const trackFragmentDecodeTime = getTrackFragmentDecodeTime(chunk);
            let trunDuration = getDurationFromTrun(chunk);
            if (
              trackFragmentDecodeTime !== undefined &&
              trunDuration !== undefined &&
              this._lastInitTimescale !== null
            ) {
              let startTime =
                this._timestampOffset + trackFragmentDecodeTime / this._lastInitTimescale;
              trunDuration = trunDuration / this._lastInitTimescale;
              if (startTime < 0) {
                if (trunDuration !== undefined) {
                  trunDuration += startTime; // remove from duration what comes before `0`
                }
                startTime = 0;
              }
              segmentRanges.push({ start: startTime, end: startTime + trunDuration });
            }
          }
        }

        for (const { start, end } of segmentRanges) {
          this.buffered.insert(start, end);
        }
        this._callbacks.onBufferedUpdate();
        this.updating = false;
        return this.eventScheduler.schedule(this, "update", canceller.signal);
      })
      .then(() => this.eventScheduler.schedule(this, "updateend", canceller.signal))
      .then(() => {
        this.currentAppendCanceller = null;
      })
      .catch(() => {
        this.currentAppendCanceller = null;
      });
  }

  public remove(start: number, end: number): void {
    if (this.removed) {
      const err = new Error("`remove` called on a removed DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this.updating) {
      const err = new Error("`remove` called on an updating DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    const duration = this._callbacks.getMediaSourceDuration();
    if (isNaN(duration)) {
      const err = new TypeError(
        "Cannot remove data from DummySourceBuffer: NaN duration",
      );
      throw err;
    }
    if (start < 0 || start > duration) {
      throw new TypeError("Invalid start given to `remove`");
    }

    if (isNaN(end) || start > end) {
      throw new TypeError("Invalid arguments given to `remove`");
    }

    if (this._callbacks.getMediaSourceReadyState() === "ended") {
      this._callbacks.openMediaSource();
    }

    this._operations.push({
      type: SourceBufferOperation.Remove,
      start,
      end,
    });

    this.updating = true;
    this._isRemoving = true;

    this.eventScheduler
      .schedule(this, "updatestart", this.canceller.signal)
      .then(() => {
        this.buffered.remove(start, end);
        this._callbacks.onBufferedUpdate();
        this.updating = false;
        return this.eventScheduler.schedule(this, "update", this.canceller.signal);
      })
      .then(() => this.eventScheduler.schedule(this, "updateend", this.canceller.signal))
      .catch(noop);
  }

  public abort(): void {
    if (this.removed) {
      const err = new Error("`abort` called on a removed DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this._isRemoving) {
      const err = new Error("`abort` called as a DummySourceBuffer is removing");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this.updating) {
      this.currentAppendCanceller?.cancel();
      this.currentAppendCanceller = null;
      this.updating = false;
      this.eventScheduler
        .schedule(this, "abort", this.canceller.signal)
        .then(() =>
          this.eventScheduler.schedule(this, "updateend", this.canceller.signal),
        )
        .catch(noop);
    }

    this._lastInitTimescale = null;
    this.appendWindowStart = 0;
    this.appendWindowEnd = Infinity;
  }

  public changeType(givenType: string): void {
    const type = String(givenType);
    if (type === "") {
      throw new TypeError("`changeType` error: empty string");
    }

    if (this.removed) {
      const err = new Error("`changeType` called on a removed DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this.updating) {
      const err = new Error("`changeType` called on an updating DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }

    if (this._callbacks.getMediaSourceReadyState() === "ended") {
      this._callbacks.openMediaSource();
    }

    this._currentType = type;
  }

  private _checkProp(propName: string, openMediaSource: boolean): void {
    if (this.removed) {
      const err = new Error(`${propName} updated on a removed DummySourceBuffer`);
      err.name = "InvalidStateError";
      throw err;
    }

    if (this.updating) {
      const err = new Error(`${propName} updated on an updating DummySourceBuffer`);
      err.name = "InvalidStateError";
      throw err;
    }

    if (openMediaSource) {
      if (this._callbacks.getMediaSourceReadyState() === "ended") {
        this._callbacks.openMediaSource();
      }
    }
  }
}

export interface IDummyMediaElementOptions {
  nodeName?: "AUDIO" | "VIDEO" | undefined | null;
}

export class DummyMediaElement
  extends EventEmitter<IMediaElementEventMap>
  implements IMediaElement
{
  public readonly FORCED_MEDIA_SOURCE: new () => IMediaSource;

  public readonly autoplay: false;
  public readonly childNodes: [];
  public readonly ended: boolean;
  public readonly isDummy: true;
  public readonly nodeName: "AUDIO" | "VIDEO";
  public readonly src: "";
  public readonly textTracks: never[];

  public buffered: ManualTimeRanges;
  public clientHeight: undefined;
  public clientWidth: undefined;
  public error: MediaError | null;
  public mediaKeys: null;
  public muted: boolean;
  public paused: boolean;
  public preload: "auto";
  public readyState: number;
  public seekable: ManualTimeRanges;
  public seeking: boolean;
  public volume: number;

  // events
  public onencrypted: ((evt: MediaEncryptedEvent) => void) | null;
  public oncanplay: ((evt: Event) => void) | null;
  public oncanplaythrough: ((evt: Event) => void) | null;
  public onenterpictureinpicture: ((evt: Event) => void) | null;
  public onleavepictureinpicture: ((evt: Event) => void) | null;
  public onended: ((evt: Event) => void) | null;
  public onerror: ((evt: Event) => void) | null;
  public onloadeddata: ((evt: Event) => void) | null;
  public onloadedmetadata: ((evt: Event) => void) | null;
  public onpause: ((evt: Event) => void) | null;
  public onplay: ((evt: Event) => void) | null;
  public onplaying: ((evt: Event) => void) | null;
  public onratechange: ((evt: Event) => void) | null;
  public onseeked: ((evt: Event) => void) | null;
  public onseeking: ((evt: Event) => void) | null;
  public onstalled: ((evt: Event) => void) | null;
  public ontimeupdate: ((evt: Event) => void) | null;
  public onvolumechange: ((evt: Event) => void) | null;
  public onwaiting: ((evt: Event) => void) | null;

  private _attachedMediaSource: null | DummyMediaSource;
  private _currentContentCanceller: TaskCanceller | null;
  private _duration: number;
  private _eventScheduler: EventScheduler;
  private _lastPosition: number;
  private _playbackRate: number;
  // private _allowedToPlay: boolean;
  // private _canAutoPlay: boolean;
  // private _pendingPlayPromises: Array<{
  //   resolve: () => void;
  //   reject: (err: Error) => void;
  // }>;

  constructor(opts: IDummyMediaElementOptions = {}) {
    super();

    this.FORCED_MEDIA_SOURCE = DummyMediaSource;

    this.autoplay = false;
    this.buffered = new ManualTimeRanges();
    this.childNodes = [];
    this.ended = false;
    this.error = null;
    this.isDummy = true;
    this.mediaKeys = null;
    this.muted = false;
    this.nodeName = opts.nodeName ?? "VIDEO";
    this.paused = true;
    this.preload = "auto";
    this.readyState = 0;
    this.seekable = new ManualTimeRanges();
    this.seeking = false;
    this.src = "";
    this.textTracks = [];
    this.volume = 1;

    this._attachedMediaSource = null;
    this._attachedMediaSource = null;
    this._currentContentCanceller = null;
    this._duration = NaN;
    this._eventScheduler = new EventScheduler();
    this._lastPosition = 0;
    this._playbackRate = 1;
    // this._allowedToPlay = true;
    // this._canAutoPlay = true;
    // this._pendingPlayPromises = [];

    this.onencrypted = null;
    this.oncanplay = null;
    this.oncanplaythrough = null;
    this.onended = null;
    this.onerror = null;
    this.onloadeddata = null;
    this.onloadedmetadata = null;
    this.onpause = null;
    this.onplay = null;
    this.onplaying = null;
    this.onratechange = null;
    this.onseeked = null;
    this.onseeking = null;
    this.onstalled = null;
    this.ontimeupdate = null;
    this.onenterpictureinpicture = null;
    this.onleavepictureinpicture = null;
    this.onvolumechange = null;
    this.onwaiting = null;
  }

  public get duration(): number {
    // TODO liveSeekableRange etc.

    return this._duration;
  }

  // TODO
  // private _resolvePendingPlayPromises() {
  //   while (true) {
  //     const next = this._pendingPlayPromises.shift();
  //     if (next === undefined) {
  //       return;
  //     }
  //     next.resolve();
  //   }
  // }

  public set srcObject(val: MediaProvider | null) {
    if (!(val instanceof DummyMediaSource)) {
      throw new Error("A DummyMediaElement can only be linked to a DummyMediaSource");
    }
    const prev = this._attachedMediaSource;
    this._attachedMediaSource = val;
    if (val !== null) {
      this.buffered = new ManualTimeRanges();
      this._currentContentCanceller = new TaskCanceller();
      this._attachMediaSource(val);
    } else if (prev !== null) {
      prev.destroy();
      this.buffered = new ManualTimeRanges();
      this._lastPosition = 0;
      this._duration = NaN;
      this.error = null;
      this._attachedMediaSource = null;
      this.seeking = false;
      this.readyState = 0;
    }
  }

  public get srcObject(): MediaProvider | null {
    return this._attachedMediaSource as unknown as MediaProvider;
  }

  public appendChild<T extends Node>(_child: T): void {
    throw new Error("Unimplemented");
  }

  public setMediaKeys(_mk: MediaKeys | null): Promise<void> {
    return Promise.reject("EME not implemented on dummy media element.");
  }

  public set currentTime(val: number) {
    const canceller = this._currentContentCanceller;
    if (canceller === null || this.readyState === 0) {
      return;
    }

    let seekingPos = val;

    this.seeking = true;
    if (seekingPos > this._duration) {
      seekingPos = this._duration;
    }

    let distance: [number, number | undefined] = [Infinity, undefined];
    for (let i = 0; i < this.seekable.length; i++) {
      if (seekingPos >= this.seekable.start(i) && seekingPos <= this.seekable.end(i)) {
        distance = [0, i];
        break;
      } else {
        const rangeDistance = Math.min(
          Math.abs(this.seekable.end(i) - seekingPos),
          Math.abs(this.seekable.start(i) - seekingPos),
        );
        if (rangeDistance < distance[0]) {
          distance = [rangeDistance, i];
        } else if (rangeDistance === distance[0]) {
          // TODO
        }
      }
    }

    if (distance[0] === Infinity) {
      seekingPos = 0;
    }

    this._lastPosition = val;
    this._eventScheduler
      .schedule(this, "seeking", canceller.signal)
      .then(() => {
        this.seeking = false;
        return Promise.all([
          this._eventScheduler.schedule(this, "timeupdate", canceller.signal),
          this._eventScheduler.schedule(this, "seeked", canceller.signal),
        ]);
      })
      .catch(noop);
  }

  public get currentTime(): number {
    return this._lastPosition;
  }

  public set playbackRate(val: number) {
    this._playbackRate = val;
    this._eventScheduler.schedule(this, "ratechange", null).catch(noop);
  }

  public get playbackRate(): number {
    return this._playbackRate;
  }

  public play(): Promise<void> {
    const error = new Error("Dummy media element cannot play");
    error.name = "NotAllowedError";
    return Promise.reject(error);

    // TODO
    // if (!this._allowedToPlay) {
    //   const error = new Error("Dummy media element cannot play");
    //   error.name = "NotAllowedError";
    //   return Promise.reject(error);
    // }
    // if (this.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    //   const error = new Error("`play` call on not supported content");
    //   error.name = "NotSupportedError";
    //   return Promise.reject(error);
    // }
    // if (this.ended) {
    //   this.currentTime =
    //     this.seekable.length > 0 ? this.seekable.start(0) : this.currentTime;
    // }
    // if (this._currentContentCanceller !== null && this.paused) {
    //   this.paused = false;
    //   this._eventScheduler.schedule(this, "play", this._currentContentCanceller.signal)
    //     .catch(noop);
    //   if (this.readyState <= 2) {
    //     this._eventScheduler.schedule(this, "waiting", this._currentContentCanceller.signal)
    //       .catch(noop);
    //   } else {
    //     this._eventScheduler.schedule(this, "playing", this._currentContentCanceller.signal)
    //       .catch(noop);
    //   }
    // } else if (this.readyState >= 3) {
    // }
    // this._pendingPlayPromise.push(res);
    // this._canAutoPlay = false;
  }

  public pause(): void {
    // TODO
  }

  public hasAttribute(_attr: string): boolean {
    return false;
  }

  public removeAttribute(_attr: string): void {
    return;
  }

  public hasChildNodes(): false {
    return false;
  }

  public removeChild(x: unknown): never {
    if (x === null) {
      throw new TypeError("Asked to remove null child");
    }
    const notFoundErr = new Error("DummyMediaElement has no child");
    notFoundErr.name = "NotFoundError";
    throw notFoundErr;
  }

  private _attachMediaSource(dummyMs: DummyMediaSource): void {
    dummyMs.updateCallbacks({
      hasMediaElementErrored: () => {
        return this.error !== null;
      },

      onBufferedUpdate: () => {
        const allBuffered = dummyMs.sourceBuffers.reduce((acc: IRange[] | null, sb) => {
          if (acc === null) {
            return convertToRanges(sb.buffered);
          }
          return keepRangeIntersection(acc, convertToRanges(sb.buffered));
        }, null);
        if (allBuffered !== null) {
          for (const range of allBuffered) {
            this.buffered.insert(range.start, range.end);
          }
          if (this.readyState === 0) {
            const canceller = this._currentContentCanceller;
            if (canceller === null) {
              return;
            }
            this.readyState = 1;
            this.seekable.insert(0, Infinity);
            this._eventScheduler
              .schedule(this, "loadedmetadata", canceller.signal)
              .catch(noop);
          } else if (
            this.readyState === 1 &&
            isTimeInRanges(allBuffered, this.currentTime)
          ) {
            const canceller = this._currentContentCanceller;
            if (canceller === null) {
              return;
            }
            this.readyState = 3;
            this._eventScheduler
              .schedule(this, "loadeddata", canceller.signal)
              .then(() => {
                return this._eventScheduler.schedule(this, "canplay", canceller.signal);
              })
              .then(() => {
                this.readyState = 4;
                return this._eventScheduler.schedule(
                  this,
                  "canplaythrough",
                  canceller.signal,
                );
              })
              .catch(noop);
          }
        }
      },

      updateMediaElementDuration: (duration: number) => {
        // TODO check
        this._duration = duration;
        if (this.currentTime > this._duration) {
          this.currentTime = this._duration;
        }
      },
    });
    dummyMs.readyState = "open";
    dummyMs.eventScheduler.schedule(dummyMs, "sourceopen", null).catch(noop);
  }
}

// TODO this should be better typed, might leave some brain cells behind though
interface IDummySourceBufferEventObject {
  resolve: () => void;
  reject: (e: unknown) => void;
  obj: DummySourceBuffer;
  evtName: keyof ISourceBufferEventMap;
  cancelSignal: CancellationSignal | null;
}
interface IDummyMediaSourceEventObject {
  resolve: () => void;
  reject: (e: unknown) => void;
  obj: DummyMediaSource;
  evtName: keyof IMediaSourceEventMap;
  cancelSignal: CancellationSignal | null;
}
export class EventScheduler {
  private _scheduled: Array<IDummySourceBufferEventObject | IDummyMediaSourceEventObject>;
  constructor() {
    this._scheduled = [];
  }

  public schedule(
    obj: DummyMediaElement,
    evtName: keyof IMediaElementEventMap,
    cancelSignal: CancellationSignal | null,
  ): Promise<void>;
  public schedule(
    obj: DummyMediaSource,
    evtName: keyof IMediaSourceEventMap,
    cancelSignal: CancellationSignal | null,
  ): Promise<void>;
  public schedule(
    obj: DummySourceBuffer,
    evtName: keyof ISourceBufferEventMap,
    cancelSignal: CancellationSignal | null,
  ): Promise<void>;
  public schedule(
    obj: DummyMediaElement | DummyMediaSource | DummySourceBuffer,
    evtName:
      | keyof IMediaElementEventMap
      | keyof IMediaSourceEventMap
      | keyof ISourceBufferEventMap,
    cancelSignal: CancellationSignal | null,
  ): Promise<void> {
    return new Promise<void>((res, rej) => {
      /* eslint-disable */
      this._scheduled.push({
        resolve: res,
        reject: rej,
        obj: obj as any,
        evtName: evtName as any,
        cancelSignal,
      });
      /* eslint-enable */
      if (this._scheduled.length === 1) {
        this._start();
      }
    });
  }

  private _start() {
    const elt = this._scheduled[0];
    if (elt === undefined) {
      return;
    }
    /* eslint-disable */
    let timeout: number | null;
    timeout = setTimeout(() => {
      const { evtName, obj } = elt;
      timeout = null;
      const event = new Event(evtName);
      const handlerFnName = `on${evtName}` as any;
      if ((obj as any)[handlerFnName] !== null) {
        try {
          (obj as any)[handlerFnName](event);
        } catch (e) {
          // nothing
        }
      }
      timeout = setTimeout(() => {
        timeout = null;
        (obj as any).trigger(evtName as any, event);
        const index = this._scheduled.indexOf(elt);
        if (index >= 0) {
          this._scheduled.splice(index, 1);
        }
        elt.resolve();
        this._start();
      }, 0);
    }, 0);
    /* eslint-enable */
    elt.cancelSignal?.register((err) => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      const index = this._scheduled.indexOf(elt);
      if (index >= 0) {
        this._scheduled.splice(index, 1);
      }
      elt.reject(err);
      this._start();
    });
  }
}
