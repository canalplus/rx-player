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

const assert = require("../utils/assert");

// Factor for rounding errors
const EPSILON = 1 / 60;

function nearlyEqual(a, b) {
  return Math.abs(a - b) < EPSILON;
}

function nearlyLt(a, b) {
  return a - b <= EPSILON;
}

function bufferedToRanges(ranges) {
  const l = ranges.length;
  const a = [];
  for (let i = 0; i < l; i++) {
    a.push(new Range(ranges.start(i), ranges.end(i), 0));
  }
  return a;
}

function cloneRanges(ranges) {
  const l = ranges.length;
  const a = [];
  for (let i = 0; i < l; i++) {
    a.push(ranges[i].clone());
  }
  return a;
}

function isPointInRange(r, point) {
  return r.start <= point && point < r.end;
}

function findOverlappingRange(range, others) {
  for (let i = 0; i < others.length; i++) {
    if (areOverlappingRanges(range, others[i])) {
      return others[i];
    }
  }
  return null;
}

function areOverlappingRanges(r1, r2) {
  return isPointInRange(r1, r2.start) || isPointInRange(r1, r2.end) || isPointInRange(r2, r1.start);
}

function isContainedInto(r1, r2) {
  return (isPointInRange(r1, r2.start) && isPointInRange(r1, r2.end));
}

function areContiguousWithRanges(r1, r2) {
  return nearlyEqual(r2.start, r1.end) || nearlyEqual(r2.end, r1.start);
}

function unionWithOverlappingOrContiguousRange(r1, r2, bitrate) {
  const start = Math.min(r1.start, r2.start);
  const end = Math.max(r1.end, r2.end);
  return new Range(start, end, bitrate);
}

function isOrdered(r1, r2) {
  return r1.end <= r2.start;
}

function sameBitrate(r1, r2) {
  return r1.bitrate === r2.bitrate;
}

function removeEmptyRanges(ranges) {
  for (let index = 0; index < ranges.length; index++) {
    const range = ranges[index];
    if (range.isNil()) {
      ranges.splice(index++, 1);
    }
  }
  return ranges;
}

function mergeContiguousRanges(ranges) {
  for (let index = 1; index < ranges.length; index++) {
    const prevRange = ranges[index-1];
    const currRange = ranges[index];
    if (sameBitrate(prevRange, currRange) &&
        areContiguousWithRanges(prevRange, currRange)) {
      const unionRange = unionWithOverlappingOrContiguousRange(prevRange, currRange, currRange.bitrate);
      ranges.splice(--index, 2, unionRange);
    }
  }
  return ranges;
}

function insertInto(ranges, addedRange) {
  if (addedRange.isNil()) {
    return ranges;
  }

  // For each present range check if we need to:
  // - In case we are overlapping or contiguous:
  //   - if added range has the same bitrate as the overlapped or
  //     contiguous one, we can merge them
  //   - if added range has a different bitrate we need to insert it
  //     in place
  // - Need to insert in place, we we are completely, not overlapping
  //   and not contiguous in between two ranges.

  let index = 0;
  for (; index < ranges.length; index++) {
    const currentRange = ranges[index];

    const overlapping = areOverlappingRanges(addedRange, currentRange);
    const contiguous = areContiguousWithRanges(addedRange, currentRange);

    // We assume ranges are ordered and two ranges can not be
    // completely overlapping.
    if (overlapping || contiguous) {
      // We need to merge the addedRange and that range.
      if (sameBitrate(addedRange, currentRange)) {
        addedRange = unionWithOverlappingOrContiguousRange(addedRange, currentRange, currentRange.bitrate);
        ranges.splice(index--, 1);
      }
      // Overlapping ranges with different bitrates.
      else if (overlapping) {
        // Added range is contained in on existing range
        if (isContainedInto(currentRange, addedRange)) {
          ranges.splice(++index, 0, addedRange);
          const memCurrentEnd = currentRange.end;
          currentRange.end = addedRange.start;
          addedRange = new Range(addedRange.end, memCurrentEnd, currentRange.bitrate);
        }
        // Added range contains one existing range
        else if (isContainedInto(addedRange, currentRange)) {
          ranges.splice(index--, 1);
        }
        else if (currentRange.start < addedRange.start) {
          currentRange.end = addedRange.start;
        }
        else {
          currentRange.start = addedRange.end;
          break;
        }
      }
      // Contiguous ranges with different bitrates.
      else {
        // do nothing
        break;
      }
    } else {
      // Check the case for which there is no more to do
      if (index === 0) {
        if (isOrdered(addedRange, ranges[0])) {
          // First index, and we are completely before that range (and
          // not contiguous, nor overlapping). We just need to be
          // inserted here.
          break;
        }
      } else {
        if (isOrdered(ranges[index - 1], addedRange)
         && isOrdered(addedRange, currentRange)) {
          // We are exactly after the current previous range, and
          // before the current range, while not overlapping with none
          // of them. Insert here.
          break;
        }
      }
    }
  }

  // Now that we are sure we don't overlap with any range, just add it.
  ranges.splice(index, 0, addedRange);

  return mergeContiguousRanges(removeEmptyRanges(ranges));
}

