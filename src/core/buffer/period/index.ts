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
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
} from "rxjs";
import {
  catchError,
  ignoreElements,
  mapTo,
  mergeMap,
  startWith,
  switchMap,
  take,
} from "rxjs/operators";
import config from "../../../config";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
} from "../../../manifest";
import arrayIncludes from "../../../utils/array-includes";
import InitializationSegmentCache from "../../../utils/initialization_segment_cache";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import {
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../../pipelines";
import SourceBufferManager, {
  IBufferType,
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../../source_buffers";
import AdaptationBuffer, {
  IAdaptationBufferClockTick,
} from "../adaptation";
import EVENTS from "../events_generators";
import SegmentBookkeeper from "../segment_bookkeeper";
import {
  IAdaptationBufferEvent,
  IBufferWarningEvent,
  IPeriodBufferEvent,
} from "../types";
import createFakeBuffer from "./create_fake_buffer";
import getAdaptationSwitchStrategy from "./get_adaptation_switch_strategy";

const {
  DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
  DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE,
} = config;

export type IPeriodBufferClockTick = IAdaptationBufferClockTick;

export interface IPeriodBufferArguments {
  abrManager : ABRManager;
  bufferType : IBufferType;
  clock$ : Observable<IPeriodBufferClockTick>;
  content : {
    manifest$ : BehaviorSubject<Manifest>;
    period : Period;
  };
  garbageCollectors : WeakMapMemory<QueuedSourceBuffer<unknown>, Observable<never>>;
  segmentBookkeepers : WeakMapMemory<QueuedSourceBuffer<unknown>, SegmentBookkeeper>;
  segmentPipelinesManager : SegmentPipelinesManager<any>;
  sourceBufferManager : SourceBufferManager;
  options: {
    manualBitrateSwitchingMode : "seamless"|"direct";
    offlineRetry? : number;
    segmentRetry? : number;
    textTrackOptions? : ITextTrackSourceBufferOptions;
    wantedBufferAhead$ : Observable<number>;
  };
}

/**
 * Create single PeriodBuffer Observable:
 *   - Lazily create (or reuse) a SourceBuffer for the given type.
 *   - Create a Buffer linked to an Adaptation each time it changes, to
 *     download and append the corresponding Segments in the SourceBuffer.
 *   - Announce when the Buffer is full or is awaiting new Segments through
 *     events
 * @returns {Observable}
 */
export default function PeriodBuffer({
  abrManager,
  bufferType,
  clock$,
  content,
  garbageCollectors,
  segmentBookkeepers,
  segmentPipelinesManager,
  sourceBufferManager,
  options,
} : IPeriodBufferArguments) : Observable<IPeriodBufferEvent> {
  const { period } = content;
  const { wantedBufferAhead$ } = options;

  // Emits the chosen adaptation for the current type.
  const adaptation$ = new ReplaySubject<Adaptation|null>(1);
  return adaptation$.pipe(
    switchMap((adaptation) => {
      if (adaptation == null) {
        log.info(`Buffer: Set no ${bufferType} Adaptation`, period);
        const previousQSourceBuffer = sourceBufferManager.get(bufferType);
        let cleanBuffer$ : Observable<unknown>;

        if (previousQSourceBuffer != null) {
          log.info(`Buffer: Clearing previous ${bufferType} SourceBuffer`);
          cleanBuffer$ = previousQSourceBuffer
            .removeBuffer(period.start, period.end || Infinity);
        } else {
          cleanBuffer$ = observableOf(null);
        }

        return observableConcat<IPeriodBufferEvent>(
          cleanBuffer$.pipe(mapTo(EVENTS.adaptationChange(bufferType, null, period))),
          createFakeBuffer(clock$, wantedBufferAhead$, bufferType, { period })
        );
      }

      log.info(`Buffer: Updating ${bufferType} adaptation`, adaptation, period);

      const newBuffer$ = clock$.pipe(
        take(1),
        mergeMap<IPeriodBufferClockTick, IPeriodBufferEvent>((tick) => {
          const qSourceBuffer = createOrReuseQueuedSourceBuffer(
            sourceBufferManager, bufferType, adaptation, options);
          const strategy = getAdaptationSwitchStrategy(
            qSourceBuffer.getBuffered(), period, bufferType, tick);

          if (strategy.type === "needs-reload") {
            return observableOf(EVENTS.needsMediaSourceReload());
          }

          const cleanBuffer$ = strategy.type === "clean-buffer" ?
            observableConcat(
              ...strategy.value.map(({ start, end }) =>
                qSourceBuffer.removeBuffer(start, end)
              )).pipe(ignoreElements()) : EMPTY;

          const bufferGarbageCollector$ = garbageCollectors.get(qSourceBuffer);
          const adaptationBuffer$ = createAdaptationBuffer(adaptation, qSourceBuffer);

          return observableConcat(
            cleanBuffer$,
            observableMerge(adaptationBuffer$, bufferGarbageCollector$)
          );
        }));

      return observableConcat<IPeriodBufferEvent>(
        observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)),
        newBuffer$
      );
    }),
    startWith(EVENTS.periodBufferReady(bufferType, period, adaptation$))
  );

  /**
   * @param {string} bufferType
   * @param {Object} period
   * @param {Object} adaptation
   * @param {Object} qSourceBuffer
   * @returns {Observable}
   */
  function createAdaptationBuffer<T>(
    adaptation : Adaptation,
    qSourceBuffer : QueuedSourceBuffer<T>
  ) : Observable<IAdaptationBufferEvent<T>|IBufferWarningEvent> {
    const { manifest$ } = content;
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
      { manifest$, period, adaptation },
      abrManager,
      options
    ).pipe(catchError((error : Error) => {
      // non native buffer should not impact the stability of the
      // player. ie: if a text buffer sends an error, we want to
      // continue playing without any subtitles
      if (!SourceBufferManager.isNative(bufferType)) {
        log.error(`Buffer: Custom ${bufferType} buffer crashed. Aborting it.`, error);
        sourceBufferManager.disposeSourceBuffer(bufferType);
        return observableConcat<IAdaptationBufferEvent<T>|IBufferWarningEvent>(
          observableOf(EVENTS.warning(error)),
          createFakeBuffer(clock$, wantedBufferAhead$, bufferType, { period })
        );
      }
      log.error(`Buffer: Native ${bufferType} buffer crashed. Stopping playback.`, error);
      throw error;
    }));
  }
}

/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseQueuedSourceBuffer<T>(
  sourceBufferManager : SourceBufferManager,
  bufferType : IBufferType,
  adaptation : Adaptation,
  options: { textTrackOptions? : ITextTrackSourceBufferOptions }
) : QueuedSourceBuffer<T> {
  const currentQSourceBuffer = sourceBufferManager.get(bufferType);
  if (currentQSourceBuffer != null) {
    log.info("Buffer: Reusing a previous SourceBuffer for the type", bufferType);
    return currentQSourceBuffer;
  }
  const codec = getFirstDeclaredMimeType(adaptation);
  const sbOptions = bufferType === "text" ?  options.textTrackOptions : undefined;
  return sourceBufferManager.createSourceBuffer(bufferType, codec, sbOptions);
}

/**
 * @param {string} bufferType
 * @param {number|undefined} retry
 * @param {number|undefined} offlineRetry
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

  return { cache, maxRetry, maxRetryOffline };
}

/**
 * Get mimetype string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation : Adaptation) : string {
  const { representations } = adaptation;
  return (representations[0] && representations[0].getMimeTypeString()) || "";
}
