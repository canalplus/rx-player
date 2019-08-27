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
  areSameContent,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { convertToRanges } from "../../utils/ranges";
import takeFirstSet from "../../utils/take_first_set";

const { MAX_MANIFEST_BUFFERED_DIFFERENCE,
        MINIMUM_SEGMENT_SIZE } = config;

interface IBufferedChunkInfos { adaptation : Adaptation;
                                period : Period;
                                representation : Representation;
                                segment : ISegment; }

export interface IBufferedChunk {
  bufferedEnd : number|undefined; // Last inferred end in the SourceBuffer
  bufferedStart : number|undefined; // Last inferred start in the SourceBuffer
  end : number; // Supposed end the segment should reach
  precizeEnd : boolean; // if `true` the `end` property is an estimate we have
                        // enough confidence in.
                        // if `false`, it is just a guess based on segment
                        // informations. in that case, we might update that
                        // value the next time we check the state of the
                        // buffered segments.
  precizeStart : boolean; // if `true` the `start` is an estimate we have enough
                          // confidence in.
                          // if `false`, it is just a guess based on segment
                          // informations. in that case, we might update that
                          // value the next time we check the state of the
                          // buffered segments.
  infos : IBufferedChunkInfos; // Informations on what this segment is in terms
                               // of content.
  isCompleteSegment : boolean; // If true, the whole segment has been completely
                               // pushed. If false, it is either still pending
                               // or it has not been pushed till the end.
  start : number; // Supposed start the segment should start from
}

/**
 * Keep track of every segment downloaded and currently in the browser's memory.
 *
 * The main point of this class is to know which CDN segments are already
 * pushed to the SourceBuffer, at which bitrate, and which have been
 * garbage-collected since by the browser (and thus should be re-downloaded).
 * @class SegmentInventory
 */
export default class SegmentInventory {
  // The inventory keep track of all the segments which should be currently
  // in the browser's memory.
  // This array contains objects, each being related to a single downloaded
  // segment which is at least partially added in a SourceBuffer.
  private inventory : IBufferedChunk[];

  constructor() {
    this.inventory = [];
  }

  /**
   * Reset the whole inventory.
   */
  public reset() {
    this.inventory.length = 0;
  }

