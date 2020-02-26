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
 * This file allows to create RepresentationBuffers.
 *
 * A RepresentationBuffer downloads and push segment for a single
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
  mapTo,
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
import objectAssign from "../../../utils/object_assign";
import SimpleSet from "../../../utils/simple_set";
import {
  IPrioritizedSegmentFetcher,
  ISegmentFetcherEvent,
  ISegmentFetcherWarning,
} from "../../pipelines";
import { QueuedSourceBuffer } from "../../source_buffers";
import EVENTS from "../events_generators";
import {
  IBufferEventAddedSegment,
  IBufferManifestMightBeOutOfSync,
  IBufferNeededActions,
  IBufferStateActive,
  IBufferStateFull,
  IProtectedSegmentEvent,
  IRepresentationBufferEvent,
} from "../types";
import getNeededSegments from "./get_needed_segments";
import getSegmentPriority from "./get_segment_priority";
import getWantedRange from "./get_wanted_range";
import pushInitSegment from "./push_init_segment";
import pushMediaSegment from "./push_media_segment";

// Item emitted by the Buffer's clock$
export interface IRepresentationBufferClockTick {
  currentTime : number; // the current position we are in the video in s
  liveGap? : number; // gap between the current position and the edge of a
                     // live content. Not set for non-live contents
  stalled : object|null; // if set, the player is currently stalled
  wantedTimeOffset : number; // offset in s to add to currentTime to obtain the
                             // position we actually want to download from
}

// Arguments to give to the RepresentationBuffer
// @see RepresentationBuffer for documentation
export interface IRepresentationBufferArguments<T> {
  clock$ : Observable<IRepresentationBufferClockTick>;
  content: { adaptation : Adaptation;
             manifest : Manifest;
             period : Period;
             representation : Representation; };
  queuedSourceBuffer : QueuedSourceBuffer<T>;
  segmentFetcher : IPrioritizedSegmentFetcher<T>;
  terminate$ : Observable<void>;
  bufferGoal$ : Observable<number>;
  knownStableBitrate$: Observable< undefined | number>;
}

// Information about a Segment waiting for download
interface IQueuedSegment {
  priority : number; // Priority of the request (lower number = higher priority)
  segment : ISegment; // Segment wanted
}

export interface ISegmentProtection { // Describes DRM information
  type : string;
  data : Uint8Array;
}

type IParsedInitSegmentEvent<T> = ISegmentParserInitSegment<T> &
                                  { segment : ISegment };

type IParsedSegmentEvent<T> = ISegmentParserSegment<T> &
                              { segment : ISegment };

interface IEndOfSegmentEvent { type : "end-of-segment";
                               value: { segment : ISegment }; }

interface ILoaderRetryEvent { type : "retry";
                              value : { segment : ISegment;
                                        error : ICustomError; };
}

type ISegmentLoadingEvent<T> = IParsedSegmentEvent<T> |
                               IParsedInitSegmentEvent<T> |
                               IEndOfSegmentEvent |
                               ILoaderRetryEvent;

// Object describing a pending Segment request
interface ISegmentRequestObject<T> {
  segment : ISegment; // The Segment the request is for
  request$ : Observable<ISegmentFetcherEvent<T>>; // The request itself
  priority : number; // The current priority of the request
}

