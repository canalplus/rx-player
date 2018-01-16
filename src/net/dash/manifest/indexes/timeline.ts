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

import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import {
  calculateRepeat,
  getInitSegment,
  getTimelineRangeEnd,
  IIndexSegment,
  normalizeRange,
  scale,
  setTimescale,
} from "./helpers";

export interface IRepresentationIndexSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

interface ITimelineIndex {
  presentationTimeOffset? : number;
  timescale : number;
  media : string;
  timeline : IIndexSegment[];
  startNumber? : number;
}

/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} ts
 * @returns {Number}
 */
function getSegmentIndex(
  index : ITimelineIndex,
  ts : number
) : number {
  const { timeline } = index;

  let low = 0;
  let high = timeline.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (timeline[mid].ts < ts) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return (low > 0)
    ? low - 1
    : low;
}

/**
 * @param {Number} ts
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(
  ts : number,
  up : number,
  duration : number
) : number {
  const diff = up - ts;
  if (diff > 0) {
    return Math.floor(diff / duration);
  } else {
    return 0;
  }
}

/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Number} newSegment.timescale
 * @param {Number} newSegment.time
 * @param {Number} newSegment.duration
 * @param {Object} currentSegment
 * @param {Number} currentSegment.timescale
 * @param {Number} currentSegment.time
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(
  index : ITimelineIndex,
  newSegment : { time : number; duration : number; timescale : number },
  currentSegment : { time : number; duration : number; timescale : number }
) : boolean {
  const { timeline, timescale } = index;
  const timelineLength = timeline.length;
  const last = timeline[timelineLength - 1];

  const scaledNewSegment = newSegment.timescale === timescale ? {
    time: newSegment.time,
    duration: newSegment.duration,
  } : {
    time: (newSegment.time / newSegment.timescale) * timescale,
    duration: (newSegment.duration / newSegment.timescale) * timescale,
  };

  let scaledCurrentTime;

  if (currentSegment) {
    scaledCurrentTime = currentSegment.timescale === timescale ?
      currentSegment.time :
      (currentSegment.time / currentSegment.timescale) * timescale;
  }

  // in some circumstances, the new segment informations are only
  // duration informations that we can use to deduct the ts of the
  // next segment. this is the case where the new segment are
  // associated to a current segment and have the same ts
  const shouldDeductNextSegment = scaledCurrentTime != null &&
    (scaledNewSegment.time === scaledCurrentTime);
  if (shouldDeductNextSegment) {
    const newSegmentTs = scaledNewSegment.time + scaledNewSegment.duration;
    const lastSegmentTs = (last.ts + last.d * last.r);
    const tsDiff = newSegmentTs - lastSegmentTs;

    if (tsDiff <= 0) { // same segment / behind the last
      return false;
    }

    // try to use the compact notation with @r attribute on the last
    // to elements of the timeline if we find out they have the same
    // duration
    if (last.d === -1) {
      const prev = timeline[timelineLength - 2];
      if (prev && prev.d === tsDiff) {
        prev.r++;
        timeline.pop();
      } else {
        last.d = tsDiff;
      }
    }

    index.timeline.push({
      d: -1,
      ts: newSegmentTs,
      r: 0,
    });
    return true;
  }

  // if the given timing has a timestamp after the timeline end we
  // just need to push a new element in the timeline, or increase
  // the @r attribute of the last element.
  else if (scaledNewSegment.time >= getTimelineRangeEnd(last)) {
    if (last.d === scaledNewSegment.duration) {
      last.r++;
    } else {
      index.timeline.push({
        d: scaledNewSegment.duration,
        ts: scaledNewSegment.time,
        r: 0,
      });
    }
    return true;
  }

  return false;
}

export default class TimelineRepresentationIndex implements IRepresentationIndex {
  protected _index : any; // XXX TODO

  constructor(index : any) { // XXX TODO
    this._index = index;
  }

  // XXX TODO Comments
  /**
   * Construct init Segment compatible with a Smooth Manifest.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index);
  }

  /**
   * Update the timescale in a DASH Manifest with a SegmentTimeline Index.
   * TODO private?
   *
   * @param {Number} timescale
   */
  setTimescale(timescale : number) : void {
    setTimescale(this._index, timescale);
  }

  /**
   * Convert a time from a generated Segment to seconds.
   *
   * TODO What? Should be sufficient with a Segment alone. Check that.
   * @param {Number} time
   * @returns {Number}
   */
  scale(time : number) : number {
    return scale(this._index, time);
  }

  /**
   * @param {Object} index
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Object>}
   */
  getSegments(_up : number, _to : number) : ISegment[] {
    const index = this._index;
    const { up, to } = normalizeRange(index, _up, _to);
    const { timeline, timescale, media, startNumber } = index;

    let currentNumber = startNumber != null ? startNumber : undefined;

    const segments : ISegment[] = [];

    const timelineLength = timeline.length;

    // TODO(pierre): use @maxSegmentDuration if possible
    let maxEncounteredDuration = (timeline.length && timeline[0].d) || 0;

    for (let i = 0; i < timelineLength; i++) {
      const segmentRange = timeline[i];
      const { d, ts, range } = segmentRange;

      maxEncounteredDuration = Math.max(maxEncounteredDuration, d);

      // live-added segments have @d attribute equals to -1
      if (d < 0) {
        // TODO what? May be to play it safe and avoid adding segments which are
        // not completely generated
        if (ts + maxEncounteredDuration < to) {
          const segment = {
            id: "" + ts,
            time: ts,
            isInit: false,
            range,
            duration: undefined,
            timescale,
            media,
            number: currentNumber != null ? currentNumber : undefined,
          };
          segments.push(segment);
        }
        return segments;
      }

      const repeat = calculateRepeat(segmentRange, timeline[i + 1]);
      let segmentNumberInCurrentRange = getSegmentNumber(ts, up, d);
      let segmentTime = ts + segmentNumberInCurrentRange * d;
      while (segmentTime < to && segmentNumberInCurrentRange <= repeat) {
        const segment = {
          id: "" + segmentTime,
          time: segmentTime,
          isInit: false,
          range,
          duration: d,
          timescale,
          media,
          number: currentNumber != null ?
            currentNumber + segmentNumberInCurrentRange : undefined,
        };
        segments.push(segment);

        // update segment number and segment time for the next segment
        segmentNumberInCurrentRange++;
        segmentTime = ts + segmentNumberInCurrentRange * d;
      }

      if (segmentTime >= to) {
        // we reached ``to``, we're done
        return segments;
      }

      if (currentNumber != null) {
        currentNumber += repeat + 1;
      }
    }

    return segments;
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * @param {Object} index
   * @param {Number} time
   * @param {Number} up
   * @param {Number} to
   * @returns {Boolean}
   */
  shouldRefresh(_ : ISegment[], _up : number, to : number) : boolean {
    const {
      timeline,
      timescale,
      presentationTimeOffset = 0,
    } = this._index;

    const scaledTo = to * timescale - presentationTimeOffset;

    let last = timeline[timeline.length - 1];
    if (!last) {
      return false;
    }

    if (last.d < 0) {
      last = { ts: last.ts, d: 0, r: last.r };
    }

    return !(scaledTo <= getTimelineRangeEnd(last));
  }

  /**
   * Returns first position in index.
   * @param {Object} index
   * @returns {Number}
   */
  getFirstPosition() : number|undefined {
    const index = this._index;
    if (!index.timeline.length) {
      return undefined;
    }
    return index.timeline[0].ts / index.timescale;
  }

  /**
   * Returns last position in index.
   * @param {Object} index
   * @returns {Number}
   */
  getLastPosition() : number|undefined {
    const index = this._index;
    if (!index.timeline.length) {
      return undefined;
    }
    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    return (getTimelineRangeEnd(lastTimelineElement) / index.timescale);
  }

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Object} index
   * @param {Number} _time
   * @returns {Number} - If a discontinuity is present, this is the Starting ts
   * for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(_time : number) : number {
    const { timeline, timescale = 1 } = this._index;
    const time = _time * timescale;

    if (time <= 0) {
      return -1;
    }

    const segmentIndex = getSegmentIndex(this._index, time);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
      return -1;
    }

    const range = timeline[segmentIndex];
    if (range.d === -1) {
      return -1;
    }

    const rangeUp = range.ts;
    const rangeTo = getTimelineRangeEnd(range);
    const nextRange = timeline[segmentIndex + 1];

    // when we are actually inside the found range and this range has
    // an explicit discontinuity with the next one
    if (rangeTo !== nextRange.ts &&
        time >= rangeUp &&
        time <= rangeTo &&
        (rangeTo - time) < timescale) {
      return nextRange.ts / timescale;
    }

    return -1;
  }

  _addSegments(
    nextSegments : Array<{ duration : number; time : number; timescale : number }>,
    currentSegment : { duration : number; time : number; timescale : number}
  ) : IRepresentationIndexSegmentInfos[] {
    const addedSegments : IRepresentationIndexSegmentInfos[] = [];
    for (let i = 0; i < nextSegments.length; i++) {
      if (
        _addSegmentInfos(
          this._index,
          nextSegments[i],
          currentSegment
        )
      ) {
        addedSegments.push(nextSegments[i]);
      }
    }
    return addedSegments;
  }

  update(newIndex : any /* TODO @ index refacto */) : void {
    this._index = newIndex._index;
  }

  getType() : string { // TODO Remove
    return "timeline";
  }
}
