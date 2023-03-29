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

import isSeekingApproximate from "../../../compat/is_seeking_approximate";
import config from "../../../config";
import { MediaError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Period,
} from "../../../manifest";
import { IPlayerError } from "../../../public_types";
import EventEmitter from "../../../utils/event_emitter";
import { getNextRangeGap } from "../../../utils/ranges";
import { IReadOnlySharedReference } from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import {
  IPlaybackObservation,
  PlaybackObserver,
} from "../../api";
import SegmentBuffersStore, { IBufferType } from "../../segment_buffers";
import { IStallingSituation } from "../types";


/**
 * Work-around rounding errors with floating points by setting an acceptable,
 * very short, deviation when checking equalities.
 */
const EPSILON = 1 / 60;

/**
 * Monitor playback, trying to avoid stalling situation.
 * If stopping the player to build buffer is needed, temporarily set the
 * playback rate (i.e. speed) at `0` until enough buffer is available again.
 *
 * Emit "stalled" then "unstalled" respectively when an unavoidable stall is
 * encountered and exited.
 */
export default class RebufferingController
  extends EventEmitter<IRebufferingControllerEvent> {

  /** Emit the current playback conditions */
  private _playbackObserver : PlaybackObserver;
  private _manifest : Manifest | null;
  private _segmentBuffersStore : SegmentBuffersStore | null;
  private _speed : IReadOnlySharedReference<number>;
  private _isStarted : boolean;

  /**
   * Every known audio and video buffer discontinuities in chronological
   * order (first ordered by Period's start, then by bufferType in any order.
   */
  private _discontinuitiesStore : IDiscontinuityStoredInfo[];

  private _canceller : TaskCanceller;

  /**
   * @param {object} playbackObserver - emit the current playback conditions.
   * @param {Object} manifest - The Manifest of the currently-played content.
   * @param {Object} speed - The last speed set by the user
   */
  constructor(
    playbackObserver : PlaybackObserver,
    manifest : Manifest | null,
    segmentBuffersStore : SegmentBuffersStore | null,
    speed : IReadOnlySharedReference<number>
  ) {
    super();
    this._playbackObserver = playbackObserver;
    this._manifest = manifest;
    this._segmentBuffersStore = segmentBuffersStore;
    this._speed = speed;
    this._discontinuitiesStore = [];
    this._isStarted = false;
    this._canceller = new TaskCanceller();
  }

  public start() : void {
    if (this._isStarted) {
      return;
    }
    this._isStarted = true;

    /**
     * On some devices (right now only seen on Tizen), seeking through the
     * `currentTime` property can lead to the browser re-seeking once the
     * segments have been loaded to improve seeking performances (for
     * example, by seeking right to an intra video frame).
     * In that case, we risk being in a conflict with that behavior: if for
     * example we encounter a small discontinuity at the position the browser
     * seeks to, we will seek over it, the browser would seek back and so on.
     *
     * This variable allows to store the last known position we were seeking to
     * so we can detect when the browser seeked back (to avoid performing another
     * seek after that). When browsers seek back to a position behind a
     * discontinuity, they are usually able to skip them without our help.
     */
    let lastSeekingPosition : number | null;

    /**
     * In some conditions (see `lastSeekingPosition`), we might want to not
     * automatically seek over discontinuities because the browser might do it
     * itself instead.
     * In that case, we still want to perform the seek ourselves if the browser
     * doesn't do it after sufficient time.
     * This variable allows to store the timestamp at which a discontinuity began
     * to be ignored.
     */
    let ignoredStallTimeStamp : number | null = null;

    const playbackRateUpdater = new PlaybackRateUpdater(this._playbackObserver,
                                                        this._speed);
    this._canceller.signal.register(() => {
      playbackRateUpdater.dispose();
    });

    let prevFreezingState : { attemptTimestamp : number } | null = null;

    this._playbackObserver.listen((observation) => {
      const discontinuitiesStore = this._discontinuitiesStore;
      const { buffered,
              position,
              readyState,
              rebuffering,
              freezing } = observation;

      const { BUFFER_DISCONTINUITY_THRESHOLD,
              FORCE_DISCONTINUITY_SEEK_DELAY,
              FREEZING_STALLED_DELAY,
              UNFREEZING_SEEK_DELAY,
              UNFREEZING_DELTA_POSITION } = config.getCurrent();

      if (
        !observation.seeking &&
        isSeekingApproximate &&
        ignoredStallTimeStamp === null &&
        lastSeekingPosition !== null && observation.position < lastSeekingPosition)
      {
        log.debug("Init: the device appeared to have seeked back by itself.");
        const now = performance.now();
        ignoredStallTimeStamp = now;
      }

      lastSeekingPosition = observation.seeking ?
        Math.max(observation.pendingInternalSeek ?? 0, observation.position) :
        null;

      if (this._checkDecipherabilityFreeze(observation)) {
        return ;
      }

      if (freezing !== null) {
        const now = performance.now();

        const referenceTimestamp = prevFreezingState === null ?
          freezing.timestamp :
          prevFreezingState.attemptTimestamp;

        if (now - referenceTimestamp > UNFREEZING_SEEK_DELAY) {
          log.warn("Init: trying to seek to un-freeze player");
          this._playbackObserver.setCurrentTime(
            this._playbackObserver.getCurrentTime() + UNFREEZING_DELTA_POSITION);
          prevFreezingState = { attemptTimestamp: now };
        }

        if (now - freezing.timestamp > FREEZING_STALLED_DELAY) {
          if (rebuffering === null || ignoredStallTimeStamp !== null) {
            playbackRateUpdater.stopRebuffering();
          } else {
            playbackRateUpdater.startRebuffering();
          }
          this.trigger("stalled", "freezing");
          return;
        }
      } else {
        prevFreezingState = null;
      }

      if (rebuffering === null) {
        playbackRateUpdater.stopRebuffering();
        if (readyState === 1) {
          // With a readyState set to 1, we should still not be able to play:
          // Return that we're stalled
          let reason : IStallingSituation;
          if (observation.seeking) {
            reason = observation.pendingInternalSeek !== null ? "internal-seek" :
                                                                "seeking";
          } else {
            reason = "not-ready";
          }
          this.trigger("stalled", reason);
          return ;
        }
        this.trigger("unstalled", null);
        return ;
      }

      // We want to separate a stall situation when a seek is due to a seek done
      // internally by the player to when its due to a regular user seek.
      const stalledReason = rebuffering.reason === "seeking" &&
                            observation.pendingInternalSeek !== null ?
        "internal-seek" as const :
        rebuffering.reason;

      if (ignoredStallTimeStamp !== null) {
        const now = performance.now();
        if (now - ignoredStallTimeStamp < FORCE_DISCONTINUITY_SEEK_DELAY) {
          playbackRateUpdater.stopRebuffering();
          log.debug("Init: letting the device get out of a stall by itself");
          this.trigger("stalled", stalledReason);
          return ;
        } else {
          log.warn("Init: ignored stall for too long, considering it",
                   now - ignoredStallTimeStamp);
        }
      }

      ignoredStallTimeStamp = null;
      playbackRateUpdater.startRebuffering();

      if (this._manifest === null) {
        this.trigger("stalled", stalledReason);
        return ;
      }

      /** Position at which data is awaited. */
      const { position: stalledPosition } = rebuffering;

      if (stalledPosition !== null &&
          stalledPosition !== undefined &&
          this._speed.getValue() > 0)
      {
        const skippableDiscontinuity = findSeekableDiscontinuity(discontinuitiesStore,
                                                                 this._manifest,
                                                                 stalledPosition);
        if (skippableDiscontinuity !== null) {
          const realSeekTime = skippableDiscontinuity + 0.001;
          if (realSeekTime <= this._playbackObserver.getCurrentTime()) {
            log.info("Init: position to seek already reached, no seeking",
                     this._playbackObserver.getCurrentTime(), realSeekTime);
          } else {
            log.warn("SA: skippable discontinuity found in the stream",
                     position, realSeekTime);
            this._playbackObserver.setCurrentTime(realSeekTime);
            this.trigger("warning", generateDiscontinuityError(stalledPosition,
                                                               realSeekTime));
            return;
          }
        }
      }

      const freezePosition = stalledPosition ?? position;

      // Is it a very short discontinuity in buffer ? -> Seek at the beginning of the
      //                                                 next range
      //
      // Discontinuity check in case we are close a buffered range but still
      // calculate a stalled state. This is useful for some
      // implementation that might drop an injected segment, or in
      // case of small discontinuity in the content.
      const nextBufferRangeGap = getNextRangeGap(buffered, freezePosition);
      if (
        this._speed.getValue() > 0 &&
        nextBufferRangeGap < BUFFER_DISCONTINUITY_THRESHOLD
      ) {
        const seekTo = (freezePosition + nextBufferRangeGap + EPSILON);
        if (this._playbackObserver.getCurrentTime() < seekTo) {
          log.warn("Init: discontinuity encountered inferior to the threshold",
                   freezePosition, seekTo, BUFFER_DISCONTINUITY_THRESHOLD);
          this._playbackObserver.setCurrentTime(seekTo);
          this.trigger("warning", generateDiscontinuityError(freezePosition, seekTo));
          return;
        }
      }

      // Are we in a discontinuity between periods ? -> Seek at the beginning of the
      //                                                next period
      for (let i = this._manifest.periods.length - 2; i >= 0; i--) {
        const period = this._manifest.periods[i];
        if (period.end !== undefined && period.end <= freezePosition) {
          if (this._manifest.periods[i + 1].start > freezePosition &&
              this._manifest.periods[i + 1].start >
                this._playbackObserver.getCurrentTime())
          {
            const nextPeriod = this._manifest.periods[i + 1];
            this._playbackObserver.setCurrentTime(nextPeriod.start);
            this.trigger("warning", generateDiscontinuityError(freezePosition,
                                                               nextPeriod.start));
            return;

          }
          break;
        }
      }

      this.trigger("stalled", stalledReason);
    }, { includeLastObservation: true, clearSignal: this._canceller.signal });
  }

  /**
   * Update information on an upcoming discontinuity for a given buffer type and
   * Period.
   * Each new update for the same Period and type overwrites the previous one.
   * @param {Object} evt
   */
  public updateDiscontinuityInfo(evt: IDiscontinuityEvent) : void {
    if (!this._isStarted) {
      this.start();
    }
    const lastObservation = this._playbackObserver.getReference().getValue();
    updateDiscontinuitiesStore(this._discontinuitiesStore, evt, lastObservation);
  }

  /**
   * Function to call when a Stream is currently locked, i.e. we cannot load
   * segments for the corresponding Period and buffer type until it is seeked
   * to.
   * @param {string} bufferType - Buffer type for which no segment will
   * currently load.
   * @param {Object} period - Period for which no segment will currently load.
   */
  public onLockedStream(bufferType : IBufferType, period : Period) : void {
    if (!this._isStarted) {
      this.start();
    }
    const observation = this._playbackObserver.getReference().getValue();
    if (
      !observation.rebuffering ||
      observation.paused ||
      this._speed.getValue() <= 0 || (
        bufferType !== "audio" &&
        bufferType !== "video"
      )
    ) {
      return;
    }
    const currPos = observation.position;
    const rebufferingPos = observation.rebuffering.position ?? currPos;
    const lockedPeriodStart = period.start;
    if (currPos < lockedPeriodStart &&
        Math.abs(rebufferingPos - lockedPeriodStart) < 1)
    {
      log.warn("Init: rebuffering because of a future locked stream.\n" +
               "Trying to unlock by seeking to the next Period");
      this._playbackObserver.setCurrentTime(lockedPeriodStart + 0.001);
    }
  }

  /**
   * Stops the `RebufferingController` from montoring stalling situations,
   * forever.
   */
  public destroy() : void {
    this._canceller.cancel();
  }

  /**
   * Support of contents with DRM on all the platforms out there is a pain
   * considering all the DRM-related bugs there are.
   *
   * We found out a frequent issue which is to be unable to play despite having
   * all the decryption keys to play what is currently buffered.
   * When this happens, re-creating the buffers from scratch, with a reload, is
   * usually sufficient to unlock the situation.
   *
   * Although we prefer providing more targeted fixes or telling to platform
   * developpers to fix their implementation, it's not always possible.
   * We thus resorted to developping an heuristic which detects such situation
   * and reload in that case.
   *
   * @param {Object} observation - The last playback observation produced, it
   * has to be recent (just triggered for example).
   * @returns {boolean} - Returns `true` if it seems to be such kind of
   * decipherability freeze, in which case this method already performed the
   * right handling steps.
   */
  private _checkDecipherabilityFreeze(
    observation : IPlaybackObservation
  ): boolean {
    const { readyState,
            rebuffering,
            freezing } = observation;
    const bufferGap = observation.bufferGap !== undefined &&
      isFinite(observation.bufferGap) ? observation.bufferGap :
      0;
    if (
      this._segmentBuffersStore === null ||
      bufferGap < 6 ||
      (rebuffering === null && freezing === null) ||
      readyState > 1
    ) {
      return false;
    }

    const now = performance.now();
    const rebufferingForTooLong =
      rebuffering !== null && now - rebuffering.timestamp > 4000;
    const frozenForTooLong =
      freezing !== null && now - freezing.timestamp > 4000;

    if (rebufferingForTooLong || frozenForTooLong) {
      const statusAudio = this._segmentBuffersStore.getStatus("audio");
      const statusVideo = this._segmentBuffersStore.getStatus("video");
      let hasOnlyDecipherableSegments = true;
      let isClear = true;
      for (const status of [statusAudio, statusVideo]) {
        if (status.type === "initialized") {
          for (const segment of status.value.getInventory()) {
            const { representation } = segment.infos;
            if (representation.decipherable === false) {
              log.warn(
                "Init: we have undecipherable segments left in the buffer, reloading"
              );
              this.trigger("needsReload", null);
              return true;
            } else if (representation.contentProtections !== undefined) {
              isClear = false;
              if (representation.decipherable !== true) {
                hasOnlyDecipherableSegments = false;
              }
            }
          }
        }
      }

      if (!isClear && hasOnlyDecipherableSegments) {
        log.warn(
          "Init: we are frozen despite only having decipherable " +
          "segments left in the buffer, reloading"
        );
        this.trigger("needsReload", null);
        return true;
      }
    }
    return false;
  }
}

