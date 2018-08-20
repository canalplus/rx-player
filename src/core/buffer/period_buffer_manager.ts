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
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
} from "rxjs";
import {
  catchError,
  exhaustMap,
  filter,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  share,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest, {
  Adaptation,
  Period,
} from "../../manifest";
import arrayIncludes from "../../utils/array-includes";
import InitializationSegmentCache from "../../utils/initialization_segment_cache";
import {
  convertToRanges,
  keepRangeIntersection,
} from "../../utils/ranges";
import SortedList from "../../utils/sorted_list";
import WeakMapMemory from "../../utils/weak_map_memory";
import ABRManager from "../abr";
import {
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
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
import AdaptationBuffer, {
  IAdaptationBufferClockTick,
} from "./adaptation_buffer";
import areBuffersComplete from "./are_buffers_complete";
import createFakeBuffer from "./create_fake_buffer";
import EVENTS from "./events_generators";
import SegmentBookkeeper from "./segment_bookkeeper";
import {
  IAdaptationBufferEvent,
  IMultiplePeriodBuffersEvent,
  IPeriodBufferEvent,
  IPeriodBufferManagerEvent,
} from "./types";

export type IPeriodBufferManagerClockTick = IAdaptationBufferClockTick;

const {
  DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
  DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE,
  ADAPTATION_SWITCH_BUFFER_PADDINGS,
} = config;

/**
 * Create and manage the various Buffer Observables needed for the content to
 * stream:
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
 *
 * TODO Special garbage collection for text and image buffers, as we want to
 * clean it for potentially very long sessions.
 */
export default function PeriodBufferManager(
  content : { manifest : Manifest; initialPeriod : Period },
  clock$ : Observable<IPeriodBufferManagerClockTick>,
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
  }
) : Observable<IPeriodBufferManagerEvent> {
  const { manifest, initialPeriod } = content;

  const {
    wantedBufferAhead$,
    maxBufferAhead$,
    maxBufferBehind$,
  } = options;

  /**
   * Keep track of a unique BufferGarbageCollector created per
   * QueuedSourceBuffer.
   * @type {WeakMapMemory}
   */
  const garbageCollectors =
    new WeakMapMemory((qSourceBuffer : QueuedSourceBuffer<unknown>) =>
      BufferGarbageCollector({
        queuedSourceBuffer: qSourceBuffer,
        clock$: clock$.pipe(map(tick => tick.currentTime)),
        maxBufferBehind$,
        maxBufferAhead$,
      })
    );

  /**
   * Keep track of a unique segmentBookkeeper created per
   * QueuedSourceBuffer.
   * @type {WeakMapMemory}
   */
  const segmentBookkeepers =
    new WeakMapMemory<QueuedSourceBuffer<unknown>, SegmentBookkeeper>(() =>
      new SegmentBookkeeper()
    );

  const addPeriodBuffer$ = new Subject<IPeriodBufferInfos>();
  const removePeriodBuffer$ = new Subject<IPeriodBufferInfos>();

  const bufferTypes = getBufferTypes();

  /**
   * Every PeriodBuffers for every possible types
   * @type {Array.<Observable>}
   */
  const buffersArray = bufferTypes
    .map((bufferType) => {
      return manageEveryBuffers(bufferType, initialPeriod)
        .pipe(
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

  /**
   * Emits the active Period every time it changes
   * @type {Observable}
   */
  const activePeriod$ : Observable<Period> =
    ActivePeriodEmitter(bufferTypes, addPeriodBuffer$, removePeriodBuffer$)
      .pipe(filter((period) : period is Period => !!period));
  /**
   * Emits the activePeriodChanged events every time the active Period changes.
   * @type {Observable}
   */
  const activePeriodChanged$ = activePeriod$
    .pipe(
      tap((period : Period) => {
        log.info("new active period", period);
      }),
      map(period => EVENTS.activePeriodChanged(period))
    );

  /**
   * Emits an "end-of-stream" event once every PeriodBuffer are complete.
   * @type {Observable}
   */
  const streamHasEnded$ = areBuffersComplete(...buffersArray)
    .pipe(map((areComplete) =>
      areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream()
    ));

  return observableMerge(
    activePeriodChanged$,
    ...buffersArray,
    streamHasEnded$
  );

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
    /**
     * Keep a SortedList for cases such as seeking ahead/before the buffers
     * already created.
     * When that happens, interrupt the previous buffers and create one back
     * from the new initial period.
     * @type {SortedList}
     */
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
      return head.start > time ||
        (last.end || Infinity) < time;
    }

    /**
     * Destroy the current set of consecutive buffers.
     * Used when the clocks goes out of the bounds of those, e.g. when the user
     * seeks.
     * We can then re-create consecutive buffers, from the new point in time.
     * @type {Subject}
     */
    const destroyCurrentBuffers = new Subject<void>();

    const restartBuffers$ = clock$.pipe(

      filter(({ currentTime, wantedTimeOffset }) => {
        if (!manifest.getPeriodForTime(wantedTimeOffset + currentTime)) {
          // TODO Manage out-of-manifest situations
          return false;
        }
        return isOutOfPeriodList(wantedTimeOffset + currentTime);
      }),

      take(1),

      tap(({ currentTime, wantedTimeOffset }) => {
        log.info("Current position out of the bounds of the active periods," +
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
      bufferType,
      basePeriod,
      destroyCurrentBuffers
    ).pipe(
        tap((message) => {
        if (message.type === "periodBufferReady") {
          periodList.add(message.value.period);
        } else if (message.type === "periodBufferCleared") {
          periodList.removeElement(message.value.period);
        }
      }),
      share() // as always, with side-effects
    );

    return observableMerge(currentBuffers$, restartBuffers$);
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
   * @param {Observable} destroy$ - Emit when/if all created Buffer from this
   * point should be destroyed.
   * @returns {Observable}
   */
  function manageConsecutivePeriodBuffers(
    bufferType : IBufferType,
    basePeriod : Period,
    destroy$ : Observable<void>
  ) : Observable<IMultiplePeriodBuffersEvent> {
    log.info("creating new Buffer for", bufferType, basePeriod);

    // Emits the chosen adaptation for the current type.
    const adaptation$ = new ReplaySubject<Adaptation|null>(1);

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
      .pipe(exhaustMap((nextPeriod) => {
        return manageConsecutivePeriodBuffers(
          bufferType, nextPeriod, destroyNextBuffers$);
      }));

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

    const periodBuffer$ = createPeriodBuffer(bufferType, basePeriod, adaptation$).pipe(
      mergeMap((
        evt : IPeriodBufferEvent
      ) : Observable<IMultiplePeriodBuffersEvent> => {
        const { type } = evt;
        if (type === "full-buffer") {
          /**
           * The Period coming just after the current one.
           * @type {Period|undefined}
           */
          const nextPeriod = manifest.getPeriodAfter(basePeriod);

          if (nextPeriod == null) {
            // no more period, emits  event
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
        observableOf(EVENTS.periodBufferReady(bufferType, basePeriod, adaptation$)),
        periodBuffer$.pipe(takeUntil(killCurrentBuffer$)),
        observableOf(EVENTS.periodBufferCleared(bufferType, basePeriod))
          .pipe(tap(() => {
            log.info("destroying buffer for", bufferType, basePeriod);
          }))
        );

    return observableMerge(
      currentBuffer$,
      nextPeriodBuffer$,
      destroyAll$.pipe(ignoreElements())
    );
  }

  /**
   * Create single PeriodBuffer Observable:
   *   - Lazily create (or reuse) a SourceBuffer for the given type.
   *   - Create a Buffer linked to an Adaptation each time it changes, to
   *     download and append the corresponding Segments in the SourceBuffer.
   *   - Announce when the Buffer is full or is awaiting new Segments through
   *     events
   *
   * /!\ This Observable has multiple side-effects (creation of SourceBuffers,
   * downloading and appending of Segments etc.) on subscription.
   *
   * @param {string} bufferType
   * @param {Period} period - The period concerned
   * @param {Observable} adaptation$ - Emit the chosen adaptation.
   * Emit null to deactivate a type of adaptation
   * @returns {Observable}
   */
  function createPeriodBuffer(
    bufferType : IBufferType,
    period: Period,
    adaptation$ : Observable<Adaptation|null>
  ) : Observable<IPeriodBufferEvent> {
    return adaptation$.pipe(switchMap((adaptation) => {
      if (adaptation == null) {
        log.info(`set no ${bufferType} Adaptation`, period);
        let cleanBuffer$ : Observable<null>;

        if (sourceBufferManager.has(bufferType)) {
          log.info(`clearing previous ${bufferType} SourceBuffer`);
          const _qSourceBuffer = sourceBufferManager.get(bufferType);
          cleanBuffer$ = _qSourceBuffer
            .removeBuffer(period.start, period.end || Infinity)
            .pipe(mapTo(null));
        } else {
          cleanBuffer$ = observableOf(null);
        }

        return observableConcat(
          cleanBuffer$.pipe(mapTo(EVENTS.adaptationChange(bufferType, null, period))),
          createFakeBuffer(clock$, wantedBufferAhead$, bufferType, { manifest, period })
        );
      }

      log.info(`updating ${bufferType} adaptation`, adaptation, period);

      const qSourceBuffer = createOrReuseQueuedSourceBuffer(bufferType, adaptation);
      const cleanPreviousBuffer$ = clock$.pipe(
        take(1),
        mergeMap(({ currentTime }) =>
          cleanPreviousSourceBuffer(qSourceBuffer, period, bufferType, currentTime)
        )
      );
      const bufferGarbageCollector$ = garbageCollectors.get(qSourceBuffer);
      const adaptationBuffer$ = createAdaptationBuffer(
        bufferType, period, adaptation, qSourceBuffer);
      return observableConcat(
        observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)),
        cleanPreviousBuffer$.pipe(ignoreElements()),
        observableMerge(adaptationBuffer$, bufferGarbageCollector$)
      );
    }));
  }

  /**
   * @param {string} bufferType
   * @param {Object} adaptation
   * @returns {Object}
   */
  function createOrReuseQueuedSourceBuffer<T>(
    bufferType : IBufferType,
    adaptation : Adaptation
  ) : QueuedSourceBuffer<T> {
    if (sourceBufferManager.has(bufferType)) {
      log.info("reusing a previous SourceBuffer for the type", bufferType);
      return sourceBufferManager.get(bufferType);
    }
    const codec = getFirstDeclaredMimeType(adaptation);
    const sbOptions = bufferType === "text" ?  options.textTrackOptions : undefined;
    return sourceBufferManager.createSourceBuffer(bufferType, codec, sbOptions);
  }

  /**
   * @param {string} bufferType
   * @param {Object} period
   * @param {Object} adaptation
   * @param {Object} qSourceBuffer
   * @returns {Observable}
   */
  function createAdaptationBuffer<T>(
    bufferType : IBufferType,
    period: Period,
    adaptation : Adaptation,
    qSourceBuffer : QueuedSourceBuffer<T>
  ) : Observable<IAdaptationBufferEvent<T>> {
    const segmentBookkeeper = segmentBookkeepers.get(qSourceBuffer);
    const pipelineOptions = getPipelineOptions(
      bufferType, options.segmentRetry, options.offlineRetry);
    const pipeline = segmentPipelinesManager
      .createPipeline(bufferType, pipelineOptions);
     return AdaptationBuffer(
      clock$,
      qSourceBuffer,
      segmentBookkeeper,
      pipeline,
      wantedBufferAhead$,
      { manifest, period, adaptation },
      abrManager
    ).pipe(catchError<IAdaptationBufferEvent<T>, never>((error : Error) => {
      // non native buffer should not impact the stability of the
      // player. ie: if a text buffer sends an error, we want to
      // continue streaming without any subtitles
      if (!SourceBufferManager.isNative(bufferType)) {
        log.error("custom buffer: ", bufferType, "has crashed. Aborting it.", error);
        sourceBufferManager.disposeSourceBuffer(bufferType);
        return observableConcat<IPeriodBufferEvent>(
          observableOf(EVENTS.warning(error)),
          createFakeBuffer(clock$, wantedBufferAhead$, bufferType, { manifest, period })
        );
      }
      log.error(`native ${bufferType} buffer has crashed. Stopping playback.`, error);
      throw error;
    }));
  }
}

/**
 * @param {string} bufferType
 * @param {number} retry
 * @param {number} offlineRetry
 * @returns {Object} - Options to give to the Pipeline
 */
function getPipelineOptions(
  bufferType : string,
  retry? : number,
  offlineRetry? : number
) : IPipelineOptions<any, any> {
  const cache = arrayIncludes(["audio", "video"], bufferType) ?
    new InitializationSegmentCache<any>() : undefined;

  let maxRetry : number;
  let maxRetryOffline : number;

  if (bufferType === "image") {
    maxRetry = 0; // Deactivate BIF fetching if it fails
  } else {
    maxRetry = retry != null ?
      retry : DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;
  }

  maxRetryOffline = offlineRetry != null ?
    offlineRetry : DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;

  return {
    cache,
    maxRetry,
    maxRetryOffline,
  };
}

/**
 * Clean up previous SourceBuffer with paddings relative to the current
 * position.
 *
 * Those paddings are based on the config.
 * @param {QueuedSourceBuffer} qSourceBuffer
 * @param {Object} period
 * @param {string} bufferType
 * @param {number} currentTime
 * @returns {Observable}
 */
function cleanPreviousSourceBuffer(
  qSourceBuffer : QueuedSourceBuffer<unknown>,
  period : Period,
  bufferType : IBufferType,
  currentTime : number
) : Observable<void> {
  if (!qSourceBuffer.getBuffered().length) {
    return observableOf(undefined);
  }
  const bufferedRanges = convertToRanges(qSourceBuffer.getBuffered());
  const start = period.start;
  const end = period.end || Infinity;
  const intersection = keepRangeIntersection(bufferedRanges, [{ start, end }]);
  if (!intersection.length) {
    return observableOf(undefined);
  }

  const paddingBefore = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].before || 0;
  const paddingAfter = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].after || 0;
  if (
    !paddingAfter && !paddingBefore ||
    (currentTime - paddingBefore) >= end ||
    (currentTime + paddingAfter) <= start
  ) {
    return qSourceBuffer.removeBuffer(start, end);
  }
  if (currentTime - paddingBefore <= start) {
    return qSourceBuffer.removeBuffer(currentTime + paddingAfter, end);
  }
  if (currentTime + paddingAfter >= end) {
    return qSourceBuffer.removeBuffer(start, currentTime - paddingBefore);
  }
  return observableConcat(
    qSourceBuffer.removeBuffer(start, currentTime - paddingBefore),
    qSourceBuffer.removeBuffer(currentTime + paddingAfter, end)
  );
}

/**
 * Get mimetype string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation : Adaptation) : string {
  const { representations } = adaptation;
  return (
    representations[0] && representations[0].getMimeTypeString()
  ) || "";
}
