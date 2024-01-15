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

import isSeekingApproximate from "../../compat/is_seeking_approximate";
import config from "../../config";
import log from "../../log";
import getMonotonicTimeStamp from "../../utils/monotonic_timestamp";
import noop from "../../utils/noop";
import objectAssign from "../../utils/object_assign";
import { getBufferedTimeRange } from "../../utils/ranges";
import SharedReference, {
  IReadOnlySharedReference,
} from "../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../utils/task_canceller";

/**
 * HTMLMediaElement Events for which playback observations are calculated and
 * emitted.
 * @type {Array.<string>}
 */
const SCANNED_MEDIA_ELEMENTS_EVENTS : IPlaybackObserverEventType[] = [ "canplay",
                                                                       "ended",
                                                                       "play",
                                                                       "pause",
                                                                       "seeking",
                                                                       "seeked",
                                                                       "loadedmetadata",
                                                                       "ratechange" ];

/**
 * Class allowing to "observe" current playback conditions so the RxPlayer is
 * then able to react upon them.
 *
 * This is a central class of the RxPlayer as many modules rely on the
 * `PlaybackObserver` to know the current state of the media being played.
 *
 * You can use the PlaybackObserver to either get the last observation
 * performed, get the current media state or listen to media observation sent
 * at a regular interval.
 *
 * @class {PlaybackObserver}
 */
export default class PlaybackObserver {

  /** HTMLMediaElement which we want to observe. */
  private _mediaElement : HTMLMediaElement;

  /** If `true`, a `MediaSource` object is linked to `_mediaElement`. */
  private _withMediaSource : boolean;

  /**
   * If `true`, we're playing in a low-latency mode, which might have an
   * influence on some chosen interval values here.
   */
  private _lowLatencyMode : boolean;

  /**
   * If set, position which could not yet be seeked to as the HTMLMediaElement
   * had a readyState of `0`.
   * This position should be seeked to as soon as the HTMLMediaElement is able
   * to handle it.
   */
  private _pendingSeek : number | null;

  /**
   * The RxPlayer usually wants to differientate when a seek was sourced from
   * the RxPlayer's internal logic vs when it was sourced from an outside
   * application code.
   *
   * To implement this in the PlaybackObserver, we maintain this counter
   * allowing to know when a "seeking" event received from a `HTMLMediaElement`
   * was due to an "internal seek" or an external seek:
   *   - This counter is incremented each time an "internal seek" (seek from the
   *     inside of the RxPlayer has been performed.
   *   - This counter is decremented each time we received a "seeking" event.
   *
   * This allows us to correctly characterize seeking events: if the counter is
   * superior to `0`, it is probably due to an internal "seek".
   */
  private _internalSeeksIncoming : number[];

  /**
   * Stores the last playback observation produced by the `PlaybackObserver`.:
   */
  private _observationRef : SharedReference<IPlaybackObservation>;

  /**
   * `TaskCanceller` allowing to free all resources and stop producing playback
   * observations.
   */
  private _canceller : TaskCanceller;

  /**
   * On some devices (right now only seen on Tizen), seeking through the
   * `currentTime` property can lead to the browser re-seeking once the
   * segments have been loaded to improve seeking performances (for
   * example, by seeking right to an intra video frame).
   * In that case, we risk being in a conflict with that behavior: if for
   * example we encounter a small discontinuity at the position the browser
   * seeks to, we will seek over it, the browser would seek back and so on.
   *
   * This variable allows to store the maximum known position we were seeking to
   * so we can detect when the browser seeked back (to avoid performing another
   * seek after that). When browsers seek back to a position behind a
   * discontinuity, they are usually able to skip them without our help.
   */
  private _expectedSeekingPosition : number | null;

