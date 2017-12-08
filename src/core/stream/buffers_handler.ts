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

import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { Subject } from "rxjs/Subject";
import {
  CustomError,
  MediaError,
} from "../../errors";
import Manifest, {
  Adaptation,
  Period,
} from "../../manifest";
import arrayIncludes from "../../utils/array-includes";
import InitializationSegmentCache from "../../utils/initialization_segment_cache";
import log from "../../utils/log";
import SortedList from "../../utils/sorted_list";
import WeakMapMemory from "../../utils/weak_map_memory";
import BufferManager, {
  IAdaptationBufferEvent,
  IBufferClockTick,
} from "../buffer";
import {
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import SourceBufferManager, {
  BUFFER_TYPES,
  QueuedSourceBuffer,
  SourceBufferOptions,
  SupportedBufferTypes,
} from "../source_buffers";
import ActivePeriodEmitter, {
  IPeriodBufferItem,
} from "./active_period_emitter";
import SegmentBookkeeper from "./segment_bookkeeper";
import EVENTS, {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  IPeriodBufferClearedEvent,
  IPeriodBufferReadyEvent,
} from "./stream_events";

/**
 * Events coming from single PeriodBuffer (Buffer linked to a Period and a type).
 */
type IPeriodBufferEvent =
  IAdaptationBufferEvent |
  IAdaptationChangeEvent;

/**
 * Events coming from function(s) managing multiple PeriodBuffers.
 */
type IMultiplePeriodBuffersEvent =
  IPeriodBufferEvent |
  IPeriodBufferReadyEvent |
  IPeriodBufferClearedEvent;

/**
 * Every events sent by the BuffersHandler exported here.
 */
export type IBufferHandlerEvent =
  IActivePeriodChangedEvent |
  IMultiplePeriodBuffersEvent;

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
 *
 * @param {Object} content
 * @param {Manifest} content.manifest
 * @param {Period} content.period - The first period to play in the content
 * @param {Observable} clock$ - Emit current informations about the content
 * being played. Also regulate the frequencies of the time the Buffer check
 * for new its status / new segments.
 * @param {BufferManager} bufferManager - Will be used to creates new
 * AdaptationBuffers at will
 * @param {SourceBufferManager} sourceBufferManager - Will be used to lazily
 * create SourceBuffer instances associated with the current content.
 * @param {SegmentPipelinesManager} segmentPipelinesManager - Used to download
 * segments.
 * @param {WeakMapMemory} segmentBookkeeper - Allow to easily retrieve
 * or create a unique SegmentBookkeeper per SourceBuffer
 * @param {WeakMapMemory} garbageCollectors - Allows to easily create a
 * unique Garbage Collector per SourceBuffer
 * @param {Object} sourceBufferOptions - Every SourceBuffer options, per type
 * @param {Subject} errorStream - Subject to emit minor errors
 * @returns {Observable}
 */
export default function BuffersHandler(
  { manifest, period: firstPeriod } : { manifest : Manifest; period : Period },
  clock$ : Observable<IBufferClockTick>,
  bufferManager : BufferManager,
  sourceBufferManager : SourceBufferManager,
  segmentPipelinesManager : SegmentPipelinesManager,
  segmentBookkeepers : WeakMapMemory<QueuedSourceBuffer<any>, SegmentBookkeeper>,
  garbageCollectors : WeakMapMemory<QueuedSourceBuffer<any>, Observable<never>>,
  sourceBufferOptions : Partial<Record<SupportedBufferTypes, SourceBufferOptions>>,
  errorStream : Subject<Error | CustomError>
) : Observable<IBufferHandlerEvent> {
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

  const addPeriodBuffer$ = new Subject<IPeriodBufferItem>();
  const removePeriodBuffer$ = new Subject<IPeriodBufferItem>();

  // Manage Buffers for every possible types of content
  const buffersArray = BUFFER_TYPES
    .map((adaptationType) => {
      // :/ TS does not have the intelligence to know that here
      const bufferType = adaptationType as SupportedBufferTypes;
      return manageEveryBuffers(bufferType, firstPeriod)
        .do((evt) => {
          if (evt.type === "periodBufferReady") {
            addPeriodBuffer$.next(evt.value);
          } else if (evt.type === "periodBufferCleared") {
            removePeriodBuffer$.next(evt.value);
          }
        }).share();
    });

  const activePeriod$ : Observable<Period> =
    ActivePeriodEmitter(addPeriodBuffer$, removePeriodBuffer$)
      .filter((period) : period is Period => !!period);

  return Observable.merge(
    activePeriod$
      .do((period : Period) => {
        log.info("new active period", period);
      })
      .map(period => EVENTS.activePeriodChanged(period)),
    ...buffersArray
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
    bufferType : SupportedBufferTypes,
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

    const restartBuffers$ = clock$
      .filter(({ currentTime, timeOffset }) =>
        isOutOfPeriodList(timeOffset + currentTime)
      )
      .take(1)
      .do(({ currentTime, timeOffset }) => {
        log.info("Current position out of the bounds of the active periods," +
          "re-creating buffers.", bufferType, currentTime + timeOffset);
        destroyCurrentBuffers.next();
      })
      .mergeMap(({ currentTime, timeOffset }) => {
        const newInitialPeriod = manifest.getPeriodForTime(currentTime + timeOffset);
        if (newInitialPeriod == null) {
          throw new MediaError("MEDIA_TIME_NOT_FOUND", null, true);
        }

        // Note: For this to work, manageEveryBuffers should always emit the
        // "periodBufferReady" event for the new InitialPeriod synchronously
        return manageEveryBuffers(bufferType, newInitialPeriod);
      });

    const currentBuffers$ = manageConsecutivePeriodBuffers(
      bufferType,
      basePeriod,
      destroyCurrentBuffers
    ).do((message) => {
      if (message.type === "periodBufferReady") {
        periodList.add(message.value.period);
      } else if (message.type === "periodBufferCleared") {
        periodList.removeFirst(message.value.period);
      }
    }).share(); // as always, with side-effects

    return Observable.merge(currentBuffers$, restartBuffers$);
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
    bufferType : SupportedBufferTypes,
    basePeriod : Period,
    destroy$ : Observable<void>
  ) : Observable<IMultiplePeriodBuffersEvent> {
    log.info("creating new Buffer for", bufferType, basePeriod);

    /**
     * Emit the chosen adaptation for the current type.
     * @type {ReplaySubject}
     */
    const adaptation$ = new ReplaySubject<Adaptation|null>(1);

    /**
     * The Period coming just after the current one.
     * @type {Period|undefined}
     */
    const nextPeriod = manifest.getPeriodAfter(basePeriod);

    /**
     * Will emit when the Buffer for the next Period can be created.
     * @type {Subject}
     */
    const createNextBuffers$ = new Subject<void>();

    /**
     * Will emit when the Buffers for the next Periods should be destroyed, if
     * created.
     * @type {Subject}
     */
    const destroyNextBuffers$ = new Subject<void>();

    /**
     * Emit when the current position goes over the end of the current buffer.
     * @type {Subject}
     */
    const endOfCurrentBuffer$ = clock$
      .filter(({ currentTime, timeOffset }) =>
        !!basePeriod.end && (currentTime + timeOffset) >= basePeriod.end
      );

    /**
     * Prepare Buffer for the next Period.
     * @type {Observable}
     */
    const nextPeriodBuffer$ = createNextBuffers$
      .exhaustMap(() => {
        if (!nextPeriod || nextPeriod === basePeriod) {
          return Observable.empty(); // finished
        }
        return manageConsecutivePeriodBuffers(
          bufferType, nextPeriod, destroyNextBuffers$);
      });

    /**
     * Allows to destroy each created Buffer, from the newest to the oldest,
     * once destroy$ emits.
     * @type {Observable}
     */
    const destroyAll$ = destroy$
      .take(1)
      .do(() => {
        // first complete createNextBuffer$ to allow completion of the
        // nextPeriodBuffer$ observable once every further Buffers have been
        // cleared.
        createNextBuffers$.complete();

        // emit destruction signal to the next Buffer first
        destroyNextBuffers$.next();
        destroyNextBuffers$.complete(); // we do not need it anymore
      }).share(); // share side-effects

    /**
     * Will emit when the current buffer should be destroyed.
     * @type {Observable}
     */
    const killCurrentBuffer$ = Observable.merge(endOfCurrentBuffer$, destroyAll$);

    const periodBuffer$ = createPeriodBuffer(bufferType, basePeriod, adaptation$)
      .do(({ type }) => {
        if (type === "full") {
          // current buffer is full, create the next one if not
          createNextBuffers$.next();
        } else if (type === "segments-queued") {
          // current buffer is active, destroy next buffer if created
          destroyNextBuffers$.next();
        }
      })
      .share();

    /**
     * Buffer for the current Period.
     * @type {Observable}
     */
    const currentBuffer$ : Observable<IMultiplePeriodBuffersEvent> =
      Observable.of(EVENTS.periodBufferReady(bufferType, basePeriod, adaptation$))
        .concat(periodBuffer$)
        .takeUntil(killCurrentBuffer$)
        .concat(
          Observable.of(EVENTS.periodBufferCleared(bufferType, basePeriod))
            .do(() => {
              log.info("destroying buffer for", bufferType, basePeriod);
            })
        );

    return Observable.merge(
      currentBuffer$,
      nextPeriodBuffer$,
      destroyAll$.ignoreElements()
    ) as Observable<IMultiplePeriodBuffersEvent>;
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
    bufferType : SupportedBufferTypes,
    period: Period,
    adaptation$ : Observable<Adaptation|null>
  ) : Observable<IPeriodBufferEvent> {
    return adaptation$.switchMap((adaptation) => {

      if (adaptation == null) {
        if (sourceBufferManager.has(bufferType)) {
          const _queuedSourceBuffer = sourceBufferManager.get(bufferType);

          // TODO use SegmentBookeeper to remove the complete range of segments
          // linked to this period (Min between that and period.start for example)
          // const segmentBookkeeper = segmentBookkeepers.get(queuedSourceBuffer);
          _queuedSourceBuffer
            .removeBuffer({ start: period.start, end: period.end || Infinity });
        }

        return Observable
          .of(EVENTS.adaptationChange(bufferType, null, period))
          .concat(bufferManager.createEmptyBuffer(clock$, { manifest, period }));
      }

      log.info(`updating ${bufferType} adaptation`, adaptation);

      // 1 - create or reuse the SourceBuffer
      let queuedSourceBuffer : QueuedSourceBuffer<any>;
      if (sourceBufferManager.has(bufferType)) {
        log.info("reusing a previous SourceBuffer for the type", bufferType);
        queuedSourceBuffer = sourceBufferManager.get(bufferType);
      } else {
        const codec = getFirstDeclaredMimeType(adaptation);
        queuedSourceBuffer = sourceBufferManager
          .createSourceBuffer(bufferType, codec, sourceBufferOptions[bufferType]);
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
      const pipelineOptions = getPipelineOptions(bufferType);
      const pipeline = segmentPipelinesManager
        .createPipeline(bufferType, pipelineOptions);

      // 4 - create the Buffer
      const adaptationBuffer$ = bufferManager.createBuffer(
        clock$,
        queuedSourceBuffer,
        segmentBookkeeper,
        pipeline,
        { manifest, period, adaptation }
      ).catch<IAdaptationBufferEvent, never>((error : Error) => {
        // non native buffer should not impact the stability of the
        // player. ie: if a text buffer sends an error, we want to
        // continue streaming without any subtitles
        if (!SourceBufferManager.isNative(bufferType)) {
          log.error("custom buffer: ", bufferType,
            "has crashed. Aborting it.", error);
          errorStream.next(error);
          return Observable.empty();
        }

        log.error(
          "native buffer: ", bufferType, "has crashed. Stopping playback.", error);
        throw error; // else, throw
      });

      // 5 - Return the buffer and send right events
      return Observable
        .of(EVENTS.adaptationChange(bufferType, adaptation, period))
        .concat(Observable.merge(adaptationBuffer$, bufferGarbageCollector$));
    });
  }
}

/**
 * Returns the pipeline options depending on the type of pipeline concerned.
 * @param {string} bufferType - e.g. "audio"|"text"...
 * @returns {Object} - Options to give to the Pipeline
 */
function getPipelineOptions(bufferType : string) : IPipelineOptions<any, any> {
  const downloaderOptions : IPipelineOptions<any, any> = {};

  if (arrayIncludes(["audio", "video"], bufferType)) {
    downloaderOptions.cache = new InitializationSegmentCache();
  } else if (bufferType === "image") {
    downloaderOptions.maxRetry = 0; // Deactivate BIF fetching if it fails
  }
  return downloaderOptions;
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
  Object.keys(period.adaptations).map(bufferType => {
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
