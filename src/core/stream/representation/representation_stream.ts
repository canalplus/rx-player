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

/**
 * This file allows to create RepresentationStreams.
 *
 * A RepresentationStream downloads and push segment for a single
 * Representation (e.g. a single video stream of a given quality).
 * It chooses which segments should be downloaded according to the current
 * position and what is currently buffered.
 */

import nextTick from "next-tick";
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
  finalize,
  ignoreElements,
  map,
  mergeMap,
  share,
  startWith,
  switchMap,
  take,
  takeWhile,
  withLatestFrom,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import {
  ISegmentParserInitSegment,
  ISegmentParserParsedInitSegment,
  ISegmentParserSegment,
} from "../../../transports";
import assertUnreachable from "../../../utils/assert_unreachable";
import objectAssign from "../../../utils/object_assign";
import { IStalledStatus } from "../../api";
import {
  IPrioritizedSegmentFetcher,
  IPrioritizedSegmentFetcherEvent,
  ISegmentFetcherWarning,
} from "../../fetchers";
import { SegmentBuffer } from "../../segment_buffers";
import EVENTS from "../events_generators";
import {
  IProtectedSegmentEvent,
  IQueuedSegment,
  IRepresentationStreamEvent,
  IStreamStatusEvent,
  IStreamEventAddedSegment,
  IStreamManifestMightBeOutOfSync,
  IStreamNeedsManifestRefresh,
  IStreamTerminatingEvent,
} from "../types";
import getBufferStatus from "./get_buffer_status";
import getSegmentPriority from "./get_segment_priority";
import pushInitSegment from "./push_init_segment";
import pushMediaSegment from "./push_media_segment";

/** Object emitted by the Stream's clock$ at each tick. */
export interface IRepresentationStreamClockTick {
  /** The position, in seconds, the media element was in at the time of the tick. */
  position : number;
 /**
  * Gap between the current position and the edge of a live content.
  * Not set for non-live contents.
  */
  liveGap? : number;
  /** If set, the player is currently stalled (blocked). */
  stalled : IStalledStatus|null;
  /**
   * Offset in seconds to add to the time to obtain the position we
   * actually want to download from.
   * This is mostly useful when starting to play a content, where `currentTime`
   * might still be equal to `0` but you actually want to download from a
   * starting position different from `0`.
   */
  wantedTimeOffset : number;
  /** Fetch the precize position currently in the HTMLMediaElement. */
  getCurrentTime() : number;
}

/** Item emitted by the `terminate$` Observable given to a RepresentationStream. */
export interface ITerminationOrder {
  /*
   * If `true`, the RepresentationStream should interrupt immediately every long
   * pending operations such as segment downloads.
   * If it is set to `false`, it can continue until those operations are
   * finished.
   */
  urgent : boolean;
}

/** Arguments to give to the RepresentationStream. */
export interface IRepresentationStreamArguments<T> {
  /** Periodically emits the current playback conditions. */
  clock$ : Observable<IRepresentationStreamClockTick>;
  /** The context of the Representation you want to load. */
  content: { adaptation : Adaptation;
             manifest : Manifest;
             period : Period;
             representation : Representation; };
  /** The `SegmentBuffer` on which segments will be pushed. */
  segmentBuffer : SegmentBuffer<T>;
  /** Interface used to load new segments. */
  segmentFetcher : IPrioritizedSegmentFetcher<T>;
  /**
   * Observable emitting when the RepresentationStream should "terminate".
   *
   * When this Observable emits, the RepresentationStream will begin a
   * "termination process": it will, depending on the type of termination
   * wanted, either stop immediately pending segment requests or wait until they
   * are finished before fully terminating (sending the
   * `IStreamTerminatingEvent` and then completing the `RepresentationStream`
   * Observable once the corresponding segments have been pushed).
   */
  terminate$ : Observable<ITerminationOrder>;
  /**
   * The buffer size we have to reach in seconds (compared to the current
   * position. When that size is reached, no segments will be loaded until it
   * goes below that size again.
   */
  bufferGoal$ : Observable<number>;
  /**
   * Bitrate threshold from which no "fast-switching" should occur on a segment.
   *
   * Fast-switching is an optimization allowing to replace segments from a
   * low-bitrate Representation by segments from a higher-bitrate
   * Representation. This allows the user to see/hear an improvement in quality
   * faster, hence "fast-switching".
   *
   * This Observable allows to limit this behavior to only allow the replacement
   * of segments with a bitrate lower than a specific value - the number emitted
   * by that Observable.
   *
   * If set to `undefined`, no threshold is active and any segment can be
   * replaced by higher quality segment(s).
   *
   * `0` can be emitted to disable any kind of fast-switching.
   */
  fastSwitchThreshold$: Observable< undefined | number>;
}

