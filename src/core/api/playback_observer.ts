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

import config from "../../config";
import log from "../../log";
import noop from "../../utils/noop";
import objectAssign from "../../utils/object_assign";
import { getRange } from "../../utils/ranges";
import createSharedReference, {
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
 * performed, get the current media state or subscribe to an Observable emitting
 * regularly media conditions.
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
  private _observationRef : IReadOnlySharedReference<IPlaybackObservation>;

  /**
   * `TaskCanceller` allowing to free all resources and stop producing playback
   * observations.
   */
  private _canceller : TaskCanceller;

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
  }

  /**
   * Stop the `PlaybackObserver` from emitting playback observations and free all
   * resources reserved to emitting them such as event listeners, intervals and
   * subscribing callbacks.
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
    this._internalSeeksIncoming.push(time);
    this._mediaElement.currentTime = time;
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
   * This value can then be for example subscribed to to be notified of future
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
    cb : (observation : IPlaybackObservation) => void,
    options? : { includeLastObservation? : boolean | undefined;
                 clearSignal? : CancellationSignal | undefined; }
  ) {
    if (this._canceller.isUsed || options?.clearSignal?.isCancelled === true) {
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

  /**
   * Creates the `IReadOnlySharedReference` that will generate playback
   * observations.
   * @returns {Observable}
   */
  private _createSharedReference() : IReadOnlySharedReference<IPlaybackObservation> {
    if (this._observationRef !== undefined) {
      return this._observationRef;
    }

    let lastObservation : IPlaybackObservation | null;
    const { SAMPLING_INTERVAL_MEDIASOURCE,
            SAMPLING_INTERVAL_LOW_LATENCY,
            SAMPLING_INTERVAL_NO_MEDIASOURCE } = config.getCurrent();

    const getCurrentObservation = (
      event : IPlaybackObserverEventType
    ) : IPlaybackObservation => {
      let tmpEvt: IPlaybackObserverEventType = event;
      let startedInternalSeekTime : number | undefined;
      if (tmpEvt === "seeking" && this._internalSeeksIncoming.length > 0) {
        tmpEvt = "internal-seeking";
        startedInternalSeekTime = this._internalSeeksIncoming.shift();
      }
      const _lastObservation = lastObservation ?? this._generateInitialObservation();
      const mediaTimings = getMediaInfos(this._mediaElement, tmpEvt);
      let pendingInternalSeek : number | null = null;
      if (mediaTimings.seeking) {
        if (typeof startedInternalSeekTime === "number") {
          pendingInternalSeek = startedInternalSeekTime;
        } else if (_lastObservation.pendingInternalSeek !== null && event !== "seeking") {
          pendingInternalSeek = _lastObservation.pendingInternalSeek;
        }
      }
      const rebufferingStatus = getRebufferingStatus(
        _lastObservation,
        mediaTimings,
        { lowLatencyMode: this._lowLatencyMode,
          withMediaSource: this._withMediaSource });

      const freezingStatus = getFreezingStatus(_lastObservation, mediaTimings);
      const timings = objectAssign(
        {},
        { rebuffering: rebufferingStatus,
          freezing: freezingStatus,
          pendingInternalSeek },
        mediaTimings);
      if (log.hasLevel("DEBUG")) {
        log.debug("API: current media element state tick",
                  "event", timings.event,
                  "position", timings.position,
                  "seeking", timings.seeking,
                  "internalSeek", timings.pendingInternalSeek,
                  "rebuffering", timings.rebuffering !== null,
                  "freezing", timings.freezing !== null,
                  "ended", timings.ended,
                  "paused", timings.paused,
                  "playbackRate", timings.playbackRate,
                  "readyState", timings.readyState);
      }
      return timings;
    };

    const returnedSharedReference = createSharedReference(getCurrentObservation("init"));

    const generateObservationForEvent = (event : IPlaybackObserverEventType) => {
      const newObservation = getCurrentObservation(event);
      if (log.hasLevel("DEBUG")) {
        log.debug("API: current playback timeline:\n" +
                  prettyPrintBuffered(newObservation.buffered,
                                      newObservation.position),
                  `\n${event}`);
      }
      lastObservation = newObservation;
      returnedSharedReference.setValue(newObservation);
    };

    const interval = this._lowLatencyMode  ? SAMPLING_INTERVAL_LOW_LATENCY :
                     this._withMediaSource ? SAMPLING_INTERVAL_MEDIASOURCE :
                                             SAMPLING_INTERVAL_NO_MEDIASOURCE;
    let intervalId = setInterval(onInterval, interval);
    const removeEventListeners = SCANNED_MEDIA_ELEMENTS_EVENTS.map((eventName) => {
      this._mediaElement.addEventListener(eventName, onMediaEvent);
      function onMediaEvent() {
        restartInterval();
        generateObservationForEvent(eventName);
      }
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

    function onInterval() {
      generateObservationForEvent("timeupdate");
    }

    function restartInterval() {
      clearInterval(intervalId);
      intervalId = setInterval(onInterval, interval);
    }
  }

  private _generateInitialObservation() : IPlaybackObservation {
    return objectAssign(getMediaInfos(this._mediaElement, "init"),
                        { rebuffering: null,
                          freezing: null,
                          pendingInternalSeek: null });
  }
}

/** "Event" that triggered the playback observation. */
export type IPlaybackObserverEventType =
  /** First playback observation automatically emitted. */
  "init" | // set once on first emit
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
  /** Gap between `currentTime` and the next position with un-buffered data. */
  bufferGap : number;
  /** Value of `buffered` (buffered ranges) for the media element. */
  buffered : TimeRanges;
  /** The buffered range we are currently playing. */
  currentRange : { start : number;
                   end : number; } |
                 null;
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
   /** Event that triggered this playback observation. */
  event : IPlaybackObserverEventType;
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
  /** `performance.now` at the time the rebuffering happened. */
  timestamp : number;
  /**
   * Position, in seconds, at which data is awaited.
   * If `null` the player is rebuffering but not because it is awaiting future data.
   */
  position : number | null;
}