/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SourceBuffer and where the playback currently is.
 *
 * Multiple RepresentationBuffer observables can run on the same SourceBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationBuffer<T>({
  bufferGoal$, // emit the buffer size we have to reach
  clock$, // emit current playback information regularly
  content, // The content we want to play
  knownStableBitrate$, // Bitrate higher or equal to this value should not be
                      // replaced by segments of better quality
  queuedSourceBuffer, // interface to the SourceBuffer
  segmentFetcher, // allows to download new segments
  terminate$, // signal the RepresentationBuffer that it should terminate
} : IRepresentationBufferArguments<T>) : Observable<IRepresentationBufferEvent<T>> {
  const { manifest, period, adaptation, representation } = content;
  const bufferType = adaptation.type;
  const initSegment = representation.index.getInitSegment();

  // Saved initSegment state for this representation.
  let initSegmentObject : ISegmentParserParsedInitSegment<T>|null =
    initSegment == null ? { initializationData: null,
                            segmentProtections: [],
                            initTimescale: undefined } :
                          null;

  // Segments queued for download in the BufferQueue.
  let downloadQueue : IQueuedSegment[] = [];

  // Subject to start/restart a downloading Queue.
  const startDownloadingQueue$ = new ReplaySubject<void>(1);

  // Emit when the RepresentationBuffer asks to re-check which segments are needed.
  const reCheckNeededSegments$ = new Subject<void>();

  // Keep track of the information about the pending Segment request.
  // null if no request is pending.
  let currentSegmentRequest : ISegmentRequestObject<T>|null = null;

  // Keep track of downloaded segments currently awaiting to be appended to the
  // QueuedSourceBuffer.
  const loadedSegmentPendingPush = new SimpleSet();

  const status$ = observableCombineLatest([
    clock$,
    bufferGoal$,
    terminate$.pipe(take(1),
                    mapTo(true),
                    startWith(false)),
    reCheckNeededSegments$.pipe(startWith(undefined)) ]
  ).pipe(
    withLatestFrom(knownStableBitrate$),
    map(function getCurrentStatus(
      [ [ timing, bufferGoal, terminate ],
        knownStableBitrate ]
    ) : { discontinuity : number;
          isFull : boolean;
          terminate : boolean;
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

      const segmentInventory = queuedSourceBuffer.getInventory();
      let neededSegments = getNeededSegments({ content,
                                               currentPlaybackTime: timing.currentTime,
                                               knownStableBitrate,
                                               loadedSegmentPendingPush,
                                               neededRange,
                                               segmentInventory })
        .map((segment) => ({ priority: getSegmentPriority(segment, timing),
                             segment }));

      if (initSegment !== null && initSegmentObject === null) {
        // prepend initialization segment
        const initSegmentPriority = getSegmentPriority(initSegment, timing);
        neededSegments = [ { segment: initSegment,
                             priority: initSegmentPriority },
                           ...neededSegments ];
      }

      let isFull : boolean; // True if the current buffer is full and the one
                            // from the next Period can be created
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

    mergeMap(function handleStatus(status) : Observable<IBufferNeededActions |
                                                        IBufferStateFull |
                                                        IBufferStateActive |
                                                        { type : "terminated" }
    > {
      const neededSegments = status.neededSegments;
      const mostNeededSegment = neededSegments[0];

      if (status.terminate) {
        downloadQueue = [];
        if (currentSegmentRequest == null) {
          log.debug("Buffer: no request, terminate.", bufferType);
          startDownloadingQueue$.complete(); // complete the downloading queue
          return observableOf({ type: "terminated" as "terminated" });
        } else if (
          mostNeededSegment == null ||
          currentSegmentRequest.segment.id !== mostNeededSegment.segment.id
        ) {
          log.debug("Buffer: cancel request and terminate.", bufferType);
          startDownloadingQueue$.next(); // interrupt the current request
          startDownloadingQueue$.complete(); // complete the downloading queue
          return observableOf({ type: "terminated" as "terminated" });
        } else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
          const { request$ } = currentSegmentRequest;
          segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
          currentSegmentRequest.priority = mostNeededSegment.priority;
        }
        log.debug("Buffer: terminate after request.", bufferType);
        return EMPTY;
      }

      const neededActions : IBufferNeededActions[] = [];
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
        if (currentSegmentRequest != null) {
          log.debug("Buffer: interrupt segment request.", bufferType);
        }
        downloadQueue = [];
        startDownloadingQueue$.next(); // (re-)start with an empty queue

        return observableConcat(
          observableOf(...neededActions),
          status.isFull ? observableOf(EVENTS.fullBuffer(bufferType)) :
                          EMPTY
        );
      }

      if (currentSegmentRequest == null) {
        log.debug("Buffer: start downloading queue.", bufferType);
        downloadQueue = neededSegments;
        startDownloadingQueue$.next(); // restart the queue
      } else if (currentSegmentRequest.segment.id !== mostNeededSegment.segment.id) {
        log.debug("Buffer: restart download queue.", bufferType);
        downloadQueue = neededSegments;
        startDownloadingQueue$.next(); // restart the queue
      } else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
        log.debug("Buffer: update request priority.", bufferType);
        const { request$ } = currentSegmentRequest;
        segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
        currentSegmentRequest.priority = mostNeededSegment.priority;
      } else {
        log.debug("Buffer: update downloading queue", bufferType);

        // Update the previous queue to be all needed segments but the first one,
        // for which a request is already pending
        downloadQueue = neededSegments.slice().splice(1, neededSegments.length);
      }

      return observableConcat(observableOf(...neededActions),
                              observableOf(EVENTS.activeBuffer(bufferType)));
    }),
    takeWhile((e) : e is IBufferNeededActions|IBufferStateFull|IBufferStateActive =>
      e.type !== "terminated"
    )
  );

  // Buffer Queue:
  //   - download every segments queued sequentially
  //   - append them to the SourceBuffer
  const bufferQueue$ = startDownloadingQueue$.pipe(
    switchMap(() => downloadQueue.length > 0 ? loadSegmentsFromQueue() : EMPTY),
    mergeMap(onLoaderEvent)
  );

  return observableMerge(status$, bufferQueue$).pipe(share());

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
        const response$ = request$
          .pipe(mergeMap((evt) : Observable<ISegmentLoadingEvent<T>> => {
            if (evt.type === "warning") {
              return observableOf({ type: "retry" as const,
                                    value: { segment,
                                             error: evt.value } });
            } else if (evt.type === "chunk-complete") {
              currentSegmentRequest = null;
              return observableOf({ type: "end-of-segment" as const,
                                    value: { segment } });
            }

            const initTimescale = initSegmentObject?.initTimescale;
            return evt.parse(initTimescale).pipe(map(parserResponse => {
              return objectAssign({ segment }, parserResponse);
            }));
          }));

        return observableConcat(response$, requestNextSegment$);
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
  ) : Observable<IBufferEventAddedSegment<T> |
                 ISegmentFetcherWarning |
                 IProtectedSegmentEvent |
                 IBufferManifestMightBeOutOfSync>
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
            } else if (index.canBeOutOfSyncError(evt.value.error)) {
              return observableOf(EVENTS.manifestMightBeOufOfSync());
            }
            return EMPTY;
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
        loadedSegmentPendingPush.add(segment.id);
        return queuedSourceBuffer.endOfSegment(objectAssign({ segment }, content))
          .pipe(
            ignoreElements(),
            finalize(() => { // remove from queue
              loadedSegmentPendingPush.remove(segment.id);
            }));
      }
    }
  }
}
