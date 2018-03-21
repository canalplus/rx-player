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
import { Subject } from "rxjs/Subject";
import config from "../../config";
import { IndexError } from "../../errors";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { SimpleSet } from "../../utils/collections";
import log from "../../utils/log";
import { ISegmentPipeline } from "../pipelines";
import {
  QueuedSourceBuffer,
  SupportedBufferTypes ,
} from "../source_buffers";
import { SegmentBookkeeper } from "../stream";
import appendDataInSourceBuffer from "./append_data";
import getSegmentsNeeded from "./get_segments_needed";
import getWantedRange from "./get_wanted_range";
import shouldDownloadSegment from "./segment_filter";

// Emitted when a new segment has been added to the SourceBuffer
export interface IBufferEventAddedSegment<T> {
  type : "added-segment";
  value : {
    bufferType : SupportedBufferTypes;
    segment : ISegment;
    segmentData : T;
  };
}

// The Manifest needs to be refreshed.
// The buffer might still download segments after this message
export interface IBufferEventNeedManifestRefresh {
  type : "needs-manifest-refresh";
  value : Error;
}

// Emit when a discontinuity is encountered and the user is "stuck" on it.
export interface IBufferEventDiscontinuityEncountered {
  type : "discontinuity-encountered";
  value : {
    nextTime : number;
  };
}

export interface IBufferSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

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
  pipeline : ISegmentPipeline<T>;
  wantedBufferAhead$ : Observable<number>;
}

// Events emitted by the Buffer
export type IRepresentationBufferEvent<T> =
  IBufferEventAddedSegment<T> |
  IBufferEventNeedManifestRefresh |
  IBufferEventDiscontinuityEncountered |
  IBufferState;

// Buffer state exposed
type IBufferState =
  IBufferStateFull |
  IBufferStateActive;

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

// Buffer state used only internally
type IBufferInternalState =
  IBufferInternalStateFull |
  IBufferInternalStateIdle |
  IBufferInternalStateNeedSegments;

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

// State emitted when the buffer is scheduling segments
interface IBufferInternalStateNeedSegments {
  type : "need-segments";
  value : {
    segments : ISegment[];
  };
}

interface IInitSegmentState<T> {
  data : T|null;
  infos: IBufferSegmentInfos|null;
}

interface IParsedPipelineData<T> {
  segmentData : T;
  segmentInfos : IBufferSegmentInfos|null;
}

interface IPipelineData<T> {
  segment : ISegment;
  parsed : IParsedPipelineData<T>;
}

const { BUFFER_PADDING } = config;

/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SourceBuffer.
 *
 * Multiple RepresentationBuffer observables can be ran on the same
 * SourceBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 *
 * The RepresentationBuffer tries to push the most needed segment first and
 * abort pending requests if they do not correspond to needed segment anymore.
 *
 *
 *
 * @param {Object} opt
 * @returns {Observable}
 */
