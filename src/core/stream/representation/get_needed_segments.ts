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

import shouldAppendBufferAfterPadding from "../../../compat/should_append_buffer_after_padding";
import config from "../../../config";
import log from "../../../log";
import Manifest, {
  Adaptation,
  areSameContent,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import {
  IBufferedChunk,
  IEndOfSegmentOperation,
  QueuedSourceBuffer,
  SourceBufferOperation,
} from "../../source_buffers";

const { CONTENT_REPLACEMENT_PADDING,
        BITRATE_REBUFFERING_RATIO,
        MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT,
        MINIMUM_SEGMENT_SIZE } = config;

export interface ISegmentFilterArgument {
  content: { adaptation : Adaptation;
             manifest : Manifest;
             period : Period;
             representation : Representation; };
  currentPlaybackTime: number;
  fastSwitchThreshold : number | undefined;
  neededRange : { start: number;
                  end: number; };
  queuedSourceBuffer : QueuedSourceBuffer<unknown>;
}

/**
 * Epsilon compensating for rounding errors when comparing the start and end
 * time of multiple segments.
 */
const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);

/**
 * @param {Object} segmentFilterArgument
 * @returns {Array.<Object>}
 */
export default function getNeededSegments({
  content,
  currentPlaybackTime,
  fastSwitchThreshold,
  neededRange,
  queuedSourceBuffer,
} : ISegmentFilterArgument) : ISegment[] {
  const segmentInventory = queuedSourceBuffer.getInventory();
  /**
   * Every segment awaiting an "EndOfSegment" operation, which indicates that a
   * completely-loaded segment is still being pushed to the QueuedSourceBuffer.
   */
  const segmentsBeingPushed = queuedSourceBuffer.getPendingOperations()
    .filter((operation) : operation is IEndOfSegmentOperation =>
      operation.type === SourceBufferOperation.EndOfSegment
    ).map(operation => operation.value);

  // 1 - construct lists of segments possible and actually pushed
  const segmentsForRange = content.representation.index
    .getSegments(neededRange.start, neededRange.end - neededRange.start);

  let bufferedSegments = getPlayableBufferedSegments({
    start: Math.max(neededRange.start - 0.5, 0),
    end: neededRange.end + 0.5,
  }, segmentInventory);

  // 2 - remove from pushed list of current segments the contents we want to replace
  bufferedSegments = bufferedSegments.filter((bufferedSegment) =>
    !shouldContentBeReplaced(bufferedSegment.infos,
                             content,
                             currentPlaybackTime,
                             fastSwitchThreshold));

  // 3 - remove from that list the segments who appeared to have been GCed
  bufferedSegments = filterGarbageCollectedSegments(bufferedSegments, neededRange);

  // 4 - now filter the list of segments we can download
  return segmentsForRange.filter(segment => {
    const contentObject = objectAssign({ segment }, content);

    // First, check that the segment is not already being pushed
    if (segmentsBeingPushed.length > 0) {
      const isAlreadyBeingPushed = segmentsBeingPushed
        .some((pendingSegment) => areSameContent(contentObject, pendingSegment));
      if (isAlreadyBeingPushed) {
        return false;
      }
    }

    const { duration, time, timescale } = segment;
    if (segment.isInit || duration === undefined) {
      return true; // never skip those
    }

    if (duration / timescale < MINIMUM_SEGMENT_SIZE) {
      return false; // too small
    }

    const scaledTime = time / timescale;
    const scaledDuration = duration / timescale;
    const scaledEnd = scaledTime + scaledDuration;

    // Check if the same segment from another Representation is not already
    // being pushed.
    if (segmentsBeingPushed.length > 0) {
      const waitForPushedSegment = segmentsBeingPushed.some((pendingSegment) => {
        if (pendingSegment.period.id !== content.period.id ||
            pendingSegment.adaptation.id !== content.adaptation.id)
        {
          return false;
        }
        const { segment: oldSegment } = pendingSegment;
        const oldSegmentStart = oldSegment.time / oldSegment.timescale;
        if ((oldSegmentStart - ROUNDING_ERROR) > scaledTime) {
          return false;
        }
        const oldSegmentEnd = oldSegmentStart +
          (oldSegment.duration / oldSegment.timescale);
        if ((oldSegmentEnd + ROUNDING_ERROR) < scaledEnd) {
          return false;
        }
        return !shouldContentBeReplaced(pendingSegment,
                                        contentObject,
                                        currentPlaybackTime,
                                        fastSwitchThreshold);
      });
      if (waitForPushedSegment) {
        return false;
      }
    }

    // check if the segment is already downloaded
    for (let i = 0; i < bufferedSegments.length; i++) {
      const completeSeg = bufferedSegments[i];
      const areFromSamePeriod = completeSeg.infos.period.id === content.period.id;
      // Check if content are from same period, as there can't be overlapping
      // periods, we should consider a segment as already downloaded if
      // it is from same period (but can be from different adaptation or
      // representation)
      if (areFromSamePeriod) {
        const segTime = completeSeg.infos.segment.time;
        const segDuration = completeSeg.infos.segment.duration;
        const segTimeScale = completeSeg.infos.segment.timescale;
        const scaledSegTime = segTime / segTimeScale;
        const scaledSegEnd = scaledSegTime + segDuration / segTimeScale;
        if (scaledTime - scaledSegTime > -ROUNDING_ERROR &&
            scaledSegEnd - scaledEnd > -ROUNDING_ERROR)
        {
          return false; // already downloaded
        }
      }
    }

    // check if there is an hole in place of the segment currently
    for (let i = 0; i < bufferedSegments.length; i++) {
      const completeSeg = bufferedSegments[i];
      if (completeSeg.end > scaledTime) {
        if (completeSeg.start > scaledTime + ROUNDING_ERROR) {
          return true;
        }
        let j = i + 1;

        // go through all contiguous segments and take the last one
        while (j < bufferedSegments.length - 1 &&
               (bufferedSegments[j - 1].end + ROUNDING_ERROR) >
                bufferedSegments[j].start)
        {
          j++;
        }
        j--; // index of last contiguous segment

        return bufferedSegments[j].end < scaledEnd + ROUNDING_ERROR;
      }
    }
    return true;
  });
}

