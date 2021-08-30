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
  Observable,
  merge as observableMerge,
} from "rxjs";
import {
  ignoreElements,
  map,
  scan,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import isSeekingApproximate from "../../compat/is_seeking_approximate";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest, {
  Period,
} from "../../manifest";
import { getNextRangeGap } from "../../utils/ranges";
import { IBufferType } from "../segment_buffers";
import EVENTS from "../stream/events_generators";
import {
  IInitClockTick,
  IStalledEvent,
  IUnstalledEvent,
  IWarningEvent,
} from "./types";

const { BUFFER_DISCONTINUITY_THRESHOLD,
        FORCE_DISCONTINUITY_SEEK_DELAY,
        FREEZING_STALLED_DELAY,
        UNFREEZING_SEEK_DELAY,
        UNFREEZING_DELTA_POSITION } = config;

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
 * Monitor situations where playback is stalled and try to get out of those.
 * Emit "stalled" then "unstalled" respectively when an unavoidable stall is
 * encountered and exited.
 * @param {Observable} clock$ - Observable emitting the current playback
 * conditions.
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement on which the
 * media is played.
 * @param {Object} manifest - The Manifest of the currently-played content.
 * @param {Observable} discontinuityUpdate$ - Observable emitting encountered
 * discontinuities for loaded Period and buffer types.
 * @param {Function} setCurrentTime
 * @returns {Observable}
 */
export default function StallAvoider(
  clock$: Observable<IInitClockTick>,
  mediaElement : HTMLMediaElement,
  manifest: Manifest | null,
  discontinuityUpdate$: Observable<IDiscontinuityEvent>,
  lockedStream$ : Observable<ILockedStreamEvent>,
  setCurrentTime: (nb: number) => void
) : Observable<IStalledEvent | IUnstalledEvent | IWarningEvent> {
  const initialDiscontinuitiesStore : IDiscontinuityStoredInfo[] = [];

  /**
   * Emit every known audio and video buffer discontinuities in chronological
   * order (first ordered by Period's start, then by bufferType in any order.
   */
  const discontinuitiesStore$ = discontinuityUpdate$.pipe(
    withLatestFrom(clock$), // listen to clock to clean-up old discontinuities
    scan(
      (discontinuitiesStore, [evt, tick]) =>
        updateDiscontinuitiesStore(discontinuitiesStore, evt, tick),
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
    withLatestFrom(clock$),
    tap(([lockedStreamEvt, tick]) => {
      // TODO(PaulB) also skip when the user's wanted speed is set to `0`, as we
      // might not want to seek in that case?
      if (
        !tick.rebuffering ||
        tick.paused || (
          lockedStreamEvt.bufferType !== "audio" &&
          lockedStreamEvt.bufferType !== "video"
        )
      ) {
        return;
      }
      const currPos = tick.position;
      const rebufferingPos = tick.rebuffering.position ?? currPos;
      const lckdPeriodStart = lockedStreamEvt.period.start;
      if (currPos < lckdPeriodStart &&
          Math.abs(rebufferingPos - lckdPeriodStart) < 1)
      {
        log.warn("Init: rebuffering because of a future locked stream.\n" +
                 "Trying to unlock by seeking to the next Period");
        setCurrentTime(lckdPeriodStart + 0.001);
      }
    }),
    ignoreElements()
  );

  const stall$ = clock$.pipe(
    withLatestFrom(discontinuitiesStore$),
    map(([tick, discontinuitiesStore]) => {
      const { buffered,
              position,
              readyState,
              rebuffering,
              freezing } = tick;
      if (freezing !== null) {
        const now = performance.now();

        const referenceTimestamp = prevFreezingState === null ?
          freezing.timestamp :
          prevFreezingState.attemptTimestamp;

        if (now - referenceTimestamp > UNFREEZING_SEEK_DELAY) {
          log.warn("Init: trying to seek to un-freeze player");
          setCurrentTime(tick.getCurrentTime() + UNFREEZING_DELTA_POSITION);
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
          // With a readyState set to 1, we should still be not able to play,
          // anounce that we're stalled due to an unknown "freezing" status.
          return { type: "stalled" as const,
                   value: "freezing" as const };
        }
        return { type: "unstalled" as const,
                 value: null };
      }

      if (tick.seeking) {
        lastSeekingPosition = tick.position;
      } else if (lastSeekingPosition !== null) {
        const now = performance.now();
        if (ignoredStallTimeStamp === null) {
          ignoredStallTimeStamp = now;
        }
        if (isSeekingApproximate &&
            tick.position < lastSeekingPosition &&
            now - ignoredStallTimeStamp < FORCE_DISCONTINUITY_SEEK_DELAY)
        {
          return { type: "stalled" as const,
                   value: rebuffering.reason };
        }
        lastSeekingPosition = null;
      }

      ignoredStallTimeStamp = null;

      if (manifest === null) {
        return { type: "stalled" as const,
                 value: rebuffering.reason };
      }

      /** Position at which data is awaited. */
      const { position: stalledPosition } = rebuffering;

      if (stalledPosition !== null) {
        const skippableDiscontinuity = findSeekableDiscontinuity(discontinuitiesStore,
                                                                 manifest,
                                                                 stalledPosition);
        if (skippableDiscontinuity !== null) {
          const realSeekTime = skippableDiscontinuity + 0.001;
          if (realSeekTime <= mediaElement.currentTime) {
            log.info("Init: position to seek already reached, no seeking",
                     mediaElement.currentTime, realSeekTime);
          } else {
            log.warn("SA: skippable discontinuity found in the stream",
                     position, realSeekTime);
            setCurrentTime(realSeekTime);
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
      if (nextBufferRangeGap < BUFFER_DISCONTINUITY_THRESHOLD) {
        const seekTo = (freezePosition + nextBufferRangeGap + EPSILON);
        if (mediaElement.currentTime < seekTo) {
          log.warn("Init: discontinuity encountered inferior to the threshold",
                   freezePosition, seekTo, BUFFER_DISCONTINUITY_THRESHOLD);
          setCurrentTime(seekTo);
          return EVENTS.warning(generateDiscontinuityError(freezePosition, seekTo));
        }
      }

      // Are we in a discontinuity between periods ? -> Seek at the beginning of the
      //                                                next period
      for (let i = manifest.periods.length - 2; i >= 0; i--) {
        const period = manifest.periods[i];
        if (period.end !== undefined && period.end <= freezePosition) {
          if (manifest.periods[i + 1].start > freezePosition &&
              manifest.periods[i + 1].start > mediaElement.currentTime)
          {
            const nextPeriod = manifest.periods[i + 1];
            setCurrentTime(nextPeriod.start);
            return EVENTS.warning(generateDiscontinuityError(freezePosition,
                                                             nextPeriod.start));

          }
          break;
        }
      }

      return { type: "stalled" as const,
               value: rebuffering.reason };
    }));
  return observableMerge(unlock$, stall$);
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
 * @param {Object} tick
 * @returns {Array.<Object>}
 */
function updateDiscontinuitiesStore(
  discontinuitiesStore : IDiscontinuityStoredInfo[],
  evt : IDiscontinuityEvent,
  tick : IInitClockTick
) : IDiscontinuityStoredInfo[] {
  // First, perform clean-up of old discontinuities
  while (discontinuitiesStore.length > 0 &&
         discontinuitiesStore[0].period.end !== undefined &&
         discontinuitiesStore[0].period.end + 10 < tick.position)
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
