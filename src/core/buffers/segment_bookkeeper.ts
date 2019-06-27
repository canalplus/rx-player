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

import config from "../../config";
import log from "../../log";
import {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { convertToRanges } from "../../utils/ranges";
import takeFirstSet from "../../utils/take_first_set";

const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT,
        MAX_BUFFERED_DISTANCE,
        MINIMUM_SEGMENT_SIZE } = config;

interface IBufferedSegmentInfos { adaptation : Adaptation;
                                  period : Period;
                                  representation : Representation;
                                  segment : ISegment; }

interface IBufferedSegment {
  bufferedEnd : number|undefined; // Last inferred end in the SourceBuffer
  bufferedStart : number|undefined; // Last inferred start in the SourceBuffer
  end : number; // Supposed end the segment should reach
  infos : IBufferedSegmentInfos; // Informations on what this segment is
  start : number; // Supposed start the segment should start from
}

/**
 * Keep track of every segment downloaded and currently in the browser's memory.
 *
 * The main point of this class is to know which CDN segments are already
 * pushed to the SourceBuffer, at which bitrate, and which have been
 * garbage-collected since by the browser (and thus should be re-downloaded).
 * @class SegmentBookkeeper
 */
export default class SegmentBookkeeper {
  public inventory : IBufferedSegment[];

  constructor() {
    /**
     * The inventory keep track of all the segments which should be currently
     * in the browser's memory.
     * This array contains objects, each being related to a single downloaded
     * segment which is at least partially added in a SourceBuffer.
     * @type {Array.<Object>}
     */
    this.inventory = [];
  }

