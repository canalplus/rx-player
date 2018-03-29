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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
// import { Subject } from "rxjs/Subject";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import log from "../../utils/log";
import SimpleSet from "../../utils/simple_set";
import {
  IPrioritizedSegmentFetcher,
  ISegmentResponse,
} from "../pipelines";
import {
  QueuedSourceBuffer,
  SupportedBufferTypes ,
} from "../source_buffers";
import { SegmentBookkeeper } from "../stream";

import appendDataInSourceBuffer from "./append_data";
import getBufferPaddings from "./get_buffer_paddings";
import getSegmentPriority from "./get_segment_priority";
import getSegmentsNeeded from "./get_segments_needed";
import getWantedRange from "./get_wanted_range";
import shouldDownloadSegment from "./segment_filter";

// Emitted after a new segment has been added to the SourceBuffer
export interface IBufferEventAddedSegment<T> {
  type : "added-segment";
  value : {
    bufferType : SupportedBufferTypes; // The type of the Representation
    segment : ISegment; // The concerned Segment
    segmentData : T; // The data pushed
  };
}

// The Manifest needs to be refreshed.
// The buffer might still download segments after this message
export interface IBufferNeedsManifestRefresh {
  type : "needs-manifest-refresh";
  value : undefined;
}

// Emit when a discontinuity is encountered and the user is "stuck" on it.
export interface IBufferNeedsDiscontinuitySeek {
  type : "discontinuity-encountered";
  value : {
    nextTime : number; // the time we should seek to TODO this is ugly
  };
}

// Events communicating about actions that need to be taken
type IBufferNeededActions =
  IBufferNeedsManifestRefresh |
  IBufferNeedsDiscontinuitySeek;

// State emitted when the Buffer is scheduling segments
export interface IBufferStateActive {
  type : "active-buffer";
  value : undefined;
}

// State emitted when the buffer has been filled to the end
export interface IBufferStateFull {
  type : "full-buffer";
  value : undefined;
}

// Buffer state exposed
type IBufferState =
  IBufferNeededActions |
  IBufferStateFull |
  IBufferStateActive;

// Events emitted by the Buffer
export type IRepresentationBufferEvent<T> =
  IBufferEventAddedSegment<T> |
  IBufferState;

// Item emitted by the Buffer's clock$
export interface IBufferClockTick {
  currentTime : number;
  readyState : number;

  // TODO Rename "baseTime" or something which will be currentTime + timeOffset
  timeOffset : number;
  stalled : object|null;
  liveGap? : number;
}

// Arguments to give to the Buffer
export interface IRepresentationBufferArguments<T> {
  clock$ : Observable<IBufferClockTick>;
  content: {
    representation : Representation;
    adaptation : Adaptation;
    period : Period;
    manifest : Manifest;
  };
  queuedSourceBuffer : QueuedSourceBuffer<T>;
  segmentBookkeeper : SegmentBookkeeper;
  segmentFetcher : IPrioritizedSegmentFetcher<T>;
  wantedBufferAhead$ : Observable<number>;
}

// Buffer state used only internally
type IBufferInternalState =
  IBufferInternalStateFull |
  IBufferInternalStateIdle |
  IBufferInternalStateNeedSegments;

interface IBufferCurrentStatus {
  discontinuity : number;
  shouldRefreshManifest : boolean;
  state : IBufferInternalState;
}

// State emitted when the buffer has been filled to the end
interface IBufferInternalStateFull {
  type : "full-buffer";
  value : undefined;
}

// State emitted when the buffer has nothing to do
interface IBufferInternalStateIdle {
  type : "idle-buffer";
  value : undefined;
}

// Informations about a Segment waiting for download
interface IQueuedSegment {
  priority : number; // the priority of the request
  segment : ISegment; // the Segment wanted
}

// State emitted when the buffer is scheduling segments
interface IBufferInternalStateNeedSegments {
  type : "need-segments";
  value : {
    neededSegments : IQueuedSegment[]; // The whole Segment queue
  };
}

// temporal informations of a Segment
interface ISegmentInfos {
  duration : number; // timescaled duration of the Segment
  time : number; // timescaled start time of the Segment
  timescale : number;
}

