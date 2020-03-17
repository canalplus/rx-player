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
  mergeMap,
  share,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import log from "../../../log";
import Manifest, {
  LoadedPeriod,
  PartialPeriod,
} from "../../../manifest";
import { fromEvent } from "../../../utils/event_emitter";
import filterMap from "../../../utils/filter_map";
import SortedList from "../../../utils/sorted_list";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import { SegmentFetcherCreator } from "../../fetchers";
import SourceBuffersStore, {
  IBufferType,
  QueuedSourceBuffer,
} from "../../source_buffers";
import EVENTS from "../events_generators";
import PeriodStream, {
  IPeriodStreamClockTick,
  IPeriodStreamOptions,
} from "../period";
import {
  ICompletedStreamEvent,
  IMultiplePeriodStreamsEvent,
  IPeriodStreamEvent,
} from "../types";
import getBlacklistedRanges from "./get_blacklisted_ranges";
import getPeriodForTime from "./get_period_for_time";
import resolvePartialPeriod from "./resolve_partial_period";

export { IPeriodStreamClockTick };

export interface IConsecutivePeriodStreamArguments {
  abrManager : ABRManager;
  clock$ : Observable<IPeriodStreamClockTick>;
  garbageCollectors : WeakMapMemory<QueuedSourceBuffer<unknown>, Observable<never>>;
  initialTime : number;
  manifest : Manifest;
  options : IPeriodStreamOptions;
  segmentFetcherCreator : SegmentFetcherCreator<any>;
  sourceBuffersStore : SourceBuffersStore;
}

/**
 * Handle creation and removal of Streams for every Periods for a given type.
 *
 * Works by creating consecutive Streams through the
 * `startConsecutivePeriodStreams` function, and resetting it when the clock
 * goes out of the bounds of these consecutive Periods.
 * @param {string} bufferType
 * @param {object} args - The huge list of requirements to create consecutive
 * PeriodStreams
 * @returns {Observable}
 */