/**
 * Returns `true` if segments linked to the given `oldContent` currently present
 * in the buffer should be replaced by segments coming from `currentContent`.
 * @param {Object} oldContent
 * @param {Object} currentContent
 * @param {number} currentPlaybackTime
 * @param {number} [fastSwitchThreshold]
 * @returns {boolean}
 */
function shouldContentBeReplaced(
  oldContent : { adaptation : Adaptation;
                 period : Period;
                 representation : Representation;
                 segment : ISegment; },
  currentContent : { adaptation : Adaptation;
                     period : Period;
                     representation : Representation; },
  currentPlaybackTime: number,
  fastSwitchThreshold? : number
) : boolean {
  if (oldContent.period.id !== currentContent.period.id) {
    return false; // keep segments from another Period by default.
  }

  const { segment } = oldContent;
  if (shouldAppendBufferAfterPadding &&
      (segment.time / segment.timescale) <
      (currentPlaybackTime + CONTENT_REPLACEMENT_PADDING)) {
      return false;
  }

  if (oldContent.adaptation.id !== currentContent.adaptation.id) {
    return true; // replace segments from another Adaptation
  }

  return canFastSwitch(oldContent.representation,
                       currentContent.representation,
                       fastSwitchThreshold);
}

/**
 * Returns `true` if segments from the new Representation can replace
 * previously-loaded segments from the old Representation given.
 *
 * This behavior is called "fast-switching".
 * @param {Object} oldSegmentRepresentation
 * @param {Object} newSegmentRepresentation
 * @param {number|undefined} fastSwitchThreshold
 * @returns {boolean}
 */
function canFastSwitch(
  oldSegmentRepresentation : Representation,
  newSegmentRepresentation : Representation,
  fastSwitchThreshold : number | undefined
) : boolean {
  const oldContentBitrate = oldSegmentRepresentation.bitrate;
  if (fastSwitchThreshold === undefined) {
    // only re-load comparatively-poor bitrates for the same Adaptation.
    const bitrateCeil = oldContentBitrate * BITRATE_REBUFFERING_RATIO;
    return newSegmentRepresentation.bitrate > bitrateCeil;
  }
  return oldContentBitrate < fastSwitchThreshold &&
         newSegmentRepresentation.bitrate > oldContentBitrate;
}

/**
 * Returns an Array which removed the segments from `consideredSegments` which
 * appeared to have been garbage collected.
 * @param {Array.<Object>} consideredSegments
 * @param {Object} neededRange
 * @returns {Array.<Object>}
 */