// Informations about any Segment of a given Representation.
interface ISegmentObject<T> {
  segmentData : T; // What will be pushed to the SourceBuffer
  segmentInfos : ISegmentInfos|null; // temporal information
}

// Informations about a loaded Segment
interface ILoadedSegmentObject<T> {
  segment : ISegment; // Concerned Segment
  parsed : ISegmentObject<T>; // Data and informations
}

// Object describing a pending Segment request
interface ISegmentRequestObject<T> {
  segment : ISegment; // The Segment the request is for
  request$ : Observable<ISegmentResponse<T>>; // The request itself
  priority : number; // The current priority of the request
}

/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SourceBuffer and where the playback currently is.
 *
 * Multiple RepresentationBuffer observables can be ran on the same
 * SourceBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} opt
 * @returns {Observable}
 */
export default function RepresentationBuffer<T>({
  clock$, // emit current playback informations
  content, // all informations about the content we want to play
  queuedSourceBuffer, // allows to interact with the SourceBuffer
  segmentBookkeeper, // keep track of what segments already are in the SourceBuffer
  segmentFetcher, // allows to download new segments
  wantedBufferAhead$, // emit the buffer goal
} : IRepresentationBufferArguments<T>) : Observable<IRepresentationBufferEvent<T>> {
  // unwrap components of the content
  const {
    manifest,
    period,
    adaptation,
    representation,
  } = content;

  /**
   * Compute paddings, then used to calculate the wanted range of Segments
   * wanted.
   * @type {Object}
   */
  const paddings = getBufferPaddings(adaptation);

  /**
   * Saved initSegment state for this representation.
   * null when no initialization segment has been downloaded yet.
   * @type {Object}
   */
  let initSegmentObject : ISegmentObject<T>|null = null;

  /**
   * Subject to start/restart a Buffer Queue.
   * @type {Subject}
   */
  const startQueue$ = new ReplaySubject<void>(1);

  /**
   * Segments queued for download in the BufferQueue.
   * @type {Array.<Object>}
   */
  let downloadQueue : IQueuedSegment[] = [];

  /**
   * Keep track of the informations about the pending Segment request.
   * null if no request is pending.
   * @type {Object|null}
   */
  let currentSegmentRequest : ISegmentRequestObject<T>|null = null;

  /**
   * Keep track of downloaded segments currently awaiting to be appended to the
   * SourceBuffer.
   *
   * This is to avoid scheduling another download for that segment.
   * The ID of each segment (segment.id) is thus added before each append and
   * removed after it.
   * @type {Object}
   */
  const sourceBufferWaitingQueue = new SimpleSet();

  /**
   * Request every Segment in the ``downloadQueue`` on subscription.
   * Emit the data of a segment when a request succeeded.
   * @returns {Observable}
   */
  function requestSegments() : Observable<ILoadedSegmentObject<T>> {
    const requestNextSegment$ : Observable<ILoadedSegmentObject<T>> =
      Observable.defer(() => {
        const currentNeededSegment = downloadQueue.shift();
        if (currentNeededSegment == null) {
          // queue is finished...
          currentSegmentRequest = null;
          return Observable.empty();
        }
        const { segment, priority } = currentNeededSegment;
        const initSegmentInfos = initSegmentObject && initSegmentObject.segmentInfos;
        const request$ = segmentFetcher.createRequest({
          adaptation,
          init: initSegmentInfos || undefined,
          manifest,
          period,
          representation,
          segment,
        }, priority);

        currentSegmentRequest = {
          segment,
          priority,
          request$,
        };

        const responseWithSegment$ = request$
          .map((args) => objectAssign({ segment }, args));

        return responseWithSegment$
          .mergeMap((pipelineData) => {
            return Observable.of(pipelineData)
              .concat(requestNextSegment$);
          });
      });

    return requestNextSegment$
      .finally(() => {
        currentSegmentRequest = null;
      });
  }

  /**
   * Append the given segment to the SourceBuffer.
   * Emit the right event when it succeeds.
   * @param {Object} data
   * @returns {Observable}
   */
  function appendSegment(
    data : ILoadedSegmentObject<T>
  ) : Observable<IBufferEventAddedSegment<T>> {
    return Observable.defer(() => {
      const { segment } = data;
      const segmentInfos = data.parsed.segmentInfos;
      const segmentData = data.parsed.segmentData;

      if (segment.isInit) {
        initSegmentObject = { segmentData, segmentInfos };
      }
      const initSegmentData = initSegmentObject && initSegmentObject.segmentData;
      const append$ = appendDataInSourceBuffer(
        clock$, queuedSourceBuffer, initSegmentData, segment, segmentData);

      sourceBufferWaitingQueue.add(segment.id);

      return append$
        .mapTo({
          type: "added-segment" as "added-segment",
          value : {
            bufferType: adaptation.type,
            segment,
            segmentData,
          },
        })
        .do(() => {
          if (segment.isInit) {
            return;
          }

          const {
            time,
            duration,
            timescale,
          } = segmentInfos ? segmentInfos : segment;

          // current segment timings informations are used to update
          // bufferedRanges informations
          segmentBookkeeper.insert(
            period,
            adaptation,
            representation,
            segment,
            time / timescale, // start
            duration != null ?
            (time + duration) / timescale : undefined // end
          );
        })
        .finally(() => {
          sourceBufferWaitingQueue.remove(segment.id);
        });
    });
  }

  /**
   * Perform a check-up of the current status of the RepresentationBuffer:
   *   - synchronize the SegmentBookkeeper with the current buffered
   *   - checks if the manifest should be refreshed
   *   - checks if a discontinuity is encountered
   *   - check if segments need to be downloaded
   *   - Emit a description of the current state of the buffer
   *
   * @param {Array} arr
   * @returns {Object}
   */
  function getBufferStatus(
    [timing, bufferGoal] : [IBufferClockTick, number]
  ) : IBufferCurrentStatus {
    const buffered = queuedSourceBuffer.getBuffered();
    const neededRange = getWantedRange(
      period, buffered, timing, bufferGoal, paddings);
    const discontinuity = getCurrentDiscontinuity(content, timing);
    const shouldRefreshManifest =
      shouldRefreshManifestForRange(content, segmentBookkeeper, neededRange);

    // /!\ Side effect to a SegmentBookkeeper
    segmentBookkeeper.synchronizeBuffered(buffered);

    const neededSegments = getSegmentsNeeded(
      representation,
      neededRange,
      {
        addInitSegment: initSegmentObject == null,
        ignoreRegularSegments: timing.readyState === 0,
      }
    )
      .filter((segment) => { // filter unwanted
        return shouldDownloadSegment(
          segment, content, segmentBookkeeper, neededRange, sourceBufferWaitingQueue);
      })

      .map((segment) => ({ // add priority of the segment
        priority: getSegmentPriority(segment, timing),
        segment,
      }));

    let state : IBufferInternalState;
    if (!neededSegments.length) {
      state = period.end != null && neededRange.end >= period.end ?
        { type: "full-buffer" as "full-buffer", value: undefined } :
        { type: "idle-buffer" as "idle-buffer", value: undefined };
    } else {
      state = {
        type: "need-segments" as "need-segments",
        value: { neededSegments },
      };
    }

    return {
      discontinuity,
      shouldRefreshManifest,
      state,
    };
  }

  /**
   * Exploit the internal state given by ``getBufferStatus``:
   *   - mutates the downloadQueue
   *   - start/restart the current BufferQueue
   *   - emit needed actions
   *   - emit the state of the Buffer
   * @param {Object} status
   * @returns {Observable}
   */
  function handleInternalState(
    status : IBufferCurrentStatus
  ) : Observable<IBufferState> {
    const {
      discontinuity,
      shouldRefreshManifest,
      state,
    } = status;

    const neededActions$ = buildNeededActions(discontinuity, shouldRefreshManifest);

    if (state.type === "full-buffer") {
      log.debug("finished downloading queue", adaptation.type);
      if (currentSegmentRequest) {
        log.debug("interrupting segment request.");
      }
      downloadQueue = [];
      startQueue$.next(undefined); // (re-)start with an empty queue
      return neededActions$
        .concat(Observable.of(state));
    }

    if (state.type === "idle-buffer") {
      if (currentSegmentRequest) {
        log.debug("interrupting segment request.");
      }
      downloadQueue = [];
      startQueue$.next(undefined); // (re-)start with an empty queue
    }

    else if (state.type === "need-segments" && state.value.neededSegments.length) {
      const neededSegments = state.value.neededSegments;
      const mostNeededSegment = neededSegments[0];

      if (!currentSegmentRequest) {
        log.debug("starting downloading queue", adaptation.type);
        downloadQueue = neededSegments;
        startQueue$.next(undefined); // restart the queue
      } else if (
        currentSegmentRequest.segment.id !== mostNeededSegment.segment.id
      ) {
        log.debug("canceling old downloading queue and starting a new one",
          adaptation.type);
        downloadQueue = neededSegments;
        startQueue$.next(undefined); // restart the queue
      } else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
        log.debug("updating pending request priority", adaptation.type);
        segmentFetcher.updatePriority(
          currentSegmentRequest.request$, mostNeededSegment.priority);
      } else {
        log.debug("updating downloading queue", adaptation.type);

        // Update the previous queue to be all needed segments but the first one,
        // for which a request is already pending
        const newQueue = neededSegments
          .slice() // clone previous
          .splice(1, neededSegments.length); // remove first element
                                             // (pending request)
        downloadQueue = newQueue;
      }

      const activeBufferEvent$ = Observable.of({
        type: "active-buffer" as "active-buffer",
        value: undefined,
      });

      return neededActions$
        .concat(activeBufferEvent$);
    }

    // else
    return neededActions$;
  }

  /**
   * State Checker:
   *   - indicates when the manifest should be refreshed
   *   - indicates if a discontinuity is encountered
   *   - emit state updates
   *   - update the downloadQueue
   *   - start/restart the BufferQueue
   * @type {Observable}
   */
  const bufferState$ : Observable<IBufferState> =
    Observable.combineLatest(clock$, wantedBufferAhead$)
      .map(getBufferStatus)
      .mergeMap(handleInternalState);

  /**
   * Buffer Queue:
   *   - download segment
   *   - append them to the SourceBuffer
   * @type {Observable}
   */
  const bufferQueue$ = startQueue$
    .switchMap(requestSegments)
    .mergeMap(appendSegment);

  return Observable.merge(bufferState$, bufferQueue$)
    .share();
}

