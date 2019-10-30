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
import takeFirstSet from "../../utils/take_first_set";

const { MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
        MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE,
        MINIMUM_SEGMENT_SIZE } = config;

interface IBufferedChunkInfos { adaptation : Adaptation;
                                period : Period;
                                representation : Representation;
                                segment : ISegment; }

// Stored information for each chunk
export interface IBufferedChunk {
  bufferedEnd : number|undefined; // Last inferred end in the SourceBuffer this
                                  // chunk ends at, in seconds
  bufferedStart : number|undefined; // Last inferred start in the SourceBuffer
                                    // this chunk starts at, in seconds
  end : number; // Supposed end, in seconds, the chunk is expected to reach
  precizeEnd : boolean; // if `true` the `end` property is an estimate we have
                        // enough confidence in (and thus `bufferedEnd` should
                        // be very close to that value when that chunk has been
                        // pushed).
                        // if `false`, it is just a guess based on segment
                        // information. in that case, we might update that
                        // value the next time we check the state of the
                        // buffered segments.
  precizeStart : boolean; // if `true` the `start` is an estimate we have enough
                          // confidence in (and thus `bufferedStart` should
                          // be very close to that value when that chunk has
                          // been pushed).
                          // if `false`, it is just a guess based on segment
                          // information. in that case, we might update that
                          // value the next time we check the state of the
                          // buffered segments.
  infos : IBufferedChunkInfos; // Information on what this segment is in terms
                               // of content.
  partiallyPushed : boolean; // If `false`, the whole segment has been
                             // completely pushed. If false, it is just a
                             // chunk of the whole segment which has yet to be
                             // finished to be pushed
  start : number; // Supposed start the segment should start from, in seconds
}

// information to provide when inserting a new chunk
export interface IInsertedChunkInfos {
  adaptation : Adaptation;
  period : Period;
  representation : Representation;
  segment : ISegment;
  start : number; // Start time the segment should most probably begin from when
                  // pushed, in seconds
  end : number; // End time at which the segment should most probably end when
                // pushed, in seconds
}

/**
 * Keep track of every chunk downloaded and currently in the browser's memory.
 *
 * The main point of this class is to know which CDN chunks are already
 * pushed to the SourceBuffer, at which bitrate, and which have been
 * garbage-collected since by the browser (and thus should be re-downloaded).
 * @class SegmentInventory
 */
