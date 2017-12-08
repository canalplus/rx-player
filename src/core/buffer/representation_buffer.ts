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
import { Subject } from "rxjs/Subject";
import config from "../../config";
import {
  IndexError,
  MediaError,
} from "../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
  Segment,
} from "../../manifest";
import { ISegmentLoaderArguments } from "../../net/types";
import { SimpleSet } from "../../utils/collections";
import log from "../../utils/log";
import {
  QueuedSourceBuffer,
  SupportedBufferTypes ,
} from "../source_buffers";
import { SegmentBookkeeper } from "../stream";
import forceGarbageCollection from "./force_garbage_collection";
import getWantedRange from "./get_wanted_range";

// Emitted when a new segment has been added to the SourceBuffer
export interface IAddedSegmentEvent {
  type : "added-segment";
  value : {
    bufferType : SupportedBufferTypes;
    parsed : {
      segmentData : any;
      segmentInfos? : IBufferSegmentInfos;
    };
  };
}

// The Manifest needs to be refreshed.
// The buffer might still download segments after this message
export interface INeedingManifestRefreshEvent {
  type : "needs-manifest-refresh";
  value : Error;
}

// Emit when a discontinuity is encountered and the user is "stuck" on it.
export interface IDiscontinuityEvent {
  type : "discontinuity-encountered";
  value : {
    nextTime : number;
  };
}