  /**
   * Infer each segment's bufferedStart and bufferedEnd from the TimeRanges
   * given (coming from the SourceBuffer).
   * @param {TimeRanges}
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
            (takeFirstSet<number>(thisSegment.bufferedEnd, thisSegment.end)
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

        lastDeletedSegmentEnd = takeFirstSet<number>(lastDeletedSegment.bufferedEnd,
                                                     lastDeletedSegment.end);
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
          takeFirstSet<number>(thisSegment.bufferedStart, thisSegment.start)
            >= MINIMUM_SEGMENT_SIZE
      ) {
        // set the bufferedStart of the first segment in that range
        if (thisSegment.bufferedStart != null &&
            thisSegment.bufferedStart < rangeStart)
        {
          // the segment appears to have been partially garbage collected:
          // Update bufferedStart
          thisSegment.bufferedStart = rangeStart;
          if (!thisSegment.precizeStart &&
              Math.abs(thisSegment.start - thisSegment.bufferedStart) <=
                MAX_MANIFEST_BUFFERED_DIFFERENCE)
          {
            thisSegment.precizeStart = true;
            thisSegment.start = thisSegment.bufferedStart;
          }
        } else if (thisSegment.bufferedStart == null) {
          if (thisSegment.precizeStart) {
            thisSegment.bufferedStart = thisSegment.start;
          } else if (lastDeletedSegmentEnd !== -1 &&
                     lastDeletedSegmentEnd > rangeStart &&
                     thisSegment.start - lastDeletedSegmentEnd <=
                       MAX_MANIFEST_BUFFERED_DIFFERENCE)
          {
            thisSegment.start = lastDeletedSegmentEnd;
            thisSegment.precizeStart = true;
            thisSegment.bufferedStart = lastDeletedSegmentEnd;
          } else if (thisSegment.start - rangeStart <=
                       MAX_MANIFEST_BUFFERED_DIFFERENCE)
          {
            thisSegment.start = rangeStart;
            thisSegment.precizeStart = true;
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
               (rangeEnd -
                takeFirstSet<number>(thisSegment.bufferedStart, thisSegment.start)
               ) >= MINIMUM_SEGMENT_SIZE
        ) {
          const prevSegment = inventory[inventoryIndex - 1];

          // those segments are contiguous, we have no way to infer their real
          // end
          if (prevSegment.bufferedEnd == null) {
            prevSegment.bufferedEnd = thisSegment.precizeStart ? thisSegment.start :
                                                               prevSegment.end;
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
          if (!lastSegmentInRange.precizeEnd &&
              Math.abs(lastSegmentInRange.end - lastSegmentInRange.bufferedEnd) <=
                MAX_MANIFEST_BUFFERED_DIFFERENCE)
          {
            lastSegmentInRange.precizeEnd = true;
            lastSegmentInRange.end = lastSegmentInRange.bufferedEnd;
          }
        } else if (lastSegmentInRange.bufferedEnd == null) {
          const bufferedEnd = rangeEnd - lastSegmentInRange.end <=
                                MAX_MANIFEST_BUFFERED_DIFFERENCE ? rangeEnd :
                                                       lastSegmentInRange.end;
          lastSegmentInRange.bufferedEnd = bufferedEnd;
          if (!lastSegmentInRange.precizeEnd) {
            if (lastSegmentInRange.precizeStart) {
              const segmentDuration = lastSegmentInRange.infos.segment.duration /
                                      lastSegmentInRange.infos.segment.timescale;
              lastSegmentInRange.end = Math.min(lastSegmentInRange.end,
                                                lastSegmentInRange.start +
                                                  segmentDuration);
            }
            if (Math.abs(bufferedEnd - lastSegmentInRange.end) <=
                  MAX_MANIFEST_BUFFERED_DIFFERENCE)
            {
              lastSegmentInRange.end = bufferedEnd;
              lastSegmentInRange.precizeEnd = true;
            }
          }
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
   * @param {Object} chunkInformations
   */
  public insertChunk(
    { period,
      adaptation,
      representation,
      segment,
      estimatedStart,
      estimatedEnd } : { adaptation : Adaptation;
                         period : Period;
                         representation : Representation;
                         segment : ISegment;
                         estimatedStart? : number;
                         estimatedEnd? : number; }
  ) : void {
    if (segment.isInit) {
      return;
    }

    const start = estimatedStart == null ? segment.time / segment.timescale :
                                           estimatedStart;

    const end = estimatedEnd == null ? ((segment.time + segment.duration) /
                                         segment.timescale) :
                                       estimatedEnd;

    if (start >= end) {
      return;
    }

    const { inventory } = this;

    const newSegment = { isCompleteSegment: false,
                         start,
                         end,
                         precizeStart: estimatedStart != null,
                         precizeEnd: estimatedEnd != null,
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
          //   prevSegment  : |------|
          //   newSegment   :        |======|
          //   ===>         : |------|======|
          //
          // Case 2:
          //   prevSegment  : |------|
          //   newSegment   :          |======|
          //   ===>         : |------| |======|
          this.inventory.splice(i + 1, 0, newSegment);

          i += 2; // Go to segment immediately after newSegment
          while (i < inventory.length && inventory[i].start < newSegment.end) {
            if (inventory[i].end > newSegment.end) {
              // The next segment ends after newSegment.
              // Mutate the next segment.
              //
              // Case 1:
              //   prevSegment  : |------|
              //   newSegment   :        |======|
              //   nextSegment  :            |----|
              //   ===>         : |------|======|-|
              inventory[i].start = newSegment.end;
              inventory[i].bufferedStart = undefined;
              inventory[i].precizeStart = inventory[i].precizeStart &&
                                        newSegment.precizeEnd;
              return;
            }
            // The next segment was completely contained in newSegment.
            // Remove it.
            //
            // Case 1:
            //   prevSegment  : |------|
            //   newSegment   :        |======|
            //   nextSegment  :          |---|
            //   ===>         : |------|======|
            //
            // Case 2:
            //   prevSegment  : |------|
            //   newSegment   :        |======|
            //   nextSegment  :          |----|
            //   ===>         : |------|======|
            inventory.splice(i, 1);
          }
          return;
        } else {
          if (segmentI.start === start) {
            if (segmentI.end <= end) {
              // In those cases, replace
              //
              // Case 1:
              //  prevSegment  : |-------|
              //  newSegment   : |=======|
              //  ===>         : |=======|
              //
              // Case 2:
              //  prevSegment  : |-------|
              //  newSegment   : |==========|
              //  ===>         : |==========|
              this.inventory.splice(i, 1, newSegment);
              i += 1; // Go to segment immediately after newSegment
              while (i < inventory.length && inventory[i].start < newSegment.end) {
                if (inventory[i].end > newSegment.end) {
                  // The next segment ends after newSegment.
                  // Mutate the next segment.
                  //
                  // Case 1:
                  //   newSegment   : |======|
                  //   nextSegment  :      |----|
                  //   ===>         : |======|--|
                  inventory[i].start = newSegment.end;
                  inventory[i].bufferedStart = undefined;
                  inventory[i].precizeStart = inventory[i].precizeStart &&
                                            newSegment.precizeEnd;
                  return;
                }
                // The next segment was completely contained in newSegment.
                // Remove it.
                //
                // Case 1:
                //   newSegment   : |======|
                //   nextSegment  :   |---|
                //   ===>         : |======|
                //
                // Case 2:
                //   newSegment   : |======|
                //   nextSegment  :   |----|
                //   ===>         : |======|
                inventory.splice(i, 1);
              }
              return;
            } else {
              // The previous segment starts at the same time and finishes
              // after the new segment.
              // Update the start of the previous segment and put the new
              // segment before.
              //
              // Case 1:
              //  prevSegment  : |------------|
              //  newSegment   : |==========|
              //  ===>         : |==========|-|
              inventory.splice(i, 0, newSegment);
              segmentI.start = newSegment.end;
              segmentI.bufferedStart = undefined;
              segmentI.precizeStart = segmentI.precizeStart &&
                                    newSegment.precizeEnd;
              return;
            }
          } else {
            if (segmentI.end <= newSegment.end) {
              // our segment has a "complex" relation with this one,
              // update the old one end and add this one after it.
              //
              // Case 1:
              //  prevSegment  : |-------|
              //  newSegment   :    |======|
              //  ===>         : |--|======|
              //
              // Case 2:
              //  prevSegment  : |-------|
              //  newSegment   :    |====|
              //  ===>         : |--|====|
              this.inventory.splice(i + 1, 0, newSegment);
              segmentI.end = newSegment.start;
              segmentI.bufferedEnd = undefined;
              segmentI.precizeEnd = segmentI.precizeEnd &&
                                  newSegment.precizeStart;
              i += 2; // Go to segment immediately after newSegment
              while (i < inventory.length && inventory[i].start < newSegment.end) {
                if (inventory[i].end > newSegment.end) {
                  // The next segment ends after newSegment.
                  // Mutate the next segment.
                  //
                  // Case 1:
                  //   newSegment   : |======|
                  //   nextSegment  :      |----|
                  //   ===>         : |======|--|
                  inventory[i].start = newSegment.end;
                  inventory[i].bufferedStart = undefined;
                  inventory[i].precizeStart = inventory[i].precizeStart &&
                                            newSegment.precizeEnd;
                  return;
                }
                // The next segment was completely contained in newSegment.
                // Remove it.
                //
                // Case 1:
                //   newSegment   : |======|
                //   nextSegment  :   |---|
                //   ===>         : |======|
                //
                // Case 2:
                //   newSegment   : |======|
                //   nextSegment  :   |----|
                //   ===>         : |======|
                inventory.splice(i, 1);
              }
              return;
            } else {
              // The previous segment completely recovers the new segment.
              // Split the previous segment into two segments, before and after
              // the new segment.
              //
              // Case 1:
              //  prevSegment  : |---------|
              //  newSegment   :    |====|
              //  ===>         : |--|====|-|
              const nextSegment = { isCompleteSegment: segmentI.isCompleteSegment,
                                    start: newSegment.end,
                                    end: segmentI.end,
                                    precizeStart: segmentI.precizeStart &&
                                                segmentI.precizeEnd &&
                                                newSegment.precizeEnd,
                                    precizeEnd: segmentI.precizeEnd,
                                    bufferedStart: undefined,
                                    bufferedEnd: segmentI.end,
                                    infos: segmentI.infos };
              segmentI.end = newSegment.start;
              segmentI.bufferedEnd = undefined;
              segmentI.precizeEnd = segmentI.precizeEnd &&
                                  newSegment.precizeStart;
              inventory.splice(i + 1, 0, newSegment);
              inventory.splice(i + 2, 0, nextSegment);
              return;
            }
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

    if (firstSegment.start >= end) {
      // our segment is before, put it before
      //
      // Case 1:
      //  firstSegment :      |----|
      //  newSegment   : |----|
      //
      // Case 2:
      //  firstSegment :        |----|
      //  newSegment   : |----|
      this.inventory.splice(0, 0, newSegment);
    } else if (firstSegment.end <= end) {
      // Our segment is bigger, replace the first
      //
      // Case 1:
      //  firstSegment :   |---|
      //  newSegment   : |-------|
      //
      // Case 2:
      //  firstSegment :   |-----|
      //  newSegment   : |-------|
      this.inventory.splice(0, 1, newSegment);
      while (inventory.length > 1 && inventory[1].start < newSegment.end) {
        if (inventory[1].end > newSegment.end) {
          // The next segment ends after newSegment.
          // Mutate the next segment.
          //
          // Case 1:
          //   newSegment   : |======|
          //   nextSegment  :      |----|
          //   ===>         : |======|--|
          inventory[1].start = newSegment.end;
          inventory[1].bufferedStart = undefined;
          inventory[1].precizeStart = newSegment.precizeEnd;
          return;
        }
        // The next segment was completely contained in newSegment.
        // Remove it.
        //
        // Case 1:
        //   newSegment   : |======|
        //   nextSegment  :   |---|
        //   ===>         : |======|
        //
        // Case 2:
        //   newSegment   : |======|
        //   nextSegment  :   |----|
        //   ===>         : |======|
        inventory.splice(1, 1);
      }
      return;
    } else {
      // our segment has a "complex" relation with the first one,
      // update the old one start and add this one before it.
      //
      // Case 1:
      //  firstSegment :    |------|
      //  newSegment   : |======|
      //  ===>         : |======|--|
      firstSegment.start = end;
      firstSegment.bufferedStart = undefined;
      firstSegment.precizeStart = newSegment.precizeEnd;
      this.inventory.splice(0, 0, newSegment);
      return;
    }
  }

  /**
   * Indicate that inserted chunks can now be considered as a complete segment.
   * Take in argument the same content than what was given to `insertChunk` for
   * the corresponding chunks.
   * @param {Object} content
   */
  public completeSegment(
    content : { period: Period;
                adaptation: Adaptation;
                representation: Representation;
                segment: ISegment; }
  ) : void {
    if (content.segment.isInit) {
      return;
    }
    const { inventory } = this;

    let foundIt = false;
    for (let i = 0; i < inventory.length; i++) {
      if (areSameContent(inventory[i].infos, content)) {
        if (foundIt) {
          log.warn("SI: Completed Segment is splitted.");
        }
        foundIt = true;

        const firstI = i;
        i += 1;
        while (i < inventory.length &&
               areSameContent(inventory[i].infos, content))
        {
          i++;
        }

        const lastI = i - 1;
        const length = lastI - firstI;
        const lastEnd = inventory[lastI].end;
        const lastBufferedEnd = inventory[lastI].bufferedEnd;
        if (length > 0) {
          this.inventory.splice(firstI + 1, length);
          i -= length;
        }
        this.inventory[firstI].isCompleteSegment = true;
        this.inventory[firstI].end = lastEnd;
        this.inventory[firstI].bufferedEnd = lastBufferedEnd;
      }
    }

    if (!foundIt) {
      log.warn("SI: Completed Segment not found");
    }
  }

  /**
   * @returns {Array.<Object>}
   */
  public getInventory() : IBufferedChunk[] {
    return this.inventory;
  }
}
