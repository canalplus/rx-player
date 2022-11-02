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

import {
  defer as observableDefer,
  distinctUntilChanged,
  ignoreElements,
  map,
  merge as observableMerge,
  Observable,
  of as observableOf,
  scan,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import isSeekingApproximate from "../../compat/is_seeking_approximate";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest, {
  Period,
} from "../../manifest";
import { getNextRangeGap } from "../../utils/ranges";
import { IReadOnlySharedReference } from "../../utils/reference";
import {
  IPlaybackObservation,
  PlaybackObserver,
} from "../api";
import { IBufferType } from "../segment_buffers";
import EVENTS from "../stream/events_generators";
import {
  IStalledEvent,
  IStallingSituation,
  IUnstalledEvent,
  IWarningEvent,
} from "./types";


/**
 * Work-around rounding errors with floating points by setting an acceptable,
 * very short, deviation when checking equalities.
 */
const EPSILON = 1 / 60;

export interface ILockedStreamEvent {
  /** Buffer type for which no segment will currently load. */
  bufferType : IBufferType;
  /** Period for which no segment will currently load. */
  period : Period;
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

/**
 * Monitor playback, trying to avoid stalling situation.
 * If stopping the player to build buffer is needed, temporarily set the
 * playback rate (i.e. speed) at `0` until enough buffer is available again.
 *
 * Emit "stalled" then "unstalled" respectively when an unavoidable stall is
 * encountered and exited.
 * @param {object} playbackObserver - emit the current playback conditions.
 * @param {Object} manifest - The Manifest of the currently-played content.
 * @param {Object} speed - The last speed set by the user
 * @param {Observable} lockedStream$ - Emit information on currently "locked"
 * streams.
 * @param {Observable} discontinuityUpdate$ - Observable emitting encountered
 * discontinuities for loaded Period and buffer types.
 * @returns {Observable}
 */
export default function RebufferingController(
  playbackObserver : PlaybackObserver,
  manifest: Manifest | null,
  speed : IReadOnlySharedReference<number>,
  lockedStream$ : Observable<ILockedStreamEvent>,
  discontinuityUpdate$: Observable<IDiscontinuityEvent>
) : Observable<IStalledEvent | IUnstalledEvent | IWarningEvent> {
  const initialDiscontinuitiesStore : IDiscontinuityStoredInfo[] = [];

  /**
   * Emit every known audio and video buffer discontinuities in chronological
   * order (first ordered by Period's start, then by bufferType in any order.
   */
  const discontinuitiesStore$ = discontinuityUpdate$.pipe(
    withLatestFrom(playbackObserver.getReference().asObservable()),
    scan(
      (discontinuitiesStore, [evt, observation]) =>
        updateDiscontinuitiesStore(discontinuitiesStore, evt, observation),
      initialDiscontinuitiesStore));

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
  let lastSeekingPosition : number | null = null;

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

  let prevFreezingState : { attemptTimestamp : number } | null;

  /**
   * If we're rebuffering waiting on data of a "locked stream", seek into the
   * Period handled by that stream to unlock the situation.
   */
  const unlock$ = lockedStream$.pipe(
    withLatestFrom(playbackObserver.getReference().asObservable()),
    tap(([lockedStreamEvt, observation]) => {
      if (
        !observation.rebuffering ||
        observation.paused ||
        speed.getValue() <= 0 || (
          lockedStreamEvt.bufferType !== "audio" &&
          lockedStreamEvt.bufferType !== "video"
        )
      ) {
        return;
      }
      const currPos = observation.position;
      const rebufferingPos = observation.rebuffering.position ?? currPos;
      const lockedPeriodStart = lockedStreamEvt.period.start;
      if (currPos < lockedPeriodStart &&
          Math.abs(rebufferingPos - lockedPeriodStart) < 1)
      {
        log.warn("Init: rebuffering because of a future locked stream.\n" +
                 "Trying to unlock by seeking to the next Period");
        playbackObserver.setCurrentTime(lockedPeriodStart + 0.001);
      }
    }),
    // NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
    // first type parameter as `any` instead of the perfectly fine `unknown`,
    // leading to linter issues, as it forbids the usage of `any`.
    // This is why we're disabling the eslint rule.
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
    ignoreElements()
  );

  const playbackRateUpdates$ = updatePlaybackRate(playbackObserver, speed)
    .pipe(ignoreElements());
  const stall$ = playbackObserver.getReference().asObservable().pipe(
    withLatestFrom(discontinuitiesStore$),
    map(([observation, discontinuitiesStore]) => {
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
        lastSeekingPosition !== null &&
        observation.position < lastSeekingPosition
      ) {
        log.debug("Init: the device appeared to have seeked back by itself.");
        const now = performance.now();
        ignoredStallTimeStamp = now;
      }

      lastSeekingPosition = observation.seeking ?
        Math.max(observation.pendingInternalSeek ?? 0, observation.position) :
        null;

      if (freezing !== null) {
        const now = performance.now();

        const referenceTimestamp = prevFreezingState === null ?
          freezing.timestamp :
          prevFreezingState.attemptTimestamp;

        if (now - referenceTimestamp > UNFREEZING_SEEK_DELAY) {
          log.warn("Init: trying to seek to un-freeze player");
          playbackObserver.setCurrentTime(
            playbackObserver.getCurrentTime() + UNFREEZING_DELTA_POSITION);
          prevFreezingState = { attemptTimestamp: now };
        }

        if (now - freezing.timestamp > FREEZING_STALLED_DELAY) {
          return { type: "stalled" as const,
                   value: "freezing" as const };
        }
      } else {
        prevFreezingState = null;
      }

      if (rebuffering === null) {
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
          return { type: "stalled" as const,
                   value: reason };
        }
        return { type: "unstalled" as const,
                 value: null };
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
          log.debug("Init: letting the device get out of a stall by itself");
          return { type: "stalled" as const,
                   value: stalledReason };
        } else {
          log.warn("Init: ignored stall for too long, checking discontinuity",
                   now - ignoredStallTimeStamp);
        }
      }

      ignoredStallTimeStamp = null;

      if (manifest === null) {
        return { type: "stalled" as const,
                 value: stalledReason };
      }

      /** Position at which data is awaited. */
      const { position: stalledPosition } = rebuffering;

      if (stalledPosition !== null &&
          stalledPosition !== undefined &&
          speed.getValue() > 0)
      {
        const skippableDiscontinuity = findSeekableDiscontinuity(discontinuitiesStore,
                                                                 manifest,
                                                                 stalledPosition);
        if (skippableDiscontinuity !== null) {
          const realSeekTime = skippableDiscontinuity + 0.001;
          if (realSeekTime <= playbackObserver.getCurrentTime()) {
            log.info("Init: position to seek already reached, no seeking",
                     playbackObserver.getCurrentTime(), realSeekTime);
          } else {
            log.warn("SA: skippable discontinuity found in the stream",
                     position, realSeekTime);
            playbackObserver.setCurrentTime(realSeekTime);
            return EVENTS.warning(generateDiscontinuityError(stalledPosition,
                                                             realSeekTime));
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
        speed.getValue() > 0 &&
        nextBufferRangeGap < BUFFER_DISCONTINUITY_THRESHOLD
      ) {
        const seekTo = (freezePosition + nextBufferRangeGap + EPSILON);
        if (playbackObserver.getCurrentTime() < seekTo) {
          log.warn("Init: discontinuity encountered inferior to the threshold",
                   freezePosition, seekTo, BUFFER_DISCONTINUITY_THRESHOLD);
          playbackObserver.setCurrentTime(seekTo);
          return EVENTS.warning(generateDiscontinuityError(freezePosition, seekTo));
        }
      }

      // Are we in a discontinuity between periods ? -> Seek at the beginning of the
      //                                                next period
      for (let i = manifest.periods.length - 2; i >= 0; i--) {
        const period = manifest.periods[i];
        if (period.end !== undefined && period.end <= freezePosition) {
          if (manifest.periods[i + 1].start > freezePosition &&
              manifest.periods[i + 1].start > playbackObserver.getCurrentTime())
          {
            const nextPeriod = manifest.periods[i + 1];
            playbackObserver.setCurrentTime(nextPeriod.start);
            return EVENTS.warning(generateDiscontinuityError(freezePosition,
                                                             nextPeriod.start));

          }
          break;
        }
      }

      return { type: "stalled" as const,
               value: stalledReason };
    }));
  return observableMerge(unlock$, stall$, playbackRateUpdates$);
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
) : IDiscontinuityStoredInfo[] {
  // First, perform clean-up of old discontinuities
  while (discontinuitiesStore.length > 0 &&
         discontinuitiesStore[0].period.end !== undefined &&
         discontinuitiesStore[0].period.end + 10 < observation.position)
  {
    discontinuitiesStore.shift();
  }

  const { period, bufferType } = evt;
  if (bufferType !== "audio" && bufferType !== "video") {
    return discontinuitiesStore;
  }

  for (let i = 0; i < discontinuitiesStore.length; i++) {
    if (discontinuitiesStore[i].period.id === period.id) {
      if (discontinuitiesStore[i].bufferType === bufferType) {
        if (!eventContainsDiscontinuity(evt)) {
          discontinuitiesStore.splice(i, 1);
        } else {
          discontinuitiesStore[i] = evt;
        }
        return discontinuitiesStore;
      }
    } else if (discontinuitiesStore[i].period.start > period.start) {
      if (eventContainsDiscontinuity(evt)) {
        discontinuitiesStore.splice(i, 0, evt);
      }
      return discontinuitiesStore;
    }
  }
  if (eventContainsDiscontinuity(evt)) {
    discontinuitiesStore.push(evt);
  }
  return discontinuitiesStore;
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
 * Manage playback speed.
 * Set playback rate set by the user, pause playback when the player appear to
 * rebuffering and restore the speed once it appears to exit rebuffering status.
 *
 * @param {Object} playbackObserver
 * @param {Object} speed - last speed set by the user
 * @returns {Observable}
 */
function updatePlaybackRate(
  playbackObserver : PlaybackObserver,
  speed : IReadOnlySharedReference<number>
) : Observable<number> {
  const forcePause$ = playbackObserver.getReference().asObservable()
    .pipe(
      map((observation) => observation.rebuffering !== null),
      startWith(false),
      distinctUntilChanged()
    );

  return forcePause$
    .pipe(switchMap(shouldForcePause => {
      if (shouldForcePause) {
        return observableDefer(() => {
          log.info("Init: Pause playback to build buffer");
          playbackObserver.setPlaybackRate(0);
          return observableOf(0);
        });
      }
      return speed.asObservable()
        .pipe(tap((lastSpeed) => {
          log.info("Init: Resume playback speed", lastSpeed);
          playbackObserver.setPlaybackRate(lastSpeed);
        }));
    }));
}