  /**
   * Create a new `PlaybackObserver`, which allows to produce new "playback
   * observations" on various media events and intervals.
   *
   * Note that creating a `PlaybackObserver` lead to the usage of resources,
   * such as event listeners which will only be freed once the `stop` method is
   * called.
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} options
   */
  constructor(mediaElement : HTMLMediaElement, options : IPlaybackObserverOptions) {
    this._internalSeeksIncoming = [];
    this._mediaElement = mediaElement;
    this._withMediaSource = options.withMediaSource;
    this._lowLatencyMode = options.lowLatencyMode;
    this._canceller = new TaskCanceller();
    this._observationRef = this._createSharedReference();
    this._expectedSeekingPosition = null;
    this._pendingSeek = null;

    const onLoadedMetadata = () => {
      if (this._pendingSeek !== null) {
        const positionToSeekTo = this._pendingSeek;
        this._pendingSeek = null;
        this._actuallySetCurrentTime(positionToSeekTo);
      }
    };
    mediaElement.addEventListener("loadedmetadata", onLoadedMetadata);
    this._canceller.signal.register(() => {
      mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata);
    });
  }

  /**
   * Stop the `PlaybackObserver` from emitting playback observations and free all
   * resources reserved to emitting them such as event listeners and intervals.
   *
   * Once `stop` is called, no new playback observation will ever be emitted.
   *
   * Note that it is important to call stop once the `PlaybackObserver` is no
   * more needed to avoid unnecessarily leaking resources.
   */
  public stop() {
    this._canceller.cancel();
  }

  /**
   * Returns the current position advertised by the `HTMLMediaElement`, in
   * seconds.
   * @returns {number}
   */
  public getCurrentTime() : number {
    return this._mediaElement.currentTime;
  }

  /**
   * Returns the current playback rate advertised by the `HTMLMediaElement`.
   * @returns {number}
   */
  public getPlaybackRate() : number {
    return this._mediaElement.playbackRate;
  }

  /**
   * Returns the current `paused` status advertised by the `HTMLMediaElement`.
   *
   * Use this instead of the same status emitted on an observation when you want
   * to be sure you're using the current value.
   * @returns {boolean}
   */
  public getIsPaused() : boolean {
    return this._mediaElement.paused;
  }

  /**
   * Update the current position (seek) on the `HTMLMediaElement`, by giving a
   * new position in seconds.
   *
   * Note that seeks performed through this method are caracherized as
   * "internal" seeks. They don't result into the exact same playback
   * observation than regular seeks (which most likely comes from the outside,
   * e.g. the user).
   * @param {number} time
   */
  public setCurrentTime(time: number) : void {
    if (this._mediaElement.readyState >= 1) {
      this._actuallySetCurrentTime(time);
    } else {
      this._internalSeeksIncoming = [];
      this._pendingSeek = time;
      this._generateObservationForEvent("manual");
    }
  }

  /**
   * Update the playback rate of the `HTMLMediaElement`.
   * @param {number} playbackRate
   */
  public setPlaybackRate(playbackRate: number) : void {
    this._mediaElement.playbackRate = playbackRate;
  }

  /**
   * Returns the current `readyState` advertised by the `HTMLMediaElement`.
   * @returns {number}
   */
  public getReadyState() : number {
    return this._mediaElement.readyState;
  }

  /**
   * Returns an `IReadOnlySharedReference` storing the last playback observation
   * produced by the `PlaybackObserver` and updated each time a new one is
   * produced.
   *
   * This value can then be for example listened to to be notified of future
   * playback observations.
   *
   * @returns {Object}
   */
  public getReference() : IReadOnlySharedReference<IPlaybackObservation> {
    return this._observationRef;
  }

  /**
   * Register a callback so it regularly receives playback observations.
   * @param {Function} cb
   * @param {Object} options - Configuration options:
   *   - `includeLastObservation`: If set to `true` the last observation will
   *     be first emitted synchronously.
   *   - `clearSignal`: If set, the callback will be unregistered when this
   *     CancellationSignal emits.
   */
  public listen(
    cb : (
      observation : IPlaybackObservation,
      stopListening : () => void
    ) => void,
    options? : { includeLastObservation? : boolean | undefined;
                 clearSignal? : CancellationSignal | undefined; }
  ) {
    if (this._canceller.isUsed() || options?.clearSignal?.isCancelled() === true) {
      return noop;
    }
    this._observationRef.onUpdate(cb, {
      clearSignal: options?.clearSignal,
      emitCurrentValue: options?.includeLastObservation,
    });
  }

  /**
   * Generate a new playback observer which can listen to other
   * properties and which can only be accessed to read observations (e.g.
   * it cannot ask to perform a seek).
   *
   * The object returned will respect the `IReadOnlyPlaybackObserver` interface
   * and will inherit this `PlaybackObserver`'s lifecycle: it will emit when
   * the latter emits.
   *
   * As argument, this method takes a function which will allow to produce
   * the new set of properties to be present on each observation.
   * @param {Function} transform
   * @returns {Object}
   */
  public deriveReadOnlyObserver<TDest>(
    transform : (
      observationRef : IReadOnlySharedReference<IPlaybackObservation>,
      cancellationSignal : CancellationSignal
    ) => IReadOnlySharedReference<TDest>
  ) : IReadOnlyPlaybackObserver<TDest> {
    return generateReadOnlyObserver(this, transform, this._canceller.signal);
  }

  private _actuallySetCurrentTime(time: number) : void {
    log.info("API: Seeking internally", time);
    this._internalSeeksIncoming.push(time);
    this._mediaElement.currentTime = time;
  }

  /**
   * Creates the `IReadOnlySharedReference` that will generate playback
   * observations.
   * @returns {Object}
   */
  private _createSharedReference() : SharedReference<IPlaybackObservation> {
    if (this._observationRef !== undefined) {
      return this._observationRef;
    }

    const { SAMPLING_INTERVAL_MEDIASOURCE,
            SAMPLING_INTERVAL_LOW_LATENCY,
            SAMPLING_INTERVAL_NO_MEDIASOURCE } = config.getCurrent();
    const returnedSharedReference = new SharedReference(
      this._getCurrentObservation("init"),
      this._canceller.signal
    );
    const interval = this._lowLatencyMode  ? SAMPLING_INTERVAL_LOW_LATENCY :
                     this._withMediaSource ? SAMPLING_INTERVAL_MEDIASOURCE :
                                             SAMPLING_INTERVAL_NO_MEDIASOURCE;
    const onInterval = () => {
      this._generateObservationForEvent("timeupdate");
    };
    let intervalId = setInterval(onInterval, interval);
    const removeEventListeners = SCANNED_MEDIA_ELEMENTS_EVENTS.map((eventName) => {
      const onMediaEvent = () => {
        restartInterval();
        this._generateObservationForEvent(eventName);
      };
      this._mediaElement.addEventListener(eventName, onMediaEvent);
      return () => {
        this._mediaElement.removeEventListener(eventName, onMediaEvent);
      };
    });
    this._canceller.signal.register(() => {
      clearInterval(intervalId);
      removeEventListeners.forEach(cb => cb());
      returnedSharedReference.finish();
    });
    return returnedSharedReference;


    function restartInterval() {
      clearInterval(intervalId);
      intervalId = setInterval(onInterval, interval);
    }
  }

  private _getCurrentObservation(
    event : IPlaybackObserverEventType
  ) : IPlaybackObservation {
    /** Actual event emitted through an observation. */
    let tmpEvt: IPlaybackObserverEventType = event;

    // NOTE: `this._observationRef` may be `undefined` because we might here be
    // called in the constructor when that property is not yet set.
    const previousObservation = this._observationRef === undefined ?
      getInitialObservation(this._mediaElement) :
      this._observationRef.getValue();

    /**
     * If `true`, there is a seek operation ongoing but it was done from the
     * `PlaybackObserver`'s `setCurrentTime` method, not from external code.
     */
    let isInternalSeeking = false;

    /** If set, the position for which we plan to seek to as soon as possible. */
    let pendingPosition: number | null = this._pendingSeek;

    /** Initially-polled playback observation, before adjustments. */
    const mediaTimings = getMediaInfos(this._mediaElement);
    const { buffered, readyState, position, seeking } = mediaTimings;
    if (tmpEvt === "seeking") {
      // We just began seeking.
      // Let's find out if the seek is internal or external and handle approximate
      // seeking
      if (this._internalSeeksIncoming.length > 0) {
        isInternalSeeking = true;
        tmpEvt = "internal-seeking";
        const startedInternalSeekTime = this._internalSeeksIncoming.shift();
        this._expectedSeekingPosition = isSeekingApproximate ?
          Math.max(position, startedInternalSeekTime ?? 0) :
          position;
      } else {
        this._expectedSeekingPosition = position;
      }
    } else if (seeking) {
      // we're still seeking, this time without a "seeking" event so it's an
      // already handled one, keep track of the last wanted position we wanted
      // to seek to, to work-around devices re-seeking silently.
      this._expectedSeekingPosition = Math.max(position,
                                               this._expectedSeekingPosition ?? 0);
    } else if (isSeekingApproximate &&
               this._expectedSeekingPosition !== null &&
                 position < this._expectedSeekingPosition)
    {
      // We're on a target with aproximate seeking, we're not seeking anymore, but
      // we're not yet at the expected seeking position.
      // Signal to the rest of the application that the intented position is not
      // the current position but the one contained in `this._expectedSeekingPosition`
      pendingPosition = this._expectedSeekingPosition;
    } else {
      this._expectedSeekingPosition = null;
    }

    if (seeking &&
        previousObservation.seeking === SeekingState.Internal &&
        event !== "seeking")
    {
      isInternalSeeking = true;
    }

    // NOTE: Devices which decide to not exactly seek where we want to seek
    // (e.g. to start on an intra video frame instead) bother us when it
    // comes to defining rebuffering and freezing statuses, because we might
    // for example believe that we're rebuffering whereas it's just that the
    // device decided to bring us just before the buffered data.
    //
    // After many major issues on those devices (namely Tizen), we decided to
    // just consider the position WE wanted to seek to as the real current
    // position for buffer-starvation related metrics like the current range,
    // the bufferGap, the rebuffering status, the freezing status...
    //
    // This specificity should only apply to those devices, other devices rely
    // on the actual current position.
    const basePosition = this._expectedSeekingPosition ?? position;
    let currentRange;
    let bufferGap;
    if (!this._withMediaSource && buffered.length === 0 && readyState >= 3) {
      // Sometimes `buffered` stay empty for directfile contents yet we are able
      // to play. This seems to be linked to browser-side issues but has been
      // encountered on enough platforms (Chrome desktop and PlayStation 4's
      // WebKit for us to do something about it in the player.
      currentRange = undefined;
      bufferGap = undefined;
    } else {
      currentRange = getBufferedTimeRange(buffered, basePosition);
      bufferGap = currentRange !== null ? currentRange.end - basePosition :
                                          // TODO null/0 would probably be
                                          // more appropriate
                                          Infinity;
    }

    const rebufferingStatus = getRebufferingStatus({
      previousObservation,
      currentObservation: mediaTimings,
      basePosition,
      observationEvent: tmpEvt,
      lowLatencyMode: this._lowLatencyMode,
      withMediaSource: this._withMediaSource,
      bufferGap,
      currentRange,
    });

    const freezingStatus = getFreezingStatus(previousObservation,
                                             mediaTimings,
                                             tmpEvt,
                                             bufferGap);

    const seekingState = isInternalSeeking    ? SeekingState.Internal :
                         seeking              ? SeekingState.External :
                                                SeekingState.None;
    const timings: IPlaybackObservation = objectAssign(
      {},
      mediaTimings,
      { position: new ObservationPosition(mediaTimings.position, pendingPosition),
        event: tmpEvt,
        seeking: seekingState,
        rebuffering: rebufferingStatus,
        freezing: freezingStatus });
    if (log.hasLevel("DEBUG")) {
      log.debug("API: current media element state tick",
                "event", timings.event,
                "position", timings.position.getPolled(),
                "seeking", timings.seeking,
                "internalSeek", isInternalSeeking,
                "rebuffering", timings.rebuffering !== null,
                "freezing", timings.freezing !== null,
                "ended", timings.ended,
                "paused", timings.paused,
                "playbackRate", timings.playbackRate,
                "readyState", timings.readyState,
                "pendingPosition", pendingPosition);
    }
    return timings;
  }

  private _generateObservationForEvent(event : IPlaybackObserverEventType): void {
    const newObservation = this._getCurrentObservation(event);
    if (log.hasLevel("DEBUG")) {
      log.debug("API: current playback timeline:\n" +
                prettyPrintBuffered(newObservation.buffered,
                                    newObservation.position.getPolled()),
                `\n${event}`);
    }
    this._observationRef.setValue(newObservation);
  }
}

