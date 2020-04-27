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
  BehaviorSubject,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  exhaustMap,
  filter,
  ignoreElements,
  map,
  mergeMap,
  share,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../../config";
import { MediaError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Period,
} from "../../../manifest";
import deferSubscriptions from "../../../utils/defer_subscriptions";
import { fromEvent } from "../../../utils/event_emitter";
import filterMap from "../../../utils/filter_map";
import SortedList from "../../../utils/sorted_list";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import { SegmentFetcherCreator } from "../../fetchers";
import SourceBuffersStore, {
  BufferGarbageCollector,
  getBufferTypes,
  IBufferType,
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../../source_buffers";
import EVENTS from "../events_generators";
import PeriodBuffer, {
  IPeriodBufferClockTick,
} from "../period";
import {
  IBufferOrchestratorEvent,
  IMultiplePeriodBuffersEvent,
  IPeriodBufferEvent,
} from "../types";
import ActivePeriodEmitter from "./active_period_emitter";
import areBuffersComplete from "./are_buffers_complete";
import getBlacklistedRanges from "./get_blacklisted_ranges";

export type IBufferOrchestratorClockTick = IPeriodBufferClockTick;

const { MAXIMUM_MAX_BUFFER_AHEAD,
        MAXIMUM_MAX_BUFFER_BEHIND } = config;

/**
 * Create and manage the various Buffer Observables needed for the content to
 * play:
 *
 *   - Create or dispose SourceBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SourceBuffers depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Buffers for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit various events to notify of its health and issues
 *
 * Here multiple buffers can be created at the same time to allow smooth
 * transitions between periods.
 * To do this, we dynamically create or destroy buffers as they are needed.
 * @param {Object} content
 * @param {Observable} clock$ - Emit position information
 * @param {Object} abrManager - Emit bitrate estimation and best Representation
 * to play.
 * @param {Object} sourceBuffersStore - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} options
 * @returns {Observable}
 *
 * TODO Special case for image Buffer, where we want data for EVERY active
 * periods.
 */
export default function BufferOrchestrator(
  content : { manifest : Manifest;
              initialPeriod : Period; },
  clock$ : Observable<IBufferOrchestratorClockTick>,
  abrManager : ABRManager,
  sourceBuffersStore : SourceBuffersStore,
  segmentFetcherCreator : SegmentFetcherCreator<any>,
  options: { wantedBufferAhead$ : BehaviorSubject<number>;
             maxBufferAhead$ : Observable<number>;
             maxBufferBehind$ : Observable<number>;
             textTrackOptions? : ITextTrackSourceBufferOptions;
             manualBitrateSwitchingMode : "seamless" | "direct"; }
) : Observable<IBufferOrchestratorEvent> {
  const { manifest, initialPeriod } = content;
  const { maxBufferAhead$, maxBufferBehind$, wantedBufferAhead$ } = options;

  // Keep track of a unique BufferGarbageCollector created per
  // QueuedSourceBuffer.
  const garbageCollectors =
    new WeakMapMemory((qSourceBuffer : QueuedSourceBuffer<unknown>) => {
      const { bufferType } = qSourceBuffer;
      const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
                                 MAXIMUM_MAX_BUFFER_BEHIND[bufferType] as number :
                                 Infinity;
      const defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
                                MAXIMUM_MAX_BUFFER_AHEAD[bufferType] as number :
                                Infinity;
      return BufferGarbageCollector({
        queuedSourceBuffer: qSourceBuffer,
        clock$: clock$.pipe(map(tick => tick.currentTime)),
        maxBufferBehind$: maxBufferBehind$
                            .pipe(map(val => Math.min(val, defaultMaxBehind))),
        maxBufferAhead$: maxBufferAhead$
                           .pipe(map(val => Math.min(val, defaultMaxAhead))),
      });
    });

  // trigger warnings when the wanted time is before or after the manifest's
  // segments
  const outOfManifest$ = clock$.pipe(
    filterMap(({ currentTime, wantedTimeOffset }) => {
      const position = wantedTimeOffset + currentTime;
      if (position < manifest.getMinimumPosition()) {
        const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST",
                                       "The current position is behind the " +
                                       "earliest time announced in the Manifest.");
        return EVENTS.warning(warning);
      } else if (position > manifest.getMaximumPosition()) {
        const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST",
                                       "The current position is after the latest " +
                                       "time announced in the Manifest.");
        return EVENTS.warning(warning);
      }
      return null;
    }, null));

  const bufferTypes = getBufferTypes();

  // Every PeriodBuffers for every possible types
  const buffersArray = bufferTypes.map((bufferType) => {
    return manageEveryBuffers(bufferType, initialPeriod)
      .pipe(deferSubscriptions(), share());
  });

  // Emits the activePeriodChanged events every time the active Period changes.
  const activePeriodChanged$ = ActivePeriodEmitter(buffersArray).pipe(
    filter((period) : period is Period => period != null),
    map(period => {
      log.info("Buffer: New active period", period);
      return EVENTS.activePeriodChanged(period);
    }));

  // Emits an "end-of-stream" event once every PeriodBuffer are complete.
  // Emits a 'resume-stream" when it's not
  const endOfStream$ = areBuffersComplete(...buffersArray)
    .pipe(map((areComplete) =>
      areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream()
    ));

  return observableMerge(...buffersArray,
                         activePeriodChanged$,
                         endOfStream$,
                         outOfManifest$);

  /**
   * Manage creation and removal of Buffers for every Periods for a given type.
   *
   * Works by creating consecutive buffers through the
   * `manageConsecutivePeriodBuffers` function, and restarting it when the clock
   * goes out of the bounds of these buffers.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @returns {Observable}
   */
  function manageEveryBuffers(
    bufferType : IBufferType,
    basePeriod : Period
  ) : Observable<IMultiplePeriodBuffersEvent> {
    // Each Period for which there is currently a Buffer, chronologically
    const periodList = new SortedList<Period>((a, b) => a.start - b.start);
    const destroyBuffers$ = new Subject<void>();

    // When set to `true`, all the currently active PeriodBuffer will be destroyed
    // and re-created from the new current position if we detect it to be out of
    // their bounds.
    // This is set to false when we're in the process of creating the first
    // PeriodBuffer, to avoid interferences while no PeriodBuffer is available.
    let enableOutOfBoundsCheck = false;

    /**
     * @param {Object} period
     * @returns {Observable}
     */
    function launchConsecutiveBuffersForPeriod(
      period : Period
    ) : Observable<IMultiplePeriodBuffersEvent> {
      return manageConsecutivePeriodBuffers(bufferType, period, destroyBuffers$).pipe(
        filterMap<IMultiplePeriodBuffersEvent,
                  IMultiplePeriodBuffersEvent,
                  null>((message) => {
          switch (message.type) {
            case "needs-media-source-reload":
              // Only reload the MediaSource when the more immediately required
              // Period is the one asking for it
              const firstPeriod = periodList.head();
              if (firstPeriod === undefined ||
                  firstPeriod.id !== message.value.period.id)
              {
                return null;
              }
              break;
            case "periodBufferReady":
              enableOutOfBoundsCheck = true;
              periodList.add(message.value.period);
              break;
            case "periodBufferCleared":
              periodList.removeElement(message.value.period);
              break;
          }
          return message;
        }, null),
        share()
      );
    }

    /**
     * Returns true if the given time is either:
     *   - less than the start of the chronologically first Period
     *   - more than the end of the chronologically last Period
     * @param {number} time
     * @returns {boolean}
     */
    function isOutOfPeriodList(time : number) : boolean {
      const head = periodList.head();
      const last = periodList.last();
      if (head == null || last == null) { // if no period
        return true;
      }
      return head.start > time ||
            (last.end == null ? Infinity :
                                last.end) < time;
    }

    // Restart the current buffer when the wanted time is in another period
    // than the ones already considered
    const restartBuffersWhenOutOfBounds$ = clock$.pipe(
      filter(({ currentTime, wantedTimeOffset }) => {
        return enableOutOfBoundsCheck &&
               manifest.getPeriodForTime(wantedTimeOffset +
                                           currentTime) !== undefined &&
               isOutOfPeriodList(wantedTimeOffset + currentTime);
      }),
      tap(({ currentTime, wantedTimeOffset }) => {
        log.info("BO: Current position out of the bounds of the active periods," +
                 "re-creating buffers.",
                 bufferType,
                 currentTime + wantedTimeOffset);
        enableOutOfBoundsCheck = false;
        destroyBuffers$.next();
      }),
      mergeMap(({ currentTime, wantedTimeOffset }) => {
        const newInitialPeriod = manifest
          .getPeriodForTime(currentTime + wantedTimeOffset);
        if (newInitialPeriod == null) {
          throw new MediaError("MEDIA_TIME_NOT_FOUND",
                               "The wanted position is not found in the Manifest.");
        }
        return launchConsecutiveBuffersForPeriod(newInitialPeriod);
      })
    );

    const handleDecipherabilityUpdate$ = fromEvent(manifest, "decipherabilityUpdate")
      .pipe(mergeMap((updates) => {
        const sourceBufferStatus = sourceBuffersStore.getStatus(bufferType);
        const hasType = updates.some(update => update.adaptation.type === bufferType);
        if (!hasType || sourceBufferStatus.type !== "initialized") {
          return EMPTY; // no need to stop the current buffers
        }
        const queuedSourceBuffer = sourceBufferStatus.value;
        const rangesToClean = getBlacklistedRanges(queuedSourceBuffer, updates);
        enableOutOfBoundsCheck = false;
        destroyBuffers$.next();
        return observableConcat(
          ...rangesToClean.map(({ start, end }) =>
            queuedSourceBuffer.removeBuffer(start, end).pipe(ignoreElements())),
          clock$.pipe(take(1), mergeMap((lastTick) => {
            return observableConcat(
              observableOf(EVENTS.needsDecipherabilityFlush(lastTick)),
              observableDefer(() => {
                const lastPosition = lastTick.currentTime + lastTick.wantedTimeOffset;
                const newInitialPeriod = manifest.getPeriodForTime(lastPosition);
                if (newInitialPeriod == null) {
                  throw new MediaError("MEDIA_TIME_NOT_FOUND",
                    "The wanted position is not found in the Manifest.");
                }
                return launchConsecutiveBuffersForPeriod(newInitialPeriod);
              }));
          })));
      }));

    return observableMerge(restartBuffersWhenOutOfBounds$,
                           handleDecipherabilityUpdate$,
                           launchConsecutiveBuffersForPeriod(basePeriod));
  }

  /**
   * Create lazily consecutive PeriodBuffers:
   *
   * It first creates the PeriodBuffer for `basePeriod` and - once it becomes
   * full - automatically creates the next chronological one.
   * This process repeats until the PeriodBuffer linked to the last Period is
   * full.
   *
   * If an "old" PeriodBuffer becomes active again, it destroys all PeriodBuffer
   * coming after it (from the last chronological one to the first).
   *
   * To clean-up PeriodBuffers, each one of them are also automatically
   * destroyed once the clock anounce a time superior or equal to the end of
   * the concerned Period.
   *
   * A "periodBufferReady" event is sent each times a new PeriodBuffer is
   * created. The first one (for `basePeriod`) should be sent synchronously on
   * subscription.
   *
   * A "periodBufferCleared" event is sent each times a PeriodBuffer is
   * destroyed.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @param {Observable} destroy$ - Emit when/if all created Buffers from this
   * point should be destroyed.
   * @returns {Observable}
   */
  function manageConsecutivePeriodBuffers(
    bufferType : IBufferType,
    basePeriod : Period,
    destroy$ : Observable<void>
  ) : Observable<IMultiplePeriodBuffersEvent> {
    log.info("BO: Creating new Buffer for", bufferType, basePeriod);

    // Emits the Period of the next Period Buffer when it can be created.
    const createNextPeriodBuffer$ = new Subject<Period>();

    // Emits when the Buffers for the next Periods should be destroyed, if
    // created.
    const destroyNextBuffers$ = new Subject<void>();

    // Emits when the current position goes over the end of the current buffer.
    const endOfCurrentBuffer$ = clock$
      .pipe(filter(({ currentTime, wantedTimeOffset }) =>
                     basePeriod.end != null &&
                    (currentTime + wantedTimeOffset) >= basePeriod.end));

    // Create Period Buffer for the next Period.
    const nextPeriodBuffer$ = createNextPeriodBuffer$
      .pipe(exhaustMap((nextPeriod) =>
        manageConsecutivePeriodBuffers(bufferType, nextPeriod, destroyNextBuffers$)
      ));

    // Allows to destroy each created Buffer, from the newest to the oldest,
    // once destroy$ emits.
    const destroyAll$ = destroy$.pipe(
      take(1),
      tap(() => {
        // first complete createNextBuffer$ to allow completion of the
        // nextPeriodBuffer$ observable once every further Buffers have been
        // cleared.
        createNextPeriodBuffer$.complete();

        // emit destruction signal to the next Buffer first
        destroyNextBuffers$.next();
        destroyNextBuffers$.complete(); // we do not need it anymore
      }),
      share() // share side-effects
    );

    // Will emit when the current buffer should be destroyed.
    const killCurrentBuffer$ = observableMerge(endOfCurrentBuffer$, destroyAll$);

    const periodBuffer$ = PeriodBuffer({ abrManager,
                                         bufferType,
                                         clock$,
                                         content: { manifest, period: basePeriod },
                                         garbageCollectors,
                                         segmentFetcherCreator,
                                         sourceBuffersStore,
                                         options,
                                         wantedBufferAhead$, }
    ).pipe(
      mergeMap((evt : IPeriodBufferEvent) : Observable<IMultiplePeriodBuffersEvent> => {
        const { type } = evt;
        if (type === "full-buffer") {
          const nextPeriod = manifest.getPeriodAfter(basePeriod);
          if (nextPeriod == null) {
            return observableOf(EVENTS.bufferComplete(bufferType));
          } else {
            // current buffer is full, create the next one if not
            createNextPeriodBuffer$.next(nextPeriod);
          }
        } else if (type === "active-buffer") {
          // current buffer is active, destroy next buffer if created
          destroyNextBuffers$.next();
        }
        return observableOf(evt);
      }),
      share()
    );

    // Buffer for the current Period.
    const currentBuffer$ : Observable<IMultiplePeriodBuffersEvent> =
      observableConcat(
        periodBuffer$.pipe(takeUntil(killCurrentBuffer$)),
        observableOf(EVENTS.periodBufferCleared(bufferType, basePeriod))
          .pipe(tap(() => {
            log.info("BO: Destroying buffer for", bufferType, basePeriod);
          }))
        );

    return observableMerge(currentBuffer$,
                           nextPeriodBuffer$,
                           destroyAll$.pipe(ignoreElements()));
  }
}
