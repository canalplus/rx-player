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

import config from "../../../config";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import SimpleSet from "../../../utils/simple_set";
import { IBufferedChunk } from "../../source_buffers";

const { BITRATE_REBUFFERING_RATIO,
        MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT,
        MINIMUM_SEGMENT_SIZE } = config;

export interface ISegmentFilterArgument { content: { adaptation : Adaptation;
                                                     manifest : Manifest;
                                                     period : Period;
                                                     representation : Representation; };
                                          fastSwitchingStep : number | undefined;
                                          loadedSegmentPendingPush : SimpleSet;
                                          neededRange : { start: number;
                                                          end: number; };
                                          segment : ISegment;
                                          segmentInventory : IBufferedChunk[]; }

/**
 * From the given SegmentInventory, filters the buffered Segment Object which
 * overlap with the given [segmentStart, segmentEnd[ range.
 * @param {number} segmentStart
 * @param {number} segmentEnd
 * @param {Array.<Object>} segmentInventory
 * @returns {Array.<Object>}
 */
function getCorrespondingBufferedSegments(
  segmentStart : number,
  segmentEnd : number,
  segmentInventory : IBufferedChunk[]
) : IBufferedChunk[] {
  const overlappingChunks : IBufferedChunk[] = [];
  for (let i = segmentInventory.length - 1; i >= 0; i--) {
    const eltInventory = segmentInventory[i];

    if (eltInventory.isCompleteSegment) {
      const inventorySegment = eltInventory.infos.segment;
      const eltInventoryStart = inventorySegment.time /
                                inventorySegment.timescale;
      const eltInventoryEnd = inventorySegment.duration == null ?
        eltInventory.end :
        eltInventoryStart + inventorySegment.duration / inventorySegment.timescale;
      if (eltInventoryEnd > (segmentStart + 1 / 60) // 1 / 60 for rounding errors
          && eltInventoryStart < (segmentEnd - 1 / 60))
      {
        overlappingChunks.push(eltInventory);
      }
    }
  }
  return overlappingChunks;
}

/**
 * Return true if the given segment should be downloaded. false otherwise.
 * @param {Object} segmentFilterArgument
 * @returns {Boolean}
 */
export default function shouldDownloadSegment({
  content,
  fastSwitchingStep,
  loadedSegmentPendingPush,
  neededRange,
  segment,
  segmentInventory,
} : ISegmentFilterArgument) : boolean {
  if (loadedSegmentPendingPush.test(segment.id)) {
    return false; // we're already pushing it
  }

  const { duration, time, timescale } = segment;
  if (segment.isInit || duration == null) {
    return true;
  }

  if (duration / timescale < MINIMUM_SEGMENT_SIZE) {
    return false;
  }

  const scaledTime = time / timescale;
  const scaledDuration = duration / timescale;
  const scaledEnd = scaledTime + scaledDuration;
  const overlappingChunks =
    getCorrespondingBufferedSegments(scaledTime, scaledEnd, segmentInventory);

  if (overlappingChunks.length <= 0) {
    return true;
  }

  // if there is multiple ones check that they are contiguous.
  for (let i = 1; i < overlappingChunks.length; i++) {
    const overlChunk = overlappingChunks[i];
    const prevOverlChunk = overlappingChunks[i - 1];
    if (prevOverlChunk.bufferedEnd == null || overlChunk.bufferedStart == null) {
      return true;
    }
    const delta = overlChunk.bufferedStart - prevOverlChunk.bufferedEnd;
    if (Math.abs(delta) > 1 / 60) { // 1/60 for rounding errors
      return true;
    }
  }

  const firstOverlSegment = overlappingChunks[0];
  const lastOverlSegment = overlappingChunks[overlappingChunks.length - 1];

  if (firstOverlSegment.bufferedStart == null ||
      lastOverlSegment.bufferedEnd == null)
  {
    return true;
  }

  if (neededRange.start < firstOverlSegment.bufferedStart &&
      firstOverlSegment.bufferedStart - firstOverlSegment.start >
        MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT)
  {
    log.debug("SI: The wanted segment has been garbage collected",
              firstOverlSegment);
    return true;
  }

  if (neededRange.end > lastOverlSegment.bufferedEnd &&
      lastOverlSegment.end - lastOverlSegment.bufferedEnd >
        MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT)
  {
    log.debug("SI: The wanted segment has been garbage collected",
              lastOverlSegment);
    return true;
  }

  for (let i = 0; i < overlappingChunks.length; i++) {
    if (shouldReplaceContent(overlappingChunks[i].infos,
                             content,
                             fastSwitchingStep))
    {
      return true;
    }
  }

  return false;
}

/**
 * Return `true` if the old content should be replaced by the new content or
 * `false` otherwise.
 * @param {Object} oldContent
 * @param {Object} newContent
 * @param {number|undefined} fastSwitchingStep
 * @returns {boolean}
 */
function shouldReplaceContent(
  oldContent : { adaptation : Adaptation;
                 period : Period;
                 representation : Representation; },
  newContent : { adaptation : Adaptation;
                 period : Period;
                 representation : Representation; },
  fastSwitchingStep : number | undefined
) : boolean {
  if (oldContent.period.id !== newContent.period.id) {
    // segments for later periods have the advantage here
    return newContent.period.start >= oldContent.period.start;
  }

  if (oldContent.adaptation.id !== newContent.adaptation.id) {
    return true;
  }

  const currentSegmentBitrate = oldContent.representation.bitrate;

  if (fastSwitchingStep == null) {
    // only re-load comparatively-poor bitrates for the same Adaptation.
    const bitrateCeil = currentSegmentBitrate * BITRATE_REBUFFERING_RATIO;
    return newContent.representation.bitrate > bitrateCeil;
  }
  return currentSegmentBitrate < fastSwitchingStep;
}