/** "Event" that triggered the playback observation. */
export type IPlaybackObserverEventType =
  /** First playback observation automatically emitted. */
  "init" |
  /** Observation manually forced by the PlaybackObserver. */
  "manual" |
  /** Regularly emitted playback observation when no event happened in a long time. */
  "timeupdate" |
  /** On the HTML5 event with the same name */
  "canplay" |
  /** On the HTML5 event with the same name */
  "ended" |
  /** On the HTML5 event with the same name */
  "canplaythrough" | // HTML5 Event
  /** On the HTML5 event with the same name */
  "play" |
  /** On the HTML5 event with the same name */
  "pause" |
  /** On the HTML5 event with the same name */
  "seeking" |
  /** On the HTML5 event with the same name */
  "seeked" |
  /** On the HTML5 event with the same name */
  "stalled" |
  /** On the HTML5 event with the same name */
  "loadedmetadata" |
  /** On the HTML5 event with the same name */
  "ratechange" |
  /** An internal seek happens */
  "internal-seeking";

/** Information recuperated on the media element on each playback observation. */
interface IMediaInfos {
  /** Value of `buffered` (buffered ranges) for the media element. */
  buffered : TimeRanges;
  /**
   * `currentTime` (position) set on the media element at the time of the
   * PlaybackObserver's measure.
   */
  position : number;
  /** Current `duration` set on the media element. */
  duration : number;
  /** Current `ended` set on the media element. */
  ended: boolean;
  /** Current `paused` set on the media element. */
  paused : boolean;
  /** Current `playbackRate` set on the media element. */
  playbackRate : number;
  /** Current `readyState` value on the media element. */
  readyState : number;
  /** Current `seeking` value on the mediaElement. */
  seeking : boolean;
}

