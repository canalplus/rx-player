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
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest, {
  Period,
} from "../../manifest";
import SortedList from "../../utils/sorted_list";
import WeakMapMemory from "../../utils/weak_map_memory";
import ABRManager from "../abr";
import { SegmentPipelinesManager } from "../pipelines";
import SourceBufferManager, {
  BufferGarbageCollector,
  getBufferTypes,
  IBufferType,
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../source_buffers";
import ActivePeriodEmitter, {
  IPeriodBufferInfos,
} from "./active_period_emitter";
import areBuffersComplete from "./are_buffers_complete";
import EVENTS from "./events_generators";
import PeriodBuffer, {
  IPeriodBufferClockTick,
} from "./period";
import SegmentBookkeeper from "./segment_bookkeeper";
import {
  IBufferOrchestratorEvent,
  IMultiplePeriodBuffersEvent,
  IPeriodBufferEvent,
} from "./types";

export type IBufferOrchestratorClockTick = IPeriodBufferClockTick;

const {
  MAXIMUM_MAX_BUFFER_AHEAD,
  MAXIMUM_MAX_BUFFER_BEHIND,
} = config;

/**
 * Create and manage the various Buffer Observables needed for the content to
 * play:
 *
 *   - Create or dispose SourceBuffers depending on the chosen adaptations.
 *
 *   - Concatenate Buffers for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit events as Period or Adaptations change or as new Period are
 *     prepared.
 *
 * Here multiple buffers can be created at the same time to allow smooth
 * transitions between periods.
 * To do this, we dynamically create or destroy buffers as they are needed.
 * @param {Object} content
 * @param {Observable} clock$ - Emit position informations
 * @param {Object} abrManager - Emit bitrate estimation and best Representation
 * to play.
 * @param {Object} sourceBufferManager - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentPipelinesManager - Download segments
 * @param {Object} options
 * @returns {Observable}
 *
 * TODO Special case for image Buffer, where we want data for EVERY active
 * periods.
 */
export default function IBufferOrchestratorEvent(
  content : {
    manifest : Manifest;
    initialPeriod : Period;
  },
  clock$ : Observable<IBufferOrchestratorClockTick>,
  abrManager : ABRManager,
  sourceBufferManager : SourceBufferManager,
  segmentPipelinesManager : SegmentPipelinesManager<any>,
  options: {
    wantedBufferAhead$ : Observable<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>;
    segmentRetry? : number;
    offlineRetry? : number;
    textTrackOptions? : ITextTrackSourceBufferOptions;
    manualBitrateSwitchingMode : "seamless"|"direct";
  }
) : Observable<IBufferOrchestratorEvent> {
  const { manifest, initialPeriod } = content;
  const { maxBufferAhead$, maxBufferBehind$ } = options;

  // Keep track of a unique BufferGarbageCollector created per
  // QueuedSourceBuffer.
  const garbageCollectors =
    new WeakMapMemory((qSourceBuffer : QueuedSourceBuffer<unknown>) => {
      const { bufferType } = qSourceBuffer;
      const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
        MAXIMUM_MAX_BUFFER_BEHIND[bufferType] as number : Infinity;
      const defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
        MAXIMUM_MAX_BUFFER_AHEAD[bufferType] as number : Infinity;
      return BufferGarbageCollector({
        queuedSourceBuffer: qSourceBuffer,
        clock$: clock$.pipe(map(tick => tick.currentTime)),
        maxBufferBehind$: maxBufferBehind$
          .pipe(map(val => Math.min(val, defaultMaxBehind))),
        maxBufferAhead$: maxBufferAhead$
          .pipe(map(val => Math.min(val, defaultMaxAhead))),
      });
    });

  // Keep track of a unique segmentBookkeeper created per
  // QueuedSourceBuffer.
  const segmentBookkeepers =
    new WeakMapMemory<QueuedSourceBuffer<unknown>, SegmentBookkeeper>(() =>
      new SegmentBookkeeper()
    );

  const addPeriodBuffer$ = new Subject<IPeriodBufferInfos>();
  const removePeriodBuffer$ = new Subject<IPeriodBufferInfos>();
  const bufferTypes = getBufferTypes();

  // Every PeriodBuffers for every possible types
  const buffersArray = bufferTypes.map((bufferType) => {
    return manageEveryBuffers(bufferType, initialPeriod).pipe(
      tap((evt) => {
        if (evt.type === "periodBufferReady") {
          addPeriodBuffer$.next(evt.value);
        } else if (evt.type === "periodBufferCleared") {
          removePeriodBuffer$.next(evt.value);
        }
      }),
      share()
    );
  });

  // Emits the activePeriodChanged events every time the active Period changes.
  const activePeriodChanged$ =
    ActivePeriodEmitter(bufferTypes, addPeriodBuffer$, removePeriodBuffer$).pipe(
      filter((period) : period is Period => !!period),
      map(period => {
        log.info("Buffer: New active period", period);
        return EVENTS.activePeriodChanged(period);
      })
    );

  // Emits an "end-of-stream" event once every PeriodBuffer are complete.
  // Emits a 'resume-stream" when it's not
  const endOfStream$ = areBuffersComplete(...buffersArray)
    .pipe(map((areComplete) =>
      areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream()
    ));

  return observableMerge(activePeriodChanged$, ...buffersArray, endOfStream$);

  /**
   * Manage creation and removal of Buffers for every Periods.
   *
   * Works by creating consecutive buffers through the
   * manageConsecutivePeriodBuffers function, and restarting it when the clock
   * goes out of the bounds of these buffers.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @returns {Observable}
   */
  function manageEveryBuffers(
    bufferType : IBufferType,
    basePeriod : Period
  ) : Observable<IMultiplePeriodBuffersEvent> {
    // Each Period currently considered, chronologically
    const periodList = new SortedList<Period>((a, b) => a.start - b.start);

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
      return head.start > time || (last.end || Infinity) < time;
    }

    // Destroy the current set of consecutive buffers.
    // Used when the clocks goes out of the bounds of those, e.g. when the user
    // seeks.
    // We can then re-create consecutive buffers, from the new point in time.
    const destroyCurrentBuffers = new Subject<void>();

    // trigger warnings when the wanted time is before or after the manifest's
    // segments
    const outOfManifest$ = clock$.pipe(
      mergeMap(({ currentTime, wantedTimeOffset }) => {
        const position = wantedTimeOffset + currentTime;
        if (position < manifest.getMinimumPosition()) {
          const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", null, false);
          return observableOf(EVENTS.warning(warning));
        } else if (position > manifest.getMaximumPosition()) {
          const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST", null, false);
          return observableOf(EVENTS.warning(warning));
        }
        return EMPTY;
      })
    );

    // Restart the current buffer when the wanted time is in another period
    // than the ones already considered
    const restartBuffers$ = clock$.pipe(
      filter(({ currentTime, wantedTimeOffset }) => {
        return !!manifest.getPeriodForTime(wantedTimeOffset + currentTime) &&
          isOutOfPeriodList(wantedTimeOffset + currentTime);
      }),

      take(1),

      tap(({ currentTime, wantedTimeOffset }) => {
        log.info("Buffer: Current position out of the bounds of the active periods," +
          "re-creating buffers.", bufferType, currentTime + wantedTimeOffset);
        destroyCurrentBuffers.next();
      }),

      mergeMap(({ currentTime, wantedTimeOffset }) => {
        const newInitialPeriod = manifest
          .getPeriodForTime(currentTime + wantedTimeOffset);
        if (newInitialPeriod == null) {
          throw new MediaError("MEDIA_TIME_NOT_FOUND", null, true);
        } else {
        // Note: For this to work, manageEveryBuffers should always emit the
        // "periodBufferReady" event for the new InitialPeriod synchronously
        return manageEveryBuffers(bufferType, newInitialPeriod);
        }
      })
    );

    const currentBuffers$ = manageConsecutivePeriodBuffers(
      bufferType, basePeriod, destroyCurrentBuffers).pipe(
        tap((message) => {
          if (message.type === "periodBufferReady") {
            periodList.add(message.value.period);
          } else if (message.type === "periodBufferCleared") {
            periodList.removeElement(message.value.period);
          }
        }),
        share() // as always, with side-effects
      );

    return observableMerge(currentBuffers$, restartBuffers$, outOfManifest$);
  }

  /**
   * Manage creation and removal of Buffers for consecutive Periods.
   *
   * This function is called recursively for each successive Periods as needed.
   *
   * This function does not guarantee creation/destruction of the right Buffers
   * when the user seeks or rewind in the content.
   * It only manages regular playback, another layer should be used to manage
   * those cases.
   *
   * You can know about buffers creation and destruction respectively through
   * the "periodBufferReady" and "periodBufferCleared" events.
   *
   * The "periodBufferReady" related to the given period should be sent synchronously
   * on subscription.
   * Further "periodBufferReady" for further Periods should be sent each time the
   * Buffer for the previous Buffer is full.
   *
   * Buffers for each Period are cleared ("periodBufferCleared" event) either:
   *   - when it has finished to play (currentTime is after it)
   *   - when one of the older Buffers becomes active again, in which case the
   *     Buffers coming after will be cleared from the newest to the oldest.
   *   - when the destroy$ observable emits, in which case every created Buffer
   *     here will be cleared from the newest to the oldest.
   *
   * TODO The code here can surely be greatly simplified.
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
    log.info("Buffer: Creating new Buffer for", bufferType, basePeriod);

    // Emits the Period of the next Period Buffer when it can be created.
    const createNextPeriodBuffer$ = new Subject<Period>();

    // Emits when the Buffers for the next Periods should be destroyed, if
    // created.
    const destroyNextBuffers$ = new Subject<void>();

    // Emits when the current position goes over the end of the current buffer.
    const endOfCurrentBuffer$ = clock$
      .pipe(filter(({ currentTime, wantedTimeOffset }) =>
        !!basePeriod.end && (currentTime + wantedTimeOffset) >= basePeriod.end
      ));

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

    const periodBuffer$ = PeriodBuffer({
      abrManager,
      bufferType,
      clock$,
      content: { manifest, period: basePeriod },
      garbageCollectors,
      segmentBookkeepers,
      segmentPipelinesManager,
      sourceBufferManager,
      options,
    }).pipe(
      mergeMap((
        evt : IPeriodBufferEvent
      ) : Observable<IMultiplePeriodBuffersEvent> => {
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
            log.info("Buffer: Destroying buffer for", bufferType, basePeriod);
          }))
        );

    return observableMerge(
      currentBuffer$,
      nextPeriodBuffer$,
      destroyAll$.pipe(ignoreElements())
    );
  }
}
