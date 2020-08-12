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
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
} from "rxjs";
import {
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
import { QueuedSourceBuffer } from "../../source_buffers";
import EVENTS from "../events_generators";
import {
  IProtectedSegmentEvent,
  IRepresentationStreamEvent,
  IStreamEventAddedSegment,
  IStreamManifestMightBeOutOfSync,
  IStreamNeedsDiscontinuitySeek,
  IStreamNeedsManifestRefresh,
  IStreamStateActive,
  IStreamStateFull,
  IStreamTerminatingEvent,
} from "../types";
import getNeededSegments from "./get_needed_segments";
import getSegmentPriority, {
  getPriorityForTime
} from "./get_segment_priority";
import getWantedRange from "./get_wanted_range";
import pushInitSegment from "./push_init_segment";
import pushMediaSegment from "./push_media_segment";

/** Object emitted by the Stream's clock$ at each tick. */
export interface IRepresentationStreamClockTick {
  /** The current position, in seconds the media element is in, in seconds. */
  currentTime : number;
 /**
  * Gap between the current position and the edge of a live content.
  * Not set for non-live contents.
  */
  liveGap? : number;
  /** If set, the player is currently stalled (blocked). */
  stalled : IStalledStatus|null;
  /**
   * Offset in seconds to add to `currentTime` to obtain the position we
   * actually want to download from.
   * This is mostly useful when starting to play a content, where `currentTime`
   * might still be equal to `0` but you actually want to download from a
   * starting position different from `0`.
   */
  wantedTimeOffset : number;
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
  /** The `QueuedSourceBuffer` on which segments will be pushed. */
  queuedSourceBuffer : QueuedSourceBuffer<T>;
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

/** Information about a Segment waiting to be loaded. */
interface IQueuedSegment {
  /** Priority of the segment request (lower number = higher priority). */
  priority : number;
  /** Segment wanted. */
  segment : ISegment;
}

/** Internal event used to anounce that the initialization segment has been parsed. */
type IParsedInitSegmentEvent<T> = ISegmentParserInitSegment<T> &
                                  { segment : ISegment };

/** Internal event used to anounce that a media segment has been parsed. */
type IParsedSegmentEvent<T> = ISegmentParserSegment<T> &
                              { segment : ISegment };

/** Internal event used to anounce that a segment has been fully-loaded. */
interface IEndOfSegmentEvent { type : "end-of-segment";
                               value: { segment : ISegment }; }

/** Internal event used to anounce that a segment request is retried. */
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
 * to what is already in the SourceBuffer and where the playback currently is.
 *
 * Multiple RepresentationStream observables can run on the same SourceBuffer.
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
  queuedSourceBuffer,
  segmentFetcher,
  terminate$,
} : IRepresentationStreamArguments<T>) : Observable<IRepresentationStreamEvent<T>> {
  const { manifest, period, adaptation, representation } = content;
  const bufferType = adaptation.type;
  const initSegment = representation.index.getInitSegment();

  /**
   * Saved initialization segment state for this representation.
   * `null` if the initialization segment hasn't been loaded yet.
   */
  let initSegmentObject : ISegmentParserParsedInitSegment<T> | null =
    initSegment == null ? { initializationData: null,
                            segmentProtections: [],
                            initTimescale: undefined } :
                          null;

  /** Segments queued for download in this RepresentationStream. */
  let downloadQueue : IQueuedSegment[] = [];

  /** Emit to start/restart a downloading Queue. */
  const startDownloadingQueue$ = new ReplaySubject<void>(1);

  /** Emit when the RepresentationStream asks to re-check which segments are needed. */
  const reCheckNeededSegments$ = new Subject<void>();

  /**
   * Keep track of the information about the pending segment request.
   * `null` if no segment request is pending in that RepresentationStream.
   */
  let currentSegmentRequest : ISegmentRequestObject<T>|null = null;

  const status$ = observableCombineLatest([
    clock$,
    bufferGoal$,
    terminate$.pipe(take(1),
                    startWith(null)),
    reCheckNeededSegments$.pipe(startWith(undefined)) ]
  ).pipe(
    withLatestFrom(fastSwitchThreshold$),
    map(function getCurrentStatus(
      [ [ timing, bufferGoal, terminate ],
        fastSwitchThreshold ]
    ) : { discontinuity : number;
          isFull : boolean;
          terminate : ITerminationOrder | null;
          neededSegments : IQueuedSegment[];
          shouldRefreshManifest : boolean; }
    {
      queuedSourceBuffer.synchronizeInventory();
      const neededRange = getWantedRange(period, timing, bufferGoal);

      const discontinuity = timing.stalled != null ?
        representation.index.checkDiscontinuity(timing.currentTime) :
        -1;

      const shouldRefreshManifest =
        representation.index.shouldRefresh(neededRange.start,
                                           neededRange.end);

      let neededSegments : IQueuedSegment[] = [];

      if (!representation.index.isInitialized()) {
        if (initSegment === null) {
          log.warn("Stream: Uninitialized index without an initialization segment");
        } else if (initSegmentObject !== null) {
          log.warn("Stream: Uninitialized index with an already loaded " +
                   "initialization segment");
        } else {
          neededSegments.push({ segment: initSegment,
                                priority: getPriorityForTime(period.start, timing) });
        }
      } else {
        neededSegments = getNeededSegments({ content,
                                             currentPlaybackTime: timing.currentTime,
                                             fastSwitchThreshold,
                                             neededRange,
                                             queuedSourceBuffer })
          .map((segment) => ({ priority: getSegmentPriority(segment, timing),
                               segment }));

        if (neededSegments.length > 0 &&
            initSegment !== null && initSegmentObject === null)
        {
          // prepend initialization segment
          const initSegmentPriority = neededSegments[0].priority;
          neededSegments = [ { segment: initSegment,
                               priority: initSegmentPriority },
                             ...neededSegments ];
        }
      }

      /**
       * `true` if the current Stream has loaded all the needed segments for
       * this Representation until the end of the Period.
       */
      let isFull : boolean;
      if (neededSegments.length > 0 || period.end == null) {
        // Either we still have segments to download or the current Period is
        // not yet ended: not full
        isFull = false;
      } else {
        const lastPosition = representation.index.getLastPosition();
        if (lastPosition === undefined) {
          // We do not know the end of this index.
          // If we reached the end of the period, check that all segments are
          // available.
          isFull = neededRange.end >= period.end &&
                   representation.index.isFinished();
        } else if (lastPosition === null) {
          // There is no available segment in the index currently. If the index
          // tells us it has finished generating new segments, we're done.
          isFull = representation.index.isFinished();
        } else {
          // We have a declared end. Check that our range went until the last
          // position available in the index. If that's the case and we're left
          // with no segments after filtering them, it means we already have
          // downloaded the last segments and have nothing left to do: full.
          const endOfRange = period.end != null ? Math.min(period.end,
                                                           lastPosition) :
                                                  lastPosition;
          isFull = neededRange.end >= endOfRange &&
                   representation.index.isFinished();
        }
      }

      return { discontinuity,
               isFull,
               terminate,
               neededSegments,
               shouldRefreshManifest };
    }),

    mergeMap(function handleStatus(status) : Observable<IStreamNeedsManifestRefresh |
                                                        IStreamNeedsDiscontinuitySeek |
                                                        IStreamStateFull |
                                                        IStreamStateActive |
                                                        IStreamTerminatingEvent
    > {
      const neededSegments = status.neededSegments;
      const mostNeededSegment = neededSegments[0];

      if (status.terminate !== null) {
        downloadQueue = [];
        if (status.terminate.urgent) {
          log.debug("Stream: urgent termination request, terminate.", bufferType);
          startDownloadingQueue$.complete(); // complete the downloading queue
          return observableOf(EVENTS.streamTerminating());
        } else if (currentSegmentRequest === null) {
          log.debug("Stream: no request, terminate.", bufferType);
          startDownloadingQueue$.complete(); // complete the downloading queue
          return observableOf(EVENTS.streamTerminating());
        } else if (
          mostNeededSegment == null ||
          currentSegmentRequest.segment.id !== mostNeededSegment.segment.id
        ) {
          log.debug("Stream: cancel request and terminate.", bufferType);
          startDownloadingQueue$.next(); // interrupt the current request
          startDownloadingQueue$.complete(); // complete the downloading queue
          return observableOf(EVENTS.streamTerminating());
        } else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
          const { request$ } = currentSegmentRequest;
          segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
          currentSegmentRequest.priority = mostNeededSegment.priority;
        }
        log.debug("Stream: terminate after request.", bufferType);
        return EMPTY;
      }

      const neededActions : Array<IStreamNeedsManifestRefresh |
                                  IStreamNeedsDiscontinuitySeek> = [];
      if (status.discontinuity > 1) {
        const nextTime = status.discontinuity + 1;
        const gap: [number, number] = [status.discontinuity, nextTime];
        neededActions.push(EVENTS.discontinuityEncountered(gap,
                                                           bufferType));
      }
      if (status.shouldRefreshManifest) {
        neededActions.push(EVENTS.needsManifestRefresh());
      }

      if (mostNeededSegment == null) {
        if (currentSegmentRequest !== null) {
          log.debug("Stream: interrupt segment request.", bufferType);
        }
        downloadQueue = [];
        startDownloadingQueue$.next(); // (re-)start with an empty queue

        return observableConcat(
          observableOf(...neededActions),
          status.isFull ? observableOf(EVENTS.fullStream(bufferType)) :
                          EMPTY
        );
      }

      if (currentSegmentRequest === null) {
        log.debug("Stream: start downloading queue.", bufferType);
        downloadQueue = neededSegments;
        startDownloadingQueue$.next(); // restart the queue
      } else if (currentSegmentRequest.segment.id !== mostNeededSegment.segment.id) {
        log.debug("Stream: restart download queue.", bufferType);
        downloadQueue = neededSegments;
        startDownloadingQueue$.next(); // restart the queue
      } else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
        log.debug("Stream: update request priority.", bufferType);
        const { request$ } = currentSegmentRequest;
        segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
        currentSegmentRequest.priority = mostNeededSegment.priority;
      } else {
        log.debug("Stream: update downloading queue", bufferType);

        // Update the previous queue to be all needed segments but the first one,
        // for which a request is already pending
        downloadQueue = neededSegments.slice().splice(1, neededSegments.length);
      }

      return observableConcat(observableOf(...neededActions),
                              observableOf(EVENTS.activeStream(bufferType)));
    }),
    takeWhile((e) => e.type !== "stream-terminating", true)
  );

  /**
   * Stream Queue:
   *   - download every segments queued sequentially
   *   - when a segment is loaded, append it to the SourceBuffer
   */
  const streamQueue$ = startDownloadingQueue$.pipe(
    switchMap(() => downloadQueue.length > 0 ? loadSegmentsFromQueue() : EMPTY),
    mergeMap(onLoaderEvent));

  return observableMerge(status$, streamQueue$).pipe(share());

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
    const requestNextSegment$ =
      observableDefer(() : Observable<ISegmentLoadingEvent<T>> => {
        const currentNeededSegment = downloadQueue.shift();
        if (currentNeededSegment == null) {
          nextTick(() => { reCheckNeededSegments$.next(); });
          return EMPTY;
        }

        const { segment, priority } = currentNeededSegment;
        const context = { manifest, period, adaptation, representation, segment };
        const request$ = segmentFetcher.createRequest(context, priority);

        currentSegmentRequest = { segment, priority, request$ };
        return request$
          .pipe(mergeMap((evt) : Observable<ISegmentLoadingEvent<T>> => {
            switch (evt.type) {
              case "warning":
                return observableOf({ type: "retry" as const,
                                      value: { segment, error: evt.value } });
              case "chunk-complete":
                currentSegmentRequest = null;
                return observableOf({ type: "end-of-segment" as const,
                                      value: { segment } });

              case "interrupted":
                log.info("Stream: segment request interrupted temporarly.", segment);
                return EMPTY;

              case "chunk":
                const initTimescale = initSegmentObject?.initTimescale;
                return evt.parse(initTimescale).pipe(map(parserResponse => {
                  return objectAssign({ segment }, parserResponse);
                }));

              case "ended":
                return requestNextSegment$;

              default:
                assertUnreachable(evt);
            }
          }));
      });

    return requestNextSegment$
      .pipe(finalize(() => { currentSegmentRequest = null; }));
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
        initSegmentObject = evt.value;
        const protectedEvents$ = observableOf(
          ...evt.value.segmentProtections.map(segmentProt => {
            return EVENTS.protectedSegment(segmentProt);
          }));
        const pushEvent$ = pushInitSegment({ clock$,
                                             content,
                                             segment: evt.segment,
                                             segmentData: evt.value.initializationData,
                                             queuedSourceBuffer });
        return observableMerge(protectedEvents$, pushEvent$);

      case "parsed-segment":
        const initSegmentData = initSegmentObject?.initializationData ?? null;
        return pushMediaSegment({ clock$,
                                  content,
                                  initSegmentData,
                                  parsedSegment: evt.value,
                                  segment: evt.segment,
                                  queuedSourceBuffer });

      case "end-of-segment": {
        const { segment } = evt.value;
        return queuedSourceBuffer.endOfSegment(objectAssign({ segment }, content))
          .pipe(ignoreElements());
      }

      default:
        assertUnreachable(evt);
    }
  }
}