/** Categorize a pending seek operation. */
export const enum SeekingState {
  /** We're not currently seeking. */
  None,
  /**
   * We're currently seeking due to an internal logic of the RxPlayer (e.g.
   * discontinuity skipping).
   */
  Internal,
  /** We're currently seeking due to a regular seek wanted by the application. */
  External,
}

/**
 * Describes when the player is "rebuffering" and what event started that
 * status.
 * "Rebuffering" is a status where the player has not enough buffer ahead to
 * play reliably.
 * The RxPlayer should pause playback when a playback observation indicates the
 * rebuffering status.
 */
export interface IRebufferingStatus {
  /** What started the player to rebuffer. */
  reason : "seeking" | // Building buffer after seeking
           "not-ready" | // Building buffer after low readyState
           "buffering"; // Other cases
  /**
   * Monotonically-raising timestamp at the time the rebuffering happened on the
   * main thread.
   */
  timestamp : number;
  /**
   * Position, in seconds, at which data is awaited.
   * If `null` the player is rebuffering but not because it is awaiting future data.
   * If `undefined`, that position is unknown.
   */
  position : number | null | undefined;
}

/**
 * Describes when the player is "frozen".
 * This status is reserved for when the player is stuck at the same position for
 * an unknown reason.
 */
export interface IFreezingStatus {
  /**
   * Monotonically-raising timestamp at the time the freezing started to be
   * detected.
   */
  timestamp : number;
}

/** Information emitted on each playback observation. */
export interface IPlaybackObservation extends Omit<IMediaInfos, "position" | "seeking"> {
   /** Event that triggered this playback observation. */
  event : IPlaybackObserverEventType;
  /** Current seeking state. */
  seeking : SeekingState;
  /**
   * Information on the current position being played, the position for which
   * media is wanted etc.
   */
  position : IObservationPosition;
  /**
   * Set if the player is short on audio and/or video media data and is a such,
   * rebuffering.
   * `null` if not.
   */
  rebuffering : IRebufferingStatus | null;
  /**
   * Set if the player is frozen, that is, stuck in place for unknown reason.
   * Note that this reason can be a valid one, such as a necessary license not
   * being obtained yet.
   *
   * `null` if the player is not frozen.
   */
  freezing : IFreezingStatus | null;
  /**
   * Gap between `currentTime` and the next position with un-buffered data.
   * `Infinity` if we don't have buffered data right now.
   * `undefined` if we cannot determine the buffer gap.
   */
  bufferGap : number | undefined;
  /**
   * The buffered range we are currently playing.
   * `null` if no range is currently available.
   * `undefined` if we cannot tell which range is currently available.
   */
  currentRange : { start : number;
                   end : number; } |
                 null |
                 undefined;
}

