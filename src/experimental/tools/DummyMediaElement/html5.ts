import type {
  IMediaElement,
  IMediaElementEventMap,
  IMediaKeys,
} from "../../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../../compat/eme";
import { createCompatibleEventListener } from "../../../compat/event_listeners";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import type { IRange } from "../../../utils/ranges";
import {
  convertToRanges,
  isTimeInRanges,
  keepRangeIntersection,
} from "../../../utils/ranges";
import TaskCanceller from "../../../utils/task_canceller";
import { DummyMediaKeys, createRequestMediaKeySystemAccess } from "./eme";
import type { IRequestMediaKeySystemAccessConfig } from "./eme";
import { DummyMediaSource } from "./mse";
import TimeRangesWithMetadata, { EventScheduler } from "./utils";

export interface IDummyMediaElementOptions {
  nodeName?: "AUDIO" | "VIDEO" | undefined | null;
  drmOptions?:
    | {
        requestMediaKeySystemAccessConfig?:
          | IRequestMediaKeySystemAccessConfig
          | undefined;
      }
    | undefined;
}

export class DummyMediaElement
  extends EventEmitter<IMediaElementEventMap>
  implements IMediaElement
{
  public readonly autoplay: false;
  public readonly childNodes: [];
  public readonly ended: boolean;
  public readonly isDummy: true;
  public readonly nodeName: "AUDIO" | "VIDEO";
  public readonly textTracks: never[];
  public readonly FORCED_MEDIA_SOURCE: typeof DummyMediaSource;
  public readonly FORCED_EME_API: IEmeApiImplementation;

  public src: "";
  public buffered: TimeRangesWithMetadata<null>;
  public clientHeight: undefined;
  public clientWidth: undefined;
  public error: MediaError | null;
  public muted: boolean;
  public paused: boolean;
  public preload: "auto";
  public readyState: number;
  public seekable: TimeRangesWithMetadata<null>;
  public seeking: boolean;
  public volume: number;
  public mediaKeys: DummyMediaKeys | null;

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

    this.autoplay = false;
    this.buffered = new TimeRangesWithMetadata();
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
    this.seekable = new TimeRangesWithMetadata();
    this.seeking = false;
    this.src = "";
    this.textTracks = [];
    this.volume = 1;

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

    const setMediaKeys = (
      mediaElement: IMediaElement,
      mediaKeys: IMediaKeys | null,
    ): Promise<undefined> => {
      return new Promise((resolve) => {
        mediaElement.mediaKeys = mediaKeys;
        if (mediaElement === this && mediaKeys instanceof DummyMediaKeys) {
          mediaKeys.onSessionKeyUpdates = () => {
            this._updateBufferedAndReadyState();
          };
        }
        resolve(undefined);
        this._updateBufferedAndReadyState();
      });
    };

    this.FORCED_MEDIA_SOURCE = DummyMediaSource;
    this.FORCED_EME_API = {
      requestMediaKeySystemAccess: createRequestMediaKeySystemAccess(
        opts.drmOptions?.requestMediaKeySystemAccessConfig,
      ),
      onEncrypted: createCompatibleEventListener(["encrypted"]),
      setMediaKeys,
      implementation: "standard",
    };
  }

  public get duration(): number {
    // TODO liveSeekableRange etc.

    return this._duration;
  }

  public addTextTrack(): never {
    throw new Error("Not implemented yet");
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

    this.currentTime = 0;
    this.buffered = new TimeRangesWithMetadata();
    this._lastPosition = 0;
    this._duration = NaN;
    this.error = null;
    this.seeking = false;
    this.readyState = 0;

    const prev = this._attachedMediaSource;
    this._attachedMediaSource = val;
    if (val !== null) {
      this._currentContentCanceller = new TaskCanceller();
      this._attachCurrentMediaSource();
    } else if (prev !== null) {
      prev.destroy();
      this._attachedMediaSource = null;
    }
  }

  public get srcObject(): MediaProvider | null {
    return this._attachedMediaSource as unknown as MediaProvider;
  }

  public appendChild<T extends Node>(_child: T): void {
    throw new Error("Unimplemented");
  }

  public setMediaKeys(_mk: IMediaKeys | null): Promise<void> {
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
    this._updateBufferedAndReadyState();
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

  public removeAttribute(attr: "src"): void {
    if (attr === "src") {
      this.src = "";
    }
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

  private _updateBufferedAndReadyState(): void {
    if (this._attachedMediaSource === null) {
      this.buffered.remove(0, Infinity);
      this.readyState = 0;
      return;
    }

    // TODO also check encryption metadata
    const allBuffered = this._attachedMediaSource.sourceBuffers.reduce(
      (acc: IRange[] | null, sb) => {
        if (acc === null) {
          return convertToRanges(sb.buffered);
        }
        return keepRangeIntersection(acc, convertToRanges(sb.buffered));
      },
      null,
    );

    if (allBuffered === null) {
      this.buffered.remove(0, Infinity);
      this.readyState = 0;
      return;
    }

    const isMissingKey = this._attachedMediaSource.sourceBuffers.some((sb) => {
      const metadata = sb.buffered.getMetadataFor(this._lastPosition);
      if (metadata === null || metadata.keyIds === null) {
        return false;
      }
      if (this.mediaKeys === null) {
        return true;
      }
      const { sessions } = this.mediaKeys;
      return metadata.keyIds.some((k) => {
        return !sessions.some((s) => {
          const keyMap = s.keyStatuses.getInnerMap();
          for (const key of keyMap.keys()) {
            if (key === k) {
              const val = keyMap.get(key);
              return val?.status === "usable";
            }
          }
        });
      });
    });

    for (const range of allBuffered) {
      this.buffered.insert(range.start, range.end, null);
    }

    if (this.readyState === 0) {
      const canceller = this._currentContentCanceller;
      if (canceller === null) {
        return;
      }
      this.readyState = 1;
      this.seekable.insert(0, Infinity, null);
      this._eventScheduler.schedule(this, "loadedmetadata", canceller.signal).catch(noop);
    } else if (this.readyState === 1) {
      if (!isTimeInRanges(allBuffered, this.currentTime) || isMissingKey) {
        return;
      }
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
          return this._eventScheduler.schedule(this, "canplaythrough", canceller.signal);
        })
        .catch(noop);
    } else {
      // For readyState > 1
      if (isTimeInRanges(allBuffered, this.currentTime) && !isMissingKey) {
        return;
      }
      this.readyState = 1;
    }
  }

  private _attachCurrentMediaSource(): void {
    const dummyMs = this._attachedMediaSource;
    if (dummyMs === null) {
      return;
    }
    dummyMs.updateCallbacks({
      hasMediaElementErrored: () => {
        return this.error !== null;
      },

      onBufferedUpdate: () => {
        this._updateBufferedAndReadyState();
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