/** Internal event used to notify that the initialization segment has been parsed. */
type IParsedInitSegmentEvent<T> = ISegmentParserInitSegment<T> &
                                  { segment : ISegment };

/** Internal event used to notify that a media segment has been parsed. */
type IParsedSegmentEvent<T> = ISegmentParserSegment<T> &
                              { segment : ISegment };

/** Internal event used to notify that a segment has been fully-loaded. */
interface IEndOfSegmentEvent { type : "end-of-segment";
                               value: { segment : ISegment }; }

/** Internal event used to notify that a segment request is retried. */
interface ILoaderRetryEvent { type : "retry";
                              value : { segment : ISegment;
                                        error : ICustomError; };
}

/** Internal event sent when loading a segment. */
type ISegmentLoadingEvent<T> = IParsedSegmentEvent<T> |
                               IParsedInitSegmentEvent<T> |
                               IEndOfSegmentEvent |
                               ILoaderRetryEvent;

/** Object describing a pending Segment request. */
interface ISegmentRequestObject<T> {
  /** The segment the request is for. */
  segment : ISegment; // The Segment the request is for
  /** The request Observable itself. Can be used to update its priority. */
  request$ : Observable<IPrioritizedSegmentFetcherEvent<T>>;
  /** Last set priority of the segment request (lower number = higher priority). */
  priority : number; // The current priority of the request
}