export type IObservationPosition = ObservationPosition;

export class ObservationPosition {
  /**
   * Known position at the time the Observation was emitted, in seconds.
   *
   * Note that it might have changed since. If you want truly precize
   * information, you should recuperate it from the HTMLMediaElement directly
   * through another mean.
   */
  private _last: number;
  /**
   * Actually wanted position in seconds that is not yet reached.
   *
   * This might for example be set to the initial position when the content is
   * loading (and thus potentially at a `0` position) but which will be seeked
   * to a given position once possible. It may also be the position of a seek
   * that has not been properly accounted for by the current device.
   */
  private _wanted: number | null;
  constructor(last: number, wanted: number | null) {
    this._last = last;
    this._wanted = wanted;
  }

  /**
   * Obtain arguments allowing to instanciate the same ObservationPosition.
   *
   * This can be used to create a new `ObservationPosition` across JS realms,
   * generally to communicate its data between the main thread and a WebWorker.
   * @returns {Array.<number>}
   */
  public serialize(): [number, number | null] {
    return [this._last, this._wanted];
  }

  /**
   * Returns the playback position actually observed on the media element at
   * the time the playback observation was made.
   *
   * Note that it may be different than the position for which media data is
   * wanted in rare scenarios where the goal position is not yet set on the
   * media element.
   *
   * You should use this value when you want to obtain the actual position set
   * on the media element for browser compatibility purposes. Note that this
   * position was calculated at observation time, it might thus not be
   * up-to-date if what you want is milliseconds-accuracy.
   *
   * If what you want is the actual position which the player is intended to
   * play, you should rely on `getWanted` instead`.
   * @returns {number}
   */
  public getPolled(): number {
    return this._last;
  }

  /**
   * Returns the position which the player should consider to load media data
   * at the time the observation was made.
   *
   * It can be different than the value returned by `getPolled` in rare
   * scenarios:
   *
   *   - When the initial position has not been set yet.
   *
   *   - When the current device do not let the RxPlayer peform precize seeks,
   *     usually for perfomance reasons by seeking to a previous IDR frame
   *     instead (for now only Tizen may be like this), in which case we
   *     prefer to generally rely on the position wanted by the player (this
   *     e.g. prevents issues where the RxPlayer logic and the device are
   *     seeking back and forth in a loop).
   *
   *   - When a wanted position has been "forced" (@see forceWantedPosition).
   * @returns {number}
   */
  public getWanted(): number {
    return this._wanted ?? this._last;
  }

  /**
   * Method to call if you want to overwrite the currently wanted position.
   * @param {number} pos
   */
  public forceWantedPosition(pos: number): void {
    this._wanted = pos;
  }

  /**
   * Returns `true` when the position wanted returned by `getWanted` and the
   * actual position returned by `getPolled` may be different, meaning that
   * we're currently not at the position we want to reach.
   *
   * This is a relatively rare situation which only happens when either the
   * initial seek has not yet been performed. on specific targets where the
   * seeking behavior is a little broken (@see getWanted) or when the wanted
   * position has been forced (@see forceWantedPosition).
   *
   * In those situations, you might temporarily refrain from acting upon the
   * actual current media position, as it may change soon.
   *
   * @returns {boolean}
   */
  public isAwaitingFuturePosition(): boolean {
    return this._wanted !== null;
  }
}

/**
 * Interface providing a generic and read-only version of a `PlaybackObserver`.
 *
 * This interface allows to provide regular and specific playback information
 * without allowing any effect on playback like seeking.
 *
 * This can be very useful to give specific playback information to modules you
 * don't want to be able to update playback.
 *
 * Note that a `PlaybackObserver` is compatible and can thus be upcasted to a
 * `IReadOnlyPlaybackObserver` to "remove" its right to update playback.
 */
export interface IReadOnlyPlaybackObserver<TObservationType> {
  /**
   * Get the current playing position, in seconds.
   * Returns `undefined` when this cannot be known, such as when the playback
   * observer is running in a WebWorker.
   * @returns {number|undefined}
   */
  getCurrentTime() : number | undefined;
  /**
   * Returns the current playback rate advertised by the `HTMLMediaElement`.
   * Returns `undefined` when this cannot be known, such as when the playback
   * observer is running in a WebWorker.
   * @returns {number|undefined}
   */
  getPlaybackRate() : number | undefined;
  /**
   * Get the HTMLMediaElement's current `readyState`.
   * Returns `undefined` when this cannot be known, such as when the playback
   * observer is running in a WebWorker.
   * @returns {number|undefined}
   */
  getReadyState() : number | undefined;
  /**
   * Returns the current `paused` status advertised by the `HTMLMediaElement`.
   *
   * Use this instead of the same status emitted on an observation when you want
   * to be sure you're using the current value.
   *
   * Returns `undefined` when this cannot be known, such as when the playback
   * observer is running in a WebWorker.
   * @returns {boolean|undefined}
   */
  getIsPaused() : boolean | undefined;
  /**
   * Returns an `IReadOnlySharedReference` storing the last playback observation
   * produced by the `IReadOnlyPlaybackObserver` and updated each time a new one
   * is produced.
   *
   * This value can then be for example listened to to be notified of future
   * playback observations.
   *
   * @returns {Object}
   */
  getReference() : IReadOnlySharedReference<TObservationType>;
  /**
   * Register a callback so it regularly receives playback observations.
   * @param {Function} cb
   * @param {Object} options - Configuration options:
   *   - `includeLastObservation`: If set to `true` the last observation will
   *     be first emitted synchronously.
   *   - `clearSignal`: If set, the callback will be unregistered when this
   *     CancellationSignal emits.
   * @returns {Function} - Allows to easily unregister the callback
   */
  listen(
    cb : (
      observation : TObservationType,
      stopListening : () => void
    ) => void,
    options? : { includeLastObservation? : boolean | undefined;
                 clearSignal? : CancellationSignal | undefined; }
  ) : void;
  /**
   * Generate a new `IReadOnlyPlaybackObserver` from this one.
   *
   * As argument, this method takes a function which will allow to produce
   * the new set of properties to be present on each observation.
   * @param {Function} transform
   * @returns {Object}
   */
  deriveReadOnlyObserver<TDest>(
    transform : (
      observationRef : IReadOnlySharedReference<TObservationType>,
      cancellationSignal : CancellationSignal
    ) => IReadOnlySharedReference<TDest>
  ) : IReadOnlyPlaybackObserver<TDest>;
}

