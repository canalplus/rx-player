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

import config from "../../../config";
import log from "../../../log";
import { getInnerAndOuterTimeRanges } from "../../../utils/ranges";
import { CancellationSignal } from "../../../utils/task_canceller";
import { SegmentBuffer } from "../../segment_buffers";


/**
 * Run the garbage collector.
 *
 * Try to clean up buffered ranges from a low gcGap at first.
 * If it does not succeed to clean up space, use a higher gcCap.
 *
 * @param {number} currentPosition
 * @param {Object} bufferingQueue
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
export default async function forceGarbageCollection(
  currentPosition : number,
  bufferingQueue : SegmentBuffer,
  cancellationSignal : CancellationSignal
) : Promise<void> {
  const GC_GAP_CALM = config.getCurrent().BUFFER_GC_GAPS.CALM;
  const GC_GAP_BEEFY = config.getCurrent().BUFFER_GC_GAPS.BEEFY;
  log.warn("Stream: Running garbage collector");
  const buffered = bufferingQueue.getBufferedRanges();
  let cleanedupRanges = selectGCedRanges(currentPosition, buffered, GC_GAP_CALM);

  // more aggressive GC if we could not find any range to clean
  if (cleanedupRanges.length === 0) {
    cleanedupRanges = selectGCedRanges(currentPosition, buffered, GC_GAP_BEEFY);
  }

  if (log.hasLevel("DEBUG")) {
    log.debug("Stream: GC cleaning",
              cleanedupRanges.map(({ start, end }) => `start: ${start} - end ${end}`)
                .join(", "));
  }
  for (const range of cleanedupRanges) {
    const { start, end } = range;
    if (start < end) {
      await bufferingQueue.removeBuffer(start, end, cancellationSignal);
    }
  }
  return;
}

/**
 * Buffer garbage collector algorithm.
 *
 * Tries to free up some part of the ranges that are distant from the current
 * playing time.
 * See: https://w3c.github.io/media-source/#sourcebuffer-prepare-append
 *
 * @param {Number} position
 * @param {TimeRanges} buffered - current buffered ranges
 * @param {Number} gcGap - delta gap from current timestamp from which we
 * should consider cleaning up.
 * @returns {Array.<Object>} - Ranges selected for clean up
 */
function selectGCedRanges(
  position : number,
  buffered : TimeRanges,
  gcGap : number
) : Array<{ start : number; end : number }> {
  const { innerRange, outerRanges } = getInnerAndOuterTimeRanges(buffered,
                                                                 position);
  const cleanedupRanges : Array<{ start : number;
                                  end: number; }> = [];

  // start by trying to remove all ranges that do not contain the
  // current time and respect the gcGap
  for (let i = 0; i < outerRanges.length; i++) {
    const outerRange = outerRanges[i];
    if (position - gcGap > outerRange.end) {
      cleanedupRanges.push(outerRange);
    } else if (position + gcGap < outerRange.start) {
      cleanedupRanges.push(outerRange);
    }
  }

  // try to clean up some space in the current range
  if (innerRange !== null) {
    if (log.hasLevel("DEBUG")) {
      log.debug("Stream: GC removing part of inner range",
                cleanedupRanges.map(({ start, end }) => `start: ${start} - end ${end}`)
                  .join(", "));
    }
    if (position - gcGap > innerRange.start) {
      cleanedupRanges.push({ start: innerRange.start,
                             end: position - gcGap });
    }

    if (position + gcGap < innerRange.end) {
      cleanedupRanges.push({ start: position + gcGap,
                             end: innerRange.end });
    }
  }
  return cleanedupRanges;
}
