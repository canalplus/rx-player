import type {
  IMediaElement,
  IMediaElementEventMap,
  IMediaKeys,
} from "../../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../../compat/eme";
import { createCompatibleEventListener } from "../../../compat/event_listeners";
import EventEmitter from "../../../utils/event_emitter";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import noop from "../../../utils/noop";
import type { IRange } from "../../../utils/ranges";
import {
  convertToRanges,
  insertInto,
  keepRangeIntersection,
} from "../../../utils/ranges";
import TaskCanceller from "../../../utils/task_canceller";
import { DummyMediaKeys, createRequestMediaKeySystemAccess } from "./eme";
import type { IRequestMediaKeySystemAccessConfig } from "./eme";
import { DummyMediaSource } from "./mse";
import TimeRangesWithMetadata, { EventScheduler } from "./utils";

/** Constructor options for a `DummyMediaElement`. */
export interface IDummyMediaElementOptions {
  /**
   * The type of node our `DummyMediaElement` should have:
   *   - `"AUDIO"` for an `HTMLAudioElement`
   *   - `"VIDEO"` for an `HTMLVideoElement`
   *   - Anything else for the default (`HTMLMediaElement`)
   */
  nodeName?: "AUDIO" | "VIDEO" | undefined | null;
  /**
   * If set explicitly to `false`, act as if the current browser forbid
   * content playback (`play` and `autoplay` will return the `NotAllowedError`
   * specified by the WHATWG HTML5 specification in that case).
   */
  allowedToPlay?: boolean;
  /**
   * Options linked to DRM / EME API matters.
   */
  drmOptions?:
    | {
        requestMediaKeySystemAccessConfig?:
          | IRequestMediaKeySystemAccessConfig
          | undefined;
      }
    | undefined;
}

/**
 * Minimum amount of buffer remaining in front of the currently-played position
 * in seconds from which content playback happens. If we're below that value,
 * the `DummyMediaElement` will start rebuffering itself.
 */
const MINIMUM_BUFFER_SIZE_FOR_PLAYBACK = 0.1;

/**
 * The maximum interval in milliseonds at which we re-check the current playback
 * conditions (the `currentTime`, the `readyState` if we're waiting for data
 * etc.)
 * Note that this logic also happens on specific events: new media is added,
 * removed, methods are called...
 */
const TICK_INTERVAL = 40;

/**
 * `HTMLMediaElement` implementation that should be compatible to the
 * `RxPlayer`.
 *
 * This class will act as if it is a regular `HTMLMediaElement` playing media
 * provided through the linked MSE API mocks.
 * Properties will try to mimick what an actual `HTMLMediaElement` would return
 * but the content won't actually be decoded nor deciphered.
 * @class DummyMediaElement
 */
