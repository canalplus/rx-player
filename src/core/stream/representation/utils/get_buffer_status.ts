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

import config from "../../../../config";
import type { IReadOnlyPlaybackObserver } from "../../../../main_thread/types";
import type {
  IManifest,
  IAdaptation,
  IPeriod,
  IRepresentation,
} from "../../../../manifest";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import type {
  IBufferedChunk,
  ISignalCompleteSegmentOperation,
  SegmentSink } from "../../../segment_sinks";
import SegmentSinksStore, {
  ChunkStatus,
  SegmentSinkOperation,
} from "../../../segment_sinks";
import type {
  IBufferDiscontinuity,
  IRepresentationStreamPlaybackObservation,
  IQueuedSegment,
} from "../types";
import checkForDiscontinuity from "./check_for_discontinuity";
import getNeededSegments from "./get_needed_segments";
import getSegmentPriority from "./get_segment_priority";


/** Analysis of the current buffer's status. */
export interface IBufferStatus {
  /**
   * Future discontinuity found in the SegmentSink's buffer: hole that won't
   * be filled by a segment.
   * `null` if no such discontinuity is found in the near future.
   */
  imminentDiscontinuity : IBufferDiscontinuity | null;
  /**
   * If `true`, no segment need to be loaded to be able to play until the end of
   * the Period.
   * Some segments might still be in the process of being pushed.
   */
  hasFinishedLoading : boolean;
  /**
   * Segments that have to be scheduled for download to fill the buffer at least
   * until the given buffer goal.
   * The first element of that list might already be currently downloading.
   */
  neededSegments : IQueuedSegment[];
  /**
   * If `true`, the Manifest has to be reloaded to obtain more information
   * on which segments should be loaded.
   */
  shouldRefreshManifest : boolean;
  /**
   * If 'true', the buffer memory is saturated, thus we may have issues loading
   * new segments.
   */
  isBufferFull: boolean;
}

/**
 * Checks on the current buffered data for the given type and Period
 * and returns what should be done to fill the buffer according to the buffer
 * goal, the Representation chosen, etc.
 * Also emits discontinuities if found, which are parts of the buffer that won't
 * be filled by any segment, even in the future.
 *
 * @param {Object} content
 * @param {number} initialWantedTime
 * @param {Object} playbackObserver
 * @param {number|undefined} fastSwitchThreshold
 * @param {number} bufferGoal
 * @param {number} maxBufferSize
 * @param {Object} segmentSink
 * @returns {Object}
 */
