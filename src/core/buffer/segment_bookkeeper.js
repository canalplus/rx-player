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

import log from "../../utils/log";
import takeFirstSet from "../../utils/takeFirstSet.js";
import { convertToRanges } from "../../utils/ranges.js";

/**
 * Tolerated margin when comparing segments.
 * If the absolute difference between two segment's start time is inferior or
 * equal to this margin, we infer that they begin at the exact same time, same
 * logic for the end time (where we infer that they end at the exact same
 * time).
 * Used to know whether a newly downloaded segment replace/update an old one in
 * the bookkeeping we perform on currently downloaded segments.
 * @type {Number}
 */
// const SEGMENT_EPSILON = 0.3;

/**
 * Maximum difference allowed between a segment anounced start and its effective
 * current starting time in the source buffer, in seconds, until the segment is
 * considered "incomplete".
 * Same for the ending time announced and its effective end time in the source
 * buffer.
 *
 * If the difference is bigger than this value the segment will be considered
 * incomplete and as such might be re-downloaded.
 *
 * Keeping a too high value might lead to incomplete segments being wrongly
 * considered as complete (and thus not be re-downloaded, this could lead the
 * player to stall).
 * Note that in a worst-case scenario this can happen for the end of a segment
 * and the start of the contiguous segment, leading to a discontinuity two times
 * this value. This case SHOULD be handled properly elsewhere (by for example
 * checking that all segments seem to have been downloaded when stalled).
 *
 * Keeping a too low value might lead to re-downloading the same segment
 * multiple times (when the start and end times are badly estimated) as they
 * will wrongly believed to be partially garbage-collected.
 *
 * If a segment has a perfect continuity with a previous/following one in the
 * source buffer the start/end of it will not be checked. This allows to limit
 * the number of time this error-prone logic is applied.
 * @type {Number}
 *
 * TODO We do not put the real duration of a segment in the equation here.
 */
const MAX_MISSING_FROM_COMPLETE_SEGMENT = 0.12;

/**
 * The maximum time, in seconds, the real buffered time can be superior to the
 * announced time (the "real" buffered start inferior to the announced start and
 * the "real" buffered end superior to the announced end).
 * This limit allows to avoid resizing too much downloaded segments because
 * no other segment is linked to a buffered part.
 *
 * Setting a value too high can lead to parts of the source buffer being linked
 * to the wrong segments.
 * Setting a value too low can lead to parts of the source buffer not being
 * linked to the concerned segment.
 * @type {Number}
 */
const MAX_BUFFERED_DISTANCE = 0.1;

/**
 * Minimum duration in seconds a segment should be into a range to be considered
 * as part of that range.
 * Segments which have less than this amount of time "linked" to a buffered
 * range will be deleted.
 *
 * Setting a value too high can lead to part of the buffer not being assigned
 * any segment.
 * Setting a value too low can lead in worst-case scenarios to segments being
 * wrongly linked to the next or previous range it is truly linked too (if those
 * ranges are too close).
 *
 * TODO As of now, this limits the minimum size a segment can be. A better logic
 * would be to also consider the duration of a segment. Though this logic could
 * lead to bugs with the current code.
 * @type {Number}
 */
const MINIMUM_SEGMENT_SIZE = 0.3;

/**
 * Keep track of every segment downloaded and currently in the browser's memory.
 *
 * The main point of this class is to know which CDN segments are already
 * downloaded, at which bitrate, and which have been garbage collected since
 * by the browser (and thus should be re-downloaded).
 *
 * @class SegmentBookkeeper
 */
export default class SegmentBookkeeper {
  constructor() {
    /**
     * The inventory keep track of all the segments which should be currently
     * in the browser's memory.
     * This array contains objects, each being related to a single downloaded
     * segment which is at least partially added in a source buffer.
     * Those objects have the following keys:
     *
     *   - bitrate {Number}: bitrate of the representation corresponding to
     *     the segment.
     *
     *   - start {Number}: time, in seconds, at which the segment should begin
     *     (parsed from the container or from the Segment Object)
     *
     *   - end {Number}: time, in seconds, at which the segment should end
     *     (parsed from the container or from the Segment Object)
     *
     *   - bufferedStart {Number|undefined}: time, in seconds, at which we infer
     *     the segment currently begin in the sourcebuffer
     *
     *   - bufferedEnd {Number|undefined}: time, in seconds, at which we infer
     *     the segment currently end in the sourcebuffer
     *
     *   - segment {Segment}: the corresponding segment object, as downloaded
     *     from the CDN.
     *
     * @type {Array.<Object>}
     */
    this._inventory = [];
  }