export class DummyMediaElement
  extends EventEmitter<IMediaElementEventMap>
  implements IMediaElement
{
  /** Property indicating that we're relying on a `DummyMediaElement. */
  public readonly isDummy: true;
  /**
   * Property providing the MSE API implementation we should rely on, instead
   * of the one provided by the browser.
   */
  public readonly FORCED_MEDIA_SOURCE: typeof DummyMediaSource;
  /**
   * Property providing the EME API implementation we should rely on, instead
   * of the one provided by the browser.
   */
  public readonly FORCED_EME_API: IEmeApiImplementation;
  /** `Node.childNodes` property. */
  public readonly childNodes: [];
  /** `Node.nodeName` property. */
  public readonly nodeName: "AUDIO" | "VIDEO";
  /** `HTMLMediaElement.textTracks` property. */
  public readonly textTracks: never[];

  /** `HTMLMediaElement.ended` property. */
  public ended: boolean;
  /** `HTMLMediaElement.buffered` property. */
  public buffered: TimeRangesWithMetadata<null>;
  /** `Element.clientHeight` property. */
  public clientHeight: undefined;
  /** `Element.clientWidth` property. */
  public clientWidth: undefined;
  /** `HTMLMediaElement.error` property. */
  public error: MediaError | null;
  /** `HTMLMediaElement.paused` property. */
  public paused: boolean;
  /** `HTMLMediaElement.preload` property. */
  public preload: "auto";
  /** `HTMLMediaElement.readyState` property. */
  public readyState: number;
  /** `HTMLMediaElement.seekable` property. */
  public seekable: TimeRangesWithMetadata<null>;
  /** `HTMLMediaElement.seeking` property. */
  public seeking: boolean;
  /** EME's `HTMLMediaElement.mediaKeys` property. */
  public mediaKeys: DummyMediaKeys | null;

  // event handlers from HTML specs:

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

  /**
   * Correspond to the "allowed to play" flag from the WHATWG HTML5
   * specification.
   */
  private _allowedToPlay: boolean;
  /**
   * The `DummyMediaSource` currently "attached" to this `DummyMediaElement`.
   *
   * `null` if not `DummyMediaSource` is attached.
   */
  private _attachedMediaSource: null | DummyMediaSource;
  /**
   * The real `HTMLMediaElement.autoplay` value, as it is set as getter/setter
   * methods here.
   */
  private _autoplay: boolean;
  /**
   * Correspond to the "can autoplay" flag from the WHATWG HTML5
   * specification.
   */
  private _canAutoPlay: boolean;
  /**
   * `TaskCanceller` linked to the current playing content (presumably on the
   * `attachedMediaSource`).
   * Cancelling it should free resources linked to that content.
   */
  private _currentContentCanceller: TaskCanceller | null;
  /**
   * The real `HTMLMediaElement.duration` value, as it is set as getter/setter
   * methods here.
   */
  private _duration: number;
  /** Abstraction simplifying the mechanism of sending DOM events. */
  private _eventScheduler: EventScheduler;
  /**
   * If set, we're currently "freezing" : playback will stall, even
   * if there's decodable and decipherable data in the buffer.
   */
  private _isFreezing: {
    /**
     * If set to `true` the current freeze should resolves itself when a seek is
     * performed.
     */
    resolvesOnSeek: boolean;
  } | null;
  /**
   * Object allowing to calculate easily the current playback position.
   *
   * It is important to re-compute that object each time a property linked
   * to the rate at which playback happens has changed: `paused`,
   * `playbackRate` etc., as the time is calculated in fine by deducing the
   * amount of playback time that should have elapsed since the last time
   * that object was computed.
   */
  private _lastPosition: {
    /** Position calculated at `timestamp`. */
    position: number;
    /** The monotonically-increasing timestamp at which `position` was calculated. */
    timestamp: number;
  };
  /**
   * The real `HTMLMediaElement.muted` value, as it is set as
   * getter/setter methods here.
   */
  public _muted: boolean;
  /** Capture WHATWG's `pending play promises` concept. */
  private _pendingPlayPromises: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }>;
  /**
   * The real `HTMLMediaElement.playbackRate` value, as it is set as
   * getter/setter methods here.
   */
  private _playbackRate: number;
  /**
   * The real `HTMLMediaElement.src` value, as it is set as getter/setter
   * methods here.
   */
  private _src: string;
  /**
   * The real `HTMLMediaElement.volume` value, as it is set as getter/setter
   * methods here.
   */
  private _volume: number;
  /**
   * If `true`, the `"loaded"` event was already sent for the current content
   * played. This is necessary as this event is supposed to be only sent once
   * per content as per the WHATWG specification.
   */
  private _wasLoadedDataSentForCurrentContent: boolean;
  /**
   * If `true`, the current content was played at least once.
   * `false` if there's no content or if it was always paused.
   */
  private _wasPlayPerformedOnCurrentContent: boolean;

  constructor(opts: IDummyMediaElementOptions = {}) {
    super();

    this.buffered = new TimeRangesWithMetadata();
    this.childNodes = [];
    this.ended = false;
    this.error = null;
    this.isDummy = true;
    this.mediaKeys = null;
    this.nodeName = opts.nodeName ?? "VIDEO";
    this.paused = true;
    this.preload = "auto";
    this.readyState = 0;
    this.seekable = new TimeRangesWithMetadata();
    this.seeking = false;

    this.textTracks = [];

    this._allowedToPlay = opts.allowedToPlay !== false;
    this._attachedMediaSource = null;
    this._autoplay = false;
    this._canAutoPlay = true;
    this._currentContentCanceller = null;
    this._duration = NaN;
    this._eventScheduler = new EventScheduler();
    this._isFreezing = null;
    this._lastPosition = {
      position: 0,
      timestamp: getMonotonicTimeStamp(),
    };
    this._muted = false;
    this._pendingPlayPromises = [];
    this._playbackRate = 1;
    this._src = "";
    this._volume = 1;
    this._wasLoadedDataSentForCurrentContent = false;
    this._wasPlayPerformedOnCurrentContent = false;

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
          mediaKeys.onDummySessionKeyUpdates = () => {
            this._tick();
          };
        }
        resolve(undefined);
        this._tick();
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

  /**
   * `HTMLMediaElement.duration` property getter.
   */
  public get duration(): number {
    // TODO liveSeekableRange etc.

    return this._duration;
  }

  /**
   * `HTMLMediaElement.volume` property getter.
   */
  public get volume(): number {
    return this._volume;
  }

  /**
   * `HTMLMediaElement.volume` property setter.
   */
  public set volume(newVolume: number) {
    this._volume = newVolume;
    this._eventScheduler.schedule(this, "volumechange", null).catch(noop);
  }

  /**
   * `HTMLMediaElement.muted` property getter.
   */
  public get muted(): boolean {
    return this._muted;
  }

  /**
   * `HTMLMediaElement.muted` property setter.
   */
  public set muted(newMuted: boolean) {
    this._muted = newMuted;
    this._eventScheduler.schedule(this, "volumechange", null).catch(noop);
  }

  /**
   * `HTMLMediaElement.autoplay` property getter.
   */
  public get autoplay(): boolean {
    return this._autoplay;
  }

  /**
   * `HTMLMediaElement.autoplay` property setter.
   *
   * A paused content may play if paused while autoplay is set to `true` and
   * if the current content was never played until now.
   * @param {boolean} val - New `autoplay` value.
   */
  public set autoplay(val: boolean) {
    this._autoplay = val;
    if (
      this._currentContentCanceller !== null &&
      this.readyState >= 4 &&
      !this._wasPlayPerformedOnCurrentContent
    ) {
      this._tick();
      this.paused = false;
      this._wasPlayPerformedOnCurrentContent = true;
      this._eventScheduler
        .schedule(this, "play", this._currentContentCanceller.signal)
        .catch(noop);
      this._notifyAboutPlaying();
    }
  }

  /**
   * `HTMLMediaElement.src` property getter.
   */
  public get src(): string {
    return this._src;
  }

  /**
   * `HTMLMediaElement.src` property setter.
   *
   * For now, we assume that on a `DummyMediaElement` it is only useful to play
   * "directfile" contents which we don't support for now.
   * @param {string} val - The new URL
   */
  public set src(val: string) {
    this._src = val;
    this.srcObject = null;
    this._currentContentCanceller?.cancel();
    const canceller = new TaskCanceller();
    this._currentContentCanceller = canceller;
    setTimeout(() => {
      while (this._pendingPlayPromises.length > 0) {
        const error = new Error("A new source was set");
        error.name = "AbortError";
        this._pendingPlayPromises.shift()?.reject(error);
      }
      const err = createMediaError("Failed to open media", 4);
      this.error = err;
      this._eventScheduler.schedule(this, "error", canceller.signal).catch(noop);
    });
  }

  /**
   * An `HTMLMediaElement`'s `addTextTrack` method.
   * Here I did not want to implement that complexity for now as we don't really
   * need it at the time I'm writing this. So it just throws.
   */
  public addTextTrack(): never {
    throw new Error("Not implemented yet");
  }

  /**
   * `HTMLMediaElement.srcObject` property setter,
   *
   * Right now, that the main way to attach a `DummyMediaSource` to a
   * `DummyMediaElement`.
   * @param {Object|null} val - The `DummyMediaSource` wanted or `null` to stop
   * playback.
   */
  public set srcObject(val: MediaProvider | null) {
    // media element load algorithm

    this._currentContentCanceller?.cancel();
    this._wasLoadedDataSentForCurrentContent = false;
    this._wasPlayPerformedOnCurrentContent = false;
    this.buffered = new TimeRangesWithMetadata();
    this.seekable = new TimeRangesWithMetadata();
    this._duration = NaN;
    this.error = null;
    this._canAutoPlay = true;
    this.seeking = false;
    this.readyState = 0;
    this.paused = true;
    this._isFreezing = null;
    this._lastPosition = {
      position: 0,
      timestamp: getMonotonicTimeStamp(),
    };
    this.ended = false;
    this.playbackRate = 1;

    while (this._pendingPlayPromises.length > 0) {
      const error = new Error("A new source was set");
      error.name = "AbortError";
      this._pendingPlayPromises.shift()?.reject(error);
    }

    const prev = this._attachedMediaSource;
    prev?.destroy();
    if (val !== null) {
      if (!(val instanceof DummyMediaSource) && val !== null) {
        this._attachedMediaSource = null;
        throw new Error("A DummyMediaElement can only be linked to a DummyMediaSource");
      }
      this._attachedMediaSource = val;
      this._currentContentCanceller = new TaskCanceller();
      const intervalId = setInterval(() => {
        this._tick();
      }, TICK_INTERVAL);
      this._currentContentCanceller.signal.register(() => {
        clearInterval(intervalId);
      });
      this._attachCurrentMediaSource();
    } else {
      this._attachedMediaSource = null;
    }
  }

  public get srcObject(): MediaProvider | null {
    return this._attachedMediaSource as unknown as MediaProvider;
  }

  /**
   * EME's `HTMLMediaElement.setMediaKeys` method.
   * Here we go through the `FORCED_EME_API` property instead, so that method
   * just throws.
   */
  public setMediaKeys(_mk: IMediaKeys | null): Promise<void> {
    return Promise.reject("EME not implemented on dummy media element.");
  }

  /**
   * `HTMLMediaElement.currentTime` property getter.
   */
  public get currentTime(): number {
    return this._tick();
  }

  /**
   * `HTMLMediaElement.currentTime` property setter.
   */
  public set currentTime(val: number) {
    this._tick();
    const prevPosition = this._lastPosition.position;
    const canceller = this._currentContentCanceller;
    if (canceller === null || this.readyState === 0) {
      return;
    }

    let seekingPos = val;

    this.seeking = true;
    if (this._isFreezing !== null && this._isFreezing.resolvesOnSeek) {
      this._isFreezing = null;
    }
    if (seekingPos > this._duration) {
      seekingPos = this._duration;
    }

    // From the WHATWG spec:
    // If the playback position is not in one of the ranges given in the
    // seekable attribute, then let it be the position in one of the ranges
    // given in the seekable attribute that is the nearest to the new playback
    // position.

    /**
     * Offset to add to `seekingPos` so it is contianed in a seekable range.
     * `null` if no seekable range is found for now.
     */
    let currentBestOffset = null;
    for (let i = 0; i < this.seekable.length; i++) {
      if (seekingPos >= this.seekable.start(i) && seekingPos <= this.seekable.end(i)) {
        currentBestOffset = 0;
        break;
      } else {
        let distance;
        if (seekingPos < this.seekable.start(i)) {
          distance = this.seekable.start(i) - seekingPos;
        } else {
          distance = this.seekable.end(i) - seekingPos;
        }
        if (currentBestOffset === null) {
          currentBestOffset = distance;
        } else if (Math.abs(distance) < Math.abs(currentBestOffset)) {
          currentBestOffset = distance;
        } else {
          // From the WHATWG spec:
          // If two positions both satisfy that constraint (i.e. the new playback
          // position is exactly in the middle between two ranges in the seekable
          // attribute) then use the position that is closest to the current
          // playback position.
          const prevCandidatePosition = currentBestOffset + seekingPos;
          const newCandidatePosition = distance + seekingPos;

          if (
            Math.abs(prevPosition - newCandidatePosition) <
            Math.abs(prevPosition - prevCandidatePosition)
          ) {
            currentBestOffset = distance;
          }
        }
      }
    }

    if (currentBestOffset === null) {
      this.seeking = false;
      return;
    }

    if (currentBestOffset !== 0) {
      seekingPos += currentBestOffset;
    }

    this._lastPosition.position = val;
    this._lastPosition.timestamp = getMonotonicTimeStamp();
    this.seeking = true;
    this._eventScheduler.schedule(this, "seeking", canceller.signal).catch(noop);
    this._tick();
  }

  /**
   * HTMLMediaElement.playbackRate property setter.
   */
  public set playbackRate(val: number) {
    this._tick();
    this._playbackRate = val;
    this._eventScheduler.schedule(this, "ratechange", null).catch(noop);
  }

  /**
   * HTMLMediaElement.playbackRate property getter.
   */
  public get playbackRate(): number {
    return this._playbackRate;
  }

  /**
   * HTMLMediaElement.pause() method.
   */
  public play(): Promise<void> {
    if (!this._allowedToPlay) {
      const error = new Error("Dummy media element cannot play");
      error.name = "NotAllowedError";
      return Promise.reject(error);
    }
    if (this.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      const error = new Error("`play` call on not supported content");
      error.name = "NotSupportedError";
      return Promise.reject(error);
    }

    const promise = new Promise<void>((res: () => void, rej: (err: Error) => void) => {
      this._pendingPlayPromises.push({ resolve: res, reject: rej });
    });

    if (this.ended && this.playbackRate >= 0) {
      this.ended = false;
      this._lastPosition.position =
        this.seekable.length > 0 ? this.seekable.start(0) : this._lastPosition.position;
      this._lastPosition.timestamp = getMonotonicTimeStamp();
    }

    if (this._currentContentCanceller !== null && this.paused) {
      this._tick();
      this.paused = false;
      this._wasPlayPerformedOnCurrentContent = true;

      // run the time marches on steps

      this._eventScheduler
        .schedule(this, "play", this._currentContentCanceller.signal)
        .catch(noop);

      if (this.readyState <= 2) {
        this._eventScheduler
          .schedule(this, "waiting", this._currentContentCanceller.signal)
          .catch(noop);
      } else {
        this._notifyAboutPlaying();
      }
    } else if (this._currentContentCanceller !== null && this.readyState >= 3) {
      // take pending play promises and queue a media element task given the
      // media element to resolve pending play promises with the result.
      while (this._pendingPlayPromises.length > 0) {
        const playPromise = this._pendingPlayPromises.shift();
        playPromise?.resolve();
      }
    }
    this._canAutoPlay = false;
    return promise;
  }

  /**
   * HTMLMediaElement.pause() method.
   */
  public pause(): void {
    this._internalPauseSteps();
  }

  /**
   * An `Element`'s `removeAttribute` method.
   * Here I did not want to implement that complexity for now as we don't really
   * need it at the time I'm writing this beside removing the `"src"` attribute.
   * So I just allow to do that
   * @param {string} attr
   */
  public removeAttribute(attr: "src"): void {
    if (attr === "src") {
      this.src = "";
    } else {
      throw new Error(
        'Removing the attribute + "' +
          String(attr) +
          '" is not yet supported on a `DummyMediaElement`.',
      );
    }
    return;
  }

  /**
   * A `Node`'s `hasChildNodes` method.
   * Here I did not want to implement that complexity for now as we don't really
   * need it at the time I'm writing this. So it just returns false.
   * @returns {boolean}
   */
  public hasChildNodes(): false {
    return false;
  }

  /**
   * A `Node`'s `appendChild` method.
   * Here I did not want to implement that complexity for now as we don't really
   * need it at the time I'm writing this. So it just throws.
   * @param {Node} _child
   */
  public appendChild<T extends Node>(_child: T): void {
    throw new Error("Unimplemented");
  }

  /**
   * A `Node`'s `removeChild` method.
   * Here I did not want to implement that complexity for now as we don't really
   * need it at the time I'm writing this. So it just throws.
   * @param {*} x
   */
  public removeChild(x: unknown): never {
    if (x === null) {
      throw new TypeError("Asked to remove null child");
    }
    const notFoundErr = new Error("DummyMediaElement has no child");
    notFoundErr.name = "NotFoundError";
    throw notFoundErr;
  }

  /**
   * An added method to force a "freezing" occurence: playback will stall, even
   * if there's decodable and decipherable data in the buffer.
   *
   * Playback will stop freezing once you call the `stopFreezing` method.
   * @param {boolean} resolvesOnSeek - If `true` the freeze occurence will
   * disappear once a seek is performed.
   */
  public startFreezing(resolvesOnSeek: boolean) {
    this._tick();
    this._isFreezing = {
      resolvesOnSeek,
    };
  }

  /**
   * Stop "freezing" occurence started with the `startFreezing` method.
   */
  public stopFreezing() {
    this._tick();
    this._isFreezing = null;
  }

  /**
   * Method to call once playback reaches the end of the content.
   * Will send the right events and performs the right steps at that point.
   */
  private _onPlayingEndOfContent(): void {
    if (this._attachedMediaSource?.readyState !== "ended") {
      return;
    }
    if (this.ended) {
      return;
    }

    // TODO: loop attribute?

    const canceller = this._currentContentCanceller;
    if (this.playbackRate < 0 || canceller === null) {
      return;
    }
    this._eventScheduler.schedule(this, "timeupdate", canceller.signal).catch(noop);
    if (!this.paused) {
      this.paused = true;
      this._eventScheduler.schedule(this, "pause", canceller.signal).catch(noop);
    }
    while (this._pendingPlayPromises.length > 0) {
      const error = new Error("The content has ended");
      error.name = "AbortError";
      this._pendingPlayPromises.shift()?.reject(error);
    }
    this.ended = true;
    this._eventScheduler.schedule(this, "ended", canceller.signal).catch(noop);
  }

  /**
   * Method corresponding to the WHATWG's "is eligible for autoplay" logic.
   * @returns {boolean}
   */
  private _isEligibleForAutoplay(): boolean {
    return this._canAutoPlay && this.paused && this.autoplay;
  }

  /**
   * Performs steps on the `_attachedMediaSource` that have to happen on it when
   * it is attached to the `HTMLMediaElement`.
   */
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
        this._tick();
      },

      updateMediaElementDuration: (duration: number) => {
        // TODO check
        this._duration = duration;
        if (this._lastPosition.position > this._duration) {
          this._lastPosition.position = this._duration;
          this._lastPosition.timestamp = getMonotonicTimeStamp();
        }
      },
    });
    dummyMs.readyState = "open";
    dummyMs.eventScheduler.schedule(dummyMs, "sourceopen", null).catch(noop);
  }

  /**
   * Performs the WHATWG "notify about playing" steps.
   */
  private _notifyAboutPlaying(): void {
    this._eventScheduler
      .schedule(this, "playing", this._currentContentCanceller?.signal)
      .catch(noop);
    while (this._pendingPlayPromises.length > 0) {
      const playPromise = this._pendingPlayPromises.shift();
      playPromise?.resolve();
    }
  }

  /**
   * Performs the WHATWG "internal pause steps".
   */
  private _internalPauseSteps(): void {
    // "Set the media element's can autoplay flag to false."
    this._canAutoPlay = false;
    if (!this.paused) {
      this._tick();
      this.paused = true; // "Change the value of paused to true."

      this._eventScheduler
        .schedule(this, "timeupdate", this._currentContentCanceller?.signal)
        .catch(noop);
      this._eventScheduler
        .schedule(this, "pause", this._currentContentCanceller?.signal)
        .catch(noop);

      while (this._pendingPlayPromises.length > 0) {
        const error = new Error("The content was paused");
        error.name = "AbortError";
        this._pendingPlayPromises.shift()?.reject(error);
      }
    }
  }

  /**
   * Method re-checking the current position to see if we should begin
   * rebuffering, ending the content, changing the `readyState` etc.
   *
   * Should be called at regular intervals and everytime one of the property
   * that has an effect on the playback speed (`paused`, `playbackRate` etc.)
   * will change just before it changes (so the `lastPosition` object is
   * updated accordingly).
   *
   * Returns the new calculated `currentTime` property.
   *
   * @returns {number} - The new `currentTime` property.
   */
  private _tick(): number {
    this._updateBufferedRanges();
    const bufferInfo = this._getCurrentBufferHealth();
    if (
      this._attachedMediaSource !== null &&
      this._lastPosition.position >= this._attachedMediaSource.duration
    ) {
      this._lastPosition.position = this._attachedMediaSource.duration;
      this._lastPosition.timestamp = getMonotonicTimeStamp();
      this._updateReadyState({
        isMissingMetadata: bufferInfo.isMissingMetadata,
        isMissingKey: bufferInfo.isMissingKey,
      });
      this._onPlayingEndOfContent();
      return this._lastPosition.position;
    }

    if (bufferInfo.range === null) {
      this._updateReadyState({
        isMissingMetadata: bufferInfo.isMissingMetadata,
        isMissingKey: bufferInfo.isMissingKey,
      });
      this._lastPosition.timestamp = getMonotonicTimeStamp();
      return this._lastPosition.position;
    }

    const playbackSpeed =
      bufferInfo.isMissingKey ||
      bufferInfo.isMissingMetadata ||
      this._isFreezing !== null ||
      this.paused ||
      this.ended ||
      this.readyState < 3 ||
      this.playbackRate <= 0
        ? 0
        : this.playbackRate;
    const now = getMonotonicTimeStamp();
    const elapsedTime = now - this._lastPosition.timestamp;
    let newPosition = this._lastPosition.position + (elapsedTime * playbackSpeed) / 1000;
    if (newPosition > bufferInfo.range.end) {
      newPosition = bufferInfo.range.end;
    }
    this._lastPosition.position = newPosition;
    this._lastPosition.timestamp = now;
    this._updateReadyState({
      isMissingMetadata: bufferInfo.isMissingMetadata,
      isMissingKey: bufferInfo.isMissingKey,
    });
    if (
      this._attachedMediaSource !== null &&
      this._lastPosition.position >= this._attachedMediaSource.duration
    ) {
      this._onPlayingEndOfContent();
    }
    return this._lastPosition.position;
  }

  /**
   * Check if the current `readyState` property is the right one according to
   * the `DummyMediaElement`'s state.
   * If not update it and send the right events.
   * @param {Object} obj
   * @param {boolean} obj.isMissingMetadata - If `true`, at least one active
   * buffer doesn't have enough metadata for the `HAVE_METADATA` `readyState`
   * yet.
   * @param {boolean} obj.isMissingKey - If `true`, at least one active
   * buffer is missing the decryption key for the media at the current
   * position.
   */
  private _updateReadyState({
    isMissingMetadata,
    isMissingKey,
  }: {
    isMissingMetadata: boolean;
    isMissingKey: boolean;
  }): void {
    const canceller = this._currentContentCanceller;
    if (this.readyState === 0) {
      if (canceller === null || isMissingMetadata) {
        return;
      }
      this.readyState = 1;
      this.seekable.insert(0, Infinity, null);
      this._eventScheduler.schedule(this, "loadedmetadata", canceller.signal).catch(noop);
    }

    const currentRange = this.buffered.getRangeFor(this._lastPosition.position);
    if (this.readyState === 1) {
      if (isMissingMetadata) {
        this.readyState = 0;
        return;
      }

      if (
        currentRange === null ||
        isMissingKey ||
        ((this._attachedMediaSource === null ||
          currentRange.end < this._attachedMediaSource.duration) &&
          currentRange.end - this._lastPosition.position <
            MINIMUM_BUFFER_SIZE_FOR_PLAYBACK)
      ) {
        return;
      }

      if (canceller === null) {
        return;
      }
      this.readyState = 3;
      const loadedDataProm = this._wasLoadedDataSentForCurrentContent
        ? Promise.resolve()
        : this._eventScheduler.schedule(this, "loadeddata", canceller.signal);

      this._wasLoadedDataSentForCurrentContent = true;
      loadedDataProm
        .then(() => {
          return this._eventScheduler.schedule(this, "canplay", canceller.signal);
        })
        .then(() => {
          this.readyState = 4;
          if (!this.paused) {
            this._notifyAboutPlaying();
          } else if (this._isEligibleForAutoplay()) {
            this._tick();
            this.paused = false;
            this._wasPlayPerformedOnCurrentContent = true;
            this._eventScheduler.schedule(this, "play", canceller.signal).catch(noop);
            this._notifyAboutPlaying();
          }

          if (this.seeking) {
            this.seeking = false;
            this._eventScheduler
              .schedule(this, "timeupdate", canceller.signal)
              .catch(noop);
            this._eventScheduler.schedule(this, "seeked", canceller.signal).catch(noop);
          }
          return this._eventScheduler.schedule(this, "canplaythrough", canceller.signal);
        })
        .catch(noop);
    } else if (this.readyState > 1) {
      if (isMissingMetadata) {
        this.readyState = 0;
        return;
      }

      if (
        currentRange === null ||
        isMissingKey ||
        ((this._attachedMediaSource === null ||
          this._attachedMediaSource.readyState !== "ended" ||
          currentRange.end < this._attachedMediaSource.duration) &&
          currentRange.end - this._lastPosition.position <
            MINIMUM_BUFFER_SIZE_FOR_PLAYBACK)
      ) {
        if (canceller === null) {
          return;
        }

        this.readyState = 1;
        if (!this.paused && this.error === null) {
          this._eventScheduler
            .schedule(this, "timeupdate", canceller.signal)
            .then(() => this._eventScheduler.schedule(this, "waiting", canceller.signal))
            .catch(noop);
        }
      }

      if (this.seeking) {
        this.seeking = false;
        if (canceller !== null) {
          this._eventScheduler.schedule(this, "timeupdate", canceller.signal).catch(noop);
          this._eventScheduler.schedule(this, "seeked", canceller.signal).catch(noop);
        }
      }
    }
  }

  /**
   * Update `buffered` HTML5 property based on what MSE sourceBuffers have
   * themselves buffered.
   */
  private _updateBufferedRanges(): void {
    if (this._attachedMediaSource === null) {
      this.buffered.remove(0, Infinity);
      return;
    }

    const allBuffered =
      this._attachedMediaSource.sourceBuffers.reduce((acc: IRange[] | null, sb) => {
        if (acc === null) {
          return convertToRanges(sb.buffered);
        }
        if (this._attachedMediaSource?.readyState === "ended") {
          const newRanges = convertToRanges(sb.buffered);
          for (const newRange of newRanges) {
            insertInto(acc, newRange);
          }
          return acc;
        }
        return keepRangeIntersection(acc, convertToRanges(sb.buffered));
      }, null) ?? [];

    this.buffered = new TimeRangesWithMetadata();
    for (const newRange of allBuffered) {
      this.buffered.insert(newRange.start, newRange.end, null);
    }

    if (this.buffered.length > 0) {
      const bufferEnd = this.buffered.end(this.buffered.length - 1);
      if (bufferEnd > this.duration) {
        this._duration = bufferEnd;
      }
    }
  }

  /**
   * Get key information on the media buffers linked to this media element.
   * @returns {Object}
   */
  private _getCurrentBufferHealth(): {
    /** The currently played range in the buffer. */
    range: { start: number; end: number } | null;
    /**
     * If `true`, at least one active buffer doesn't have enough metadata
     * for the `HAVE_METADATA` `readyState` yet.
     */
    isMissingMetadata: boolean;
    /**
     * If `true`, at least one active buffer is missing the decryption key for
     * the media at the current position.
     */
    isMissingKey: boolean;
  } {
    if (this._attachedMediaSource === null) {
      this.buffered.remove(0, Infinity);
      this.readyState = 0;
      return {
        range: null,
        isMissingMetadata: true,
        isMissingKey: false,
      };
    }

    const isMissingMetadata = this._attachedMediaSource.sourceBuffers.some((sb) => {
      return !sb.hasMetadata;
    });
    const isMissingKey = this._attachedMediaSource.sourceBuffers.some((sb) => {
      const metadata = sb.buffered.getMetadataFor(this._lastPosition.position);
      if (metadata === null || metadata.keyIds === null) {
        return false;
      }
      if (this.mediaKeys === null) {
        return true;
      }
      const { dummySessions } = this.mediaKeys;
      return metadata.keyIds.some((k) => {
        return !dummySessions.some((s) => {
          const keyMap = s.keyStatuses.getInnerMap();
          for (const key of keyMap.keys()) {
            if (key === k) {
              const val = keyMap.get(key);
              return val?.status === "usable";
            }
          }
          return false;
        });
      });
    });

    return {
      range: this.buffered.getRangeFor(this._lastPosition.position) ?? null,
      isMissingMetadata,
      isMissingKey,
    };
  }
}

/**
 * Create Object respecting the HTMLs `MediaError` interface with the given code
 * and error message.
 * @param {string} msg
 * @param {number} code
 * @returns {Object}
 */
function createMediaError(msg: string, code: number): MediaError {
  const err = new Error(msg) as {
    message: string;
    name: string;
    code: number;
    MEDIA_ERR_ABORTED: 1;
    MEDIA_ERR_NETWORK: 2;
    MEDIA_ERR_DECODE: 3;
    MEDIA_ERR_SRC_NOT_SUPPORTED: 4;
  };
  err.name = "MediaError";
  err.code = code;
  err.MEDIA_ERR_ABORTED = 1;
  err.MEDIA_ERR_NETWORK = 2;
  err.MEDIA_ERR_DECODE = 3;
  err.MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
  return err;
}
