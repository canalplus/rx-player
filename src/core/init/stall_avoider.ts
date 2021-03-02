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

import { Observable } from "rxjs";
import {
  map,
  scan,
  withLatestFrom,
} from "rxjs/operators";
import { isPlaybackStuck } from "../../compat";
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

const { BUFFER_DISCONTINUITY_THRESHOLD } = config;

/**
 * Work-around rounding errors with floating points by setting an acceptable,
 * very short, deviation when checking equalities.
 */
const EPSILON = 1 / 60;

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
 * Emit "stalled" then "unstalled" respectably when an unavoidable stall is
 * encountered and exited.
 * @param {Observable} clock$ - Observable emitting the current playback
 * conditions.
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement on which the
 * media is played.
 * @param {Object} manifest - The Manifest of the currently-played content.
 * @param {Observable} discontinuityUpdate$ - Observable emitting encountered
 * discontinuities for loaded Period and buffer types.
 * @returns {Observable}
 */
export default function StallAvoider(
  clock$: Observable<IInitClockTick>,
  mediaElement : HTMLMediaElement,
  manifest: Manifest,
  discontinuityUpdate$: Observable<IDiscontinuityEvent>
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

  return clock$.pipe(
    withLatestFrom(discontinuitiesStore$),
    map(([tick, discontinuitiesStore]) => {
      const { buffered, currentRange, position, event, stalled } = tick;
      if (stalled === null) {
        return { type: "unstalled" as const,
                 value: null };
      }

      /** Position at which data is awaited. */
      const { position: stalledPosition } = stalled;

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
            mediaElement.currentTime = realSeekTime;
            return EVENTS.warning(generateDiscontinuityError(stalledPosition,
                                                             realSeekTime));
          }
        }
      }

      // Is it a browser bug? -> force seek at the same current time
      if (isPlaybackStuck(position,
                          currentRange,
                          event,
                          stalled !== null)
      ) {
        log.warn("Init: After freeze seek", position, currentRange);
        mediaElement.currentTime = position;
        return EVENTS.warning(generateDiscontinuityError(position,
                                                         position));

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
          mediaElement.currentTime = seekTo;
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
            mediaElement.currentTime = nextPeriod.start;
            return EVENTS.warning(generateDiscontinuityError(freezePosition,
                                                             nextPeriod.start));

          }
          break;
        }
      }

      return { type: "stalled" as const,
               value: stalled };
    }));
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