/**
 * @param {Array.<Object>} discontinuitiesStore
 * @param {Object} manifest
 * @param {number} stalledPosition
 * @returns {number|null}
 */
function findSeekableDiscontinuity(
  discontinuitiesStore : IDiscontinuityStoredInfo[],
  manifest : Manifest,
  stalledPosition : number
) : number | null {
  if (discontinuitiesStore.length === 0) {
    return null;
  }
  let maxDiscontinuityEnd : number | null = null;
  for (let i = 0; i < discontinuitiesStore.length; i++) {
    const { period } = discontinuitiesStore[i];
    if (period.start > stalledPosition) {
      return maxDiscontinuityEnd;
    }

    let discontinuityEnd : number | undefined;

    if (period.end === undefined || period.end > stalledPosition) {
      const { discontinuity, position } = discontinuitiesStore[i];
      const { start, end } = discontinuity;
      const discontinuityLowerLimit = start ?? position;
      if (stalledPosition >= (discontinuityLowerLimit - EPSILON)) {
        if (end === null) {
          const nextPeriod = manifest.getPeriodAfter(period);
          if (nextPeriod !== null) {
            discontinuityEnd = nextPeriod.start + EPSILON;
          } else {
            log.warn("Init: discontinuity at Period's end but no next Period");
          }
        } else if (stalledPosition < (end + EPSILON)) {
          discontinuityEnd = end + EPSILON;
        }
      }
      if (discontinuityEnd !== undefined) {
        log.info("Init: discontinuity found", stalledPosition, discontinuityEnd);
        maxDiscontinuityEnd =
          maxDiscontinuityEnd !== null &&
          maxDiscontinuityEnd > discontinuityEnd ? maxDiscontinuityEnd :
                                                   discontinuityEnd;
      }
    }
  }
  return maxDiscontinuityEnd;
}

