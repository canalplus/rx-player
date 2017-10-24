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

import config from "../../config.js";
import assert from "../../utils/assert.js";
import takeFirstSet from "../../utils/takeFirstSet.js";
import { convertToRanges } from "../../utils/ranges.js";

const {
  MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT,
  MAX_BUFFERED_DISTANCE,
  MINIMUM_SEGMENT_SIZE,
} = config;

/**
 * TODO Find what to do with that one empirically. Either delete or uncomment.
 *
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
 * Keep track of every segment downloaded and currently in the browser's memory.
 *
 * The main point of this class is to know which CDN segments are already
 * downloaded, at which bitrate, and which have been garbage-collected since
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
   *
   * TODO implement management of segments whose end is not known
   */
  addBufferedInfos(buffered) {
    const ranges = convertToRanges(buffered);
    const maxI = ranges.length - 1;

    const { _inventory } = this;
    let inventoryIndex = 0;
    let thisSegment = _inventory[0];

    for (let i = 0; i <= maxI; i++) {
      if (!thisSegment) {
        // Those buffered do not link to any segment here.
        // It may be linked to another adaptation, for example
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
      // Note: lastSegmentInRange can be undefined
      const lastSegmentInRange = _inventory[inventoryIndex - 1];
      if (lastSegmentInRange) {
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
   * Note: As new segments can "replace" partially or completely old ones, we
   * have to perform a complex logic and might update previously added segments.
   *
   * @param {Segment} segment
   * @param {Number} start - start time of the segment, in seconds
   * @param {Number|undefined} end - end time of the segment, in seconds. Can
   * be undefined in some rare cases
   * @param {Number} bitrate - bitrate of the representation the segment is in
   */
  insert(segment, start, end, bitrate) {
    // TODO (*very* low-priority) manage segments whose end is unknown (rare but
    // could eventually happen).
    // This should be properly managed in this method, but it is not in some
    // other methods of this class, so I decided to not one of those to the
    // inventory by security
    if (__DEV__) {
      assert(
        end != null, "SegmentBookkeeper: ending time of the segment not defined"
      );
    } else if (end == null) {
      // This leads to excessive re-downloads of segment without an ending time.
      return;
    }

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
        } else { // /!\ also goes here if end is undefined
          if (segmentI.start >= (start/* - SEGMENT_EPSILON */)) {
            // In those cases, replace
            // Case 1:
            //  segmentI     : |=======|
            //  newSegment   : |=======|
            //
            // Case 2:
            //  segmentI     : |=======|
            //  newSegment   : |==========|
            //
            // Case 3:
            //  segmentI     : |=======|
            //  newSegment   : |???*
            //
            // Case 4:
            //  segmentI     : |???*
            //  newSegment   : |======|
            //
            // Case 5:
            //  segmentI     : |???*
            //  newSegment   : |???*
            //
            // *|??? = unknown end
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
            //
            // Case 3:
            //  segmentI     : |=======|
            //  newSegment   :    |???*
            //
            // Case 4:
            //  segmentI     : |???*
            //  newSegment   :    |====|
            //
            // Case 5:
            //  segmentI     : |???*
            //  newSegment   :    |???*
            //
            // *|??? = unknown end

            // (if segment's end is not known yet, it could perfectly
            // end before the one we're adding now)
            if (segmentI.end != null) {
              segmentI.end = start;
            }
            this._inventory.splice(i+1, 0, newSegment);
            return;
          }
        }
      }
    }

    // if we got here, we are the first segment
    // check bounds of the previous first segment
    const firstSegment = this._inventory[0];
    if (!firstSegment) { // we do not have any segment yet
      this._inventory.push(newSegment);
      return;
    }

    if (segment.end == null) {
      if (firstSegment.start === start) {
        // same beginning, unknown end, just replace
        // Case 1:
        //  firstSegment : |=======|
        //  newSegment   : |???*
        //
        // Case 2:
        //  firstSegment : |???*
        //  newSegment   : |???*
        //
        // *|??? = unknown end
        this._inventory.splice(0, 1, newSegment);
      } else {
        // our segment begins before this one, push at the beginning
        // Case 1:
        // firstSegment :   |=======|
        // newSegment   : |???*
        //
        // Case 2:
        // firstSegment :   |???*
        // newSegment   : |???*
        //
        // *|??? = unknown end
        this._inventory.splice(0, 0, newSegment);
      }
      return;
    }

    if (firstSegment.start >= segment.end) {
      // our segment is before, put it before
      // Case 1:
      //  firstSegment :      |====|
      //  newSegment   : |====|
      //
      // Case 2:
      //  firstSegment :        |====|
      //  newSegment   : |====|
      //
      // Case 3:
      //  firstSegment :        |???*
      //  newSegment   : |====|
      //
      // Case 4:
      //  firstSegment :      |???*
      //  newSegment   : |====|
      //
      // *|??? = unknown end
      this._inventory.splice(0, 0, newSegment);
    } else if ((firstSegment.end/* - SEGMENT_EPSILON */) <= segment.end) {
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
      // Case 1:
      //  firstSegment :    |======|
      //  newSegment   : |======|
      //
      // Case 2:
      // firstSegment :   |???*
      // newSegment   : |=====|
      //
      // *|??? = unknown end
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
   *     "incomplete" to be playable, in the sourceBuffer. We check if all
   *     needed data for playback (from wanted range) is loaded.
   *
   * The main purpose of this method is to know if the segment asked should be
   * downloaded (or re-downloaded).
   *
   * /!\ Make sure that this class is synchronized with the sourceBuffer
   * (see addBufferedInfos method of the same class) before calling this method,
   * as it depends on it to categorize "incomplete" from "complete" segments.
   *
   * @param {Object} wantedRange
   * @param {Number} time
   * @param {Number} duration
   * @param {Number} timescale
   * @returns {Object|null}
   */
  hasPlayableSegment(wantedRange, time, duration, timescale) {
    const { _inventory } = this;

    for (let i = _inventory.length - 1; i >= 0; i--) {
      const currentSegmentI = _inventory[i];
      const prevSegmentI = _inventory[i - 1];
      const nextSegmentI = _inventory[i + 1];

      const segment = currentSegmentI.segment;

      let _time = time;
      let _duration = duration;
      if (segment.timescale !== timescale) {
        // Note: we could get rounding errors here
        _time = (time * segment.timescale) / timescale;
        _duration = (duration * segment.timescale) / timescale;
      }

      if (segment.time === _time && segment.duration === _duration) {
        // false negatives are better than false positives here.
        // When impossible to know, say the segment is not complete
        if(hasEnoughInfos(currentSegmentI, prevSegmentI, nextSegmentI)) {
          if (
            hasWantedRange(
              wantedRange,
              currentSegmentI,
              prevSegmentI,
              nextSegmentI
            )
          ) {
            return currentSegmentI;
          }
        }
      }
    }
    return null;

    // -- Helpers

    /*
    * Check if segment can be evaluated.
    * @param {Object} currentSegmentI
    * @param {Object} prevSegmentI
    * @param {Object} nextSegmentI
    * @returns {Boolean}
    */
    function hasEnoughInfos(currentSegmentI, prevSegmentI, nextSegmentI) {
      if ((prevSegmentI && prevSegmentI.bufferedEnd == null) ||
        currentSegmentI.bufferedStart == null
      ) {
        return false;
      }

      if ((nextSegmentI && nextSegmentI.bufferedStart == null) ||
        currentSegmentI.bufferedEnd == null
      ) {
        return false;
      }

      return true;
    }

    /* Returns true if the segment given can be played for the wanted range.
    * @param {Object} currentSegmentI
    * @param {Object} prevSegmentI
    * @param {Object} nextSegmentI
    * @returns {Boolean}
    */
    function hasWantedRange(
      wantedRange,
      currentSegmentI,
      prevSegmentI,
      nextSegmentI
    ) {
      if (
        !prevSegmentI ||
        prevSegmentI.bufferedEnd < currentSegmentI.bufferedStart
      ) {
        const timeDiff = currentSegmentI.bufferedStart - currentSegmentI.start;
        if (wantedRange.start > currentSegmentI.start) {
          const wantedDiff = currentSegmentI.bufferedStart - wantedRange.start;
          if (wantedDiff > 0 && timeDiff 
            > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            return false;
          }
        } else {
          if (timeDiff > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            return false;
          }
        } 
      }

      if (currentSegmentI.end === null) {
        return false;  
      } else if (
          !nextSegmentI ||
          nextSegmentI.bufferedStart > currentSegmentI.bufferedEnd
      ) {
        const timeDiff = currentSegmentI.end - currentSegmentI.bufferedEnd;
        if (wantedRange.end < currentSegmentI.end) {
          const wantedDiff = wantedRange.end - currentSegmentI.bufferedEnd;
          if (wantedDiff > 0 && timeDiff 
            > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            return false;
          }
        } else {
          if(timeDiff > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            return false;
          }
        }
      } 
      return true;
    }
  }
}