  /**
   * Infer each segment's bufferedStart and bufferedEnd from the TimeRanges
   * given (coming from the SourceBuffer).
   * @param {TimeRanges}
   *
   * TODO implement management of segments whose end is not known
   */
  public synchronizeBuffered(buffered : TimeRanges) : void {
    const { inventory } = this;
    const ranges = convertToRanges(buffered);

    // Current inventory index considered.
    let inventoryIndex = 0;

    // Current segmentInfos considered
    let thisSegment = inventory[0];

    const rangesLength = ranges.length;
    for (let i = 0; i < rangesLength; i++) {
      if (thisSegment == null) {
        // If thisSegment is not set, it means that we arrived at the end of
        // our inventory.
        // This TimeRange do not link to any segment and neither will any
        // subsequent one.
        // (It may be linked to another adaptation, for example)
        return;
      }

      const { start: rangeStart, end: rangeEnd } = ranges[i];

      // if current TimeRange is too small to contain a segment, go to next one
      if (rangeEnd - rangeStart < MINIMUM_SEGMENT_SIZE) {
        continue;
      }

      // Inventory index of the last segment not contained in the current range.
      // Will be used to know how many segments have been garbage collected.
      const indexBefore = inventoryIndex;

      // Find the first segment either within this TimeRange or past it:
      // skip until first segment with at least MINIMUM_SEGMENT_SIZE past the
      // start of that range.
      while (thisSegment &&

             // TODO better way to indicate to typescript that all is well here
            (takeFirstSet(thisSegment.bufferedEnd, thisSegment.end) as number
              - rangeStart
            ) < MINIMUM_SEGMENT_SIZE
      ) {
        thisSegment = inventory[++inventoryIndex];
      }

      // Contains the end of the last garbage-collected segment before
      // thisSegment.
      // Might be useful to infer later the bufferedStart of thisSegment.
      //
      // -1 if no segment have been garbage-collected before thisSegment.
      let lastDeletedSegmentEnd = -1;

      // remove garbage-collected segments
      // (not in that TimeRange nor in the previous one)
      const numberOfSegmentToDelete = inventoryIndex - indexBefore;
      if (numberOfSegmentToDelete > 0) {
        // last garbage-collected segment
        const lastDeletedSegment =
          inventory[indexBefore + numberOfSegmentToDelete - 1];

        // TODO better way to indicate to typescript that all is well here
        lastDeletedSegmentEnd = takeFirstSet(lastDeletedSegment.bufferedEnd,
                                             lastDeletedSegment.end) as number;
        // mutate inventory
        inventory.splice(indexBefore, numberOfSegmentToDelete);
        inventoryIndex = indexBefore;
      }

      // if no segment is left for that range (or any other one), quit
      if (thisSegment == null) {
        return;
      }

      // Infer the bufferedStart for this segment, and the bufferedStart and
      // bufferedEnd for the following segments included in that range.
      //
      // If the current segment is actually completely outside that range (it
      // is contained in one of the next one), skip that part.
      if (rangeEnd -

          // TODO better way to indicate to typescript that all is well here
          (takeFirstSet(thisSegment.bufferedStart, thisSegment.start) as number)
            >= MINIMUM_SEGMENT_SIZE
      ) {
        // set the bufferedStart of the first segment in that range
        if (
          thisSegment.bufferedStart != null &&
          thisSegment.bufferedStart < rangeStart
        ) {
          // the segment appears to have been partially garbage collected:
          // Update bufferedStart
          thisSegment.bufferedStart = rangeStart;
        } else if (thisSegment.bufferedStart == null) {
          if (lastDeletedSegmentEnd !== -1 &&
              lastDeletedSegmentEnd > rangeStart &&
              thisSegment.start - lastDeletedSegmentEnd <= MAX_BUFFERED_DISTANCE
          ) {
            thisSegment.bufferedStart = lastDeletedSegmentEnd;
          } else if (thisSegment.start - rangeStart <= MAX_BUFFERED_DISTANCE) {
            thisSegment.bufferedStart = rangeStart;
          } else {
            thisSegment.bufferedStart = thisSegment.start;
          }
        }

        thisSegment = inventory[++inventoryIndex];

        // Make contiguous until first segment outside that range
        // (i.e until the start of the next segment can not constitute a segment
        // in that range == less than MINIMUM_SEGMENT_SIZE into that range)
        while (thisSegment &&
               (
                 rangeEnd -
                    // TODO better way to indicate to typescript that all is well here
                   (takeFirstSet(thisSegment.bufferedStart, thisSegment.start) as number)
                ) >= MINIMUM_SEGMENT_SIZE
        ) {
          const prevSegment = inventory[inventoryIndex - 1];

          // those segments are contiguous, we have no way to infer their real
          // end
          if (prevSegment.bufferedEnd == null) {
            prevSegment.bufferedEnd = prevSegment.end;
          }

          thisSegment.bufferedStart = prevSegment.bufferedEnd;
          thisSegment = inventory[++inventoryIndex];
        }
      }

      // update the bufferedEnd of the last segment in that range
      const lastSegmentInRange = inventory[inventoryIndex - 1];
      if (lastSegmentInRange) {
        if (lastSegmentInRange.bufferedEnd != null &&
            lastSegmentInRange.bufferedEnd > rangeEnd
        ) {
          // the segment appears to have been partially garbage collected:
          // Update bufferedEnd
          lastSegmentInRange.bufferedEnd = rangeEnd;
        } else if (lastSegmentInRange.bufferedEnd == null) {
          lastSegmentInRange.bufferedEnd =
            rangeEnd - lastSegmentInRange.end <= MAX_BUFFERED_DISTANCE ?
              rangeEnd : lastSegmentInRange.end;
        }
      }
    }

    // if we still have segments left, they are not affiliated to any range.
    // They might have been garbage collected, delete them from here.
    if (thisSegment) {
      inventory.splice(inventoryIndex, inventory.length - inventoryIndex);
    }
  }