/**
 * Return `true` if the given event indicates that a discontinuity is present.
 * @param {Object} evt
 * @returns {Array.<Object>}
 */
function eventContainsDiscontinuity(
  evt : IDiscontinuityEvent
) : evt is IDiscontinuityStoredInfo {
  return evt.discontinuity !== null;
}

/**
 * Update the `discontinuitiesStore` Object with the given event information:
 *
 *   - If that event indicates than no discontinuity is found for a Period
 *     and buffer type, remove a possible existing discontinuity for that
 *     combination.
 *
 *   - If that event indicates that a discontinuity can be found for a Period
 *     and buffer type, replace previous occurences for that combination and
 *     store it in Period's chronological order in the Array.
 * @param {Array.<Object>} discontinuitiesStore
 * @param {Object} evt
 * @param {Object} observation
 * @returns {Array.<Object>}
 */
function updateDiscontinuitiesStore(
  discontinuitiesStore : IDiscontinuityStoredInfo[],
  evt : IDiscontinuityEvent,
  observation : IPlaybackObservation
) : void {
  // First, perform clean-up of old discontinuities
  while (discontinuitiesStore.length > 0 &&
         discontinuitiesStore[0].period.end !== undefined &&
         discontinuitiesStore[0].period.end + 10 < observation.position)
  {
    discontinuitiesStore.shift();
  }

  const { period, bufferType } = evt;
  if (bufferType !== "audio" && bufferType !== "video") {
    return ;
  }

  for (let i = 0; i < discontinuitiesStore.length; i++) {
    if (discontinuitiesStore[i].period.id === period.id) {
      if (discontinuitiesStore[i].bufferType === bufferType) {
        if (!eventContainsDiscontinuity(evt)) {
          discontinuitiesStore.splice(i, 1);
        } else {
          discontinuitiesStore[i] = evt;
        }
        return ;
      }
    } else if (discontinuitiesStore[i].period.start > period.start) {
      if (eventContainsDiscontinuity(evt)) {
        discontinuitiesStore.splice(i, 0, evt);
      }
      return ;
    }
  }
  if (eventContainsDiscontinuity(evt)) {
    discontinuitiesStore.push(evt);
  }
  return ;
}

