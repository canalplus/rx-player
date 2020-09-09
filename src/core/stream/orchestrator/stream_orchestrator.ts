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
  IBufferType,
  QueuedSourceBuffer,
} from "../../source_buffers";
import EVENTS from "../events_generators";
import PeriodStream, {
  IPeriodStreamClockTick,
  IPeriodStreamOptions,
} from "../period";
import {
  IMultiplePeriodStreamsEvent,
  IPeriodStreamEvent,
  IStreamOrchestratorEvent,
} from "../types";
import ActivePeriodEmitter from "./active_period_emitter";
import areStreamsComplete from "./are_streams_complete";
import getBlacklistedRanges from "./get_blacklisted_ranges";

export type IStreamOrchestratorClockTick = IPeriodStreamClockTick;

const { MAXIMUM_MAX_BUFFER_AHEAD,
        MAXIMUM_MAX_BUFFER_BEHIND } = config;

/** Options tweaking the behavior of the StreamOrchestrator. */
export type IStreamOrchestratorOptions =
  IPeriodStreamOptions &
  { wantedBufferAhead$ : BehaviorSubject<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>; };

/**
 * Create and manage the various Stream Observables needed for the content to
 * play:
 *
 *   - Create or dispose SourceBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SourceBuffers depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit various events to notify of its health and issues
 *
 * Here multiple Streams can be created at the same time to allow smooth
 * transitions between periods.
 * To do this, we dynamically create or destroy Streams as they are needed.
 * @param {Object} content
 * @param {Observable} clock$ - Emit position information
 * @param {Object} abrManager - Emit bitrate estimates and best Representation
 * to play.
 * @param {Object} sourceBuffersStore - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} options
 * @returns {Observable}
 */