export default function PeriodStreamCreator(
  bufferType : IBufferType,
  { abrManager,
    clock$,
    garbageCollectors,
    initialTime,
    manifest,
    options,
    segmentFetcherCreator,
    sourceBuffersStore } : IConsecutivePeriodStreamArguments
) : Observable<IMultiplePeriodStreamsEvent> {
  const destroyStreams$ = new Subject<void>();
  const periodList = new SortedList<LoadedPeriod |
                                    PartialPeriod>((a, b) => a.start - b.start);

  // When set to `true`, all the currently active PeriodStream will be destroyed
  // and re-created from the new current position if we detect it to be out of
  // their bounds.
  // This is set to false when we're in the process of creating the first
  // PeriodStream, to avoid interferences while no PeriodStream is available.
  let enableOutOfBoundsCheck = false;

  // Restart the current Stream when the wanted time is in another period
  // than the ones already considered
  const restartStreamsWhenOutOfBounds$ = clock$.pipe(
    filter(({ currentTime, wantedTimeOffset }) => {
      return enableOutOfBoundsCheck &&
             manifest.getPeriodForTime(wantedTimeOffset +
                                         currentTime) !== undefined &&
             isOutOfPeriodList(periodList, wantedTimeOffset + currentTime);
    }),
    tap(({ currentTime, wantedTimeOffset }) => {
      log.info("BO: Current position out of the bounds of the active periods," +
               "re-creating Streams.",
               bufferType,
               currentTime + wantedTimeOffset);
      enableOutOfBoundsCheck = false;
      destroyStreams$.next();
    }),
    mergeMap(({ currentTime, wantedTimeOffset }) => {
      return startConsecutivePeriodStreams(currentTime + wantedTimeOffset,
                                           destroyStreams$);
    })
  );

  const handleDecipherabilityUpdate$ = fromEvent(manifest, "decipherabilityUpdate")
    .pipe(mergeMap((updates) => {
      const sourceBufferStatus = sourceBuffersStore.getStatus(bufferType);
      const hasType = updates.some(update => update.adaptation.type === bufferType);
      if (!hasType || sourceBufferStatus.type !== "initialized") {
        return EMPTY; // no need to stop the current Streams
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
              return startConsecutivePeriodStreams(lastPosition, destroyStreams$);
            }));
        })));
    }));

  return observableMerge(restartStreamsWhenOutOfBounds$,
                         handleDecipherabilityUpdate$,
                         startConsecutivePeriodStreams(initialTime,
                                                       destroyStreams$));

  /**
   * Create consecutive PeriodStreams lazily and recursively.
   *
   * It first creates the PeriodStream from `fromTime` and - once it has
   * downloaded it to the end - automatically creates the next chronological
   * one.
   * This process repeats until the PeriodStream linked to the last Period is
   * full, at which time the `stream-complete` event will be sent.
   *
   * When a PeriodStream becomes active again - after being full - this function
   * will destroy all PeriodStream coming after it (from the last chronological
   * one to the first).
   *
   * To clean-up PeriodStreams, each one of them are also automatically
   * destroyed once the clock anounce a time superior or equal to the end of
   * the concerned Period.
   *
   * A "periodStreamCleared" event is sent each times a PeriodStream is
   * destroyed.
   * @param {number} baseTime - The time from which we will start the first
   * needed PeriodStream
   * @param {object} args - The huge list of requirements to create consecutive
   * PeriodStreams
   * @returns {Observable}
   */
  function startConsecutivePeriodStreams(
    fromTime : number,
    destroy$ : Observable<void>
  ) : Observable<IMultiplePeriodStreamsEvent> {
    const basePeriod = getPeriodForTime(manifest, fromTime);

    periodList.add(basePeriod);

    // Activate checks if not already done, now that at least a single Period is
    // considered
    enableOutOfBoundsCheck = true;

    if (basePeriod.isLoaded) {
      return onPeriodLoaded(basePeriod);
    }
    return resolvePartialPeriod(manifest, basePeriod, fromTime).pipe(
      takeUntil(destroy$.pipe(tap(() => {
        periodList.removeElement(basePeriod);
      }))),
      mergeMap((evt) : Observable<IMultiplePeriodStreamsEvent> => {
        if (evt.type === "needs-loaded-period") {
          return observableOf({ type: "needs-loaded-period" as const,
                                value: { type : bufferType,
                                period : evt.value.period }});
        }
        const fromPeriod = evt.value.period;
        periodList.removeElement(basePeriod);
        periodList.add(fromPeriod);
        return onPeriodLoaded(fromPeriod);
      }));

    function onPeriodLoaded(
      fromPeriod : LoadedPeriod
    ) : Observable<IMultiplePeriodStreamsEvent> {
      log.info("BO: Creating new Stream for", bufferType, fromPeriod);

      // Emits the wanted time of the next Period Stream when it can be created.
      const fullStream$ = new Subject<void>();

      // Emits when the Streams for the next Periods should be destroyed, if
      // created.
      const destroyNextStreams$ = new Subject<void>();

      // Emits when the current position goes over the end of the current Stream.
      const endOfCurrentStream$ = clock$.pipe(
        filter(({ currentTime, wantedTimeOffset }) =>
          fromPeriod.end != null &&
          (currentTime + wantedTimeOffset) >= fromPeriod.end));

      // Create Period Stream for the next Period.
      const nextPeriodStream$ = fullStream$.pipe(exhaustMap(() => {
        const nextPeriod = manifest.getPeriodAfter(fromPeriod);
        if (nextPeriod === null || fromPeriod.end === undefined) {
          return observableOf(EVENTS.streamComplete(bufferType));
        }
        const nextWantedTime = Math.max(nextPeriod.start, fromPeriod.end);
        return startConsecutivePeriodStreams(nextWantedTime, destroyNextStreams$);
      }));

      // Allows to destroy each created Stream, from the newest to the oldest,
      // once destroy$ emits.
      const destroyAll$ = destroy$.pipe(
        take(1),
        tap(() => {
          // first complete createNextStream$ to allow completion of the
          // nextPeriodStream$ observable once every further Streams have been
          // cleared.
          fullStream$.complete();

          // emit destruction signal to the next Stream first
          destroyNextStreams$.next();
          destroyNextStreams$.complete(); // we do not need it anymore
        }),
        share() // share side-effects
      );

      // Will emit when the current Stream should be destroyed.
      const killCurrentStream$ = observableMerge(endOfCurrentStream$, destroyAll$);

      function createPeriodStream(
        loadedPeriod : LoadedPeriod
      ) : Observable<IPeriodStreamEvent | ICompletedStreamEvent> {
        return PeriodStream({ abrManager,
                              bufferType,
                              clock$,
                              content: { manifest, period: loadedPeriod },
                              garbageCollectors,
                              segmentFetcherCreator,
                              sourceBuffersStore,
                              options }
        ).pipe(
          filterMap<IPeriodStreamEvent,
                    IPeriodStreamEvent,
                    null>((evt : IPeriodStreamEvent) => {
              switch (evt.type) {
                case "needs-media-source-reload":
                  // Only reload the MediaSource when the more immediately required
                  // Period is the one asking for it
                  const firstPeriod = periodList.head();
                  if (firstPeriod === undefined ||
                    firstPeriod.id !== evt.value.period.id)
                  {
                    return null;
                  }
                  break;
                case "full-stream":
                  fullStream$.next();
                  break;
                case "active-stream":
                  // current Stream is active, destroy next Stream if created
                  destroyNextStreams$.next();
                  break;
              }
              return evt;
            }, null),
          share()
        );
      }

      // Stream for the current Period.
      const currentStream$ : Observable<IMultiplePeriodStreamsEvent> =
      observableConcat(
        createPeriodStream(fromPeriod).pipe(takeUntil(killCurrentStream$)),
        observableOf(EVENTS.periodStreamCleared(bufferType, fromPeriod))
        .pipe(tap(() => {
          log.info("BO: Destroying Stream for", bufferType, fromPeriod);
          periodList.removeElement(fromPeriod);
        }))
      );

      return observableMerge(currentStream$,
                             nextPeriodStream$,
                             destroyAll$.pipe(ignoreElements()));
    }
  }
}

/**
 * Returns true if the given time is either:
 *   - less than the start of the chronologically first Period
 *   - more than the end of the chronologically last Period
 * @param {number} time
 * @returns {boolean}
 */
function isOutOfPeriodList(
  periodList : SortedList< LoadedPeriod | PartialPeriod >,
  time : number
) : boolean {
  const head = periodList.head();
  const last = periodList.last();
  if (head == null || last == null) { // if no period
    return true;
  }
  return head.start > time ||
        (last.end == null ? Infinity :
                            last.end) < time;
}