/**
 * Generate error emitted when a discontinuity has been encountered.
 * @param {number} stalledPosition
 * @param {number} seekTo
 * @returns {Error}
 */
function generateDiscontinuityError(
  stalledPosition : number,
  seekTo : number
) : MediaError {
  return new MediaError("DISCONTINUITY_ENCOUNTERED",
                        "A discontinuity has been encountered at position " +
                        String(stalledPosition) + ", seeked at position " +
                        String(seekTo));
}

/**
 * Manage playback speed, allowing to force a playback rate of `0` when
 * rebuffering is wanted.
 *
 * Only one `PlaybackRateUpdater` should be created per HTMLMediaElement.
 * Note that the `PlaybackRateUpdater` reacts to playback event and wanted
 * speed change. You should call its `dispose` method once you don't need it
 * anymore.
 * @class PlaybackRateUpdater
 */
class PlaybackRateUpdater {
  private _playbackObserver : PlaybackObserver;
  private _speed : IReadOnlySharedReference<number>;
  private _speedUpdateCanceller : TaskCanceller;
  private _isRebuffering : boolean;
  private _isDisposed : boolean;

  /**
   * Create a new `PlaybackRateUpdater`.
   * @param {Object} playbackObserver
   * @param {Object} speed
   */
  constructor(
    playbackObserver : PlaybackObserver,
    speed : IReadOnlySharedReference<number>
  ) {
    this._speedUpdateCanceller = new TaskCanceller();
    this._isRebuffering = false;
    this._playbackObserver = playbackObserver;
    this._isDisposed = false;
    this._speed = speed;
    this._updateSpeed();
  }