/**
 * Returns the amount of time in seconds the buffer should have ahead of the
 * current position before resuming playback. Based on the infos of the
 * rebuffering status.
 *
 * Waiting time differs between a rebuffering happening after a "seek" or one
 * happening after a buffer starvation occured.
 * @param {Object|null} rebufferingStatus
 * @param {Boolean} lowLatencyMode
 * @returns {Number}
 */
function getRebufferingEndGap(
  rebufferingStatus : IRebufferingStatus,
  lowLatencyMode : boolean
) : number {
  if (rebufferingStatus === null) {
    return 0;
  }
  const suffix : "LOW_LATENCY" | "DEFAULT" = lowLatencyMode ? "LOW_LATENCY" :
                                                              "DEFAULT";
  const { RESUME_GAP_AFTER_SEEKING,
          RESUME_GAP_AFTER_NOT_ENOUGH_DATA,
          RESUME_GAP_AFTER_BUFFERING } = config.getCurrent();

  switch (rebufferingStatus.reason) {
    case "seeking":
      return RESUME_GAP_AFTER_SEEKING[suffix];
    case "not-ready":
      return RESUME_GAP_AFTER_NOT_ENOUGH_DATA[suffix];
    case "buffering":
      return RESUME_GAP_AFTER_BUFFERING[suffix];
  }
}

/**
 * @param {Object} currentRange
 * @param {Number} duration
 * @param {Boolean} lowLatencyMode
 * @returns {Boolean}
 */
function hasLoadedUntilTheEnd(
  currentTime : number,
  currentRange : { start : number; end : number } | null | undefined,
  ended : boolean,
  duration : number,
  lowLatencyMode : boolean
) : boolean {
  const { REBUFFERING_GAP } = config.getCurrent();
  const suffix : "LOW_LATENCY" | "DEFAULT" = lowLatencyMode ? "LOW_LATENCY" :
                                                              "DEFAULT";
  if (currentRange === undefined) {
    return ended && Math.abs(duration - currentTime) <= REBUFFERING_GAP[suffix];
  }
  return currentRange !== null &&
         (duration - currentRange.end) <= REBUFFERING_GAP[suffix];
}

/**
 * Get basic playback information.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Object}
 */
function getMediaInfos(mediaElement : HTMLMediaElement) : IMediaInfos {
  const { buffered,
          currentTime,
          duration,
          ended,
          paused,
          playbackRate,
          readyState,
          seeking } = mediaElement;
  return { buffered,
           position: currentTime,
           duration,
           ended,
           paused,
           playbackRate,
           readyState,
           seeking };
}

/**
 * Infer the rebuffering status.
 * @param {Object} options
 * @returns {Object|null}
 */