// Emit when the buffer has reached its end in term of segment downloads.
// The Buffer does not download segments after this message
export interface IBufferFullEvent {
  type: "full";
  value : {
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

// Emit when segments are being queued for download
// The Buffer emits this message just before downloading new segments
export interface IBufferActiveEvent {
  type: "segments-queued";
  value : {
    segments: Segment[]; // The downloaded segments
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

// For internal usage. Emitted when the Buffer is wainting on segments to be
// downloaded.
interface IWaitingBufferEvent {
  type : "waiting";
  value : {
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

// For internal usage. Emitted when the Buffer is completely inactive (it has
// downloaded all needed segments) but not full.
interface IIdleBufferEvent {
  type : "idle";
  value : undefined;
}

export interface IBufferSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

// Response that should be emitted by the given Pipeline
export interface IPipelineResponse {
  parsed: {
    segmentData : any;
    segmentInfos : IBufferSegmentInfos;
  };
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
export interface IRepresentationBufferArguments {
  clock$ : Observable<IBufferClockTick>;
  content: {
    representation : Representation;
    adaptation : Adaptation;
    period : Period;
    manifest : Manifest;
  };
  queuedSourceBuffer : QueuedSourceBuffer<any>;
  segmentBookkeeper : SegmentBookkeeper;
  pipeline : (x : ISegmentLoaderArguments) => Observable<IPipelineResponse>;
  wantedBufferAhead$ : Observable<number>;
}

// Events emitted by the Buffer
export type IRepresentationBufferEvent =
  IAddedSegmentEvent |
  INeedingManifestRefreshEvent |
  IDiscontinuityEvent |
  IBufferActiveEvent |
  IBufferFullEvent;

// For internal use. Buffer statuses.
type IRepresentationBufferStatus =
  IBufferActiveEvent |
  IBufferFullEvent |
  IIdleBufferEvent |
  IWaitingBufferEvent;

const { BITRATE_REBUFFERING_RATIO } = config;

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
  return adaptation.type === "video" ?
    { high: 6, low: 4 } : { high: 1, low: 1 };
}

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
 * @param {Object} opt
 * @returns {Observable}
 */
export default function RepresentationBuffer({
  clock$, // emit current playback informations
  content, // all informations about the content we want
  queuedSourceBuffer, // allows to interact with the SourceBuffer
  segmentBookkeeper, // keep track of what segments already are in the SourceBuffer
  pipeline, // allows to download new segments
  wantedBufferAhead$, // emit the buffer goal
} : IRepresentationBufferArguments) : Observable<IRepresentationBufferEvent> {
  const {
    manifest,
    period,
    adaptation,
    representation,
  } = content;

  // will be used to emit messages to the calling function
  const messageSubject : Subject<IRepresentationBufferEvent> = new Subject();

  const { high : highPadding, low : lowPadding } = getBufferPaddings(adaptation);

  /**
   * Saved state of the init segment for this representation to give it back to the
   * pipeline on subsequent downloads.
   * @type {Object|null}
   */
  let initSegmentInfos : IBufferSegmentInfos|null = null;

  /**
   * Keep track of currently downloaded segments:
   *   - avoid re-downloading them when they are pending.
   *   - allows to know if the buffer is idle or waiting on segments to be
   *     downloaded.
   * @type {Object}
   */
  const queuedSegments = new SimpleSet();

  /**
   * Returns every segments currently wanted.
   * @param {Object} representation - The representation of the chosen
   * adaptation
   * @param {BufferedRanges} buffered - The BufferedRanges of the corresponding
   * sourceBuffer
   * @param {Object} timing - The last item emitted from clock$
   * @param {Boolean} needsInitSegment - Whether we're dealing with an init
   * segment.
   * @returns {Array.<Segment>}
   */
  function getSegmentsListToInject(
    range : { start : number; end : number },
    timing : IBufferClockTick,
    needsInitSegment : boolean
  ) : Segment[] {
    let initSegment : Segment|null = null;

    if (needsInitSegment) {
      log.debug("add init segment", adaptation.type);
      initSegment = representation.index.getInitSegment();
    }

    if (timing.readyState === 0) {
      return initSegment ? [initSegment] : [];
    }

    const { start, end } = range;
    const duration = end - start;

    // TODO Better solution for HSS refresh?
    // get every segments currently downloaded and loaded
    const segments = segmentBookkeeper.inventory
      .map(s => s.infos.segment);

    const shouldRefresh = representation.index.shouldRefresh(segments, start, end);
    if (shouldRefresh) {
      const error = new IndexError(
        "OUT_OF_INDEX_ERROR", representation.index.getType(), false);
      messageSubject.next({
        type: "needs-manifest-refresh",
        value: error,
      });
    }

    // given the current timestamp and the previously calculated time gap and
    // wanted buffer size, we can retrieve the list of segments to inject in
    // our pipelines.
    const mediaSegments = representation.index.getSegments(start, duration);

    if (initSegment) {
      mediaSegments.unshift(initSegment);
    }

    return mediaSegments;
  }

  /**
   * Returns true if it considers that the segment given should be loaded.
   * @param {Segment} segment
   * @param {Object} wantedRange
   * @returns {Boolean}
   */
  function segmentFilter(
    segment : Segment,
    wantedRange : { start : number; end : number }
  ) : boolean {
    // if this segment is already in the pipeline
    const isInQueue = queuedSegments.test(segment.id);
    if (isInQueue) {
      return false;
    }

    // segment without time info are usually init segments or some
    // kind of metadata segment that we never filter out
    if (segment.isInit || segment.time < 0) {
      return true;
    }

    const { time, duration, timescale } = segment;
    if (!duration) {
      return true;
    }

    const currentSegment =
      segmentBookkeeper.hasPlayableSegment(wantedRange, { time, duration, timescale });

    if (!currentSegment) {
      return true;
    }

    if (
      currentSegment.infos.period.id !== period.id ||
      currentSegment.infos.adaptation.id !== adaptation.id
    ) {
      return true;
    }

    // only re-load comparatively-poor bitrates for the same adaptation.
    const bitrateCeil = currentSegment.infos.representation.bitrate *
      BITRATE_REBUFFERING_RATIO;
    return representation.bitrate > bitrateCeil;
  }

  /**
   * Append buffer to the queuedSourceBuffer.
   * If it leads to a QuotaExceededError, try to run our custom range
   * _garbage collector_.
   * @returns {Observable}
   */
  function appendDataInBuffer(
    pipelineData : {
      segment : Segment;
      parsed : {
        segmentData : any;
        segmentInfos : IBufferSegmentInfos;
      };
    }
  ) : Observable<IRepresentationBufferEvent> {
    const { segment, parsed } = pipelineData;
    const { segmentData, segmentInfos } = parsed;

    if (segment.isInit) {
      initSegmentInfos = segmentInfos;
    }

    /**
     * Validate the segment downloaded:
     *   - remove from the queued segment to re-allow its download
     *   - insert it in the bufferedRanges object
     */
    function validateSegment() {
      // Note: we should also clean when canceled/errored
      // (TODO do it when canceled?)
      queuedSegments.remove(segment.id);

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
          duration != null ? (time + duration) / timescale : undefined // end
        );
      }
    }

    /**
     * Append data in the SourceBuffer if we have it.
     * Emit when done.
     * @returns {Observable}
     */
    function appendSegment() : Observable<any> {
      const append$ = segmentData != null ?
        queuedSourceBuffer.appendBuffer(segmentData) : Observable.of(null);

      return append$.do(validateSegment);
    }

    return appendSegment()
      .catch((appendError : Error) => {
        if (!appendError || appendError.name !== "QuotaExceededError") {
          queuedSegments.remove(segment.id);
          throw new MediaError("BUFFER_APPEND_ERROR", appendError, true);
        }

        return forceGarbageCollection(clock$, queuedSourceBuffer)
          .mergeMap(appendSegment)
          .catch((forcedGCError : Error) => {
            queuedSegments.remove(segment.id);
            throw new MediaError("BUFFER_FULL_ERROR", forcedGCError, true);
          });
      }).map(() => ({
        type: "added-segment" as "added-segment",
        value: objectAssign({ bufferType: adaptation.type }, pipelineData),
      }));
  }

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
   * Check what should be done with the current buffer.
   *
   * The returned status indicates whether the buffer should download segments,
   * or if it is full, finished, idle etc.
   * @param {Object} timing
   * @param {number} bufferGoal
   * @param {Number} injectCount
   * @returns {Object}
   */
  function getCurrentStatus(
    timing : IBufferClockTick,
    bufferGoal : number,
    needsInitSegment : boolean
  ) : IRepresentationBufferStatus {
    const buffered = queuedSourceBuffer.getBuffered();
    segmentBookkeeper.synchronizeBuffered(buffered);

    const basePosition = timing.currentTime + timing.timeOffset;
    const limitEnd = timing.liveGap == null ?
      period.end : Math.min(period.end || Infinity, basePosition + timing.liveGap);
    const limits = {
      start: Math.max(period.start, timing.currentTime + timing.timeOffset),
      end: limitEnd,
    };
    const wantedRange = getWantedRange(
      buffered,
      basePosition,
      bufferGoal,
      limits,
      { low: lowPadding, high: highPadding }
    );

    const neededSegments = getSegmentsListToInject(
      wantedRange,
      timing,
      needsInitSegment
    ).filter((segment) => segmentFilter(segment, wantedRange));

    if (neededSegments.length) {
      return {
        type: "segments-queued",
        value: {
          segments: neededSegments,
          wantedRange,
        },
      };
    } else if (queuedSegments.isEmpty()) {
      if (period.end != null && wantedRange.end >= period.end) {
        return {
          type: "full",
          value: {
            wantedRange,
          },
        };
      } else {
        return { type : "idle", value: void 0 };
      }
    }
    return { type: "waiting", value: { wantedRange } };
  }

  /**
   * @param {Object} segment
   * @returns {Observable}
   */
  function loadNeededSegments(
    segment : Segment
  ) : Observable<{ segment : Segment } & IPipelineResponse> {
    return pipeline({
      adaptation,
      init: initSegmentInfos || undefined,
      manifest,
      period,
      representation,
      segment,
    }).map((args) => objectAssign({ segment }, args));
  }

  /**
   * @param {Object} timing
   * @param {number} wantedBufferAhead
   * @param {Boolean} needsInitSegment
   * @returns {Observable}
   */
  function checkBufferStatus(
    timing : IBufferClockTick,
    wantedBufferAhead : number,
    needsInitSegment : boolean
  ) : Observable<IRepresentationBufferEvent> {
    checkDiscontinuity(timing);
    const bufferStatus = getCurrentStatus(timing, wantedBufferAhead, needsInitSegment);

    if (bufferStatus.type === "idle" || bufferStatus.type === "waiting") {
      return Observable.empty();
    }

    log.debug("Buffer status:", bufferStatus.type, bufferStatus.value, content);

    if (bufferStatus.type === "segments-queued") {
      const neededSegments = bufferStatus.value.segments;
      for (let i = 0; i < neededSegments.length; i++) {
        queuedSegments.add(neededSegments[i].id);
      }

      return Observable.of(...neededSegments)
        .concatMap(loadNeededSegments)
        .concatMap(appendDataInBuffer)
        .startWith(bufferStatus);
    }

    return Observable.of(bufferStatus);
  }

  const check$ = Observable.combineLatest(clock$, wantedBufferAhead$)
    .concatMap((args, i) => checkBufferStatus(args[0], args[1], !i));

  return Observable.merge(check$, messageSubject);
}