export default class SegmentInventory {
  // The inventory keeps track of all the segments which should be currently in
  // the browser's memory.
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
    let inventoryIndex = 0; // Current index considered.
    let thisSegment = inventory[0]; // Current segmentInfos considered
    const rangesLength = buffered.length;
    for (let i = 0; i < rangesLength; i++) {
      if (thisSegment === undefined) { // we arrived at the end of our inventory
        return;
      }

      // take the i'nth contiguous buffered TimeRange
      const rangeStart = buffered.start(i);
      const rangeEnd = buffered.end(i);
      if (rangeEnd - rangeStart < MINIMUM_SEGMENT_SIZE) {
        log.warn("SI: skipped TimeRange when synchronizing because it was too small",
                 rangeStart, rangeEnd);
        continue;
      }

      const indexBefore = inventoryIndex; // keep track of that number

      // Find the first segment either within this TimeRange or completely past
      // it:
      // skip until first segment with at least `MINIMUM_SEGMENT_SIZE` past the
      // start of that range.
      while (thisSegment !== undefined &&
             (takeFirstSet<number>(thisSegment.bufferedEnd, thisSegment.end)
               - rangeStart) < MINIMUM_SEGMENT_SIZE)
      {
        thisSegment = inventory[++inventoryIndex];
      }

      // Contains infos about the last garbage-collected segment before
      // `thisSegment`.
      const lastDeletedSegmentInfos = { end: -1, precizeEnd: false };

      // remove garbage-collected segments
      // (not in that TimeRange nor in the previous one)
      const numberOfSegmentToDelete = inventoryIndex - indexBefore;
      if (numberOfSegmentToDelete > 0) {
        const lastDeletedSegment = // last garbage-collected segment
          inventory[indexBefore + numberOfSegmentToDelete - 1];

        lastDeletedSegmentInfos.end =
          takeFirstSet<number>(lastDeletedSegment.bufferedEnd, lastDeletedSegment.end);
        lastDeletedSegmentInfos.precizeEnd = lastDeletedSegment.precizeEnd;
        log.debug(`SI: ${numberOfSegmentToDelete} segments GCed.`);
        inventory.splice(indexBefore, numberOfSegmentToDelete);
        inventoryIndex = indexBefore;
      }

      if (thisSegment === undefined) {
        return;
      }

      // If the current segment is actually completely outside that range (it
      // is contained in one of the next one), skip that part.
      if (rangeEnd -
          takeFirstSet<number>(thisSegment.bufferedStart, thisSegment.start)
            >= MINIMUM_SEGMENT_SIZE
      ) {
        guessBufferedStartFromRangeStart(thisSegment,
                                         rangeStart,
                                         lastDeletedSegmentInfos);

        if (inventoryIndex === inventory.length - 1) {
          guessBufferedEndFromRangeEnd(thisSegment, rangeEnd);
          return;
        }

        thisSegment = inventory[++inventoryIndex];

        // Make contiguous until first segment outside that range
        let thisSegmentStart = takeFirstSet<number>(thisSegment.bufferedStart,
                                                    thisSegment.start);
        let thisSegmentEnd =  takeFirstSet<number>(thisSegment.bufferedEnd,
                                                   thisSegment.end);
        const nextRangeStart = i < rangesLength - 1 ? buffered.start(i + 1) :
                                                      undefined;
        while (thisSegment !== undefined &&
               (rangeEnd - thisSegmentStart) >= MINIMUM_SEGMENT_SIZE &&
               (nextRangeStart === undefined ||
                 rangeEnd - thisSegmentStart >= thisSegmentEnd - nextRangeStart))
        {
          const prevSegment = inventory[inventoryIndex - 1];

          // those segments are contiguous, we have no way to infer their real
          // end
          if (prevSegment.bufferedEnd === undefined) {
            prevSegment.bufferedEnd = thisSegment.precizeStart ? thisSegment.start :
                                                                 prevSegment.end;
            log.debug("SI: calculating buffered end of contiguous segment",
                      prevSegment.bufferedEnd, prevSegment.end);
          }

          thisSegment.bufferedStart = prevSegment.bufferedEnd;
          thisSegment = inventory[++inventoryIndex];
          if (thisSegment !== undefined) {
            thisSegmentStart = takeFirstSet<number>(thisSegment.bufferedStart,
                                                    thisSegment.start);
            thisSegmentEnd =  takeFirstSet<number>(thisSegment.bufferedEnd,
                                                   thisSegment.end);
          }
        }
      }

      // update the bufferedEnd of the last segment in that range
      const lastSegmentInRange = inventory[inventoryIndex - 1];
      if (lastSegmentInRange !== undefined) {
        guessBufferedEndFromRangeEnd(lastSegmentInRange, rangeEnd);
      }
    }

