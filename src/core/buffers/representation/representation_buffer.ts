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
  BehaviorSubject,
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
  tap,
} from "rxjs/operators";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import SimpleSet from "../../../utils/simple_set";
import {
  IFetchedSegment,
  IPrioritizedSegmentFetcher,
} from "../../pipelines";
import {
  QueuedSourceBuffer,
} from "../../source_buffers";
import EVENTS from "../events_generators";
import SegmentBookkeeper from "../segment_bookkeeper";
import {
  IBufferEventAddedSegment,
  IBufferNeededActions,
  IBufferStateActive,
  IBufferStateFull,
  IRepresentationBufferEvent,
} from "../types";
import appendDataInSourceBuffer from "./append_data";
import getBufferPaddings from "./get_buffer_paddings";
import getSegmentPriority from "./get_segment_priority";
import getSegmentsNeeded from "./get_segments_needed";
import getWantedRange from "./get_wanted_range";
import segmentFilter from "./segment_filter";

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
  lastStableBitrate$: BehaviorSubject<undefined|number>;
}

// Informations about a Segment waiting for download
interface IQueuedSegment {
  priority : number; // Priority of the request (lower number = higher priority)
  segment : ISegment; // Segment wanted
}

// temporal informations of a Segment
interface ISegmentInfos {
  duration? : number; // timescaled duration of the Segment
  time : number; // timescaled start time of the Segment
  timescale : number;
}

// Parsed Segment information
interface ISegmentObject<T> {
  segmentData : T|null; // What will be pushed to the SourceBuffer
  segmentInfos : ISegmentInfos|null; // informations about the segment's start
                                     // and duration
  segmentOffset : number; // Offset to add to the segment at decode time
}

// Informations about a loaded and parsed Segment
interface ILoadedSegmentObject<T> {
  segment : ISegment; // Concerned Segment
  value : ISegmentObject<T>; // parsed Data
}