export default function RepresentationBuffer<T>({
  clock$, // emit current playback informations
  content, // all informations about the content we want
  queuedSourceBuffer, // allows to interact with the SourceBuffer
  segmentBookkeeper, // keep track of what segments already are in the SourceBuffer
  pipeline, // allows to download new segments
  wantedBufferAhead$, // emit the buffer goal
} : IRepresentationBufferArguments<T>) : Observable<IRepresentationBufferEvent<T>> {
  const {
    manifest,
    period,
    adaptation,
    representation,
  } = content;

  /**
   * Will be used to emit messages to the calling function
   * @type {Subject}
   */
  const messageSubject : Subject<IRepresentationBufferEvent<T>> = new Subject();

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
  let initSegmentState : IInitSegmentState<T>|null = null;

  /**
   * Subject to start/restart a Buffer Queue.
   * @type {Subject}
   */
  const startQueue$ = new ReplaySubject<void>(1);

  /**
   * Keep track of the Segment for which a request is pending.
   * @type {Object|null}
   */
  let currentSegmentRequested : ISegment|null = null;

  /**
   * Keep track of every segments currently queued for download.
   * @type {Array.<Object>}
   */
  let downloadQueue : ISegment[] = [];

  /**
   * Keep track of downloaded segments currently awaiting to be appended to the
   * SourceBuffer.
   *
   * This is to avoid scheduling another download for that segment.
   * The ID of each segment (segment.id) is thus added before each append and
   * removed after it.
   * @type {Object}
   */
  const sourceBufferQueue = new SimpleSet();

  /**
   * Send a message downstream when bumping on an explicit
   * discontinuity announced in the segment index.
   * @param {Object} timing
   */
  function checkDiscontinuity(timing : IBufferClockTick) : void {
    if (timing.stalled) {
      if (manifest.isLive) {
        const discontinuity =
          representation.index.checkDiscontinuity(timing.currentTime);
        if (discontinuity > 0) {
          messageSubject.next({
            type: "discontinuity-encountered",
            value: {
              nextTime: discontinuity + 1,
            },
          });
        }
      }
    }
  }

  /**
   * Send a message downstream when the manifest has to be refreshed.
   * @param {Object} wantedRange
   */
  function checkManifestRefresh(
    wantedRange : { start : number; end : number}
  ) : void {
    const { start, end } = wantedRange;

    // TODO Better solution for HSS refresh?
    // get every segments currently downloaded and loaded
    const segments = segmentBookkeeper.inventory
      .map(s => s.infos.segment);

    const shouldRefresh = representation.index.shouldRefresh(segments, start, end);
    if (shouldRefresh) {
      const error = new IndexError("OUT_OF_INDEX_ERROR", false);
      messageSubject.next({
        type: "needs-manifest-refresh",
        value: error,
      });
    }
  }

  /**
   * Request every Segment in the ``downloadQueue`` on subscription.
   * Emit the data of a segment when a request succeeded.
   * @returns {Observable}
   */
  function requestSegments() : Observable<IPipelineData<T>> {
    const requestNextSegment$ : Observable<IPipelineData<T>> =
      Observable.defer(() => {
        currentSegmentRequested = downloadQueue.shift() || null;
        if (currentSegmentRequested == null) {
          // queue is finished...
          return Observable.empty();
        }

        const segment : ISegment = currentSegmentRequested;
        const initSegmentInfos = initSegmentState && initSegmentState.infos;
        const request$ = pipeline.createRequest({
          adaptation,
          init: initSegmentInfos || undefined,
          manifest,
          period,
          representation,
          segment,
        })
        .map((args) => objectAssign({ segment, }, args));

        return request$
          .mergeMap((pipelineData) => {
            return Observable.of(pipelineData)
              .concat(requestNextSegment$);
          });
      });

    return requestNextSegment$
      .finally(() => {
        currentSegmentRequested = null;
      });
  }

  /**
   * Append the given segment to the SourceBuffer.
   * Emit the right event when it succeeds.
   * @param {Object} data
   * @returns {Observable}
   */
  function appendSegment(
    data : IPipelineData<T>
  ) : Observable<IBufferEventAddedSegment<T>> {
    const { segment } = data;
    const segmentInfos = data.parsed.segmentInfos;
    const segmentData = data.parsed.segmentData;

    if (segment.isInit) {
      initSegmentState = {
        data: segmentData,
        infos: segmentInfos,
      };
    }
    const initSegmentData = initSegmentState && initSegmentState.data;
    const append$ = appendDataInSourceBuffer(
      clock$, queuedSourceBuffer, initSegmentData, segment, segmentData);

    sourceBufferQueue.add(segment.id);

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
        if (!segment.isInit) {
          const { time, duration, timescale } = segmentInfos ?
            segmentInfos : segment;

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
        }
      })
      .finally(() => {
        sourceBufferQueue.remove(segment.id);
      });
  }

  /**
   * Check for various things to do at a given time:
   *
   *   - indicates when the manifest should be refreshed (through the
   *     messageSubject)
   *
   *   - indicates if a discontinuity is encountered (through the
   *     messageSubject)
   *
   *   - synchronize the SegmentBookkeeper with the current buffered
   *
   *   - check if segments need to be downloaded
   *
   *   - Emit a description of the current state of the buffer
   *
   * @param {Array} arr
   * @returns {Object}
   */
  function checkInternalState(
    [timing, bufferGoal] : [IBufferClockTick, number]
  ) : IBufferInternalState {
    const buffered = queuedSourceBuffer.getBuffered();
    const neededRange = getWantedRange(
      period, buffered, timing, bufferGoal, paddings);

    // --- side-effects
    segmentBookkeeper.synchronizeBuffered(buffered);
    checkDiscontinuity(timing);
    checkManifestRefresh(neededRange);
    // ---

    const neededSegments = getSegmentsNeeded(
      representation,
      neededRange,
      {
        addInitSegment: initSegmentState == null,
        ignoreRegularSegments: timing.readyState === 0,
      }
    ).filter((segment) => {
      return shouldDownloadSegment(
        segment, content, segmentBookkeeper, neededRange, sourceBufferQueue);
    });

    if (!neededSegments.length) {
      return period.end != null && neededRange.end >= period.end ?
        { type: "full-buffer" as "full-buffer", value: undefined } :
        { type: "idle-buffer" as "idle-buffer", value: undefined };
    }

    return {
      type: "need-segments" as "need-segments",
      value: { segments: neededSegments },
    };
  }

  /**
   * Exploit the internal state given by ``checkInternalState``:
   *   - mutates the downloadQueue
   *   - start/restart the current BufferQueue
   *   - emit important events
   * @param {Object} state
   * @returns {Observable}
   */
  function handleInternalState(
    state : IBufferInternalState
  ) : Observable<IBufferState> {
    if (state.type === "full-buffer") {
      log.debug("finished downloading queue\n", adaptation.type);
      if (currentSegmentRequested) {
        log.debug("interrupting segment request.");
      }
      downloadQueue = [];
      startQueue$.next(undefined); // (re-)start with an empty queue
      return Observable.of(state);
    }

    if (state.type === "idle-buffer") {
      downloadQueue = [];
      startQueue$.next(undefined); // (re-)start with an empty queue
    }

    else if (state.type === "need-segments" && state.value.segments.length) {
      const neededSegments = state.value.segments;
      const firstNeededSegment = neededSegments[0];

      if (
        !currentSegmentRequested ||
        currentSegmentRequested.id !== firstNeededSegment.id
      ) {
        log.debug("starting downloading queue", adaptation.type);
        downloadQueue = neededSegments;
        startQueue$.next(undefined); // restart the queue
      } else {
        // Update the previous queue to be all needed segments but the first one,
        // for which a request is already pending
        const newQueue = neededSegments
          .slice() // clone previous
          .splice(1, neededSegments.length); // remove first element
                                             // (pending request)
        log.debug("updating downloading queue", adaptation.type);
        downloadQueue = newQueue;
      }

      return Observable.of({
        type: "active-buffer" as "active-buffer",
        value: undefined,
      });
    }

    // else
    return Observable.empty();
  }

  /**
   * State Checker:
   *   - indicates when the manifest should be refreshed (through the messageSubject)
   *   - indicates if a discontinuity is encountered (through the messageSubject)
   *   - emit state updates
   *   - update the downloadQueue
   *   - start/restart the BufferQueue
   * @type {Observable}
   */
  const bufferState$ : Observable<IBufferState> =
    Observable.combineLatest(clock$, wantedBufferAhead$)
      .map(checkInternalState)
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

  return Observable.merge(messageSubject, bufferState$, bufferQueue$)
    .share();
}

/**
 * Get safety paddings (low and high) for the size of buffer that won't
 * be flushed when switching representation for smooth transitions
 * and avoiding buffer underflows.
 * @param {Object} adaptation
 * @returns {number}
 */
function getBufferPaddings(
  adaptation : Adaptation
) : { high : number; low : number } {
  switch (adaptation.type) {
    case "audio":
    case "video":
      return BUFFER_PADDING[adaptation.type];
    default:
      return BUFFER_PADDING.other;
  }
}
