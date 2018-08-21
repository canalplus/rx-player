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
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  filter,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  share,
  startWith,
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
import SortedList from "../../utils/sorted_list";
import WeakMapMemory from "../../utils/weak_map_memory";
import BufferManager, {
  createFakeBuffer,
  IAdaptationBufferEvent,
  IBufferClockTick,
} from "../buffer";
import {
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import SourceBufferManager, {
  getBufferTypes,
  IBufferType,
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../source_buffers";
import ActivePeriodEmitter, {
  IPeriodBufferInfos,
} from "./active_period_emitter";
import SegmentBookkeeper from "./segment_bookkeeper";
import EVENTS, {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  ICompletedBufferEvent,
  IEndOfStreamEvent,
  IPeriodBufferClearedEvent,
  IPeriodBufferReadyEvent,
  IResumeStreamEvent,
} from "./stream_events";

// Events coming from single PeriodBuffer
type IPeriodBufferEvent =
  IAdaptationBufferEvent<any> |
  IAdaptationChangeEvent;

// Events coming from function(s) managing multiple PeriodBuffers.
type IMultiplePeriodBuffersEvent =
  IPeriodBufferEvent |
  IPeriodBufferReadyEvent |
  IPeriodBufferClearedEvent |
  ICompletedBufferEvent;

// Every events sent by the BuffersHandler exported here.
export type IBufferHandlerEvent =
  IActivePeriodChangedEvent |
  IMultiplePeriodBuffersEvent |
  IEndOfStreamEvent |
  IResumeStreamEvent;

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
 * @param {Observable} wantedBufferAhead - Emit the wanted buffer goal
 * @param {Object} bufferManager - Will be used to create new AdaptationBuffers
 * at will.
 * @param {Object} sourceBufferManager - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentPipelinesManager - Download segments
 * @param {Object} segmentBookkeepers - use/create SegmentBookeepers lazily at will.
 * @param {Object} garbageCollectors - use/create GarbageCollectors lazily at will.
 * @param {Object} options
 * @returns {Observable}
 *
 * TODO Special case for image Buffer, where we want data for EVERY active
 * periods.
 *
 * TODO Special garbage collection for text and image buffers, as we want to
 * clean it for potentially very long sessions.
 */
export default function BuffersHandler(
  content : { manifest : Manifest; period : Period },
  clock$ : Observable<IBufferClockTick>,
  wantedBufferAhead$ : Observable<number>,
  bufferManager : BufferManager,
  sourceBufferManager : SourceBufferManager,
  segmentPipelinesManager : SegmentPipelinesManager<any>,
  segmentBookkeepers : WeakMapMemory<QueuedSourceBuffer<any>, SegmentBookkeeper>,
  garbageCollectors : WeakMapMemory<QueuedSourceBuffer<any>, Observable<never>>,
  options: {
    maxRetry? : number;
    maxRetryOffline? : number;
    textTrackOptions? : ITextTrackSourceBufferOptions;
  }
) : Observable<IBufferHandlerEvent> {
  const manifest = content.manifest;
  const firstPeriod = content.period;

  // Initialize all native source buffers from the first period at the same
  // time.
  // We cannot lazily create native sourcebuffers since the spec does not
  // allow adding them during playback.
  //
  // From https://w3c.github.io/media-source/#methods
  //    For example, a user agent may throw a QuotaExceededError
  //    exception if the media element has reached the HAVE_METADATA
  //    readyState. This can occur if the user agent's media engine
  //    does not support adding more tracks during playback.
  createNativeSourceBuffersForPeriod(sourceBufferManager, firstPeriod);

  const addPeriodBuffer$ = new Subject<IPeriodBufferInfos>();
  const removePeriodBuffer$ = new Subject<IPeriodBufferInfos>();

  const bufferTypes = getBufferTypes();

  /**
   * Every PeriodBuffers for every possible types
   * @type {Array.<Observable>}
   */
  const buffersArray = bufferTypes
    .map((bufferType) => {
      return manageEveryBuffers(bufferType, firstPeriod)
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
  const streamHasEnded$ = buffersAreComplete(...buffersArray)
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
     * Keep a PeriodList for cases such as seeking ahead/before the
     * buffers already created.
     * When that happens, interrupt the previous buffers and create one back
     * from the new initial period.
     * @type {ConsecutivePeriodList}
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
          periodList.removeFirst(message.value.period);
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

    /**
     * Emits the chosen adaptation for the current type.
     * @type {ReplaySubject}
     */
    const adaptation$ = new ReplaySubject<Adaptation|null>(1);

    /**
     * Emits the Period of the next Period Buffer when it can be created.
     * @type {Subject}
     */
    const createNextPeriodBuffer$ = new Subject<Period>();

    /**
     * Emits when the Buffers for the next Periods should be destroyed, if
     * created.
     * @type {Subject}
     */
    const destroyNextBuffers$ = new Subject<void>();

    /**
     * Emits when the current position goes over the end of the current buffer.
     * @type {Subject}
     */
    const endOfCurrentBuffer$ = clock$
      .pipe(filter(({ currentTime, wantedTimeOffset }) =>
        !!basePeriod.end && (currentTime + wantedTimeOffset) >= basePeriod.end
      ));

    /**
     * Create Period Buffer for the next Period.
     * @type {Observable}
     */
    const nextPeriodBuffer$ = createNextPeriodBuffer$
      .pipe(exhaustMap((nextPeriod) => {
        return manageConsecutivePeriodBuffers(
          bufferType, nextPeriod, destroyNextBuffers$);
      }));

    /**
     * Allows to destroy each created Buffer, from the newest to the oldest,
     * once destroy$ emits.
     * @type {Observable}
     */
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

    /**
     * Will emit when the current buffer should be destroyed.
     * @type {Observable}
     */
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

    /**
     * Buffer for the current Period.
     * @type {Observable}
     */
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
          const _queuedSourceBuffer = sourceBufferManager.get(bufferType);
          cleanBuffer$ = _queuedSourceBuffer
            .removeBuffer({ start: period.start, end: period.end || Infinity })
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

      // 1 - create or reuse the SourceBuffer
      let queuedSourceBuffer : QueuedSourceBuffer<any>;
      if (sourceBufferManager.has(bufferType)) {
        log.info("reusing a previous SourceBuffer for the type", bufferType);
        queuedSourceBuffer = sourceBufferManager.get(bufferType);
      } else {
        const codec = getFirstDeclaredMimeType(adaptation);
        const sourceBufferOptions = bufferType === "text" ?
          options.textTrackOptions : undefined;
        queuedSourceBuffer = sourceBufferManager
          .createSourceBuffer(bufferType, codec, sourceBufferOptions);
      }

      // 2 - create or reuse the associated BufferGarbageCollector and
      // SegmentBookkeeper
      const bufferGarbageCollector$ = garbageCollectors.get(queuedSourceBuffer);
      const segmentBookkeeper = segmentBookkeepers.get(queuedSourceBuffer);

      // TODO Clean previous QueuedSourceBuffer for previous content in the period
      // // 3 - Clean possible content from a precedent adaptation in this period
      // // (take the clock into account to avoid removing "now" for native sourceBuffers)
      // // like:
      // return clock$.pluck("currentTime").take(1).mergeMap(currentTime => {
      // })

      // 3 - create the pipeline
      const pipelineOptions = getPipelineOptions(
        bufferType, options.maxRetry, options.maxRetryOffline);
      const pipeline = segmentPipelinesManager
        .createPipeline(bufferType, pipelineOptions);

      // 4 - create the Buffer
      const adaptationBuffer$ = bufferManager.createBuffer(
        clock$,
        queuedSourceBuffer,
        segmentBookkeeper,
        pipeline,
        wantedBufferAhead$,
        { manifest, period, adaptation }
      ).pipe(catchError<IAdaptationBufferEvent<any>, never>((error : Error) => {
        // non native buffer should not impact the stability of the
        // player. ie: if a text buffer sends an error, we want to
        // continue streaming without any subtitles
        if (!SourceBufferManager.isNative(bufferType)) {
          log.error("custom buffer: ", bufferType,
            "has crashed. Aborting it.", error);
          sourceBufferManager.disposeSourceBuffer(bufferType);
          return observableConcat(
            observableOf(EVENTS.warning(error)),
            createFakeBuffer(
              clock$, wantedBufferAhead$, bufferType, { manifest, period })
          );
        }

        log.error(
          "native buffer: ", bufferType, "has crashed. Stopping playback.", error);
        throw error; // else, throw
      }));

      // 5 - Return the buffer and send right events
      return observableConcat(
        observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)),
        observableMerge(adaptationBuffer$, bufferGarbageCollector$)
      );
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
      retry : config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;
  }

  maxRetryOffline = offlineRetry != null ?
    offlineRetry : config.DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;

  return {
    cache,
    maxRetry,
    maxRetryOffline,
  };
}

/**
 * Returns an Observable which emits ``true`` when all buffers given are
 * _complete_.
 * Returns false otherwise.
 *
 * A PeriodBuffer for a given type is considered _complete_ when both of these
 * conditions are true:
 *   - it is the last PeriodBuffer in the content for the given type
 *   - it has finished downloading segments (it is _full_)
 *
 * Simply put a _complete_ PeriodBuffer for a given type means that every
 * segments needed for this Buffer have been downloaded.
 *
 * When the Observable returned here emits, every Buffer are finished.
 * @param {...Observable} buffers
 * @returns {Observable}
 */
function buffersAreComplete(
  ...buffers : Array<Observable<IMultiplePeriodBuffersEvent>>
) : Observable<boolean> {
  /**
   * Array of Observables linked to the Array of Buffers which emit:
   *   - true when the corresponding buffer is considered _complete_.
   *   - false when the corresponding buffer is considered _active_.
   * @type {Array.<Observable>}
   */
  const isCompleteArray : Array<Observable<boolean>> = buffers
    .map((buffer) => {
      return buffer.pipe(
        filter((evt) => {
          return evt.type === "complete-buffer" || evt.type === "active-buffer";
        }),
        map((evt) => evt.type === "complete-buffer"),
        startWith(false),
        distinctUntilChanged()
      );
    });

  return observableCombineLatest(...isCompleteArray)
    .pipe(
      map((areComplete) => areComplete.every((isComplete) => isComplete)),
      distinctUntilChanged()
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

/**
 * Create all native SourceBuffers needed for a given Period.
 *
 * Native Buffers have the particulary to need to be created at the beginning of
 * the content.
 * Custom source buffers (entirely managed in JS) can generally be created and
 * disposed at will during the lifecycle of the content.
 * @param {SourceBufferManager} sourceBufferManager
 * @param {Period} period
 */
function createNativeSourceBuffersForPeriod(
  sourceBufferManager : SourceBufferManager,
  period : Period
) : void {
  Object.keys(period.adaptations).forEach(bufferType => {
    if (SourceBufferManager.isNative(bufferType)) {
      const adaptations = period.adaptations[bufferType] || [];
      const representations = adaptations ?
        adaptations[0].representations : [];
      if (representations.length) {
        const codec = representations[0].getMimeTypeString();
        sourceBufferManager.createSourceBuffer(bufferType, codec);
      }
    }
  });
}