/**
 * Emit the current discontinuity encountered.
 * Inferior or equal to 0 if no discontinuity is currently happening.
 * @param {Object} content
 * @param {Object} timing
 * @returns {number}
 */
function getCurrentDiscontinuity(
  { manifest, representation } : {
    manifest : Manifest;
    representation : Representation;
  },
  timing : IBufferClockTick
) : number {
  return !timing.stalled || !manifest.isLive ?
    -1 : representation.index.checkDiscontinuity(timing.currentTime);
}

/**
 * Returns true if the current Manifest needs to be downloaded.
 * @param {Object} content
 * @param {Object} segmentBookkeeper
 * @param {Object} wantedRange
 * @returns {Boolean}
 */
function shouldRefreshManifestForRange(
  { representation } : { representation : Representation },
  segmentBookkeeper : SegmentBookkeeper,
  wantedRange : { start : number; end : number}
) : boolean {
  const { start, end } = wantedRange;

  // TODO Better solution for HSS refresh?
  // get every segments currently downloaded and loaded
  const segments = segmentBookkeeper.inventory
    .map(s => s.infos.segment);

  return representation.index.shouldRefresh(segments, start, end);
}

/**
 * Returns an Observable emiting the various actions that need to be taken
 * depending on the current conditions.
 * @param {number} discontinuity
 * @param {boolean} shouldRefreshManifest
 * @returns {Observable}
 */
function buildNeededActions(
  discontinuity : number,
  shouldRefreshManifest : boolean
) : Observable<IBufferNeededActions> {
  // RxJS bug?
  const empty$ = Observable.empty() as Observable<never>;

  const discontinuityEvent$ = discontinuity > 1 ?
  Observable.of({
    type: "discontinuity-encountered" as "discontinuity-encountered",
    value: {
      nextTime: discontinuity + 1,
    },
  }) : empty$;

  const shouldRefreshManifest$ = shouldRefreshManifest ?
  Observable.of({
    type: "needs-manifest-refresh" as "needs-manifest-refresh",
    value: undefined,
  }) : empty$;

  return discontinuityEvent$.concat(shouldRefreshManifest$);
}