  /**
   * Add a new segment in the inventory.
   *
   * Note: As new segments can "replace" partially or completely old ones, we
   * have to perform a complex logic and might update previously added segments.
   *
   * @param {Object} period
   * @param {Object} adaptation
   * @param {Object} representation
   * @param {Object} segment
   * @param {Number} start - start time of the segment, in seconds
   * @param {Number|undefined} end - end time of the segment, in seconds. Can
   * be undefined in some rare cases
   */
  public insert(
    period : Period,
    adaptation : Adaptation,
    representation : Representation,
    segment : ISegment,
    start : number,
    end : number|undefined
  ) : void {
    // TODO (*very* low-priority) manage segments whose end is unknown (rare but
    // could eventually happen).
    // This should be properly managed in this method, but it is not in some
    // other methods of this class, so I decided to not one of those to the
    // inventory by security
    if (end == null) {
      if (__DEV__) {
        throw new Error("SegmentBookkeeper: ending time of the segment not defined");
      }
      // This leads to excessive re-downloads of segment without an ending time.
      log.warn("SB: ending time of the segment not defined");
      return;
    }

    const { inventory } = this;

    // infer start and end from the segment data
    // /!\ Can be a little different than their real start/end time in the
    // sourcebuffer.
    // const start = segment.time / segment.timescale;
    // const end = (segment.time + segment.duration) / segment.timescale;

    const newSegment = { start,
                         end,
                         bufferedStart: undefined,
                         bufferedEnd: undefined,
                         infos: { segment,
                                  period,
                                  adaptation,
                                  representation } };

    // begin by the end as in most use cases this will be faster
    for (let i = inventory.length - 1; i >= 0; i--) {
      const segmentI = inventory[i];

      if ((segmentI.start) <= start) {
        if ((segmentI.end) <= start) {
          // our segment is after, push it after this one
          //
          // Case 1:
          //   segmentI     : |------|
          //   newSegment   :        |------|
          //
          // Case 2:
          //   segmentI     : |------|
          //   newSegment   :          |------|
          this.inventory.splice(i + 1, 0, newSegment);
          return;
        } else { // /!\ also goes here if end is undefined
          if (segmentI.start >= (start)) {
            // In those cases, replace
            // Case 1:
            //  segmentI     : |-------|
            //  newSegment   : |-------|
            //
            // Case 2:
            //  segmentI     : |-------|
            //  newSegment   : |----------|
            //
            // Case 3:
            //  segmentI     : |-------|
            //  newSegment   : |???*
            //
            // Case 4:
            //  segmentI     : |???*
            //  newSegment   : |------|
            //
            // Case 5:
            //  segmentI     : |???*
            //  newSegment   : |???*
            //
            // *|??? - unknown end
            this.inventory.splice(i, 1, newSegment);
            return;
          } else {
            // our segment has a "complex" relation with this one,
            // update the old one end and add this one after it.
            //
            // Case 1:
            //  segmentI     : |-------|
            //  newSegment   :    |------|
            //
            // Case 2:
            //  segmentI     : |-------|
            //  newSegment   :    |----|
            //
            // Case 3:
            //  segmentI     : |-------|
            //  newSegment   :    |???*
            //
            // Case 4:
            //  segmentI     : |???*
            //  newSegment   :    |----|
            //
            // Case 5:
            //  segmentI     : |???*
            //  newSegment   :    |???*
            //
            // *|??? - unknown end

            // (if segment's end is not known yet, it could perfectly
            // end before the one we're adding now)
            if (segmentI.end != null) {
              segmentI.end = start;
            }
            this.inventory.splice(i + 1, 0, newSegment);
            return;
          }
        }
      }
    }

    // if we got here, we are the first segment
    // check bounds of the previous first segment
    const firstSegment = this.inventory[0];
    if (!firstSegment) { // we do not have any segment yet
      this.inventory.push(newSegment);
      return;
    }

    if (end == null) {
      if (firstSegment.start === start) {
        // same beginning, unknown end, just replace
        // Case 1:
        //  firstSegment : |-------|
        //  newSegment   : |???*
        //
        // Case 2:
        //  firstSegment : |???*
        //  newSegment   : |???*
        //
        // *|??? - unknown end
        this.inventory.splice(0, 1, newSegment);
      } else {
        // our segment begins before this one, push at the beginning
        // Case 1:
        // firstSegment :   |-------|
        // newSegment   : |???*
        //
        // Case 2:
        // firstSegment :   |???*
        // newSegment   : |???*
        //
        // *|??? - unknown end
        this.inventory.splice(0, 0, newSegment);
      }
      return;
    }

    if (firstSegment.start >= end) {
      // our segment is before, put it before
      // Case 1:
      //  firstSegment :      |----|
      //  newSegment   : |----|
      //
      // Case 2:
      //  firstSegment :        |----|
      //  newSegment   : |----|
      //
      // Case 3:
      //  firstSegment :        |???*
      //  newSegment   : |----|
      //
      // Case 4:
      //  firstSegment :      |???*
      //  newSegment   : |----|
      //
      // *|??? - unknown end
      this.inventory.splice(0, 0, newSegment);
    } else if ((firstSegment.end) <= end) {
      // Our segment is bigger, replace the first
      // Case 1:
      //  firstSegment :   |---|
      //  newSegment   : |-------|
      //
      // Case 2:
      //  firstSegment :   |-----|
      //  newSegment   : |-------|
      this.inventory.splice(0, 1, newSegment);
    } else {
      // our segment has a "complex" relation with the first one,
      // update the old one start and add this one before it.
      // Case 1:
      //  firstSegment :    |------|
      //  newSegment   : |------|
      //
      // Case 2:
      // firstSegment :   |???*
      // newSegment   : |-----|
      //
      // *|??? - unknown end
      firstSegment.start = end;
      this.inventory.splice(0, 0, newSegment);
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
   * @param {Object} segmentInfos
   * @returns {Object|null}
   */
  public hasPlayableSegment(
    wantedRange : {
      start : number;
      end : number;
    },
    segmentInfos : {
      time : number;
      duration : number;
      timescale : number;
    }
  ) : IBufferedSegment|null {
    const { time, duration, timescale } = segmentInfos;
    const { inventory } = this;

    for (let i = inventory.length - 1; i >= 0; i--) {
      const currentSegmentI = inventory[i];
      const prevSegmentI = inventory[i - 1];
      const nextSegmentI = inventory[i + 1];

      const segment = currentSegmentI.infos.segment;

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
        if (hasEnoughInfos(currentSegmentI, prevSegmentI, nextSegmentI)) {
          if (hasWantedRange(wantedRange,
                             currentSegmentI,
                             prevSegmentI,
                             nextSegmentI)
          ) {
            return currentSegmentI;
          }
        }
      }
    }
    return null;

    // -- Helpers

    /**
     * Check if segment can be evaluated.
     * @param {Object} currentSegmentI
     * @param {Object} prevSegmentI
     * @param {Object} nextSegmentI
     * @returns {Boolean}
     */
    function hasEnoughInfos(
      currentSegmentI : IBufferedSegment,
      prevSegmentI : IBufferedSegment,
      nextSegmentI : IBufferedSegment
    ) : boolean {
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

    /**
     * Returns true if the segment given can be played for the wanted range.
     * @param {Object} _wantedRange
     * @param {Object} currentSegmentI
     * @param {Object} prevSegmentI
     * @param {Object} nextSegmentI
     * @returns {Boolean}
     */
    function hasWantedRange(
      _wantedRange : {
        start : number;
        end : number;
      },
      currentSegmentI : IBufferedSegment,
      prevSegmentI : IBufferedSegment,
      nextSegmentI : IBufferedSegment
    ) : boolean {
      if (!prevSegmentI ||
          prevSegmentI.bufferedEnd == null ||
          currentSegmentI.bufferedStart == null ||
          prevSegmentI.bufferedEnd < currentSegmentI.bufferedStart
      ) {
        if (currentSegmentI.bufferedStart == null) {
          return false;
        }
        const timeDiff = currentSegmentI.bufferedStart - currentSegmentI.start;
        if (_wantedRange.start > currentSegmentI.start) {
          const wantedDiff = currentSegmentI.bufferedStart - _wantedRange.start;
          if (wantedDiff > 0 && timeDiff > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            log.debug("SB: The wanted segment has been garbage collected",
                      currentSegmentI);
            return false;
          }
        } else {
          if (timeDiff > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            log.debug("SB: The wanted segment has been garbage collected",
                      currentSegmentI);
            return false;
          }
        }
      }

      if (currentSegmentI.end === null) {
        return false;
      } else if (!nextSegmentI ||
                 nextSegmentI.bufferedStart == null ||
                 currentSegmentI.bufferedEnd == null ||
                 nextSegmentI.bufferedStart > currentSegmentI.bufferedEnd
      ) {
        if (currentSegmentI.bufferedEnd == null) {
          return false;
        }
        const timeDiff = currentSegmentI.end - currentSegmentI.bufferedEnd;
        if (_wantedRange.end < currentSegmentI.end) {
          const wantedDiff = _wantedRange.end - currentSegmentI.bufferedEnd;
          if (wantedDiff > 0 && timeDiff > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            log.debug("SB: The wanted segment has been garbage collected",
                      currentSegmentI);
            return false;
          }
        } else {
          if (timeDiff > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            log.debug("SB: The wanted segment has been garbage collected",
                      currentSegmentI);
            return false;
          }
        }
      }
      return true;
    }
  }
}