function rangesIntersect(ranges, others) {
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const overlappingRange = findOverlappingRange(range, others);
    if (!overlappingRange) {
      ranges.splice(i--, 1);
      continue;
    }
    if (overlappingRange.start > range.start) {
      range.start = overlappingRange.start;
    }
    if (overlappingRange.end < range.end) {
      range.end = overlappingRange.end;
    }
  }
  return ranges;
}

function normalizeRanges(ranges) {
  const clonedRanges = cloneRanges(ranges);
  for (let i = 0; i < clonedRanges.length; i++) {
    clonedRanges[i].bitrate = 0;
  }
  return mergeContiguousRanges(clonedRanges);
}

function rangesEquals(ranges, others) {
  ranges = normalizeRanges(ranges);
  others = normalizeRanges(ranges);
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const overlappingRange = findOverlappingRange(range, others);
    if (!overlappingRange ||
        !nearlyEqual(overlappingRange.start, range.start) ||
        !nearlyEqual(overlappingRange.end, range.end)) {
      return false;
    }
  }
  return true;
}

class Range {
  constructor(start, end, bitrate) {
    this.start = start;
    this.end = end;
    this.bitrate = bitrate;
  }

  isNil() {
    return this.start === this.end;
  }

  clone() {
    return new Range(this.start, this.end, this.bitrate);
  }
}

class BufferedRanges {
  constructor(ranges) {
    let _ranges;
    if (!ranges) {
      _ranges = [];
    } else if (Array.isArray(ranges)) {
      _ranges = cloneRanges(ranges);
    } else {
      _ranges = bufferedToRanges(ranges);
    }
    this.ranges = _ranges;
    this.length = _ranges.length;
  }

  start(i) {
    return this.ranges[i].start;
  }

  end(i) {
    return this.ranges[i].end;
  }

  hasRange(startTime, duration) {
    const endTime = startTime + duration;

    for (let i = 0; i < this.ranges.length; i++) {
      const { start, end } = this.ranges[i];

      if ((nearlyLt(start, startTime) && nearlyLt(startTime, end)) &&
          (nearlyLt(start, endTime) && nearlyLt(endTime, end))) {
        return this.ranges[i];
      }
    }

    return null;
  }

  /**
   * Get range associated to given time
   */
  getRange(time) {
    for (let i = 0; i < this.ranges.length; i++) {
      if (isPointInRange(this.ranges[i], time)) {
        return this.ranges[i];
      }
    }
    return null;
  }

  getOuterRanges(time) {
    const ranges = [];
    for (let i = 0; i < this.ranges.length; i++) {
      if (!isPointInRange(this.ranges[i], time)) {
        ranges.push(this.ranges[i]);
      }
    }
    return ranges;
  }

  /**
   * Returns the time-gap between the buffered
   * end limit and the given timestamp
   */
  getGap(time) {
    const range = this.getRange(time);
    return range
      ? range.end - time
      : Infinity;
  }

  /**
   * Return the time gap between the current time
   * and the start of current range.
   */
  getLoaded(time) {
    const range = this.getRange(time);
    return range
      ? time - range.start
      : 0;
  }

  /**
   * Returns the total size of the current range.
   */
  getSize(time) {
    const range = this.getRange(time);
    return range
      ? range.end - range.start
      : 0;
  }

  getNextRangeGap(time) {
    const { ranges } = this;
    let i = -1, nextRangeStart;
    while (++i < ranges.length) {
      const start = ranges[i].start;
      if (start > time) {
        nextRangeStart = start;
        break;
      }
    }

    if (nextRangeStart != null) {
      return nextRangeStart - time;
    } else {
      return Infinity;
    }
  }

  insert(bitrate, start, end) {
    if (__DEV__) {
      assert(start >= 0);
      assert(end - start > 0);
    }
    insertInto(this.ranges, new Range(start, end, bitrate));
    this.length = this.ranges.length;
    return this.ranges;
  }

  remove(start, end) {
    if (__DEV__) {
      assert(start >= 0);
      assert(end - start > 0);
    }
    this.intersect(new BufferedRanges([
      new Range(0, start, 0),
      new Range(end, Infinity, 0),
    ]));
  }

  equals(others) {
    if (__DEV__) {
      assert(others instanceof BufferedRanges);
    }

    return rangesEquals(this.ranges, others.ranges);
  }

  intersect(others) {
    if (__DEV__) {
      assert(others instanceof BufferedRanges);
    }

    rangesIntersect(this.ranges, others.ranges);
    this.length = this.ranges.length;
    return this.ranges;
  }
}

module.exports = {
  bufferedToRanges,
  BufferedRanges,
};
