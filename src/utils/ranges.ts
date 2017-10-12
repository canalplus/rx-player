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
 * This file contains functions helping with TimeRanges management.
 *
 * For simplicity/performance reasons, many of those work with a simplified
 * "Range" object, which is an object with two keys:
 *   - start {Number}
 *   - end {Number}
 *
 * Those two corresponds to what is returned by the start and end methods of a
 * TimeRanges Object.
 *
 * You can convert from TimeRanges to Range object(s) with the getRange/
 * convertToRanges methods.
 */

// Factor for rounding errors
const EPSILON = 1 / 60;

interface IRange {
  start : number;
  end : number;
}

/**
 * Check equality with a tolerance of EPSILON.
 * Used for various functions with this sort of tolerance regarding the
 * start/end of contiguous ranges.
 * @param {Number} a
 * @param {Number} b
 * @returns {Boolean}
 */
function nearlyEqual(a : number, b : number) : boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * Construct a new range which will have, as start/end, the min/max
 * of both the range given, and the given bitrate.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Object}
 */
function createRangeUnion(range1 : IRange, range2 : IRange) : IRange {
  const start = Math.min(range1.start, range2.start);
  const end = Math.max(range1.end, range2.end);
  return  { start, end };
}

/**
 * Clean array ranges from "empty" ranges.
 * That is, range objects which have their start equal to their end.
 * /!\ Mutate the array of ranges.
 * @param {Array<Object>} ranges
 * @returns {Array<Object>}
 */
function removeEmptyRanges(ranges : IRange[]) : IRange[] {
  for (let index = 0; index < ranges.length; index++) {
    const range = ranges[index];
    if (range.start === range.end) {
      ranges.splice(index++, 1);
    }
  }
  return ranges;
}

/**
 * /!\ Mutate the array of ranges.
 * @param {Array<Object>} ranges
 * @returns {Array<Object>}
 */
function mergeContiguousRanges(ranges : IRange[]) : IRange[] {
  for (let index = 1; index < ranges.length; index++) {
    const prevRange = ranges[index - 1];
    const currRange = ranges[index];
    if (areRangesNearlyContiguous(prevRange, currRange)) {
      const unionRange = createRangeUnion(prevRange, currRange);
      ranges.splice(--index, 2, unionRange);
    }
  }
  return ranges;
}

/**
 * True if range1 is considered _after_ range2.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Boolean}
 */
function isAfter(range1 : IRange, range2 : IRange) : boolean {
  return range1.start >= range2.end;
}

/**
 * True if range1 is considered _before_ range2.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Boolean}
 */
function isBefore(range1 : IRange, range2 : IRange) : boolean {
  return range1.end <= range2.start;
}

/**
 * Returns true if the time given can be considered as part of the given range.
 * @param {Object} range1
 * @param {Number} Time
 * @returns {Boolean}
 */
function isTimeInRange({ start, end } : IRange, time : number) : boolean {
  return start <= time && time < end;
}

/**
 * Returns true if the two ranges given are overlapping.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Boolean}
 */
function areRangesOverlapping(range1 : IRange, range2 : IRange) : boolean {
  return isTimeInRange(range1, range2.start) ||
    range1.start < range2.end && range2.end < range1.end ||
    isTimeInRange(range2, range1.start);
}

/**
 * Returns true if the two ranges given can be considered contiguous.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Boolean}
 */
function areRangesNearlyContiguous(range1 : IRange, range2 : IRange) : boolean {
  return nearlyEqual(range2.start, range1.end) ||
    nearlyEqual(range2.end, range1.start);
}

/**
 * Convert from a TimeRanges object to an array of Ranges.
 * @param {TimeRanges} timeRanges
 * @returns {Array.<Object>}
 */
function convertToRanges(timeRanges : TimeRanges) : IRange[] {
  const ranges : IRange[] = [];
  for (let i = 0; i < timeRanges.length; i++) {
    ranges.push({
      start: timeRanges.start(i),
      end: timeRanges.end(i),
    });
  }
  return ranges;
}

/**
 * Get range object of a specific time in a TimeRanges object.
 * @param {TimeRanges} timeRanges
 * @returns {Object}
 */
function getRange(timeRanges : TimeRanges, time : number) : IRange|null {
  for (let i = timeRanges.length - 1; i >= 0; i--) {
    const start = timeRanges.start(i);
    if (time >= start) {
      const end = timeRanges.end(i);
      if (time < end) {
        return {
          start,
          end,
        };
      }
    }
  }
  return null;
}

/**
 * Get gap from a specific time until the start of the next Range.
 * @param {TimeRanges} timeRanges
 * @param {Number} time
 * @returns {Number}
 */
function getNextRangeGap(timeRanges : TimeRanges, time : number) : number {
  const len = timeRanges.length;
  for (let i = 0; i < len; i++) {
    const start = timeRanges.start(i);
    if (time < start) {
      return start - time;
    }
  }
  return Infinity;
}

/**
 * @param {TimeRanges} timeRanges
 * @param {Number} time
 * @returns {Object} - Object with two properties:
 *   - outerRanges {Array.<Object>}: every ranges which does not contain the
 *     given time.
 *   - innerRange {Object|null}: the range which contain the given time.
 */