function getRebufferingStatus({
  previousObservation,
  currentObservation,
  basePosition,
  observationEvent,
  withMediaSource,
  lowLatencyMode,
  bufferGap,
  currentRange,
} : {
  /** Previous Playback Observation produced. */
  previousObservation : IPlaybackObservation;
  /** New media information collected. */
  currentObservation : IMediaInfos;
  /**
   * Position we should consider as the position we're currently playing.
   * Might be different than the `position` advertised by `currentObservation`
   * in cases where the device just decides to seek back a little without
   * authorization.
   */
  basePosition : number;
  /** Name of the event that triggers this new observation. */
  observationEvent : IPlaybackObserverEventType;
  /**
   * If `true`, we're relying on MSE API for the current content, if `false`,
   * we're relying on regular HTML5 video playback handled by the browser.
   */
  withMediaSource : boolean;
  /** If `true`, we're playing the current content in low-latency mode. */
  lowLatencyMode : boolean;
  /**
   * Amount of media data we've ahead in the current buffered range of media
   * buffer.
   *
   * `Infinity` if we've no data.
   * `undefined` if we cannot determine this due to a browser issue.
   */
  bufferGap: number | undefined;
  /**
   * Range of buffered data where the current position is (`basePosition`).
   *
   * `null` if we've no buffered data at the current position.
   * `undefined` if we cannot determine this due to a browser issue.
   */
  currentRange: { start : number; end : number } | null | undefined;
}) : IRebufferingStatus | null {

  const { REBUFFERING_GAP } = config.getCurrent();
  const { position: currentTime,
          duration,
          paused,
          readyState,
          ended } = currentObservation;

  const { rebuffering: prevRebuffering,
          event: prevEvt,
          position: prevTime } = previousObservation;

  const fullyLoaded = hasLoadedUntilTheEnd(basePosition,
                                           currentRange,
                                           ended,
                                           duration,
                                           lowLatencyMode);

  const canSwitchToRebuffering = (readyState >= 1 &&
                                  observationEvent !== "loadedmetadata" &&
                                  prevRebuffering === null &&
                                  !(fullyLoaded || ended));

  let rebufferEndPosition : number | null | undefined = null;
  let shouldRebuffer : boolean | undefined;
  let shouldStopRebuffer : boolean | undefined;

  const rebufferGap = lowLatencyMode ? REBUFFERING_GAP.LOW_LATENCY :
                                       REBUFFERING_GAP.DEFAULT;

  if (withMediaSource) {
    if (canSwitchToRebuffering) {
      if (bufferGap === Infinity) {
        shouldRebuffer = true;
        rebufferEndPosition = basePosition;
      } else if (bufferGap === undefined) {
        if (readyState < 3) {
          shouldRebuffer = true;
          rebufferEndPosition = undefined;
        }
      } else if (bufferGap <= rebufferGap) {
        shouldRebuffer = true;
        rebufferEndPosition = basePosition + bufferGap;
      }
    } else if (prevRebuffering !== null) {
      const resumeGap = getRebufferingEndGap(prevRebuffering, lowLatencyMode);
      if (shouldRebuffer !== true && prevRebuffering !== null && readyState > 1 &&
          (fullyLoaded || ended ||
            (bufferGap !== undefined && isFinite(bufferGap) && bufferGap > resumeGap)) ||
            (bufferGap === undefined && readyState >= 3))
      {
        shouldStopRebuffer = true;
      } else if (bufferGap === undefined) {
        rebufferEndPosition = undefined;
      } else if (bufferGap === Infinity) {
        rebufferEndPosition = basePosition;
      } else if (bufferGap <= resumeGap) {
        rebufferEndPosition = basePosition + bufferGap;
      }
    }
  }

  // when using a direct file, the media will stall and unstall on its
  // own, so we only try to detect when the media timestamp has not changed
  // between two consecutive timeupdates
  else {
    if (canSwitchToRebuffering &&
        (
          (
            // TODO what about when paused: e.g. when loading initially the content
            !paused &&
            observationEvent === "timeupdate" && prevEvt === "timeupdate" &&
            currentTime === prevTime.getPolled()
          ) ||
          (
            observationEvent === "seeking" && (
              bufferGap === Infinity || (bufferGap === undefined && readyState < 3)
            )
          )
        )
    ) {
      shouldRebuffer = true;
    } else if (
      prevRebuffering !== null &&
      (
        (observationEvent !== "seeking" && currentTime !== prevTime.getPolled()) ||
        observationEvent === "canplay" ||
        (bufferGap === undefined && readyState >= 3) ||
        (
          bufferGap !== undefined && bufferGap < Infinity &&
          (
            bufferGap > getRebufferingEndGap(prevRebuffering, lowLatencyMode) ||
            fullyLoaded || ended
          )
        )
      )
    ) {
      shouldStopRebuffer = true;
    }
  }

  if (shouldStopRebuffer === true) {
    return null;
  } else if (shouldRebuffer === true || prevRebuffering !== null) {
    let reason : "seeking" | "not-ready" | "buffering" | "internal-seek";
    if (observationEvent === "seeking" ||
        prevRebuffering !== null && prevRebuffering.reason === "seeking") {
      reason = "seeking";
    } else if (currentObservation.seeking) {
      reason = "seeking";
    } else if (readyState === 1) {
      reason = "not-ready";
    } else {
      reason = "buffering";
    }
    if (prevRebuffering !== null && prevRebuffering.reason === reason) {
      return { reason: prevRebuffering.reason,
               timestamp: prevRebuffering.timestamp,
               position: rebufferEndPosition };
    }
    return { reason,
             timestamp: getMonotonicTimeStamp(),
             position: rebufferEndPosition };
  }
  return null;
}

/**
 * Detect if the current media can be considered as "freezing" (i.e. not
 * advancing for unknown reasons).
 *
 * Returns a corresponding `IFreezingStatus` object if that's the case and
 * `null` if not.
 * @param {Object} prevObservation
 * @param {Object} currentInfo
 * @param {string} currentEvt
 * @param {number|undefined} bufferGap
 * @returns {Object|null}
 */