  /**
   * Infer each segment's bufferedStart and bufferedEnd from the TimeRanges
   * given (coming from the source buffer).
   * @param {TimeRanges}
   */
  addBufferedInfos(buffered) {
    const ranges = convertToRanges(buffered);
    const maxI = ranges.length - 1;

    const { _inventory } = this;
    let inventoryIndex = 0;
    let thisSegment = _inventory[0];

    for (let i = 0; i <= maxI; i++) {
      if (!thisSegment) {
        log.warn("Some buffered ranges do not link to any segment");
        return;
      }

      const { start: rangeStart, end: rangeEnd } = ranges[i];

      if (rangeEnd - rangeStart < MINIMUM_SEGMENT_SIZE) {
        continue;
      }

      const indexBefore = inventoryIndex;

      // skip until first segment with at least MINIMUM_SEGMENT_SIZE past the
      // start of that range.
      while (
        thisSegment &&
        (takeFirstSet(thisSegment.bufferedEnd, thisSegment.end) - rangeStart)
        < MINIMUM_SEGMENT_SIZE
      ) {
        thisSegment = _inventory[++inventoryIndex];
      }

      // might be useful to infer the bufferedStart of thisSegment
      let lastDeletedSegmentEnd = -1;

      // remove garbage-collected segments
      // (not in that range nor in the previous one)
      const numberOfSegmentToDelete = inventoryIndex - indexBefore;
      if (numberOfSegmentToDelete) {
        const lastDeletedSegment =
          _inventory[indexBefore + numberOfSegmentToDelete - 1];
        lastDeletedSegmentEnd =
          takeFirstSet(lastDeletedSegment.bufferedEnd, lastDeletedSegment.end);
        _inventory.splice(indexBefore, numberOfSegmentToDelete);
        inventoryIndex = indexBefore;
      }

      // if no segment left for that range (or any other one), quit
      if (!thisSegment) {
        log.warn("Some buffered ranges do not link to any segment");
        return;
      }

      // if the first segment past the start is actually outside that range,
      // skip the following part
      if (
        rangeEnd - takeFirstSet(thisSegment.bufferedStart, thisSegment.start)
        >= MINIMUM_SEGMENT_SIZE
      ) {

        // set the bufferedStart of the first segment in that range
        if (
          thisSegment.bufferedStart != null &&
          thisSegment.bufferedStart < rangeStart
        ) {
          // the segment appears to have been partially garbage collected.
          // Update bufferedStart
          thisSegment.bufferedStart = rangeStart;
        } else if (thisSegment.bufferedStart == null) {
          if (
            lastDeletedSegmentEnd !== -1 &&
            lastDeletedSegmentEnd > rangeStart
          ) {
            if (
              thisSegment.bufferedStart - lastDeletedSegmentEnd
              <= MAX_BUFFERED_DISTANCE) {
              thisSegment.bufferedStart = lastDeletedSegmentEnd;
            }
          } else if (thisSegment.start - rangeStart <= MAX_BUFFERED_DISTANCE) {
            thisSegment.bufferedStart = rangeStart;
          } else {
            thisSegment.bufferedStart = thisSegment.start;
          }
        }

        thisSegment = _inventory[++inventoryIndex];
      }

      // make contiguous until first segment outside that range
      // (i.e until the start of the next segment can not constitute a segment
      // in that range == less than MINIMUM_SEGMENT_SIZE into that range)
      while (
        thisSegment &&
        (rangeEnd - takeFirstSet(thisSegment.bufferedStart, thisSegment.start))
        >= MINIMUM_SEGMENT_SIZE
      ) {
        const prevSegment = _inventory[inventoryIndex - 1];

        // those segments are contiguous, we have no way to infer their real end
        if (prevSegment.bufferedEnd == null) {
          prevSegment.bufferedEnd = prevSegment.end;
        }

        thisSegment.bufferedStart = prevSegment.bufferedEnd;
        thisSegment = _inventory[++inventoryIndex];
      }

      // update the bufferedEnd of the last segment in that range
      const lastSegmentInRange = _inventory[inventoryIndex - 1];
      if (
        lastSegmentInRange.bufferedEnd != null &&
        lastSegmentInRange.bufferedEnd > rangeEnd
      ) {
        // the segment appears to have been partially garbage collected.
        // Update bufferedEnd
        lastSegmentInRange.bufferedEnd = rangeEnd;
      } else if (lastSegmentInRange.bufferedEnd == null) {
        if (rangeEnd - lastSegmentInRange.end <= MAX_BUFFERED_DISTANCE) {
          lastSegmentInRange.bufferedEnd = rangeEnd;
        } else {
          lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
        }
      }
    }

    // if we still have segments left, they are not affiliated to any range.
    // They might have been garbage collected, delete them from here.
    if (thisSegment) {
      _inventory.splice(inventoryIndex, _inventory.length - inventoryIndex);
    }
  }