  /**
   * Force the playback rate to `0`, to start a rebuffering phase.
   *
   * You can call `stopRebuffering` when you want the rebuffering phase to end.
   */
  public startRebuffering() : void {
    if (this._isRebuffering || this._isDisposed) {
      return;
    }
    this._isRebuffering = true;
    this._speedUpdateCanceller.cancel();
    log.info("Init: Pause playback to build buffer");
    this._playbackObserver.setPlaybackRate(0);
  }

  /**
   * If in a rebuffering phase (during which the playback rate is forced to
   * `0`), exit that phase to apply the wanted playback rate instead.
   *
   * Do nothing if not in a rebuffering phase.
   */
  public stopRebuffering() {
    if (!this._isRebuffering || this._isDisposed) {
      return;
    }
    this._isRebuffering = false;
    this._speedUpdateCanceller = new TaskCanceller();
    this._updateSpeed();
  }

  /**
   * The `PlaybackRateUpdater` allocate resources to for example listen to
   * wanted speed changes and react to it.
   *
   * Consequently, you should call the `dispose` method, when you don't want the
   * `PlaybackRateUpdater` to have an effect anymore.
   */
  public dispose() {
    this._speedUpdateCanceller.cancel();
    this._isDisposed = true;
  }

  private _updateSpeed() {
    this._speed.onUpdate((lastSpeed) => {
      log.info("Init: Resume playback speed", lastSpeed);
      this._playbackObserver.setPlaybackRate(lastSpeed);
    }, { clearSignal: this._speedUpdateCanceller.signal, emitCurrentValue: true });
  }
}