function getFreezingStatus(
  prevObservation : IPlaybackObservation,
  currentInfo : IMediaInfos,
  currentEvt : IPlaybackObserverEventType,
  bufferGap : number | undefined
) : IFreezingStatus | null {
  const { MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING } = config.getCurrent();
  if (prevObservation.freezing) {
    if (currentInfo.ended ||
        currentInfo.paused ||
        currentInfo.readyState === 0 ||
        currentInfo.playbackRate === 0 ||
        prevObservation.position.getPolled() !== currentInfo.position)
    {
      return null; // Quit freezing status
    }
    return prevObservation.freezing; // Stay in it
  }

  return currentEvt === "timeupdate" &&
         bufferGap !== undefined &&
         bufferGap > MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING &&
         !currentInfo.ended &&
         !currentInfo.paused &&
         currentInfo.readyState >= 1 &&
         currentInfo.playbackRate !== 0 &&
         currentInfo.position === prevObservation.position.getPolled() ?
           { timestamp: getMonotonicTimeStamp() } :
           null;
}

export interface IPlaybackObserverOptions {
  withMediaSource : boolean;
  lowLatencyMode : boolean;
}

/**
 * Pretty print a TimeRanges Object, to see the current content of it in a
 * one-liner string.
 *
 * @example
 * This function is called by giving it directly the TimeRanges, such as:
 * ```js
 * prettyPrintBuffered(document.getElementsByTagName("video")[0].buffered);
 * ```
 *
 * Let's consider this possible return:
 *
 * ```
 * 0.00|==29.95==|29.95 ~30.05~ 60.00|==29.86==|89.86
 *          ^14
 * ```
 * This means that our video element has 29.95 seconds of buffer between 0 and
 * 29.95 seconds.
 * Then 30.05 seconds where no buffer is found.
 * Then 29.86 seconds of buffer between 60.00 and 89.86 seconds.
 *
 * A caret on the second line indicates the current time we're at.
 * The number coming after it is the current time.
 * @param {TimeRanges} buffered
 * @param {number} currentTime
 * @returns {string}
 */
function prettyPrintBuffered(
  buffered : TimeRanges,
  currentTime : number
) : string {
  let str = "";
  let currentTimeStr = "";

  for (let i = 0; i < buffered.length; i++) {
    const start = buffered.start(i);
    const end = buffered.end(i);
    const fixedStart = start.toFixed(2);
    const fixedEnd = end.toFixed(2);
    const fixedDuration = (end - start).toFixed(2);
    const newIntervalStr = `${fixedStart}|==${fixedDuration}==|${fixedEnd}`;
    str += newIntervalStr;
    if (currentTimeStr.length === 0 && end > currentTime) {
      const padBefore = str.length - Math.floor(newIntervalStr.length / 2);
      currentTimeStr = " ".repeat(padBefore) + `^${currentTime}`;
    }
    if (i < buffered.length - 1) {
      const nextStart = buffered.start(i + 1);
      const fixedDiff = (nextStart - end).toFixed(2);
      const holeStr = ` ~${fixedDiff}~ `;
      str += holeStr;
      if (currentTimeStr.length === 0 && currentTime < nextStart) {
        const padBefore = str.length - Math.floor(holeStr.length / 2);
        currentTimeStr = " ".repeat(padBefore) + `^${currentTime}`;
      }
    }
  }
  if (currentTimeStr.length === 0) {
    currentTimeStr = " ".repeat(str.length) + `^${currentTime}`;
  }
  return str + "\n" + currentTimeStr;
}

/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export function generateReadOnlyObserver<TSource, TDest>(
  src : IReadOnlyPlaybackObserver<TSource>,
  transform : (
    observationRef : IReadOnlySharedReference<TSource>,
    cancellationSignal : CancellationSignal
  ) => IReadOnlySharedReference<TDest>,
  cancellationSignal : CancellationSignal
) : IReadOnlyPlaybackObserver<TDest> {
  const mappedRef = transform(src.getReference(), cancellationSignal);
  return {
    getCurrentTime() {
      return src.getCurrentTime();
    },
    getReadyState() {
      return src.getReadyState();
    },
    getPlaybackRate() {
      return src.getPlaybackRate();
    },
    getIsPaused() {
      return src.getIsPaused();
    },
    getReference() : IReadOnlySharedReference<TDest> {
      return mappedRef;
    },
    listen(
      cb : (
        observation : TDest,
        stopListening : () => void
      ) => void,
      options? : { includeLastObservation? : boolean | undefined;
                   clearSignal? : CancellationSignal | undefined; }
    ) : void {
      if (cancellationSignal.isCancelled() ||
          options?.clearSignal?.isCancelled() === true)
      {
        return ;
      }
      mappedRef.onUpdate(cb, {
        clearSignal: options?.clearSignal,
        emitCurrentValue: options?.includeLastObservation,
      });
    },
    deriveReadOnlyObserver<TNext>(
      newTransformFn : (
        observationRef : IReadOnlySharedReference<TDest>,
        signal : CancellationSignal
      ) => IReadOnlySharedReference<TNext>
    ) : IReadOnlyPlaybackObserver<TNext> {
      return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
    },
  };
}

/**
 * Generate the initial playback observation for when no event has yet been
 * emitted to lead to one.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Object}
 */
function getInitialObservation(mediaElement: HTMLMediaElement) : IPlaybackObservation {
  const mediaTimings = getMediaInfos(mediaElement);
  return objectAssign(mediaTimings,
                      { rebuffering: null,
                        event: "init",
                        seeking: SeekingState.None,
                        position: { last: mediaTimings.position,
                                    pending: undefined },
                        freezing: null });
}