  /**
   * Add a new segment in the inventory.
   *
   * /!\ We do not know there where the segment truly begin and end in the
   * sourcebuffer (we could add a logic for that) so we infer it from the
   * segment data, which are not exact values.
   *
   * Note: As new segments can "replace" partially or completely old ones, we
   * have to perform a complex logic and might update previously added segments.
   * @param {Segment} segment
   * @param {Number} bitrate
   */
  insert(segment, start, end, bitrate) {
    const { _inventory } = this;

    // infer start and end from the segment data
    // /!\ Can be a little different than their real start/end time in the
    // sourcebuffer.
    // const start = segment.time / segment.timescale;
    // const end = (segment.time + segment.duration) / segment.timescale;

    const newSegment = {
      bitrate,
      start,
      end,
      bufferedStart: undefined,
      bufferedEnd: undefined,
      segment,
    };

    // begin by the end as in most use cases this will be faster
    for (let i = _inventory.length - 1; i >= 0; i--) {
      const segmentI = _inventory[i];

      if ((segmentI.start/* - SEGMENT_EPSILON */) <= start) {
        if ((segmentI.end/* - SEGMENT_EPSILON */) <= start) {
          // our segment is after, push it after this one
          //
          // Case 1:
          //   segmentI     : |======|
          //   newSegment   :        |======|
          //
          // Case 2:
          //   segmentI     : |======|
          //   newSegment   :          |======|
          this._inventory.splice(i+1, 0, newSegment);
          return;
        } else {
          if (segmentI.start >= (start/* - SEGMENT_EPSILON */)) {
            // our segment is either the same or bigger, replace
            //
            // Case 1:
            //  segmentI     : |=======|
            //  newSegment   : |=======|
            //
            // Case 2:
            //  segmentI     : |=======|
            //  newSegment   : |==========|
            this._inventory.splice(i, 1, newSegment);
            return;
          } else {
            // our segment has a "complex" relation with this one,
            // update the old one end and add this one after it.
            //
            // Case 1:
            //  segmentI     : |=======|
            //  newSegment   :    |======|
            //
            // Case 2:
            //  segmentI     : |=======|
            //  newSegment   :    |====|
            segmentI.end = start;
            this._inventory.splice(i+1, 0, newSegment);
            return;
          }
        }
      }
    }

    // if we got here, we are the first segment
    // check bounds of the previous first segment
    const firstSegment = this._inventory[0];
    if (!firstSegment) {
      this._inventory.push(newSegment);
      return;
    }

    // I can see three left cases here
    if ((firstSegment.end/* - SEGMENT_EPSILON */) < segment.end) {
      // Our segment is bigger, replace the first
      // Case 1:
      //  firstSegment :   |===|
      //  newSegment   : |=======|
      //
      // Case 2:
      //  firstSegment :   |=====|
      //  newSegment   : |=======|
      this._inventory.splice(0, 1, newSegment);
    } else {
      // our segment has a "complex" relation with the first one,
      // update the old one start and add this one before it.
      //
      // Case 1:
      //  firstSegment :    |======|
      //  newSegment   : |======|
      firstSegment.start = segment.end;
      this._inventory.splice(0, 0, newSegment);
    }
  }

  /**
   * Returns segment infos for a segment corresponding to the given time,
   * duration and timescale.
   *
   * Returns null if either:
   *   - no segment can be linked exactly to the given time/duration
   *   - a segment is linked to this information, but is currently considered
   *     "incomplete" in the sourceBuffer.
   *
   * The main purpose of this method is to know if the segment asked should be
   * downloaded (or re-downloaded).
   *
   * /!\ Make sure that this class is synchronized with the sourceBuffer
   * (see addBufferedInfos) before calling this method, as it depends on it
   * to categorize "incomplete" from "complete" segments.
   *
   * @param {Number} time
   * @param {Number} duration
   * @param {Number} timescale
   * @returns {Object|null}
   */
  hasCompleteSegment(time, duration, timescale) {
    const { _inventory } = this;
    for (let i = _inventory.length - 1; i >= 0; i--) {
      const segmentI = _inventory[i];
      const segment = segmentI.segment;

      let _time = time;
      let _duration = duration;
      if (segment.timescale !== timescale) {
        // Note: we could get rounding errors here
        _time = (time * segment.timescale) / timescale;
        _duration = (duration * segment.timescale) / timescale;
      }

      if (segment.time === _time && segment.duration === _duration) {
        // check complete-ness of the segment:
        //   - check that the real start and end is contiguous with the
        //     previous/next one.
        //   - if that's not the case for at least one of them, check the
        //     difference between what is announced and what seems to be
        //     in the sourcebuffer.

        const prevSegmentI = _inventory[i - 1];

        if (
          (prevSegmentI && prevSegmentI.bufferedEnd == null) ||
          segmentI.bufferedStart == null
        ) {
          // false negatives are better than false positives here.
          // When impossible to know, say the segment is not complete
          return null;
        }

        if (
          !prevSegmentI ||
          prevSegmentI.bufferedEnd < segmentI.bufferedStart
        ) {
          const timeDiff = segmentI.bufferedStart - segmentI.start;
          if (timeDiff > MAX_MISSING_FROM_COMPLETE_SEGMENT) {
            return null;
          }
        }

        const nextSegmentI = _inventory[i + 1];
        if (
          (nextSegmentI && nextSegmentI.bufferedStart == null) ||
          segmentI.bufferedEnd == null
        ) {
          // false negatives are better than false positives here.
          // When impossible to know, say the segment is not complete
          return null;
        }

        if (
          !nextSegmentI ||
          nextSegmentI.bufferedStart > segmentI.bufferedEnd
        ) {
          const timeDiff = segmentI.end - segmentI.bufferedEnd;
          if (timeDiff > MAX_MISSING_FROM_COMPLETE_SEGMENT) {
            return null;
          }
        }

        return segmentI;
      }
    }
    return null;
  }
}
