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
import objectAssign from "object-assign";
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
import config from "../../../config";
import { ICustomError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import SimpleSet from "../../../utils/simple_set";
import {
  IPrioritizedSegmentFetcher,
  ISegmentFetcherEvent,
  ISegmentFetcherWarning,
} from "../../pipelines";
import { QueuedSourceBuffer } from "../../source_buffers";
import EVENTS from "../events_generators";
import SegmentBookkeeper from "../segment_bookkeeper";
import {
  IBufferEventAddedSegment,
  IBufferManifestMightBeOutOfSync,
  IBufferNeededActions,
  IBufferStateActive,
  IBufferStateFull,
  IRepresentationBufferEvent,
} from "../types";
import appendDataInSourceBuffer from "./append_data";
import getBufferPadding from "./get_buffer_padding";
import getSegmentPriority from "./get_segment_priority";
import getSegmentsNeeded from "./get_segments_needed";
import getWantedRange from "./get_wanted_range";
import shouldReplaceSegment from "./should_replace_segment";

// Item emitted by the Buffer's clock$
export interface IRepresentationBufferClockTick {
  currentTime : number; // the current position we are in the video in s
  liveGap? : number; // gap between the current position and the live edge of
                     // the content. Not set for non-live contents
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
  segmentBookkeeper : SegmentBookkeeper;
  segmentFetcher : IPrioritizedSegmentFetcher<T>;
  terminate$ : Observable<void>;
  bufferGoal$ : Observable<number>;
  fastSwitchingStep$: Observable< undefined | number>;
}

// Information about a Segment waiting for download
interface IQueuedSegment {
  priority : number; // Priority of the request (lower number = higher priority)
  segment : ISegment; // Segment wanted
}

// temporal information of a Segment
interface ISegmentInfos {
  duration? : number; // timescaled duration of the Segment
  time : number; // timescaled start time of the Segment
  timescale : number;
}

// Parsed Segment information
interface ISegmentObject<T> {
  chunkData : T|null; // What will be pushed to the SourceBuffer
  chunkInfos : ISegmentInfos|null; // information about the segment's start
                                   // and duration
  chunkOffset : number; // Offset to add to the segment at decode time
  appendWindow : [ number | undefined, number | undefined ];
}

// Information about a loaded and parsed Segment
interface IParsedSegmentEventValue<T> {
  segment : ISegment; // Concerned Segment
  data : ISegmentObject<T>; // parsed Data
}

interface IParsedSegmentEvent<T> {
  type : "parsed-segment";
  value : IParsedSegmentEventValue<T>;
}

interface ILoaderRetryEvent {
  type : "retry";
  value : { segment : ISegment;
            error : ICustomError; };
}

type ISegmentLoadingEvent<T> = IParsedSegmentEvent<T> |
                               ILoaderRetryEvent;

// Object describing a pending Segment request
interface ISegmentRequestObject<T> {
  segment : ISegment; // The Segment the request is for
  request$ : Observable<ISegmentFetcherEvent<T>>; // The request itself
  priority : number; // The current priority of the request
}

const { MINIMUM_SEGMENT_SIZE } = config;

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
  clock$, // emit current playback information
  content, // all information about the content we want to play
  queuedSourceBuffer, // allows to interact with the SourceBuffer
  segmentBookkeeper, // keep track of what segments already are in the SourceBuffer
  segmentFetcher, // allows to download new segments
  terminate$, // signal the RepresentationBuffer that it should terminate
  bufferGoal$, // emit the buffer goal
  fastSwitchingStep$, // Bitrate higher or equal to this value should not be
                      // replaced by segments of better quality
} : IRepresentationBufferArguments<T>) : Observable<IRepresentationBufferEvent<T>> {
  const { manifest, period, adaptation, representation } = content;
  const codec = representation.getMimeTypeString();
  const bufferType = adaptation.type;
  const initSegment = representation.index.getInitSegment();

  // Compute padding, then used to calculate the wanted range of Segments
  // wanted.
  const padding = getBufferPadding(adaptation);

  // Saved initSegment state for this representation.
  let initSegmentObject : ISegmentObject<T>|null =
    initSegment == null ? { chunkData: null,
                            chunkInfos: null,
                            chunkOffset: 0,
                            appendWindow: [undefined, undefined] } :
                          null;

  // Segments queued for download in the BufferQueue.
  let downloadQueue : IQueuedSegment[] = [];

  // Subject to start/restart a Buffer Queue.
  const startQueue$ = new ReplaySubject<void>(1);

  // Emit when the RepresentationBuffer asks to re-check which segments are needed.
  const reCheckNeededSegments$ = new Subject<void>();

  // Keep track of the information about the pending Segment request.
  // null if no request is pending.
  let currentSegmentRequest : ISegmentRequestObject<T>|null = null;

  // Keep track of downloaded segments currently awaiting to be appended to the
  // SourceBuffer.
  const sourceBufferWaitingQueue = new SimpleSet();

  const status$ = observableCombineLatest([
    clock$,
    bufferGoal$,
    terminate$.pipe(take(1),
                    mapTo(true),
                    startWith(false)),
    reCheckNeededSegments$.pipe(startWith(undefined)) ]
  ).pipe(
    withLatestFrom(fastSwitchingStep$),
    map(function getCurrentStatus(
      [ [ timing, bufferGoal, terminate ],
        fastSwitchingStep ]
    ) : { discontinuity : number;
          isFull : boolean;
          terminate : boolean;
          neededSegments : IQueuedSegment[];
          shouldRefreshManifest : boolean; }
    {
      const buffered = queuedSourceBuffer.getBuffered();
      segmentBookkeeper.synchronizeBuffered(buffered);

      const neededRange =
        getWantedRange(period, buffered, timing, bufferGoal, padding);

      // TODO Refacto discontinuity logic
      const discontinuity = timing.stalled && manifest.isLive ?
        representation.index.checkDiscontinuity(timing.currentTime) :
        -1;

      const shouldRefreshManifest =
        representation.index.shouldRefresh(neededRange.start,
                                           neededRange.end);

      let neededSegments = getSegmentsNeeded(representation, neededRange)
        .filter((segment) =>
          shouldDownloadSegment(segment, neededRange, fastSwitchingStep)
        )
        .map((segment) => ({
          priority: getSegmentPriority(segment, timing),
          segment,
        }));

      if (initSegment != null && initSegmentObject == null) {
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
          // We do not know the end of this index. Stay not full to be safe.
          isFull = false;
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
          startQueue$.complete(); // complete the downloading queue
          return observableOf({ type: "terminated" as "terminated" });
        } else if (
          mostNeededSegment == null ||
          currentSegmentRequest.segment.id !== mostNeededSegment.segment.id
        ) {
          log.debug("Buffer: cancel request and terminate.", bufferType);
          startQueue$.next(); // interrupt the current request
          startQueue$.complete(); // complete the downloading queue
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
        // TODO Refacto discontinuity logic
        const seekTo = status.discontinuity + 1;
        neededActions.push(EVENTS.discontinuityEncountered(bufferType, seekTo));
      }
      if (status.shouldRefreshManifest) {
        neededActions.push(EVENTS.needsManifestRefresh());
      }

      if (mostNeededSegment == null) {
        if (currentSegmentRequest) {
          log.debug("Buffer: interrupt segment request.", bufferType);
        }
        downloadQueue = [];
        startQueue$.next(); // (re-)start with an empty queue

        return observableConcat(
          observableOf(...neededActions),
          status.isFull ? observableOf(EVENTS.fullBuffer(bufferType)) :
                          EMPTY
        );
      }

      if (!currentSegmentRequest) {
        log.debug("Buffer: start downloading queue.", bufferType);
        downloadQueue = neededSegments;
        startQueue$.next(); // restart the queue
      } else if (currentSegmentRequest.segment.id !== mostNeededSegment.segment.id) {
        log.debug("Buffer: restart download queue.", bufferType);
        downloadQueue = neededSegments;
        startQueue$.next(); // restart the queue
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
  const bufferQueue$ = startQueue$.pipe(
    switchMap(() => downloadQueue.length ? loadSegmentsFromQueue() : EMPTY),
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
              return EMPTY;
            }

            const initInfos = initSegmentObject &&
                              initSegmentObject.chunkInfos ||
                              undefined;
            return evt.parse(initInfos).pipe(map(data => {
              return { type: "parsed-segment" as const,
                       value: { segment, data } };
            }));
          }));

        return observableConcat(response$, requestNextSegment$);
      });

    return requestNextSegment$
      .pipe(finalize(() => { currentSegmentRequest = null; }));
  }

  /**
   * If the segment was loaded:
   *   1. Append the given segment to the SourceBuffer.
   *   2. Emit the right event when it succeeds.
   *
   * If the request was retried:
   * @param {Object} evt
   * @returns {Observable}
   */
  function onLoaderEvent(
    evt : ISegmentLoadingEvent<T>
  ) : Observable<IBufferEventAddedSegment<T> |
                 ISegmentFetcherWarning |
                 IBufferManifestMightBeOutOfSync>
  {
    if (evt.type === "parsed-segment") {
      const { segment } = evt.value;
      if (segment.isInit) {
        initSegmentObject = evt.value.data;
      }
      return pushSegment(segment, evt.value.data);
    }
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
  }

  /**
   * Push a given segment to a QueuedSourceBuffer.
   * @param {Object} segment
   * @param {Object} segmentObject
   * @returns {Observable}
   */
  function pushSegment(
    segment : ISegment,
    { /* chunkInfos, */
      chunkData,
      chunkOffset,
      appendWindow } : ISegmentObject<T>
  ) : Observable<IBufferEventAddedSegment<T>> {
    return observableDefer(() => {
      if (chunkData == null) {
        // no segmentData to add here (for example, a text init segment)
        // just complete directly without appending anything
        return EMPTY;
      }

      const dataInfos = { initSegment: initSegmentObject &&
                                       initSegmentObject.chunkData,
                          segment: segment.isInit ? null :
                                                    chunkData,
                          timestampOffset: chunkOffset,
                          appendWindow,
                          codec };
      const append$ = appendDataInSourceBuffer(clock$, queuedSourceBuffer, dataInfos);

      sourceBufferWaitingQueue.add(segment.id);

      return append$.pipe(
        map(() => { // add to SegmentBookkeeper
          // if (!segment.isInit) {
          //   const { time, duration, timescale } = chunkInfos != null ? chunkInfos :
          //                                                              segment;
          //   const start = Math.max(time / timescale,
          //                          appendWindow[0] != null ? appendWindow[0] :
          //                                                    0);
          //   let end : number | undefined;
          //   if (duration != null) {
          //     end = Math.min((time + duration) / timescale,
          //                    appendWindow[1] != null ? appendWindow[1] :
          //                                              Infinity);
          //   }
          //   segmentBookkeeper
          //     .insert(period, adaptation, representation, segment, start, end);
          // }
          const buffered = queuedSourceBuffer.getBuffered();
          return EVENTS.addedSegment(content, segment, buffered, chunkData);
        }),
        finalize(() => { // remove from queue
          sourceBufferWaitingQueue.remove(segment.id);
        }));
    });
  }

  /**
   * Return true if the given segment should be downloaded. false otherwise.
   * @param {Object} segment
   * @param {Array.<Object>} neededRange
   * @param {number | undefined} fastSwitchingStep
   * @returns {Boolean}
   */
  function shouldDownloadSegment(
    segment : ISegment,
    neededRange : { start: number; end: number },
    fastSwitchingStep : number | undefined
  ) : boolean {
    if (sourceBufferWaitingQueue.test(segment.id)) {
      return false; // we're already pushing it
    }

    const { duration, time, timescale } = segment;
    if (segment.isInit || duration == null) {
      return true;
    }
    if (duration / timescale < MINIMUM_SEGMENT_SIZE) {
      return false;
    }
    const currentSegment = segmentBookkeeper.hasPlayableSegment(neededRange,
                                                                { duration,
                                                                  time,
                                                                  timescale });
    if (currentSegment == null) {
      return true;
    }

    return shouldReplaceSegment(currentSegment.infos,
                                objectAssign({ segment }, content),
                                fastSwitchingStep);
  }
}
