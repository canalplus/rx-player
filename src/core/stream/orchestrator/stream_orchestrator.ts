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
  combineLatest,
  concat as observableConcat,
  defer as observableDefer,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  ignoreElements,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  share,
  startWith,
  Subject,
  take,
  takeUntil,
  tap,
} from "rxjs";
import config from "../../../config";
import { MediaError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Period,
} from "../../../manifest";
import deferSubscriptions from "../../../utils/defer_subscriptions";
import { fromEvent } from "../../../utils/event_emitter";
import filterMap from "../../../utils/filter_map";
import { IReadOnlySharedReference } from "../../../utils/reference";
import nextTickObs from "../../../utils/rx-next-tick";
import SortedList from "../../../utils/sorted_list";
import WeakMapMemory from "../../../utils/weak_map_memory";
import { IRepresentationEstimator } from "../../adaptive";
import type { IReadOnlyPlaybackObserver } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import SegmentBuffersStore, {
  BufferGarbageCollector,
  IBufferType,
  SegmentBuffer,
} from "../../segment_buffers";
import EVENTS from "../events_generators";
import PeriodStream, {
  IPeriodStreamPlaybackObservation,
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

// NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
// first type parameter as `any` instead of the perfectly fine `unknown`,
// leading to linter issues, as it forbids the usage of `any`.
// This is why we're disabling the eslint rule.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

export type IStreamOrchestratorPlaybackObservation = IPeriodStreamPlaybackObservation;


/** Options tweaking the behavior of the StreamOrchestrator. */
export type IStreamOrchestratorOptions =
  IPeriodStreamOptions &
  { wantedBufferAhead : IReadOnlySharedReference<number>;
    maxVideoBufferSize : IReadOnlySharedReference<number>;
    maxBufferAhead : IReadOnlySharedReference<number>;
    maxBufferBehind : IReadOnlySharedReference<number>; };

/**
 * Create and manage the various Stream Observables needed for the content to
 * play:
 *
 *   - Create or dispose SegmentBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SegmentBuffers depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit various events to notify of its health and issues
 *
 * @param {Object} content
 * @param {Observable} playbackObserver - Emit position information
 * @param {Object} representationEstimator - Emit bitrate estimates and best
 * Representation to play.
 * @param {Object} segmentBuffersStore - Will be used to lazily create
 * SegmentBuffer instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} options
 * @returns {Observable}
 */
export default function StreamOrchestrator(
  content : { manifest : Manifest;
              initialPeriod : Period; },
  playbackObserver : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
  representationEstimator : IRepresentationEstimator,
  segmentBuffersStore : SegmentBuffersStore,
  segmentFetcherCreator : SegmentFetcherCreator,
  options: IStreamOrchestratorOptions
) : Observable<IStreamOrchestratorEvent> {
  const { manifest, initialPeriod } = content;
  const { maxBufferAhead,
          maxBufferBehind,
          wantedBufferAhead,
          maxVideoBufferSize } = options;

  const { MAXIMUM_MAX_BUFFER_AHEAD,
          MAXIMUM_MAX_BUFFER_BEHIND } = config.getCurrent();
  // Keep track of a unique BufferGarbageCollector created per
  // SegmentBuffer.
  const garbageCollectors =
    new WeakMapMemory((segmentBuffer : SegmentBuffer) => {
      const { bufferType } = segmentBuffer;
      const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
                                 MAXIMUM_MAX_BUFFER_BEHIND[bufferType] as number :
                                 Infinity;
      const defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
                                MAXIMUM_MAX_BUFFER_AHEAD[bufferType] as number :
                                Infinity;
      return BufferGarbageCollector({
        segmentBuffer,
        currentTime$: playbackObserver.getReference().asObservable()
          .pipe(map(o => o.position.pending ?? o.position.last)),
        maxBufferBehind$: maxBufferBehind.asObservable().pipe(
          map(val => Math.min(val, defaultMaxBehind))),
        maxBufferAhead$: maxBufferAhead.asObservable().pipe(
          map(val => Math.min(val, defaultMaxAhead))),
      });
    });

  // Every PeriodStreams for every possible types
  const streamsArray = segmentBuffersStore.getBufferTypes().map((bufferType) => {
    return manageEveryStreams(bufferType, initialPeriod)
      .pipe(deferSubscriptions(), share());
  });

  // Emits the activePeriodChanged events every time the active Period changes.
  const activePeriodChanged$ = ActivePeriodEmitter(streamsArray).pipe(
    filter((period) : period is Period => period !== null),
    map(period => {
      log.info("Stream: New active period", period.start);
      return EVENTS.activePeriodChanged(period);
    }));

  const isLastPeriodKnown$ = fromEvent(manifest, "manifestUpdate").pipe(
    map(() => manifest.isLastPeriodKnown),
    startWith(manifest.isLastPeriodKnown),
    distinctUntilChanged()
  );

  // Emits an "end-of-stream" event once every PeriodStream are complete.
  // Emits a 'resume-stream" when it's not
  const endOfStream$ = combineLatest([areStreamsComplete(...streamsArray),
                                      isLastPeriodKnown$])
    .pipe(map(([areComplete, isLastPeriodKnown]) => areComplete && isLastPeriodKnown),
          distinctUntilChanged(),
          map((emitEndOfStream) =>
            emitEndOfStream ? EVENTS.endOfStream() : EVENTS.resumeStream()));

  return observableMerge(...streamsArray, activePeriodChanged$, endOfStream$);

  /**
   * Manage creation and removal of Streams for every Periods for a given type.
   *
   * Works by creating consecutive Streams through the
   * `manageConsecutivePeriodStreams` function, and restarting it when the
   * current position goes out of the bounds of these Streams.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @returns {Observable}
   */
  function manageEveryStreams(
    bufferType : IBufferType,
    basePeriod : Period
  ) : Observable<IStreamOrchestratorEvent> {
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
    ) : Observable<IStreamOrchestratorEvent> {
      return manageConsecutivePeriodStreams(bufferType, period, destroyStreams$).pipe(
        map((message) => {
          switch (message.type) {
            case "waiting-media-source-reload":
              // Only reload the MediaSource when the more immediately required
              // Period is the one asking for it
              const firstPeriod = periodList.head();
              if (firstPeriod === undefined ||
                  firstPeriod.id !== message.value.period.id)
              {
                return EVENTS.lockedStream(message.value.bufferType,
                                           message.value.period);
              } else {
                const { position, autoPlay } = message.value;
                return EVENTS.needsMediaSourceReload(position, autoPlay);
              }
            case "periodStreamReady":
              enableOutOfBoundsCheck = true;
              periodList.add(message.value.period);
              break;
            case "periodStreamCleared":
              periodList.removeElement(message.value.period);
              break;
          }
          return message;
        }),
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
    const observation$ = playbackObserver.getReference().asObservable();
    const restartStreamsWhenOutOfBounds$ = observation$.pipe(
      filterMap<
        IStreamOrchestratorPlaybackObservation,
        Period,
        null
      >(({ position }) => {
        const time = position.pending ?? position.last;
        if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
          return null;
        }
        const nextPeriod = manifest.getPeriodForTime(time) ??
                           manifest.getNextPeriod(time);
        if (nextPeriod === undefined) {
          return null;
        }
        log.info("SO: Current position out of the bounds of the active periods," +
                 "re-creating Streams.",
                 bufferType,
                 time);
        enableOutOfBoundsCheck = false;
        destroyStreams$.next();
        return nextPeriod;
      }, null),
      mergeMap((newInitialPeriod) => {
        if (newInitialPeriod == null) {
          throw new MediaError("MEDIA_TIME_NOT_FOUND",
                               "The wanted position is not found in the Manifest.");
        }
        return launchConsecutiveStreamsForPeriod(newInitialPeriod);
      })
    );

    // Free the buffer of undecipherable data
    const handleDecipherabilityUpdate$ = fromEvent(manifest, "decipherabilityUpdate")
      .pipe(mergeMap((updates) => {
        const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
        const ofCurrentType = updates
          .filter(update => update.adaptation.type === bufferType);
        if (ofCurrentType.length === 0 || segmentBufferStatus.type !== "initialized") {
          return EMPTY; // no need to stop the current Streams.
        }
        const undecipherableUpdates = ofCurrentType.filter(update =>
          update.representation.decipherable === false);
        const segmentBuffer = segmentBufferStatus.value;
        const rangesToClean = getBlacklistedRanges(segmentBuffer, undecipherableUpdates);
        if (rangesToClean.length === 0) {
          // Nothing to clean => no buffer to flush.
          return EMPTY;
        }

        // We have to remove the undecipherable media data and then ask the
        // current media element to be "flushed"

        enableOutOfBoundsCheck = false;
        destroyStreams$.next();

        return observableConcat(
          ...rangesToClean.map(({ start, end }) =>
            start >= end ? EMPTY :
                           segmentBuffer.removeBuffer(start, end).pipe(ignoreElements())),

          // Schedule micro task before checking the last playback observation
          // to reduce the risk of race conditions where the next observation
          // was going to be emitted synchronously.
          nextTickObs().pipe(ignoreElements()),
          playbackObserver.getReference().asObservable().pipe(
            take(1),
            mergeMap((observation) => {
              const shouldAutoPlay = !(observation.paused.pending ??
                                       playbackObserver.getIsPaused());
              return observableConcat(
                observableOf(EVENTS.needsDecipherabilityFlush(observation.position.last,
                                                              shouldAutoPlay,
                                                              observation.duration)),
                observableDefer(() => {
                  const lastPosition = observation.position.pending ??
                                       observation.position.last;
                  const newInitialPeriod = manifest.getPeriodForTime(lastPosition);
                  if (newInitialPeriod == null) {
                    throw new MediaError(
                      "MEDIA_TIME_NOT_FOUND",
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
   * destroyed once the current position is superior or equal to the end of
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
    log.info("SO: Creating new Stream for", bufferType, basePeriod.start);

    // Emits the Period of the next Period Stream when it can be created.
    const createNextPeriodStream$ = new Subject<Period>();

    // Emits when the Streams for the next Periods should be destroyed, if
    // created.
    const destroyNextStreams$ = new Subject<void>();

    // Emits when the current position goes over the end of the current Stream.
    const endOfCurrentStream$ = playbackObserver.getReference().asObservable()
      .pipe(filter(({ position }) =>
        basePeriod.end != null &&
                    (position.pending ?? position.last) >= basePeriod.end));

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

    const periodStream$ = PeriodStream({ bufferType,
                                         content: { manifest, period: basePeriod },
                                         garbageCollectors,
                                         maxVideoBufferSize,
                                         segmentFetcherCreator,
                                         segmentBuffersStore,
                                         options,
                                         playbackObserver,
                                         representationEstimator,
                                         wantedBufferAhead }
    ).pipe(
      mergeMap((evt : IPeriodStreamEvent) : Observable<IMultiplePeriodStreamsEvent> => {
        if (evt.type === "stream-status") {
          if (evt.value.hasFinishedLoading) {
            const nextPeriod = manifest.getPeriodAfter(basePeriod);
            if (nextPeriod === null) {
              return observableConcat(observableOf(evt),
                                      observableOf(EVENTS.streamComplete(bufferType)));
            }

            // current Stream is full, create the next one if not
            createNextPeriodStream$.next(nextPeriod);
          } else {
            // current Stream is active, destroy next Stream if created
            destroyNextStreams$.next();
          }
        }
        return observableOf(evt);
      }),
      share()
    );

    // Stream for the current Period.
    const currentStream$ : Observable<IMultiplePeriodStreamsEvent> =
      observableConcat(
        periodStream$.pipe(takeUntil(killCurrentStream$)),
        observableOf(EVENTS.periodStreamCleared(bufferType, manifest, basePeriod))
          .pipe(tap(() => {
            log.info("SO: Destroying Stream for", bufferType, basePeriod.start);
          })));

    return observableMerge(currentStream$,
                           nextPeriodStream$,
                           destroyAll$.pipe(ignoreElements()));
  }
}