    // if we still have segments left, they are not affiliated to any range.
    // They might have been garbage collected, delete them from here.
    if (thisSegment != null) {
      log.debug("SI: last segments have been GCed", inventoryIndex, inventory.length);
      inventory.splice(inventoryIndex, inventory.length - inventoryIndex);
    }
  }

  /**
   * Add a new segment in the inventory.
   *
   * Note: As new segments can "replace" partially or completely old ones, we
   * have to perform a complex logic and might update previously added segments.
   *
   * @param {Object} chunkInformation
   */
  public insertChunk(
    { period,
      adaptation,
      representation,
      segment,
      start,
      end } : IInsertedChunkInfos
  ) : void {
    if (segment.isInit) {
      return;
    }
    if (start >= end) {
      log.warn("SI: Invalid chunked inserted: starts before it ends", start, end);
      return;
    }

    const { inventory } = this;
    const newSegment = { partiallyPushed: true,
                         estimatedStart: start,
                         start,
                         end,
                         precizeStart: false,
                         precizeEnd: false,
                         bufferedStart: undefined,
                         bufferedEnd: undefined,
                         infos: { segment, period, adaptation, representation } };

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
          log.debug("SI: Pushing segment strictly after previous one.");
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
              log.debug("SI: Segment pushed updates the start of the next one");
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
            log.debug("SI: Segment pushed removes the next one");
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
              log.debug("SI: Segment pushed replace another one");
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
                  log.debug("SI: Segment pushed updates the start of the next one");
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
                log.debug("SI: Segment pushed removes the next one");
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
              log.debug("SI: Segment pushed ends before another with the same start");
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
              log.debug("SI: Segment pushed updates end of previous one");
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
                  log.debug("SI: Segment pushed updates the start of the next one");
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
                log.debug("SI: Segment pushed removes the next one");
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
              log.debug("SI: Segment pushed is contained in a previous one");
              const nextSegment = { partiallyPushed: segmentI.partiallyPushed,
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
    if (firstSegment == null) { // we do not have any segment yet
      log.debug("SI: Segment pushed comes after all previous ones");
      this.inventory.push(newSegment);
      return;
    }

    if (firstSegment.start >= end) {
      // our segment is before, put it before
      //
      // Case 1:
      //  firstSegment :      |----|
      //  newSegment   : |====|
      //  ===>         : |====|----|
      //
      // Case 2:
      //  firstSegment :        |----|
      //  newSegment   : |====|
      //  ===>         : |====| |----|
      log.debug("SI: Segment pushed comes before all previous ones");
      this.inventory.splice(0, 0, newSegment);
    } else if (firstSegment.end <= end) {
      // Our segment is bigger, replace the first
      //
      // Case 1:
      //  firstSegment :   |---|
      //  newSegment   : |=======|
      //  ===>         : |=======|
      //
      // Case 2:
      //  firstSegment :   |-----|
      //  newSegment   : |=======|
      //  ===>         : |=======|
      log.debug("SI: Segment pushed starts before and completely " +
                "recovers the previous first one");
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
          log.debug("SI: Segment pushed updates the start of the next one");
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
        log.debug("SI: Segment pushed removes the next one");
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
      log.debug("SI: Segment pushed start of the next one");
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
          log.warn("SI: Completed Segment is splitted.", content);
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
        this.inventory[firstI].partiallyPushed = false;
        this.inventory[firstI].end = lastEnd;
        this.inventory[firstI].bufferedEnd = lastBufferedEnd;
      }
    }

    if (!foundIt) {
      log.warn("SI: Completed Segment not found", content);
    }
  }

  /**
   * @returns {Array.<Object>}
   */
  public getInventory() : IBufferedChunk[] {
    return this.inventory;
  }
}

/**
 * Returns `true` if the buffered start of the given chunk looks coherent enough
 * relatively to what is anounced in the Manifest.
 * @param {Object} thisSegment
 * @returns {Boolean}
 */
function bufferedStartLooksCoherent(
  thisSegment : IBufferedChunk
) : boolean {
  if (thisSegment.bufferedStart === undefined ||
      thisSegment.partiallyPushed)
  {
    return false;
  }
  const { start, end } = thisSegment;
  const duration = end - start;
  return Math.abs(start - thisSegment.bufferedStart) <=
           MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE &&
         (thisSegment.bufferedEnd === undefined ||
           thisSegment.bufferedEnd > thisSegment.bufferedStart &&
           Math.abs(thisSegment.bufferedEnd - thisSegment.bufferedStart -
             duration) <= Math.min(MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE,
                                   duration / 3));
}

/**
 * Returns `true` if the buffered end of the given chunk looks coherent enough
 * relatively to what is anounced in the Manifest.
 * @param {Object} thisSegment
 * @returns {Boolean}
 */
function bufferedEndLooksCoherent(
  thisSegment : IBufferedChunk
) : boolean {
  if (thisSegment.bufferedEnd === undefined ||
      thisSegment.partiallyPushed)
  {
    return false;
  }
  const { start, end } = thisSegment;
  const duration = end - start;
  return Math.abs(end - thisSegment.bufferedEnd) <=
           MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE &&
         thisSegment.bufferedStart != null &&
         thisSegment.bufferedEnd > thisSegment.bufferedStart &&
         Math.abs(thisSegment.bufferedEnd - thisSegment.bufferedStart -
           duration) <= Math.min(MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE,
                                 duration / 3);
}

/**
 * Evaluate the given buffered Chunk's buffered start from its range's start,
 * considering that this chunk is the first one in it.
 * @param {Object} firstSegmentInRange
 * @param {number} rangeStart
 * @param {Object} lastDeletedSegmentInfos
 */
