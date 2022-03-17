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

// eslint-disable-next-line max-len
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
import { IBufferedChunk, IEndOfSegmentInfos } from "../../segment_buffers";
import {
  IBufferedHistoryEntry,
  IChunkContext,
} from "../../segment_buffers/inventory";


interface IContentContext {
  adaptation: Adaptation;
  manifest: Manifest;
  period: Period;
  representation: Representation;
}


/** Arguments for `getNeededSegments`. */
export interface IGetNeededSegmentsArguments {
  /** The content we want to load segments for */
  content: IContentContext;
  /**
   * The current playing position.
   * Important to avoid asking for segments on the same exact position, which
   * can be problematic in some browsers.
   */
  currentPlaybackTime: number;
  /**
   * This threshold defines a bitrate from which "fast-switching" is disabled.
   * For example with a fastSwitchThreshold set to `100`, segments with a
   * bitrate of `90` can be replaced. But segments with a bitrate of `100`
   * onward won't be replaced by higher quality segments.
   * Set to `undefined` to indicate that there's no threshold (anything can be
   * replaced by higher-quality segments).
   */
  fastSwitchThreshold : number | undefined;
  /** The range we want to fill with segments. */
  neededRange : { start: number; end: number };
  /** The list of segments that are already in the process of being pushed. */
  segmentsBeingPushed : IEndOfSegmentInfos[];
  /**
   * Information on the segments already in the buffer, in chronological order.
   *
   * The data for the whole buffer is not necessary, as only data around the
   * current range will be looked at.
   * It is important to include segments close to - though not in - that range
   * (let's say around 5 seconds) however to avoid some segments being
   * re-requested.
   */
  bufferedSegments : IBufferedChunk[];

  /**
   * maxBufferSize is the maximum memory in kilobytes that the buffer should take
   */
  maxBufferSize: number;

  getBufferedHistory : (context : IChunkContext) => IBufferedHistoryEntry[];
}


interface INeededSegments {
  neededSegments: ISegment[];
  isBufferFull: boolean;
}
/**
 * Return the list of segments that can currently be downloaded to fill holes
 * in the buffer in the given range, including already-pushed segments currently
 * incomplete in the buffer.
 * This list might also include already-loaded segments in a higher bitrate,
 * according to the given configuration.
 * Excludes segment that are already being pushed.
 * @param {Object} args
 * @returns {Array.<Object>}
 */