/**
 * Describes when the player is "frozen".
 * This status is reserved for when the player is stuck at the same position for
 * an unknown reason.
 */
export interface IFreezingStatus {
  /** `performance.now` at the time the freezing started to be detected. */
  timestamp : number;
}

/** Information emitted on each playback observation. */
export interface IPlaybackObservation extends IMediaInfos {
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
   * If `true`, an "internal seek" (a seeking operation triggered by the
   * RxPlayer code) is currently pending.
   */
  pendingInternalSeek : number | null;
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
  /** Get the current playing position, in seconds. */
  getCurrentTime() : number;
  /**
   * Returns the current playback rate advertised by the `HTMLMediaElement`.
   * @returns {number}
   */
  getPlaybackRate() : number;
  /** Get the HTMLMediaElement's current `readyState`. */
  getReadyState() : number;
  /**
   * Returns the current `paused` status advertised by the `HTMLMediaElement`.
   *
   * Use this instead of the same status emitted on an observation when you want
   * to be sure you're using the current value.
   * @returns {boolean}
   */
  getIsPaused() : boolean;
  /**
   * Returns an `IReadOnlySharedReference` storing the last playback observation
   * produced by the `IReadOnlyPlaybackObserver` and updated each time a new one
   * is produced.
   *
   * This value can then be for example subscribed to to be notified of future
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
    cb : (observation : TObservationType) => void,
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
  currentRange : { start : number; end : number }|null,
  duration : number,
  lowLatencyMode : boolean
) : boolean {
  const { REBUFFERING_GAP } = config.getCurrent();
  const suffix : "LOW_LATENCY" | "DEFAULT" = lowLatencyMode ? "LOW_LATENCY" :
                                                              "DEFAULT";
  return currentRange !== null &&
         (duration - currentRange.end) <= REBUFFERING_GAP[suffix];
}

/**
 * Get basic playback information.
 * @param {HTMLMediaElement} mediaElement
 * @param {string} event
 * @returns {Object}
 */
function getMediaInfos(
  mediaElement : HTMLMediaElement,
  event : IPlaybackObserverEventType
) : IMediaInfos {
  const { buffered,
          currentTime,
          duration,
          ended,
          paused,
          playbackRate,
          readyState,
          seeking } = mediaElement;

  const currentRange = getRange(buffered, currentTime);
  return { bufferGap: currentRange !== null ? currentRange.end - currentTime :
                                              // TODO null/0 would probably be
                                              // more appropriate
                                              Infinity,
           buffered,
           currentRange,
           position: currentTime,
           duration,
           ended,
           paused,
           playbackRate,
           readyState,
           seeking,
           event };
}

/**
 * Infer rebuffering status of the media based on:
 *   - the return of the function getMediaInfos
 *   - the previous observation object.
 *
 * @param {Object} prevObservation - Previous playback observation object.
 * @param {Object} currentInfo - Current set of basic information on the
 * `HTMLMediaElement`. This does not need every single property from a regular
 * playback observation.
 * @param {Object} options
 * @returns {Object|null}
 */
function getRebufferingStatus(
  prevObservation : IPlaybackObservation,
  currentInfo : IMediaInfos,
  { withMediaSource, lowLatencyMode } : IPlaybackObserverOptions
) : IRebufferingStatus | null {

  const { REBUFFERING_GAP } = config.getCurrent();
  const { event: currentEvt,
          position: currentTime,
          bufferGap,
          currentRange,
          duration,
          paused,
          readyState,
          ended } = currentInfo;

  const { rebuffering: prevRebuffering,
          event: prevEvt,
          position: prevTime } = prevObservation;

  const fullyLoaded = hasLoadedUntilTheEnd(currentRange, duration, lowLatencyMode);

  const canSwitchToRebuffering = (readyState >= 1 &&
                                  currentEvt !== "loadedmetadata" &&
                                  prevRebuffering === null &&
                                  !(fullyLoaded || ended));

  let rebufferEndPosition : number | null = null;
  let shouldRebuffer : boolean | undefined;
  let shouldStopRebuffer : boolean | undefined;

  const rebufferGap = lowLatencyMode ? REBUFFERING_GAP.LOW_LATENCY :
                                       REBUFFERING_GAP.DEFAULT;

  if (withMediaSource) {
    if (canSwitchToRebuffering) {
      if (bufferGap <= rebufferGap) {
        shouldRebuffer = true;
        rebufferEndPosition = currentTime + bufferGap;
      } else if (bufferGap === Infinity) {
        shouldRebuffer = true;
        rebufferEndPosition = currentTime;
      }
    } else if (prevRebuffering !== null) {
      const resumeGap = getRebufferingEndGap(prevRebuffering, lowLatencyMode);
      if (shouldRebuffer !== true && prevRebuffering !== null && readyState > 1 &&
          (fullyLoaded || ended || (bufferGap < Infinity && bufferGap > resumeGap)))
      {
        shouldStopRebuffer = true;
      } else if (bufferGap === Infinity || bufferGap <= resumeGap) {
        rebufferEndPosition = bufferGap === Infinity ? currentTime :
                                                       currentTime + bufferGap;
      }
    }
  }

  // when using a direct file, the media will stall and unstall on its
  // own, so we only try to detect when the media timestamp has not changed
  // between two consecutive timeupdates
  else {
    if (canSwitchToRebuffering &&
        (!paused && currentEvt === "timeupdate" &&
         prevEvt === "timeupdate" && currentTime === prevTime ||
         currentEvt === "seeking" && bufferGap === Infinity)
    ) {
      shouldRebuffer = true;
    } else if (prevRebuffering !== null &&
               (currentEvt !== "seeking" && currentTime !== prevTime ||
                currentEvt === "canplay" ||
                bufferGap < Infinity &&
                (bufferGap > getRebufferingEndGap(prevRebuffering, lowLatencyMode) ||
                 fullyLoaded || ended))
    ) {
      shouldStopRebuffer = true;
    }
  }

  if (shouldStopRebuffer === true) {
    return null;
  } else if (shouldRebuffer === true || prevRebuffering !== null) {
    let reason : "seeking" | "not-ready" | "buffering" | "internal-seek";
    if (currentEvt === "seeking" ||
        prevRebuffering !== null && prevRebuffering.reason === "seeking") {
      reason = "seeking";
    } else if (currentInfo.seeking) {
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
             timestamp: performance.now(),
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
 * @returns {Object|null}
 */
function getFreezingStatus(
  prevObservation : IPlaybackObservation,
  currentInfo : IMediaInfos
) : IFreezingStatus | null {
  const { MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING } = config.getCurrent();
  if (prevObservation.freezing) {
    if (currentInfo.ended ||
        currentInfo.paused ||
        currentInfo.readyState === 0 ||
        currentInfo.playbackRate === 0 ||
        prevObservation.position !== currentInfo.position)
    {
      return null; // Quit freezing status
    }
    return prevObservation.freezing; // Stay in it
  }

  return currentInfo.event === "timeupdate" &&
         currentInfo.bufferGap > MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING &&
         !currentInfo.ended &&
         !currentInfo.paused &&
         currentInfo.readyState >= 1 &&
         currentInfo.playbackRate !== 0 &&
         currentInfo.position === prevObservation.position ?
           { timestamp: performance.now() } :
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
function generateReadOnlyObserver<TSource, TDest>(
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
    getPlaybackRate() : number {
      return src.getPlaybackRate();
    },
    getIsPaused() {
      return src.getIsPaused();
    },
    getReference() : IReadOnlySharedReference<TDest> {
      return mappedRef;
    },
    listen(
      cb : (observation : TDest) => void,
      options? : { includeLastObservation? : boolean | undefined;
                   clearSignal? : CancellationSignal | undefined; }
    ) : void {
      if (cancellationSignal.isCancelled || options?.clearSignal?.isCancelled === true) {
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