function guessBufferedStartFromRangeStart(
  firstSegmentInRange : IBufferedChunk,
  rangeStart : number,
  lastDeletedSegmentInfos : { end : number; precizeEnd : boolean }
) : void {
  if (firstSegmentInRange.bufferedStart !== undefined) {
    if (firstSegmentInRange.bufferedStart < rangeStart) {
      log.debug("SI: Segment partially GCed at the start",
                firstSegmentInRange.bufferedStart, rangeStart);
      firstSegmentInRange.bufferedStart = rangeStart;
    }

    if (!firstSegmentInRange.precizeStart &&
        bufferedStartLooksCoherent(firstSegmentInRange))
    {
      firstSegmentInRange.start = firstSegmentInRange.bufferedStart;
      firstSegmentInRange.precizeStart = true;
    }
  } else if (firstSegmentInRange.precizeStart) {
    log.debug("SI: buffered start is precize start", firstSegmentInRange.start);
    firstSegmentInRange.bufferedStart = firstSegmentInRange.start;
  } else if (lastDeletedSegmentInfos.end >= 0 &&
             lastDeletedSegmentInfos.end > rangeStart &&
               (lastDeletedSegmentInfos.precizeEnd ||
                firstSegmentInRange.start - lastDeletedSegmentInfos.end <=
                  MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE))
  {
    log.debug("SI: buffered start is end of previous segment",
              rangeStart, firstSegmentInRange.start, lastDeletedSegmentInfos.end);
    firstSegmentInRange.bufferedStart = lastDeletedSegmentInfos.end;
    if (bufferedStartLooksCoherent(firstSegmentInRange)) {
      firstSegmentInRange.start = lastDeletedSegmentInfos.end;
      firstSegmentInRange.precizeStart = true;
    }
  } else if (firstSegmentInRange.start - rangeStart <=
               MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE)
  {
    log.debug("SI: found true buffered start",
              rangeStart, firstSegmentInRange.start);
    firstSegmentInRange.bufferedStart = rangeStart;
    if (bufferedStartLooksCoherent(firstSegmentInRange)) {
      firstSegmentInRange.start = rangeStart;
      firstSegmentInRange.precizeStart = true;
    }
  } else if (rangeStart < firstSegmentInRange.start) {
    log.debug("SI: range start too far from expected start",
              rangeStart, firstSegmentInRange.start);
  } else {
    log.debug("SI: Segment appears immediately garbage collected at the start",
              firstSegmentInRange.bufferedStart, rangeStart);
    firstSegmentInRange.bufferedStart = rangeStart;
  }
}

/**
 * Evaluate the given buffered Chunk's buffered end from its range's end,
 * considering that this chunk is the last one in it.
 * @param {Object} firstSegmentInRange
 * @param {number} rangeStart
 * @param {Object} infos
 */
function guessBufferedEndFromRangeEnd(
  lastSegmentInRange : IBufferedChunk,
  rangeEnd : number
) : void {
  if (lastSegmentInRange.bufferedEnd !== undefined) {
    if (lastSegmentInRange.bufferedEnd > rangeEnd) {
      log.debug("SI: Segment partially GCed at the end",
                lastSegmentInRange.bufferedEnd, rangeEnd);
      lastSegmentInRange.bufferedEnd = rangeEnd;
    }
    if (!lastSegmentInRange.precizeEnd &&
        bufferedEndLooksCoherent(lastSegmentInRange))
    {
      lastSegmentInRange.precizeEnd = true;
      lastSegmentInRange.end = rangeEnd;
    }
  } else if (lastSegmentInRange.precizeEnd) {
    log.debug("SI: buffered end is precize end", lastSegmentInRange.end);
    lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
  } else if (rangeEnd - lastSegmentInRange.end <=
               MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE)
  {
    log.debug("SI: found true buffered end", rangeEnd, lastSegmentInRange.end);
    lastSegmentInRange.bufferedEnd = rangeEnd;
    if (bufferedEndLooksCoherent(lastSegmentInRange)) {
      lastSegmentInRange.end = rangeEnd;
      lastSegmentInRange.precizeEnd = true;
    }
  } else if (rangeEnd > lastSegmentInRange.end) {
    log.debug("SI: range end too far from expected end",
              rangeEnd, lastSegmentInRange.end);
    lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
    if (bufferedEndLooksCoherent(lastSegmentInRange)) {
      lastSegmentInRange.end = rangeEnd;
      lastSegmentInRange.precizeEnd = true;
    }

  } else {
    log.debug("SI: Segment appears immediately garbage collected at the end",
              lastSegmentInRange.bufferedEnd, rangeEnd);
    lastSegmentInRange.bufferedEnd = rangeEnd;
  }
}