export default function getNeededSegments({
  bufferedSegments,
  content,
  currentPlaybackTime,
  fastSwitchThreshold,
  getBufferedHistory,
  neededRange,
  segmentsBeingPushed,
  maxBufferSize,
} : IGetNeededSegmentsArguments) : INeededSegments {
  const { representation } = content;
  let availableBufferSize = getAvailableBufferSize(bufferedSegments,
                                                   segmentsBeingPushed,
                                                   maxBufferSize);

  // Current buffer length in seconds
  let bufferLength = getBufferLength(bufferedSegments, segmentsBeingPushed);
  const availableSegmentsForRange = representation.index
    .getSegments(neededRange.start, neededRange.end - neededRange.start);

  // Remove from `bufferedSegments` any segments we would prefer to replace:
  //   - segments in the wrong track / bad quality
  //   - garbage-collected segments
  const segmentsToKeep = bufferedSegments
    .filter((bufferedSegment) => !shouldContentBeReplaced(bufferedSegment.infos,
                                                          content,
                                                          currentPlaybackTime,
                                                          fastSwitchThreshold))
    .filter((currentSeg, i, consideredSegments) => {
      const prevSeg = i === 0 ? null :
                                consideredSegments[i - 1];
      const nextSeg = i >= consideredSegments.length - 1 ? null :
                                                           consideredSegments[i + 1];

      let lazySegmentHistory : IBufferedHistoryEntry[] | null = null;
      if (doesStartSeemGarbageCollected(currentSeg, prevSeg, neededRange.start)) {
        lazySegmentHistory = getBufferedHistory(currentSeg.infos);
        if (shouldReloadSegmentGCedAtTheStart(lazySegmentHistory,
                                              currentSeg.bufferedStart)) {
          return false;
        }
        log.debug("Stream: skipping segment gc-ed at the start", currentSeg);
      }
      if (doesEndSeemGarbageCollected(currentSeg, nextSeg, neededRange.end)) {
        lazySegmentHistory = lazySegmentHistory ?? getBufferedHistory(currentSeg.infos);
        if (shouldReloadSegmentGCedAtTheEnd(lazySegmentHistory,
                                            currentSeg.bufferedEnd)) {
          return false;
        }
        log.debug("Stream: skipping segment gc-ed at the end", currentSeg);
      }
      return true;
    });
  const { MINIMUM_SEGMENT_SIZE,
          MIN_BUFFER_LENGTH,
          MIN_BUFFER_DISTANCE_BEFORE_CLEAN_UP } = config.getCurrent();
  let isMemorySaturated = false;
  /**
   * Epsilon compensating for rounding errors when comparing the start and end
   * time of multiple segments.
   */
  const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
  let isBufferFull = false;
  const neededSegments = availableSegmentsForRange.filter(segment => {
    const contentObject = objectAssign({ segment }, content);

    // First, check that the segment is not already being pushed
    if (segmentsBeingPushed.length > 0) {
      const isAlreadyBeingPushed = segmentsBeingPushed
        .some((pendingSegment) => areSameContent(contentObject, pendingSegment));
      if (isAlreadyBeingPushed) {
        return false;
      }
    }

    const { duration, time, end } = segment;
    if (segment.isInit) {
      return true; // never skip initialization segments
    }
    if (isMemorySaturated) {
      // If we are so saturated in memory
      // That we cannot download atleast till
      // NeededRange.Start ( current position ) + a CONST
      // Then the buffer is full
      if (time < neededRange.start + MIN_BUFFER_DISTANCE_BEFORE_CLEAN_UP) {
        isBufferFull = true;
      }
    }
    if (isMemorySaturated &&
      bufferLength > MIN_BUFFER_LENGTH) {

      return false;
    }

    if (segment.complete && duration < MINIMUM_SEGMENT_SIZE) {
      return false; // too small, don't download
    }

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
        if ((oldSegment.time - ROUNDING_ERROR) > time) {
          return false;
        }
        if ((oldSegment.end + ROUNDING_ERROR) < end) {
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
    for (let i = 0; i < segmentsToKeep.length; i++) {
      const completeSeg = segmentsToKeep[i];
      const areFromSamePeriod = completeSeg.infos.period.id === content.period.id;
      // Check if content are from same period, as there can't be overlapping
      // periods, we should consider a segment as already downloaded if
      // it is from same period (but can be from different adaptation or
      // representation)
      if (areFromSamePeriod) {
        const completeSegInfos = completeSeg.infos.segment;
        if (time - completeSegInfos.time > -ROUNDING_ERROR &&
            completeSegInfos.end - end > -ROUNDING_ERROR)
        {
          return false; // already downloaded
        }
      }
    }

    // check if there is an hole in place of the segment currently
    for (let i = 0; i < segmentsToKeep.length; i++) {
      const completeSeg = segmentsToKeep[i];
      if (completeSeg.end > time) {
        // `true` if `completeSeg` starts too far after `time`
        return completeSeg.start > time + ROUNDING_ERROR ||
          // `true` if `completeSeg` ends too soon before `end`
          getLastContiguousSegment(segmentsToKeep, i).end < end - ROUNDING_ERROR;
      }
    }

    const estimatedSegmentSize = (duration * content.representation.bitrate) / 8000;
    if (availableBufferSize - estimatedSegmentSize < 0 &&
        bufferLength > MIN_BUFFER_LENGTH) {
      isMemorySaturated = true;
      return false;
    }
    availableBufferSize -= estimatedSegmentSize;
    bufferLength += duration;

    return true;
  });
  return { neededSegments, isBufferFull };

}
/**
 * Compute the estimated available buffer size in memory in kilobytes
 * @param bufferedSegments
 * @param segmentsBeingPushed
 * @param maxVideoBufferSize
 * @returns availableBufferSize in kilobytes
 */
function getAvailableBufferSize(
  bufferedSegments: IBufferedChunk[],
  segmentsBeingPushed: IEndOfSegmentInfos[],
  maxVideoBufferSize: number
) : number {
  let availableBufferSize = maxVideoBufferSize;
  availableBufferSize -= segmentsBeingPushed.reduce((size, segment) => {
    const { bitrate } = segment.representation;
    // Not taking into account the fact that the segment
    // can still be generated and the duration not fully exact
    const { duration } = segment.segment;
    return size + ((bitrate / 8000) * duration);
  }, 0);
  return bufferedSegments.reduce((size, chunk) => {
    if (chunk.chunkSize !== undefined) {
      return size - (chunk.chunkSize / 8000);
    } else {
      return size;
    }

  } , availableBufferSize);
}

/**
 * Compute the length of the buffer in seconds
 * @param bufferedSegments
 * @param segmentsBeingPushed
 * @returns bufferLength in seconds
 */
function getBufferLength(
  bufferedSegments: IBufferedChunk[],
  segmentsBeingPushed: IEndOfSegmentInfos[]
) : number {
  const bufferLength = bufferedSegments.reduce((length, segment) => {
    return length + (segment.end - segment.start);
  }, 0);
  const bufferBeingPushed = segmentsBeingPushed.reduce((length, segment) => {
    return length + segment.segment.duration;
  }, 0);
  return bufferLength + bufferBeingPushed;
}

/**
 * From the given array of buffered chunks (`bufferedSegments`) returns the last
 * buffered chunk contiguous with the one at the `startIndex` index given.
 * @param {Array.<Object>}
 * @param {number} startIndex
 * @returns {Object}
 */
function getLastContiguousSegment(
  bufferedSegments : IBufferedChunk[],
  startIndex : number
) : IBufferedChunk {
  let j = startIndex + 1;
  const { MINIMUM_SEGMENT_SIZE } = config.getCurrent();
  /**
   * Epsilon compensating for rounding errors when comparing the start and end
   * time of multiple segments.
   */
  const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
  // go through all contiguous segments and take the last one
  while (j < bufferedSegments.length - 1 &&
         (bufferedSegments[j - 1].end + ROUNDING_ERROR) >
          bufferedSegments[j].start)
  {
    j++;
  }
  j--; // index of last contiguous segment
  return bufferedSegments[j];
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
  oldContent : IEndOfSegmentInfos,
  currentContent : { adaptation : Adaptation;
                     period : Period;
                     representation : Representation; },
  currentPlaybackTime: number,
  fastSwitchThreshold? : number
) : boolean {
  const { CONTENT_REPLACEMENT_PADDING } = config.getCurrent();
  if (oldContent.period.id !== currentContent.period.id) {
    return false; // keep segments from another Period by default.
  }

  const { segment } = oldContent;
  if (segment.time < (currentPlaybackTime + CONTENT_REPLACEMENT_PADDING)) {
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
  const { BITRATE_REBUFFERING_RATIO } = config.getCurrent();
  if (fastSwitchThreshold === undefined) {
    // only re-load comparatively-poor bitrates for the same Adaptation.
    const bitrateCeil = oldContentBitrate * BITRATE_REBUFFERING_RATIO;
    return newSegmentRepresentation.bitrate > bitrateCeil;
  }
  return oldContentBitrate < fastSwitchThreshold &&
         newSegmentRepresentation.bitrate > oldContentBitrate;
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
function doesStartSeemGarbageCollected(
  currentSeg : IBufferedChunk,
  prevSeg : IBufferedChunk | null,
  maximumStartTime : number
) {
  const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT } = config.getCurrent();
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
function doesEndSeemGarbageCollected(
  currentSeg : IBufferedChunk,
  nextSeg : IBufferedChunk | null,
  minimumEndTime : number
) {
  const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT } = config.getCurrent();
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
 * Returns `true` if a segment that has been garbage-collected at the start
 * might profit from being re-loaded.
 *
 * Returns `false` if we have a high chance of staying in the same situation
 * after re-loading the segment.
 *
 * This function takes in argument the entries of a SegmentBuffer's history
 * related to the corresponding segment and check if the segment appeared
 * garbage-collected at the start directly after the last few times it was
 * pushed, indicating that the issue might be sourced at a browser issue instead
 * of classical garbage collection.
 *
 * @param {Array.<Object>} segmentEntries
 * @param {number|undefined} currentBufferedStart
 * @returns {boolean}
 */
function shouldReloadSegmentGCedAtTheStart(
  segmentEntries : IBufferedHistoryEntry[],
  currentBufferedStart : number | undefined
) : boolean {
  if (segmentEntries.length < 2) {
    return true;
  }

  const lastEntry = segmentEntries[segmentEntries.length - 1];
  const lastBufferedStart = lastEntry.bufferedStart;

  // If the current segment's buffered start is much higher than what it
  // initially was when we pushed it, the segment has a very high chance of
  // having been truly garbage-collected.
  if (currentBufferedStart !== undefined &&
      currentBufferedStart - lastBufferedStart > 0.05)
  {
    return true;
  }

  const prevEntry = segmentEntries[segmentEntries.length - 2];
  const prevBufferedStart = prevEntry.bufferedStart;

  // Compare `bufferedStart` from the last time this segment was pushed
  // (`entry.bufferedStart`) to the previous time it was pushed
  // (`prevSegEntry.bufferedStart`).
  //
  // If in both cases, we notice that their initial `bufferedStart` are close,
  // it means that in recent history the same segment has been accused to be
  // garbage collected two times at roughly the same positions just after being
  // pushed.
  // This is very unlikely and might be linked to either a content or browser
  // issue. In that case, don't try to reload.
  return Math.abs(prevBufferedStart - lastBufferedStart) > 0.01;
}

/**
 * Returns `true` if a segment that has been garbage-collected at the end
 * might profit from being re-loaded.
 *
 * Returns `false` if we have a high chance of staying in the same situation
 * after re-loading the segment.
 *
 * This function takes in argument the entries of a SegmentBuffer's history
 * related to the corresponding segment and check if the segment appeared
 * garbage-collected at the end directly after the last few times it was
 * pushed, indicating that the issue might be sourced at a browser issue instead
 * of classical garbage collection.
 *
 * @param {Array.<Object>} segmentEntries
 * @param {number|undefined} currentBufferedStart
 * @returns {boolean}
 */
function shouldReloadSegmentGCedAtTheEnd(
  segmentEntries : IBufferedHistoryEntry[],
  currentBufferedEnd : number | undefined
) : boolean {
  if (segmentEntries.length < 2) {
    return true;
  }
  const lastEntry = segmentEntries[segmentEntries.length - 1];
  const lastBufferedEnd = lastEntry.bufferedEnd;

  // If the current segment's buffered end is much lower than what it
  // initially was when we pushed it, the segment has a very high chance of
  // having been truly garbage-collected.
  if (currentBufferedEnd !== undefined &&
      lastBufferedEnd - currentBufferedEnd > 0.05)
  {
    return true;
  }

  const prevEntry = segmentEntries[segmentEntries.length - 2];
  const prevBufferedEnd = prevEntry.bufferedEnd;

  // Compare `bufferedEnd` from the last time this segment was pushed
  // (`entry.bufferedEnd`) to the previous time it was pushed
  // (`prevSegEntry.bufferedEnd`).
  //
  // If in both cases, we notice that their initial `bufferedEnd` are close,
  // it means that in recent history the same segment has been accused to be
  // garbage collected two times at roughly the same positions just after being
  // pushed.
  // This is very unlikely and might be linked to either a content or browser
  // issue. In that case, don't try to reload.
  return Math.abs(prevBufferedEnd - lastBufferedEnd) > 0.01;
}