function getInnerAndOuterTimeRanges(
  timeRanges : TimeRanges,
  time : number
) : { innerRange : IRange|null, outerRanges : IRange[] } {
  let innerRange : IRange|null = null;
  const outerRanges : IRange[] = [];
  for (let i = timeRanges.length - 1; i >= 0; i--) {
    const start = timeRanges.start(i);
    const end = timeRanges.end(i);
    if (time < start || time >= end) {
      outerRanges.push({ start, end });
    } else {
      innerRange = { start, end };
    }
  }
  return { outerRanges, innerRange };
}

/**
 * Get "size" (difference between end and start) of the range containing the
 * given time. 0 if the range is not found.
 * @param {TimeRanges} timeRanges
 * @param {Number} currentTime
 * @returns {Number}
 */
function getSizeOfRange(
  timeRanges : TimeRanges,
  currentTime : number
) : number {
  const range = getRange(timeRanges, currentTime);
  return range
    ? range.end - range.start
    : 0;
}

/**
 * Get "currently played" (difference between time given and start) of the
 * range containing the given time. 0 if the range is not found.
 * @param {TimeRanges} timeRanges
 * @param {Number} currentTime
 * @returns {Number}
 */
function getPlayedSizeOfRange(
  timeRanges : TimeRanges,
  currentTime : number
) : number {
  const range = getRange(timeRanges, currentTime);
  return range
    ? currentTime - range.start
    : 0;
}

/**
 * Get "left to play" (difference between end and time given) of the range
 * containing the given time. Infinity if the range is not found.
 * @param {TimeRanges} timeRanges
 * @param {Number} currentTime
 * @returns {Number}
 */
function getLeftSizeOfRange(
  timeRanges : TimeRanges,
  currentTime : number
) : number {
  const range = getRange(timeRanges, currentTime);
  return range
    ? range.end - currentTime
    : Infinity;
}

/**
 * Insert a range object into an array of ranges objects, at the right place.
 * /!\ Mutate the array of ranges.
 * @param {Array.<Object>} ranges
 * @param {Object} rangeToAdd
 * @returns {Array.<Object>}
 */
function insertInto(ranges : IRange[], rangeToAdd : IRange) : IRange[] {
  if (rangeToAdd.start === rangeToAdd.end) {
    return ranges;
  }

  // For each present range check if we need to:
  // - In case we are overlapping or contiguous:
  //   - if added range has the same bitrate as the overlapped or
  //     contiguous one, we can merge themcurrentRange
  //   - if added range has a different bitrate we need to insert it
  //     in place
  // - Need to insert in place, we we are completely, not overlapping
  //   and not contiguous in between two ranges.

  let index = 0;
  for (; index < ranges.length; index++) {
    const range = ranges[index];

    const overlapping = areRangesOverlapping(rangeToAdd, range);
    const contiguous = areRangesNearlyContiguous(rangeToAdd, range);

    // We assume ranges are ordered and two ranges can not be
    // completely overlapping.
    if (overlapping || contiguous) {
      rangeToAdd = createRangeUnion(rangeToAdd, range);
      ranges.splice(index--, 1);
    } else {
      // Check the case for which there is no more to do
      if (index === 0) {
        if (isBefore(rangeToAdd, ranges[0])) {
          // First index, and we are completely before that range (and
          // not contiguous, nor overlapping). We just need to be
          // inserted here.
          break;
        }
      } else {
        if (isBefore(ranges[index - 1], rangeToAdd)
         && isBefore(rangeToAdd, range)) {
          // We are exactly after the current previous range, and
          // before the current range, while not overlapping with none
          // of them. Insert here.
          break;
        }
      }
    }
  }

  // Now that we are sure we don't overlap with any range, just add it.
  ranges.splice(index, 0, rangeToAdd);

  return mergeContiguousRanges(removeEmptyRanges(ranges));
}

/**
 * Returns range, from a range objects array overlapping with a range given
 * in argument. null if none is found.
 * @param {Object} range
 * @param {Array.<Object>} ranges
 * @returns {Object|null}
 */
function findOverlappingRange(range : IRange, ranges : IRange[]) : IRange|null {
  for (let i = 0; i < ranges.length; i++) {
    if (areRangesOverlapping(range, ranges[i])) {
      return ranges[i];
    }
  }
  return null;
}

/**
 * Returns only the intersection between the two ranges, from the first
 * ranges argument given.
 * /!\ Mutates the ranges1 array given
 * @param {Array.<Range>} ranges1
 * @param {Array.<Range>} ranges2
 * @returns {Array.<Range>}
 */
function keepRangeIntersection(
  ranges1 : IRange[],
  ranges2 : IRange[]
) : IRange[] {
  for (let i = 0; i < ranges1.length; i++) {
    const range = ranges1[i];
    const overlappingRange = findOverlappingRange(range, ranges2);
    if (!overlappingRange) {
      ranges1.splice(i--, 1);
    } else if (overlappingRange.start > range.start) {
      range.start = overlappingRange.start;
    } else if (overlappingRange.end < range.end) {
      range.end = overlappingRange.end;
    }
  }
  return ranges1;
}

export {
  areRangesNearlyContiguous,
  areRangesOverlapping,
  convertToRanges,
  findOverlappingRange,
  getInnerAndOuterTimeRanges,
  getLeftSizeOfRange,
  getNextRangeGap,
  getPlayedSizeOfRange,
  getRange,
  getSizeOfRange,
  insertInto,
  isAfter,
  isBefore,
  isTimeInRange,
  keepRangeIntersection,
  mergeContiguousRanges,
  removeEmptyRanges,
};