/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SegmentBuffer and where the playback currently is.
 *
 * Multiple RepresentationStream observables can run on the same SegmentBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationStream<T>({
  bufferGoal$,
  clock$,
  content,
  fastSwitchThreshold$,
  segmentBuffer,
  segmentFetcher,
  terminate$,
} : IRepresentationStreamArguments<T>) : Observable<IRepresentationStreamEvent<T>> {
  const { manifest, period, adaptation, representation } = content;
  const bufferType = adaptation.type;
  const initSegmentInfo = representation.index.getInitSegment();

  /**
   * Initialization segment state for this representation.
   *   - `undefined` if we don't know because we didn't load it yet
   *   - `null` if there is no initialization segment
   */
  const initSegment$ = new BehaviorSubject<ISegmentParserParsedInitSegment<T> |
                                           null |
                                           undefined>(undefined);
  if (initSegmentInfo === null) {
    initSegment$.next(null);
  }

  /** Emit the last scheduled downloading queue for segments. */
  const downloadingQueue$ = new BehaviorSubject<{
    /**
     * Set when an initialization segment needs to be loaded in parallel of
     * segments in the last `downloadQueue`.
     */
    initSegment : IQueuedSegment | null;

    /** The queue of segments currently needed for download.  */
    segmentQueue : IQueuedSegment[];
  }>({ initSegment: null, segmentQueue: [] });

  /** Emit when the RepresentationStream asks to re-check which segments are needed. */
  const reCheckNeededSegments$ = new Subject<void>();

  /**
   * Keep track of the information about the pending segment request.
   * `null` if no segment request is pending in that RepresentationStream.
   */
  let currentSegmentRequest : ISegmentRequestObject<T>|null = null;

  /**
   * Keep track of the information about a possible pending init segment request.
   * `null` if no init segment request is pending in that RepresentationStream.
   */
  let initSegmentRequest : ISegmentRequestObject<T>|null = null;

  const status$ = observableCombineLatest([
    clock$,
    bufferGoal$,
    terminate$.pipe(take(1),
                    startWith(null)),
    reCheckNeededSegments$.pipe(startWith(undefined)) ]
  ).pipe(
    withLatestFrom(fastSwitchThreshold$),
    mergeMap(function (
      [ [ tick, bufferGoal, terminate ],
        fastSwitchThreshold ]
    ) : Observable<IStreamStatusEvent |
                   IStreamNeedsManifestRefresh |
                   IStreamTerminatingEvent>
    {
      const status = getBufferStatus(content,
                                     tick,
                                     fastSwitchThreshold,
                                     bufferGoal,
                                     segmentBuffer);
      const { neededSegments } = status;
      let neededInitSegment : IQueuedSegment | null = null;

      // Add initialization segment if required
      if (!representation.index.isInitialized()) {
        if (initSegmentInfo === null) {
          log.warn("Stream: Uninitialized index without an initialization segment");
        } else if (initSegment$.getValue() !== undefined) {
          log.warn("Stream: Uninitialized index with an already loaded " +
                   "initialization segment");
        } else {
          neededInitSegment = { segment: initSegmentInfo,
                                priority: getSegmentPriority(period.start, tick) };
        }
      } else if (neededSegments.length > 0 &&
                 initSegmentInfo !== null &&
                 initSegment$.getValue() === undefined)
      {
        // prepend initialization segment
        const initSegmentPriority = neededSegments[0].priority;
        neededInitSegment = { segment: initSegmentInfo,
                              priority: initSegmentPriority };
      }

      const mostNeededSegment = neededSegments[0];

      if (terminate !== null) {
        const { urgent } = terminate;
        if (urgent || (currentSegmentRequest === null && initSegmentRequest === null)) {
          log.debug(`Stream: ${urgent ? "urgent" : "no request"}, terminate now.`,
                    terminate.urgent,
                    bufferType);
          downloadingQueue$.next({ initSegment: null, segmentQueue: [] });
          downloadingQueue$.complete();
          return observableOf(EVENTS.streamTerminating());
        } else {
          // Check if we can stop requesting media segments
          if (currentSegmentRequest === null ||
              mostNeededSegment === undefined ||
              currentSegmentRequest.segment.id !== mostNeededSegment.segment.id)
          {
            if (initSegmentRequest === null || neededInitSegment === null) {
              log.debug("Stream: aborting possible segment requests, terminate.",
                        bufferType);
              downloadingQueue$.next({ initSegment: null, segmentQueue: [] });
              downloadingQueue$.complete();
              return observableOf(EVENTS.streamTerminating());
            } else if (initSegmentRequest.priority !== neededInitSegment.priority) {
              const { request$ } = initSegmentRequest;
              initSegmentRequest.priority = neededInitSegment.priority;
              segmentFetcher.updatePriority(request$, neededInitSegment.priority);
            }
          } else if (initSegmentRequest !== null) {
            if (neededInitSegment === null) {
              downloadingQueue$.next({ initSegment: null, segmentQueue: [] });
              downloadingQueue$.complete();
            } else if (neededInitSegment.priority !== initSegmentRequest.priority) {
              const { request$ } = initSegmentRequest;
              initSegmentRequest.priority = neededInitSegment.priority;
              segmentFetcher.updatePriority(request$, neededInitSegment.priority);
            }
          }
          log.debug("Stream: will terminate after pending request(s).", bufferType);
        }
      } else {
        if (currentSegmentRequest !== null && mostNeededSegment !== undefined &&
            currentSegmentRequest.priority !== mostNeededSegment.priority)
        {
          log.debug("Stream: update segment request priority.", bufferType);
          const { request$ } = currentSegmentRequest;
          currentSegmentRequest.priority = mostNeededSegment.priority;
          segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
        }
        if (initSegmentRequest !== null && neededInitSegment !== null &&
            initSegmentRequest.priority !== neededInitSegment.priority)
        {
          log.debug("Stream: update init segment request priority.", bufferType);
          const { request$ } = initSegmentRequest;
          initSegmentRequest.priority = neededInitSegment.priority;
          segmentFetcher.updatePriority(request$, neededInitSegment.priority);
        }
        downloadingQueue$.next({ initSegment: neededInitSegment,
                                 segmentQueue: neededSegments });
      }

      const bufferStatusEvt : Observable<IStreamStatusEvent> =
        observableOf({ type: "stream-status" as const,
                       value: { period,
                                position: tick.position,
                                bufferType,
                                imminentDiscontinuity: status.imminentDiscontinuity,
                                hasFinishedLoading: status.hasFinishedLoading,
                                neededSegments: status.neededSegments } });

      return status.shouldRefreshManifest ?
        observableConcat(observableOf(EVENTS.needsManifestRefresh()),
                         bufferStatusEvt) :
        bufferStatusEvt;
    }),
    takeWhile((e) => e.type !== "stream-terminating", true)
  );

  /**
   * Stream Media Queue:
   *   - download every media segments queued sequentially
   *   - when a media segment is loaded, append it to the SegmentBuffer
   */
  const mediaQueue$ = downloadingQueue$.pipe(
    filter(({ segmentQueue }) => {
      if (segmentQueue.length === 0) {
        return currentSegmentRequest !== null;
      } else if (currentSegmentRequest === null) {
        return true;
      }
      const mostNeededSegment = segmentQueue[0].segment;
      return currentSegmentRequest.segment.id !== mostNeededSegment.id;
    }),
    switchMap(({ segmentQueue }) =>
      segmentQueue.length > 0 ? loadSegmentsFromQueue() :
                                EMPTY),
    mergeMap(onLoaderEvent));

  const initSegmentPush$ = downloadingQueue$.pipe(
    distinctUntilChanged((prev, next) => !(prev.initSegment === null ||
                                           next.initSegment === null)),
    switchMap((nextQueue) => {
      if (nextQueue.initSegment === null) {
        return EMPTY;
      }
      return requestInitSegment(nextQueue.initSegment.priority);
    }),
    mergeMap(onLoaderEvent));

  return observableMerge(status$, initSegmentPush$, mediaQueue$).pipe(share());

  /**
   * Request every Segment in the ``downloadQueue`` on subscription.
   * Emit the data of a segment when a request succeeded.
   *
   * Important side-effects:
   *   - Mutates `currentSegmentRequest` when doing and finishing a request.
   *   - Will emit from reCheckNeededSegments$ Subject when it's done.
   *
   * Might emit warnings when a request is retried.
   *
   * Throws when the request will not be retried (configuration or un-retryable
   * error).
   * @returns {Observable}
   */
  function loadSegmentsFromQueue() : Observable<ISegmentLoadingEvent<T>> {
    const { segmentQueue } = downloadingQueue$.getValue();
    const currentNeededSegment = segmentQueue[0];

    return observableDefer(() =>
      recursivelyRequestSegments(currentNeededSegment)
    ).pipe(finalize(() => { currentSegmentRequest = null; }));

    function recursivelyRequestSegments(
      startingSegment : IQueuedSegment | undefined
    ) : Observable<ISegmentLoadingEvent<T>> {
      if (startingSegment === undefined) {
        nextTick(() => { reCheckNeededSegments$.next(); });
        return EMPTY;
      }
      const { segment, priority } = startingSegment;
      const context = { manifest, period, adaptation, representation, segment };
      const request$ = segmentFetcher.createRequest(context, priority);

      currentSegmentRequest = { segment, priority, request$ };
      return request$
        .pipe(mergeMap((evt) : Observable<ISegmentLoadingEvent<T>> => {
          switch (evt.type) {
            case "warning":
              return observableOf({ type: "retry" as const,
                                    value: { segment, error: evt.value } });
            case "interrupted":
              log.info("Stream: segment request interrupted temporarly.", segment);
              return EMPTY;

            case "ended":
              currentSegmentRequest = null;
              const lastQueue = downloadingQueue$.getValue().segmentQueue;
              if (lastQueue.length === 0) {
                nextTick(() => { reCheckNeededSegments$.next(); });
                return EMPTY;
              } else if (lastQueue[0].segment.id === segment.id) {
                lastQueue.shift();
              }
              return recursivelyRequestSegments(lastQueue[0]);

            case "chunk":
            case "chunk-complete":
              return initSegment$.pipe(
                filter((initSegmentVal) => initSegmentVal !== undefined),
                mergeMap((initSegmentState) => {
                  if (evt.type === "chunk-complete") {
                    return observableOf({ type: "end-of-segment" as const,
                                          value: { segment } });
                  }
                  const initTimescale = initSegmentState?.initTimescale;
                  return evt.parse(initTimescale).pipe(map(parserResponse => {
                    return objectAssign({ segment }, parserResponse);
                  }));
                }));

            default:
              assertUnreachable(evt);
          }
        }));
    }
  }

  /**
   * Load initialization segment and push it to the SegmentBuffer.
   * As its own function because the initialization segment is loaded with some
   * specificities.
   * @param {number} priority - Priority number for the initialization segment's
   * request.
   * @returns {Observable}
   */
  function requestInitSegment(
    priority : number
  ) : Observable<ISegmentLoadingEvent<T>> {
    if (initSegmentInfo === null) {
      initSegment$.next(null);
      initSegmentRequest = null;
      return EMPTY;
    }
    const segment = initSegmentInfo;
    const context = { manifest, period, adaptation, representation, segment };
    const request$ = segmentFetcher.createRequest(context, priority);

    initSegmentRequest = { segment, priority, request$ };
    return request$
      .pipe(mergeMap((evt) : Observable<ISegmentLoadingEvent<T>> => {
        switch (evt.type) {
          case "warning":
            return observableOf({ type: "retry" as const,
                                  value: { segment, error: evt.value } });
          case "interrupted":
            log.info("Stream: init segment request interrupted temporarly.", segment);
            return EMPTY;

          case "chunk":
            return evt.parse(undefined).pipe(map(parserResponse => {
              return objectAssign({ segment }, parserResponse);
            }));

          case "chunk-complete":
            return observableOf({ type: "end-of-segment" as const,
                                  value: { segment } });

          case "ended":
            return EMPTY; // Do nothing, just here to check every case
          default:
            assertUnreachable(evt);
        }
      })).pipe(finalize(() => { initSegmentRequest = null; }));
  }

  /**
   * React to event from `loadSegmentsFromQueue`.
   * @param {Object} evt
   * @returns {Observable}
   */
  function onLoaderEvent(
    evt : ISegmentLoadingEvent<T>
  ) : Observable<IStreamEventAddedSegment<T> |
                 ISegmentFetcherWarning |
                 IProtectedSegmentEvent |
                 IStreamManifestMightBeOutOfSync>
  {
    switch (evt.type) {
      case "retry":
        return observableConcat(
          observableOf({ type: "warning" as const, value: evt.value.error }),
          observableDefer(() => { // better if done after warning is emitted
            const retriedSegment = evt.value.segment;
            const { index } = representation;
            if (index.isSegmentStillAvailable(retriedSegment) === false) {
              reCheckNeededSegments$.next();
            } else if (index.canBeOutOfSyncError(evt.value.error, retriedSegment)) {
              return observableOf(EVENTS.manifestMightBeOufOfSync());
            }
            return EMPTY; // else, ignore.
          }));

      case "parsed-init-segment":
        initSegment$.next(evt.value);
        const protectedEvents$ = observableOf(
          ...evt.value.segmentProtections.map(segmentProt => {
            return EVENTS.protectedSegment(segmentProt);
          }));
        const pushEvent$ = pushInitSegment({ clock$,
                                             content,
                                             segment: evt.segment,
                                             segmentData: evt.value.initializationData,
                                             segmentBuffer });
        return observableMerge(protectedEvents$, pushEvent$);

      case "parsed-segment":
        const initSegmentData = initSegment$.getValue()?.initializationData ?? null;
        return pushMediaSegment({ clock$,
                                  content,
                                  initSegmentData,
                                  parsedSegment: evt.value,
                                  segment: evt.segment,
                                  segmentBuffer });

      case "end-of-segment": {
        const { segment } = evt.value;
        return segmentBuffer.endOfSegment(objectAssign({ segment }, content))
          .pipe(ignoreElements());
      }

      default:
        assertUnreachable(evt);
    }
  }
}