export default function getBufferStatus(
  content: { adaptation : IAdaptation;
             manifest : IManifest;
             period : IPeriod;
             representation : IRepresentation; },
  initialWantedTime : number,
  playbackObserver : IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>,
  fastSwitchThreshold : number | undefined,
  bufferGoal : number,
  maxBufferSize : number,
  segmentSink : SegmentSink
) : IBufferStatus {
  const { representation } = content;
  const isPaused =
    playbackObserver.getIsPaused() ??
    playbackObserver.getReference().getValue().paused.pending ??
    playbackObserver.getReference().getValue().paused.last;
  const playbackRate =
    playbackObserver.getPlaybackRate() ??
    playbackObserver.getReference().getValue().speed;
  let askedStart = initialWantedTime;
  if (isPaused === undefined ||
      playbackRate === undefined ||
      (isPaused || playbackRate <= 0))
  {
    askedStart -= 0.1;
  }
  const neededRange = getRangeOfNeededSegments(content,
                                               askedStart,
                                               bufferGoal);
  const shouldRefreshManifest = representation.index.shouldRefresh(neededRange.start,
                                                                   neededRange.end);

  /**
   * Every segment awaiting an "SignalSegmentComplete" operation, which
   * indicates that a completely-loaded segment is still being pushed to the
   * SegmentSink.
   */
  const segmentsBeingPushed = segmentSink.getPendingOperations()
    .filter((operation) : operation is ISignalCompleteSegmentOperation =>
      operation.type === SegmentSinkOperation.SignalSegmentComplete
    ).map(operation => operation.value);

  /** Data on every segments buffered around `neededRange`. */
  const bufferedSegments =
    getPlayableBufferedSegments({ start: Math.max(neededRange.start - 0.5, 0),
                                  end: neededRange.end + 0.5 },
                                segmentSink.getLastKnownInventory());
  let currentPlaybackTime = playbackObserver.getCurrentTime();
  if (currentPlaybackTime === undefined) {
    // We're in a WebWorker, just consider the last known position
    currentPlaybackTime = playbackObserver.getReference().getValue().position.getWanted();
  }

  /** Callback allowing to retrieve a segment's history in the buffer. */
  const getBufferedHistory = segmentSink.getSegmentHistory.bind(segmentSink);

  /** List of segments we will need to download. */
  const { segmentsToLoad,
          segmentsOnHold,
          isBufferFull } = getNeededSegments({ content,
                                               bufferedSegments,
                                               currentPlaybackTime,
                                               fastSwitchThreshold,
                                               getBufferedHistory,
                                               neededRange,
                                               segmentsBeingPushed,
                                               maxBufferSize });

  const prioritizedNeededSegments: IQueuedSegment[] = segmentsToLoad.map((segment) => (
    {
      priority: getSegmentPriority(segment.time, askedStart),
      segment,
    }
  ));

  /**
   * `true` if the current `RepresentationStream` has loaded all the
   * needed segments for this Representation until the end of the Period.
   */
  const hasFinishedLoading = representation.index.isInitialized() &&
                             !representation.index.isStillAwaitingFutureSegments() &&
                             neededRange.hasReachedPeriodEnd &&
                             prioritizedNeededSegments.length === 0 &&
                             segmentsOnHold.length === 0;

  /**
   * Start time in seconds of the next available not-yet pushed segment.
   * `null` if no segment is wanted for the current wanted range.
   */
  let nextSegmentStart : number | null = null;
  if (segmentsBeingPushed.length > 0) {
    nextSegmentStart = Math.min(...segmentsBeingPushed.map(info => info.segment.time));
  }
  if (segmentsOnHold.length > 0) {
    nextSegmentStart = nextSegmentStart !== null ?
      Math.min(nextSegmentStart, segmentsOnHold[0].time) :
      segmentsOnHold[0].time;
  }
  if (prioritizedNeededSegments.length > 0) {
    nextSegmentStart = nextSegmentStart !== null ?
      Math.min(nextSegmentStart, prioritizedNeededSegments[0].segment.time) :
      prioritizedNeededSegments[0].segment.time;
  }

  const imminentDiscontinuity = checkForDiscontinuity(content,
                                                      neededRange,
                                                      nextSegmentStart,
                                                      hasFinishedLoading,
                                                      bufferedSegments);
  return { imminentDiscontinuity,
           hasFinishedLoading,
           neededSegments: prioritizedNeededSegments,
           isBufferFull,
           shouldRefreshManifest };
}

/**
 * Returns both the time range of segments that should be loaded (from a
 * starting position to an ending position) and whether the end of the Period is
 * reached by that range.
 * @param {Object} content
 * @param {number} initialWantedTime
 * @param {number} bufferGoal
 * @returns {Object}
 */