export default function StreamOrchestrator(
  content : { manifest : Manifest;
              initialPeriod : Period; },
  clock$ : Observable<IStreamOrchestratorClockTick>,
  abrManager : ABRManager,
  sourceBuffersStore : SourceBuffersStore,
  segmentFetcherCreator : SegmentFetcherCreator<any>,
  options: IStreamOrchestratorOptions
) : Observable<IStreamOrchestratorEvent> {
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

  const bufferTypes = sourceBuffersStore.getBufferTypes();

  // Every PeriodStreams for every possible types
  const streamsArray = bufferTypes.map((bufferType) => {
    return manageEveryStreams(bufferType, initialPeriod)
      .pipe(deferSubscriptions(), share());
  });

  // Emits the activePeriodChanged events every time the active Period changes.
  const activePeriodChanged$ = ActivePeriodEmitter(streamsArray).pipe(
    filter((period) : period is Period => period != null),
    map(period => {
      log.info("Stream: New active period", period);
      return EVENTS.activePeriodChanged(period);
    }));

  // Emits an "end-of-stream" event once every PeriodStream are complete.
  // Emits a 'resume-stream" when it's not
  const endOfStream$ = areStreamsComplete(...streamsArray)
    .pipe(map((areComplete) =>
      areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream()
    ));

  return observableMerge(...streamsArray,
                         activePeriodChanged$,
                         endOfStream$,
                         outOfManifest$);

  /**
   * Manage creation and removal of Streams for every Periods for a given type.
   *
   * Works by creating consecutive Streams through the
   * `manageConsecutivePeriodStreams` function, and restarting it when the clock
   * goes out of the bounds of these Streams.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @returns {Observable}
   */
  function manageEveryStreams(
    bufferType : IBufferType,
    basePeriod : Period
  ) : Observable<IMultiplePeriodStreamsEvent> {
    // Each Period for which there is currently a Stream, chronologically
    const periodList = new SortedList<Period>((a, b) => a.start - b.start);
    const destroyStreams$ = new Subject<void>();

    // When set to `true`, all the currently active PeriodStream will be destroyed
    // and re-created from the new current position if we detect it to be out of
    // their bounds.
    // This is set to false when we're in the process of creating the first
    // PeriodStream, to avoid interferences while no PeriodStream is available.
    let enableOutOfBoundsCheck = false;

    /**
     * @param {Object} period
     * @returns {Observable}
     */
    function launchConsecutiveStreamsForPeriod(
      period : Period
    ) : Observable<IMultiplePeriodStreamsEvent> {
      return manageConsecutivePeriodStreams(bufferType, period, destroyStreams$).pipe(
        filterMap<IMultiplePeriodStreamsEvent,
                  IMultiplePeriodStreamsEvent,
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
            case "periodStreamReady":
              enableOutOfBoundsCheck = true;
              periodList.add(message.value.period);
              break;
            case "periodStreamCleared":
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

    // Restart the current Stream when the wanted time is in another period
    // than the ones already considered
    const restartStreamsWhenOutOfBounds$ = clock$.pipe(
      filter(({ currentTime, wantedTimeOffset }) => {
        return enableOutOfBoundsCheck &&
               manifest.getPeriodForTime(wantedTimeOffset +
                                           currentTime) !== undefined &&
               isOutOfPeriodList(wantedTimeOffset + currentTime);
      }),
      tap(({ currentTime, wantedTimeOffset }) => {
        log.info("SO: Current position out of the bounds of the active periods," +
                 "re-creating Streams.",
                 bufferType,
                 currentTime + wantedTimeOffset);
        enableOutOfBoundsCheck = false;
        destroyStreams$.next();
      }),
      mergeMap(({ currentTime, wantedTimeOffset }) => {
        const newInitialPeriod = manifest
          .getPeriodForTime(currentTime + wantedTimeOffset);
        if (newInitialPeriod == null) {
          throw new MediaError("MEDIA_TIME_NOT_FOUND",
                               "The wanted position is not found in the Manifest.");
        }
        return launchConsecutiveStreamsForPeriod(newInitialPeriod);
      })
    );

    const handleDecipherabilityUpdate$ = fromEvent(manifest, "decipherabilityUpdate")
      .pipe(mergeMap((updates) => {
        const sourceBufferStatus = sourceBuffersStore.getStatus(bufferType);
        const hasType = updates.some(update => update.adaptation.type === bufferType);
        if (!hasType || sourceBufferStatus.type !== "initialized") {
          return EMPTY; // no need to stop the current Streams.
        }
        const queuedSourceBuffer = sourceBufferStatus.value;
        const rangesToClean = getBlacklistedRanges(queuedSourceBuffer, updates);
        enableOutOfBoundsCheck = false;
        destroyStreams$.next();
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
                return launchConsecutiveStreamsForPeriod(newInitialPeriod);
              }));
          })));
      }));

    return observableMerge(restartStreamsWhenOutOfBounds$,
                           handleDecipherabilityUpdate$,
                           launchConsecutiveStreamsForPeriod(basePeriod));
  }

  /**
   * Create lazily consecutive PeriodStreams:
   *
   * It first creates the PeriodStream for `basePeriod` and - once it becomes
   * full - automatically creates the next chronological one.
   * This process repeats until the PeriodStream linked to the last Period is
   * full.
   *
   * If an "old" PeriodStream becomes active again, it destroys all PeriodStream
   * coming after it (from the last chronological one to the first).
   *
   * To clean-up PeriodStreams, each one of them are also automatically
   * destroyed once the clock anounce a time superior or equal to the end of
   * the concerned Period.
   *
   * A "periodStreamReady" event is sent each times a new PeriodStream is
   * created. The first one (for `basePeriod`) should be sent synchronously on
   * subscription.
   *
   * A "periodStreamCleared" event is sent each times a PeriodStream is
   * destroyed.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @param {Observable} destroy$ - Emit when/if all created Streams from this
   * point should be destroyed.
   * @returns {Observable}
   */
  function manageConsecutivePeriodStreams(
    bufferType : IBufferType,
    basePeriod : Period,
    destroy$ : Observable<void>
  ) : Observable<IMultiplePeriodStreamsEvent> {
    log.info("SO: Creating new Stream for", bufferType, basePeriod);

    // Emits the Period of the next Period Stream when it can be created.
    const createNextPeriodStream$ = new Subject<Period>();

    // Emits when the Streams for the next Periods should be destroyed, if
    // created.
    const destroyNextStreams$ = new Subject<void>();

    // Emits when the current position goes over the end of the current Stream.
    const endOfCurrentStream$ = clock$
      .pipe(filter(({ currentTime, wantedTimeOffset }) =>
                     basePeriod.end != null &&
                    (currentTime + wantedTimeOffset) >= basePeriod.end));

    // Create Period Stream for the next Period.
    const nextPeriodStream$ = createNextPeriodStream$
      .pipe(exhaustMap((nextPeriod) =>
        manageConsecutivePeriodStreams(bufferType, nextPeriod, destroyNextStreams$)
      ));

    // Allows to destroy each created Stream, from the newest to the oldest,
    // once destroy$ emits.
    const destroyAll$ = destroy$.pipe(
      take(1),
      tap(() => {
        // first complete createNextStream$ to allow completion of the
        // nextPeriodStream$ observable once every further Streams have been
        // cleared.
        createNextPeriodStream$.complete();

        // emit destruction signal to the next Stream first
        destroyNextStreams$.next();
        destroyNextStreams$.complete(); // we do not need it anymore
      }),
      share() // share side-effects
    );

    // Will emit when the current Stream should be destroyed.
    const killCurrentStream$ = observableMerge(endOfCurrentStream$, destroyAll$);

    const periodStream$ = PeriodStream({ abrManager,
                                         bufferType,
                                         clock$,
                                         content: { manifest, period: basePeriod },
                                         garbageCollectors,
                                         segmentFetcherCreator,
                                         sourceBuffersStore,
                                         options,
                                         wantedBufferAhead$, }
    ).pipe(
      mergeMap((evt : IPeriodStreamEvent) : Observable<IMultiplePeriodStreamsEvent> => {
        const { type } = evt;
        if (type === "full-stream") {
          const nextPeriod = manifest.getPeriodAfter(basePeriod);
          if (nextPeriod == null) {
            return observableOf(EVENTS.streamComplete(bufferType));
          } else {
            // current Stream is full, create the next one if not
            createNextPeriodStream$.next(nextPeriod);
          }
        } else if (type === "active-stream") {
          // current Stream is active, destroy next Stream if created
          destroyNextStreams$.next();
        }
        return observableOf(evt);
      }),
      share()
    );

    // Stream for the current Period.
    const currentStream$ : Observable<IMultiplePeriodStreamsEvent> =
      observableConcat(
        periodStream$.pipe(takeUntil(killCurrentStream$)),
        observableOf(EVENTS.periodStreamCleared(bufferType, basePeriod))
          .pipe(tap(() => {
            log.info("SO: Destroying Stream for", bufferType, basePeriod);
          }))
        );

    return observableMerge(currentStream$,
                           nextPeriodStream$,
                           destroyAll$.pipe(ignoreElements()));
  }
}
