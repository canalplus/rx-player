import type {
  ISourceBufferListEventMap,
  IMediaSource,
  IMediaSourceEventMap,
  ISourceBuffer,
  ISourceBufferEventMap,
  ISourceBufferList,
} from "../../../compat/browser_compatibility_types";
import {
  extractInitSegment,
  findCompleteBox,
  getDurationFromTrun,
  getMDHDTimescale,
  getTrackFragmentDecodeTime,
  extractCompleteChunks,
} from "../../../parsers/containers/isobmff";
import { getKeyIdFromInitSegment } from "../../../parsers/containers/isobmff/utils";
import arrayIncludes from "../../../utils/array_includes";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import type { IRange } from "../../../utils/ranges";
import startsWith from "../../../utils/starts_with";
import { bytesToHex } from "../../../utils/string_parsing";
import TaskCanceller from "../../../utils/task_canceller";
import TimeRangesWithMetadata, { EventScheduler } from "./utils";

/**
 * Re-implementation of the MSE `MediaSource` Object.
 * @class DummyMediaSource
 */
export class DummyMediaSource
  extends EventEmitter<IMediaSourceEventMap>
  implements IMediaSource
{
  public readonly isDummy: true;
  public handle: DummyMediaSource;
  public sourceBuffers: IDummySourceBufferList;
  public activeSourceBuffers: IDummySourceBufferList;
  public readyState: "closed" | "open" | "ended";
  public destroyed: boolean;
  private _duration: number;
  public liveSeekableRange: TimeRangesWithMetadata<null>;

  public onsourceopen: ((evt: Event) => void) | null;
  public onsourceended: ((evt: Event) => void) | null;
  public onsourceclose: ((evt: Event) => void) | null;

  public eventScheduler: EventScheduler;
  private _callbacks: IDummyMediaSourceCallbacks;

  constructor() {
    super();
    this.isDummy = true;
    this.sourceBuffers = createDummySourceBufferList();
    this.activeSourceBuffers = createDummySourceBufferList();
    this.readyState = "closed";
    this.handle = this;
    this.onsourceopen = null;
    this.onsourceended = null;
    this.onsourceclose = null;
    this.destroyed = false;
    this._callbacks = {
      hasMediaElementErrored: () => false,
      onBufferedUpdate: noop,
      updateMediaElementDuration: noop,
    };
    this._duration = NaN;
    this.liveSeekableRange = new TimeRangesWithMetadata();
    this.eventScheduler = new EventScheduler();
  }

  static isTypeSupported(mimeType: string): boolean {
    return startsWith(mimeType, "audio/mp4") || startsWith(mimeType, "video/mp4");
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
    const sb = new DummySourceBuffer({
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
    this.sourceBuffers.push(sb);
    this.sourceBuffers._onAddSourceBuffer();
    this.activeSourceBuffers.push(sb);
    this.activeSourceBuffers._onAddSourceBuffer();
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

    if (sb instanceof DummySourceBuffer) {
      const indexOfActive = this.activeSourceBuffers.indexOf(sb);
      if (indexOfActive >= 0) {
        this.activeSourceBuffers.splice(indexOfActive, 1);
        this.activeSourceBuffers._onRemoveSourceBuffer();
      }

      const index = this.sourceBuffers.indexOf(sb);
      if (index >= 0) {
        this.sourceBuffers.splice(index, 1);
        this.sourceBuffers._onRemoveSourceBuffer();
      }
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
    this.liveSeekableRange = new TimeRangesWithMetadata();
    this.liveSeekableRange.insert(start, end, null);
  }

  public clearLiveSeekableRange(): void {
    if (this.readyState !== "open") {
      const err = new Error(
        "`setLiveSeekableRange` called on a non-open DummyMediaSource",
      );
      err.name = "InvalidStateError";
      throw err;
    }
    this.liveSeekableRange = new TimeRangesWithMetadata();
  }
}

interface IDummySourceBufferInternalCallbacks {
  hasMediaElementErrored: () => boolean;
  getMediaSourceDuration: () => number;
  getMediaSourceReadyState: () => "open" | "ended" | "closed";
  openMediaSource: () => void;
  onBufferedUpdate: () => void;
}

/**
 * Re-implementation of the MSE `SourceBuffer` Object.
 * @class DummySourceBuffer
 */
export class DummySourceBuffer
  extends EventEmitter<ISourceBufferEventMap>
  implements ISourceBuffer
{
  /** Correspond to `SourceBuffer.prototype.updating` from MSE */
  public updating: boolean;

  /**
   * Set to `true` once this `DummySourceBuffer` is removed from the parent
   * MediaSource.
   */
  public removed: boolean;

  /**
   * When it emits, cancel all operations and scheduled events from this
   * `DummySourceBuffer`.
   */
  public canceller: TaskCanceller;

  /**
   * When it emits, abort specifically the current `appendBuffer` operation.
   */
  public currentAppendCanceller: TaskCanceller | null;

  /**
   * Allows to emit SourceBuffer events, simulating the browser's event loop.
   */
  public eventScheduler: EventScheduler;

  /**
   * To set to `true` to trigger `QuotaExceededError` to next `appendBuffer`
   * calls.
   * To set to `false` to stop doing that.
   */
  public BUFFER_FULL: boolean;

  /** Optional listener for the `updatestart` event. */
  public onupdatestart: ((evt: Event) => void) | null;
  /** Optional listener for the `update` event. */
  public onupdate: ((evt: Event) => void) | null;
  /** Optional listener for the `updateend` event. */
  public onupdateend: ((evt: Event) => void) | null;
  /** Optional listener for the `error` event. */
  public onerror: ((evt: Event) => void) | null;
  /** Optional listener for the `abort` event. */
  public onabort: ((evt: Event) => void) | null;

  /**
   * When set to an `Uint8Array`, set to the key id found in the last
   * initialization segment,
   * meaning next pushed media segments are probably encrypted with the
   * corresponding key.
   * When set to `null`, no initialization segment has been pushed or no key id
   * has been found on the last pushed initialization segment.
   */
  private _lastKeyId: Uint8Array | null;
  /**
   * When set to a `number`, set to the timescale found in the last
   * initialization segment that may be re-used for media segments.
   * When set to `null`, no initialization segment has been pushed or no
   * timescale has been found on the last pushed initialization segment.
   */
  private _lastInitTimescale: number | null;

  /** Correspond to `SourceBuffer.prototype.timestampOffset` from MSE */
  private _timestampOffset: number;
  /** Correspond to `SourceBuffer.prototype.buffered` from MSE */
  private _buffered: TimeRangesWithMetadata<IDummySourceBufferBufferMetadata>;
  /** Correspond to `SourceBuffer.prototype.appendWindowStart` from MSE */
  private _appendWindowStart: number;
  /** Correspond to `SourceBuffer.prototype.appendWindowEnd` from MSE */
  private _appendWindowEnd: number;
  /** Set to `true` if a "remove" operation is currently pending. */
  private _isRemoving: boolean;
  /** Callbacks given to a `DummySourceBuffer`. */
  private _callbacks: IDummySourceBufferInternalCallbacks;

  /**
   * @param {Object} callbacks
   */
  constructor(callbacks: IDummySourceBufferInternalCallbacks) {
    super();
    this.updating = false;
    this.removed = false;
    this.BUFFER_FULL = false;

    this.onupdatestart = null;
    this.onupdate = null;
    this.onupdateend = null;
    this.onerror = null;
    this.onabort = null;
    this.canceller = new TaskCanceller();
    this.currentAppendCanceller = null;
    this._lastKeyId = null;
    this._callbacks = callbacks;
    this._buffered = new TimeRangesWithMetadata();
    this._appendWindowStart = 0;
    this._appendWindowEnd = Infinity;
    this._timestampOffset = 0;
    this._isRemoving = false;
    this._lastInitTimescale = null;
    this.eventScheduler = new EventScheduler();
  }

  /**
   * Implements `SourceBuffer.prototype.mode` from MSE.
   */
  public set mode(mode: "segments" | "sequence" | "dummy") {
    this._checkProp("mode", true);
    if (mode === "sequence") {
      throw new Error("Trying to update mode of DummySourceBuffer");
    }
  }
  public get mode(): "dummy" {
    return "dummy";
  }

  /**
   * Implements `SourceBuffer.prototype.timestampOffset` from MSE.
   */
  public set timestampOffset(timestampOffset: number) {
    this._checkProp("timestampOffset", true);
    this._timestampOffset = timestampOffset;
  }
  public get timestampOffset(): number {
    return this._timestampOffset;
  }

  /**
   * Implements `SourceBuffer.prototype.appendWindowStart` from MSE.
   */
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

  /**
   * Implements `SourceBuffer.prototype.appendWindowEnd` from MSE.
   */
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

  /**
   * Implements `SourceBuffer.prototype.buffered` from MSE.
   */
  public get buffered(): TimeRangesWithMetadata<IDummySourceBufferBufferMetadata> {
    if (this.removed) {
      const err = new Error("buffered updated on a removed DummySourceBuffer");
      err.name = "InvalidStateError";
      throw err;
    }
    return this._buffered;
  }

  /**
   * Implements `SourceBuffer.prototype.appendBuffer` from MSE.
   * @param {BufferSource} data
   */
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

    if (this.BUFFER_FULL) {
      const err = new Error("`appendBuffer` called on a full DummySourceBuffer");
      err.name = "QuotaExceededError";
      throw err;
    }

    this.updating = true;

    const canceller = new TaskCanceller();
    canceller.linkToSignal(this.canceller.signal);
    this.currentAppendCanceller = canceller;
    this.eventScheduler
      .schedule(this, "updatestart", canceller.signal)
      .then(() => {
        let u8data: Uint8Array;
        if (data instanceof Uint8Array) {
          u8data = data;
        } else if (data instanceof ArrayBuffer) {
          u8data = new Uint8Array(data);
        } else {
          u8data = new Uint8Array(data.buffer);
        }

        const segmentRanges: IRange[] = [];

        const [initSegment, otherChunks] = extractInitSegment(u8data);
        let keyId = this._lastKeyId;
        if (initSegment !== null) {
          keyId = getKeyIdFromInitSegment(initSegment);
        }
        this._lastKeyId = keyId;

        const completeChunks: Uint8Array[] =
          otherChunks === null ? [] : extractCompleteChunks(otherChunks)[0] ?? [];
        const chunks: Uint8Array[] =
          initSegment === null ? completeChunks : [initSegment, ...completeChunks];

        for (const chunk of chunks) {
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
          this.buffered.insert(start, end, {
            keyIds: keyId !== null ? [bytesToHex(keyId)] : null,
          });
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

  /**
   * Implements `SourceBuffer.prototype.remove` from MSE.
   * @param {number} start
   * @param {number} end
   */
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

    this.updating = true;
    this._isRemoving = true;

    this.eventScheduler
      .schedule(this, "updatestart", this.canceller.signal)
      .then(() => {
        this.buffered.remove(start, end);
        this._callbacks.onBufferedUpdate();
        this.updating = false;
        this._isRemoving = false;
        return this.eventScheduler.schedule(this, "update", this.canceller.signal);
      })
      .then(() => this.eventScheduler.schedule(this, "updateend", this.canceller.signal))
      .catch(noop);
  }

  /**
   * Implements `SourceBuffer.prototype.abort` from MSE.
   */
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

  /**
   * Implements `SourceBuffer.prototype.abort` from MSE.
   * @param {string} givenType
   */
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
  }

  /**
   * Allows to trigger the common steps when updating a `SourceBuffer`'s
   * property.
   * @param {string} propName - The MSE name of the property you want to update.
   * @param {boolean} openMediaSource - If `true`, this property update should
   * lead to the parent `MediaSource` being open.
   */
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

/**
 * Metadata linked to buffer currently present in a `DummySourceBuffer`.
 */
export interface IDummySourceBufferBufferMetadata {
  keyIds: string[] | null;
}

/**
 * Callbacks needed to instantiate a `DummyMediaSource`.
 */
interface IDummyMediaSourceCallbacks {
  /**
   * Returns `true` if the parent `HTMLMediaElement` linked to that
   * `MediaSource` has its `error` property set.
   */
  hasMediaElementErrored: () => boolean;
  /**
   * Callback called any time one of the `DummySourceBuffer` linked to this
   * `DummyMediaSource` updated its `buffered` property.
   */
  onBufferedUpdate: () => void;
  /**
   * When called, allows to update the parent `HTMLMediaElement` object's
   * `duration` property by the communicated number.
   */
  updateMediaElementDuration: (duration: number) => void;
}

/**
 * Defines the type for a `IDummySourceBufferList`, the in-JS re-implementation
 * of the `SourceBufferList` MSE Object.
 */
export type IDummySourceBufferList = ISourceBufferList &
  DummySourceBuffer[] & {
    /**
     * Callback that MUST be called any time a `DummySourceBuffer` is added to
     * this  `IDummySourceBufferList`.
     */
    _onAddSourceBuffer: () => void;
    /**
     * Callback that MUST be called any time a `DummySourceBuffer` is removed
     * from this  `IDummySourceBufferList`.
     */
    _onRemoveSourceBuffer: () => void;
  };

/**
 * Allows to create a `IDummySourceBufferList` instance, which is a
 * Re-implementation in-JS of a MSE `SourceBufferList`
 * @returns {Object}
 */
function createDummySourceBufferList(): IDummySourceBufferList {
  const list = [] as unknown as IDummySourceBufferList;
  const eventEmitter = new EventEmitter<ISourceBufferListEventMap>();

  list.onaddsourcebuffer = null;
  list.onremovesourcebuffer = null;
  list.addEventListener = eventEmitter.addEventListener.bind(eventEmitter);
  list.removeEventListener = eventEmitter.removeEventListener.bind(eventEmitter);
  list._onAddSourceBuffer = function addSourceBuffer(): void {
    const evt = new Event("addsourcebuffer");
    setTimeout(() => {
      if (typeof this.onaddsourcebuffer === "function") {
        try {
          this.onaddsourcebuffer(evt);
        } catch (_) {
          // we don't care
        }
      }
    }, 0);
    setTimeout(() => {
      /* eslint-disable-next-line */
      (eventEmitter as unknown as any).trigger("addsourcebuffer", evt);
    }, 0);
  };

  list._onRemoveSourceBuffer = function removeSourceBuffer(): void {
    const evt = new Event("removesourcebuffer");
    setTimeout(() => {
      if (typeof this.onremovesourcebuffer === "function") {
        try {
          this.onremovesourcebuffer(evt);
        } catch (_) {
          // we don't care
        }
      }
    }, 0);
    setTimeout(() => {
      /* eslint-disable-next-line */
      (eventEmitter as unknown as any).trigger("removesourcebuffer", evt);
    }, 0);
  };
  return list;
}

// NOTE: The following commented code would allow to define a format to save
// performed operations on `DummySourceBuffer` objects.
// This idea has been abandonned for now.

// export interface IStoredMediaSourceInfo {
//   sourceBuffers: IStoredSourceBufferInfo[];
// }

// export const enum SourceBufferOperation {
//   Append = 0,
//   Remove,
// }

//
// export interface ISourceBufferAppendOperation {
//   type: SourceBufferOperation.Append;
//   segment: BufferSource;
//   timestampOffset: number;
//   appendWindowStart: number;
//   appendWindowEnd: number;
//   mimeType: string;
// }

// export interface ISourceBufferRemoveOperation {
//   type: SourceBufferOperation.Remove;
//   start: number;
//   end: number;
// }

// export type ISourceBufferOperation =
//   | ISourceBufferRemoveOperation
//   | ISourceBufferAppendOperation;

// export interface IStoredSourceBufferInfo {
//   type: string;
//   operations: ISourceBufferOperation[];
// }