function getRangeOfNeededSegments(
  content: { adaptation : IAdaptation;
             manifest : IManifest;
             period : IPeriod;
             representation : IRepresentation; },
  initialWantedTime : number,
  bufferGoal : number
) : { start : number; end : number; hasReachedPeriodEnd : boolean } {
  let wantedStartPosition : number;
  const { manifest, period, representation } = content;
  const lastIndexPosition = representation.index.getLastAvailablePosition();
  const representationIndex = representation.index;

  // There is an exception for when the current initially wanted time is already
  // after the last position with segments AND when we're playing the absolute
  // last Period in the Manifest.
  // In that case, we want to actually request at least the last segment to
  // avoid ending the last Period - and by extension the content - with a
  // segment which isn't the last one.
  if (!isNullOrUndefined(lastIndexPosition) &&
      SegmentSinksStore.isNative(content.adaptation.type) &&
      initialWantedTime >= lastIndexPosition &&
      representationIndex.isInitialized() &&
      !representationIndex.isStillAwaitingFutureSegments() &&
      isPeriodTheCurrentAndLastOne(manifest, period, initialWantedTime))
  {
    wantedStartPosition = lastIndexPosition - 1;
  } else {
    wantedStartPosition = initialWantedTime - 0.1;
  }

  const wantedEndPosition = wantedStartPosition + bufferGoal;

  let hasReachedPeriodEnd;
  if (!representation.index.isInitialized() ||
      representation.index.isStillAwaitingFutureSegments() ||
      period.end === undefined)
  {
    hasReachedPeriodEnd = false;
  } else if (lastIndexPosition === undefined) {
    // We do not know the end of this index.
    hasReachedPeriodEnd = wantedEndPosition >= period.end;
  } else if (lastIndexPosition === null) {
    // There is no available segment in the index currently.
    hasReachedPeriodEnd = true;
  } else {
    // We have a declared end. Check that our range went until the last
    // position available in the index. If that's the case and we're left
    // with no segments after filtering them, it means we already have
    // downloaded the last segments and have nothing left to do: full.
    hasReachedPeriodEnd = wantedEndPosition >= lastIndexPosition;
  }

  return { start: Math.max(wantedStartPosition,
                           period.start),
           end: Math.min(wantedEndPosition, period.end ?? Infinity),
           hasReachedPeriodEnd };
}

/**
 * Returns `true` if the given Period is both:
 *   - the one being played (the current position is known from `time`)
 *   - the absolute last one in the Manifest (that is, there will never be a
 *     Period after it).
 * @param {Object} manifest
 * @param {Object} period
 * @param {number} time
 * @returns {boolean}
 */
function isPeriodTheCurrentAndLastOne(
  manifest : IManifest,
  period : IPeriod,
  time : number
) : boolean {
  const nextPeriod = manifest.getPeriodAfter(period);
  return period.containsTime(time, nextPeriod) &&
         manifest.isLastPeriodKnown &&
         period.id === manifest.periods[manifest.periods.length - 1]?.id;
}

/**
 * From the given SegmentInventory, filters the "playable" (in a supported codec
 * and not known to be undecipherable) buffered Segment Objects which overlap
 * with the given range.
 * @param {Object} neededRange
 * @param {Array.<Object>} segmentInventory
 * @returns {Array.<Object>}
 */
function getPlayableBufferedSegments(
  neededRange : { start : number; end : number },
  segmentInventory : IBufferedChunk[]
) : IBufferedChunk[] {
  const { MINIMUM_SEGMENT_SIZE } = config.getCurrent();
  const segmentRoundingError = Math.max(1 / 60, MINIMUM_SEGMENT_SIZE);
  const minEnd = neededRange.start + segmentRoundingError;
  const maxStart = neededRange.end - segmentRoundingError;

  const overlappingChunks : IBufferedChunk[] = [];
  for (let i = segmentInventory.length - 1; i >= 0; i--) {
    const eltInventory = segmentInventory[i];

    const { representation } = eltInventory.infos;
    if (eltInventory.status === ChunkStatus.Complete &&
        representation.decipherable !== false &&
        representation.isSupported !== false)
    {
      const inventorySegment = eltInventory.infos.segment;
      const eltInventoryStart = inventorySegment.time /
                                inventorySegment.timescale;
      const eltInventoryEnd = !inventorySegment.complete ?
        eltInventory.end :
        eltInventoryStart + inventorySegment.duration / inventorySegment.timescale;
      if ((eltInventoryEnd > minEnd && eltInventoryStart < maxStart) ||
          (eltInventory.end > minEnd && eltInventory.start < maxStart))
      {
        overlappingChunks.unshift(eltInventory);
      }
    }
  }
  return overlappingChunks;
}
