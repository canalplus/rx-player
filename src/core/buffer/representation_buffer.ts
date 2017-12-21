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
import Adaptation from "../../manifest/adaptation";
// import Representation from "../../manifest/representation";
import Segment from "../../manifest/segment";
import { SimpleSet } from "../../utils/collections";
import log from "../../utils/log";
import forceGarbageCollection from "./force_garbage_collection";
import getWantedBufferRange from "./get_wanted_range";
import {
  IBufferArguments,
  IBufferClockTick,
  IBufferSegmentInfos,
  IDownloaderResponse,
  IRepresentationBufferEvent,
  IRepresentationBufferStatus,
} from "./types";

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
 * Multiple RepresentationBuffer can be ran on the same SourceBuffer. This
 * allows for example smooth playback of multiple periods.
 *
 * @param {Object} opt
 * @returns {Observable}
 */
export default function RepresentationBuffer({
  clock$,
  content,
  queuedSourceBuffer,
  segmentBookkeeper,
  pipeline,
  wantedBufferAhead$,
} : IBufferArguments) : Observable<IRepresentationBufferEvent> {
  const {
    manifest,
    period,
    adaptation,
    representation,
  } = content;

  // will be used to emit messages to the calling function
  const messageSubject : Subject<IRepresentationBufferEvent> = new Subject();

  const { high : HIGH_PADDING, low : LOW_PADDING } = getBufferPaddings(adaptation);
  /**
   * Saved state of the init segment for this representation to give it back to the
   * pipeline on subsequent downloads
   * @type {Object|null}
   */
  let initSegmentInfos : IBufferSegmentInfos|null = null;

  /**
   * Keep track of currently downloaded segments:
   *   - avoid re-downloading them when they are pending.
   *   - allows to know if the buffer is idle or waiting on segments.
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
    range : {
      start : number;
      end : number;
    },
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

    // XXX TODO
    // get every segments currently downloaded and loaded
    const segments = segmentBookkeeper.inventory
      .filter((bufferedSegment) =>
        bufferedSegment.infos.period.id === period.id &&
        bufferedSegment.infos.adaptation.id === adaptation.id &&
        bufferedSegment.infos.representation.id === representation.id
      )
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
    wantedRange : {
      start : number;
      end : number;
    }
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

    // only re-load comparatively-poor bitrates for the same adaptation.
    return !currentSegment ||
      (currentSegment.infos.period.id !== period.id) ||
      (currentSegment.infos.adaptation.id !== adaptation.id) ||
      (currentSegment.infos.representation.bitrate * BITRATE_REBUFFERING_RATIO) <
      representation.bitrate;
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
   * or if it is filled, finished, idle etc.
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

    const limits = {
      start: Math.max(period.start, timing.currentTime + timing.timeOffset),
      end: period.end,
      liveGap: timing.liveGap,
    };
    const wantedRange = getWantedBufferRange(
      buffered,
      limits,
      bufferGoal,
      { low: LOW_PADDING, high: HIGH_PADDING }
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
      if (limits.end != null && timing.currentTime >= limits.end) {
        return {
          type: "finished",
          value: {
            wantedRange,
          },
        };
      } else if (limits.end != null && wantedRange.end >= limits.end) {
        return {
          type: "filled",
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
  ) : Observable<{ segment : Segment } & IDownloaderResponse> {
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

    log.debug("Buffer status:", bufferStatus.type, bufferStatus.value, representation);

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