function filterGarbageCollectedSegments(
  consideredSegments : IBufferedChunk[],
  neededRange : { start : number; end : number }
) : IBufferedChunk[] {
  const completeSegments : IBufferedChunk[] = [];
  for (let i = 0; i < consideredSegments.length; i++) {
    const currentSeg = consideredSegments[i];
    const prevSeg = i === 0 ? null :
                              consideredSegments[i - 1];
    const nextSeg = i >= consideredSegments.length - 1 ? null :
                                                         consideredSegments[i + 1];
    if (!isStartGarbageCollected(currentSeg, prevSeg, neededRange.start) &&
        !isEndGarbageCollected(currentSeg, nextSeg, neededRange.end))
    {
      completeSegments.push(currentSeg);
    }
  }
  return completeSegments;
}

/**
 * From buffered segment information, return `true` if the given `currentSeg`
 * might have been garbage collected at the start.
 * Return `false` if the segment is complete at least from `maximumStartTime`.
 * @param {Object} currentSeg - The segment information for the segment in
 * question.
 * @param {Object|null} prevSeg - The segment information for the previous
 * buffered segment, if one (`null` if none).
 * @param {number} maximumStartTime - Only consider the data after that time.
 * If `currentSeg` has only been garbage collected for some data which is before
 * that time, we will return `false`.
 */
function isStartGarbageCollected(
  currentSeg : IBufferedChunk,
  prevSeg : IBufferedChunk | null,
  maximumStartTime : number
) {
  if (currentSeg.bufferedStart === undefined)  {
    log.warn("Stream: Start of a segment unknown. " +
             "Assuming it is garbage collected by default.",
             currentSeg);
    return true;
  }

  if (prevSeg !== null && prevSeg.bufferedEnd !== undefined &&
      (currentSeg.bufferedStart - prevSeg.bufferedEnd < 0.1))
  {
    return false;
  }

  if (maximumStartTime < currentSeg.bufferedStart &&
      currentSeg.bufferedStart - currentSeg.start >
        MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT)
  {
    log.info("Stream: The start of the wanted segment has been garbage collected",
              currentSeg);
    return true;
  }

  return false;
}

/**
 * From buffered segment information, return `true` if the given `currentSeg`
 * might have been garbage collected at the end.
 * Return `false` if the segment is complete at least until `minimumEndTime`.
 * @param {Object} currentSeg - The segment information for the segment in
 * question.
 * @param {Object|null} nextSeg - The segment information for the next buffered
 * segment, if one (`null` if none).
 * @param {number} minimumEndTime - Only consider the data before that time.
 * If `currentSeg` has only been garbage collected for some data which is after
 * that time, we will return `false`.
 */
function isEndGarbageCollected(
  currentSeg : IBufferedChunk,
  nextSeg : IBufferedChunk | null,
  minimumEndTime : number
) {
  if (currentSeg.bufferedEnd === undefined)  {
    log.warn("Stream: End of a segment unknown. " +
             "Assuming it is garbage collected by default.",
             currentSeg);
    return true;
  }

  if (nextSeg !== null && nextSeg.bufferedStart !== undefined &&
      (nextSeg.bufferedStart - currentSeg.bufferedEnd < 0.1))
  {
    return false;
  }

  if (minimumEndTime > currentSeg.bufferedEnd &&
      currentSeg.end - currentSeg.bufferedEnd > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT)
  {
    log.info("Stream: The end of the wanted segment has been garbage collected",
              currentSeg);
    return true;
  }

  return false;
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
  const segmentRoundingError = Math.max(1 / 60, MINIMUM_SEGMENT_SIZE);
  const minEnd = neededRange.start + segmentRoundingError;
  const maxStart = neededRange.end - segmentRoundingError;

  const overlappingChunks : IBufferedChunk[] = [];
  for (let i = segmentInventory.length - 1; i >= 0; i--) {
    const eltInventory = segmentInventory[i];

    const { representation } = eltInventory.infos;
    if (!eltInventory.partiallyPushed &&
        representation.decipherable !== false &&
        representation.isSupported)
    {
      const inventorySegment = eltInventory.infos.segment;
      const eltInventoryStart = inventorySegment.time /
                                inventorySegment.timescale;
      const eltInventoryEnd = inventorySegment.duration == null ?
        eltInventory.end :
        eltInventoryStart + inventorySegment.duration /
          inventorySegment.timescale;
      if ((eltInventoryEnd > minEnd && eltInventoryStart < maxStart) ||
          (eltInventory.end > minEnd && eltInventory.start < maxStart))
      {
        overlappingChunks.unshift(eltInventory);
      }
    }
  }
  return overlappingChunks;
}