export interface IRebufferingControllerEvent {
  stalled : IStallingSituation;
  unstalled : null;
  needsReload : null;
  warning : IPlayerError;
}

/**
 * Event indicating that a discontinuity has been found.
 * Each event for a `bufferType` and `period` combination replaces the previous
 * one.
 */
export interface IDiscontinuityEvent {
  /** Buffer type concerned by the discontinuity. */
  bufferType : IBufferType;
  /** Period concerned by the discontinuity. */
  period : Period;
  /**
   * Close discontinuity time information.
   * `null` if no discontinuity has been detected currently for that buffer
   * type and Period.
   */
  discontinuity : IDiscontinuityTimeInfo | null;
  /**
   * Position at which the discontinuity was found.
   * Can be important for when a current discontinuity's start is unknown.
   */
  position : number;
}

/** Information on a found discontinuity. */
export interface IDiscontinuityTimeInfo {
  /**
   * Start time of the discontinuity.
   * `undefined` for when the start is unknown but the discontinuity was
   * currently encountered at the position we were in when this event was
   * created.
   */
  start : number | undefined;
  /**
   * End time of the discontinuity, in seconds.
   * If `null`, no further segment can be loaded for the corresponding Period.
   */
  end : number | null;
}

/**
 * Internally stored information about a known discontinuity in the audio or
 * video buffer.
 */
interface IDiscontinuityStoredInfo {
  /** Buffer type concerned by the discontinuity. */
  bufferType : IBufferType;
  /** Period concerned by the discontinuity. */
  period : Period;
  /** Discontinuity time information. */
  discontinuity : IDiscontinuityTimeInfo;
  /**
   * Position at which the discontinuity was found.
   * Can be important for when a current discontinuity's start is unknown.
   */
  position : number;
}