// Object describing a pending Segment request
interface ISegmentRequestObject<T> {
  segment : ISegment; // The Segment the request is for
  request$ : Observable<IFetchedSegment<T>>; // The request itself
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
  clock$, // emit current playback informations
  content, // all informations about the content we want to play
  queuedSourceBuffer, // allows to interact with the SourceBuffer
  segmentBookkeeper, // keep track of what segments already are in the SourceBuffer
  segmentFetcher, // allows to download new segments
  terminate$, // signal the RepresentationBuffer that it should terminate
  bufferGoal$, // emit the buffer goal
  lastStableBitrate$,
} : IRepresentationBufferArguments<T>) : Observable<IRepresentationBufferEvent<T>> {
  const { manifest, period, adaptation, representation } = content;
  const codec = representation.getMimeTypeString();
  const bufferType = adaptation.type;
  const initSegment = representation.index.getInitSegment();

  // Compute paddings, then used to calculate the wanted range of Segments
  // wanted.
  const paddings = getBufferPaddings(adaptation);

  // Saved initSegment state for this representation.
  let initSegmentObject : ISegmentObject<T>|null =
    initSegment == null ? { segmentData: null, segmentInfos: null, segmentOffset: 0 } :
                          null;

  // Subject to start/restart a Buffer Queue.
  const startQueue$ = new ReplaySubject<void>(1);

  // Segments queued for download in the BufferQueue.
  let downloadQueue : IQueuedSegment[] = [];

  // Emit when the current queue of download is finished
  const finishedDownloadQueue$ = new Subject<void>();

  // Keep track of the informations about the pending Segment request.
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
    finishedDownloadQueue$.pipe(startWith(undefined)) ]
  ).pipe(
    map(function getCurrentStatus([timing, bufferGoal, terminate]) : {
      discontinuity : number;
      isFull : boolean;
      terminate : boolean;
      neededSegments : IQueuedSegment[];
      shouldRefreshManifest : boolean;
    } {
      const buffered = queuedSourceBuffer.getBuffered();
      segmentBookkeeper.synchronizeBuffered(buffered);

      const neededRange =
        getWantedRange(period, buffered, timing, bufferGoal, paddings);

      // TODO Refacto discontinuity logic
      const discontinuity = timing.stalled && manifest.isLive ?
        representation.index.checkDiscontinuity(timing.currentTime) :
        -1;

      const shouldRefreshManifest =
        representation.index.shouldRefresh(neededRange.start,
                                           neededRange.end);

      let neededSegments = getSegmentsNeeded(representation, neededRange)
        .filter((segment) => shouldDownloadSegment(segment, neededRange))
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

      const isFull = !neededSegments.length &&
                     period.end != null &&
                     neededRange.end >= period.end;
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
        neededActions.push(EVENTS.needsManifestRefresh(bufferType));
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
    mergeMap(appendSegment)
  );

  return observableMerge(status$, bufferQueue$).pipe(share());

  /**
   * Request every Segment in the ``downloadQueue`` on subscription.
   * Emit the data of a segment when a request succeeded.
   *
   * Important side-effects:
   *   - Mutates `currentSegmentRequest` when doing and finishing a request.
   *   - Will emit from finishedDownloadQueue$ Subject after it's done.
   * @returns {Observable}
   */
  function loadSegmentsFromQueue() : Observable<ILoadedSegmentObject<T>> {
    const requestNextSegment$ : Observable<ILoadedSegmentObject<T>> =
      observableDefer(() => {
        const currentNeededSegment = downloadQueue.shift();
        if (currentNeededSegment == null) {
          nextTick(() => { finishedDownloadQueue$.next(); });
          return EMPTY;
        }

        const { segment, priority } = currentNeededSegment;
        const context = { manifest, period, adaptation, representation, segment };
        const request$ = segmentFetcher.createRequest(context, priority);

        currentSegmentRequest = { segment, priority, request$ };
        const response$ = request$.pipe(
          mergeMap((fetchedSegment) => {
            currentSegmentRequest = null;
            const initInfos = initSegmentObject &&
                              initSegmentObject.segmentInfos ||
                              undefined;
            return fetchedSegment.parse(initInfos);
          }),
          map((args) => ({ segment, value: args }))
        );

        return observableConcat(response$, requestNextSegment$);
      });

    return requestNextSegment$
      .pipe(finalize(() => { currentSegmentRequest = null; }));
  }

  /**
   * Append the given segment to the SourceBuffer.
   * Emit the right event when it succeeds.
   * @param {Object} loadedSegment
   * @returns {Observable}
   */
  function appendSegment(
    loadedSegment : ILoadedSegmentObject<T>
  ) : Observable<IBufferEventAddedSegment<T>> {
    return observableDefer(() => {
      const { segment } = loadedSegment;
      if (segment.isInit) {
        initSegmentObject = loadedSegment.value;
      }

      const { segmentInfos, segmentData, segmentOffset } = loadedSegment.value;
      if (segmentData == null) {
        // no segmentData to add here (for example, a text init segment)
        // just complete directly without appending anything
        return EMPTY;
      }

      const append$ = appendDataInSourceBuffer(clock$, queuedSourceBuffer, {
        initSegment: initSegmentObject &&
                     initSegmentObject.segmentData,
        segment: segment.isInit ? null :
                                  segmentData,
        timestampOffset: segmentOffset,
        codec,
      });

      sourceBufferWaitingQueue.add(segment.id);

      return append$.pipe(
        tap(() => { // add to SegmentBookkeeper
          if (segment.isInit) {
            return;
          }
          const { time, duration, timescale } = segmentInfos != null ? segmentInfos :
                                                                       segment;
          const start = time / timescale;
          const end = duration && (time + duration) / timescale;
          segmentBookkeeper.insert(period,
                                   adaptation,
                                   representation,
                                   segment,
                                   start,
                                   end);
        }),
        mapTo(EVENTS.addedSegment(
          bufferType, segment, queuedSourceBuffer.getBuffered(), segmentData)),
        finalize(() => { // remove from queue
          sourceBufferWaitingQueue.remove(segment.id);
        }));
    });
  }

  /**
   * Return true if the given segment should be downloaded. false otherwise.
   * @param {Object} segment
   * @param {Array.<Object>} neededRange
   * @returns {Boolean}
   */
  function shouldDownloadSegment(
    segment : ISegment,
    neededRange : { start: number; end: number }
  ) : boolean {
    const lastStableBitrate = lastStableBitrate$.getValue();
    return segmentFilter(segment,
                         content,
                         segmentBookkeeper,
                         neededRange,
                         sourceBufferWaitingQueue,
                         lastStableBitrate);
  }
}
