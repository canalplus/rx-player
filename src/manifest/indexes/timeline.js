import Segment from "../segment.js";
import {
  calculateRepeat,
  getSegmentIndex,
  getSegmentNumber,
  normalizeRange,
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  scale,
} from "./helpers.js";

const SegmentTimelineHelpers = {
  getInitSegment,
  setTimescale,
  scale,

  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeRange(index, _up, _to);

    const { timeline, timescale, media } = index;
    const segments = [];

    const timelineLength = timeline.length;
    let timelineIndex = getSegmentIndex(index, up) - 1;
    // TODO(pierre): use @maxSegmentDuration if possible
    let maxDuration = (timeline.length && timeline[0].d) || 0;

    loop:
    for(;;) {
      if (++timelineIndex >= timelineLength) {
        break;
      }

      const segmentRange = timeline[timelineIndex];
      const { d, ts, range } = segmentRange;
      maxDuration = Math.max(maxDuration, d);

      // live-added segments have @d attribute equals to -1
      if (d < 0) {
        if (ts + maxDuration < to) {
          const args = {
            id: "" + repId + "_" + ts,
            time: ts,
            init: false,
            range: range,
            duration: undefined,
            indexRange: null,
            timescale,
            media,
          };
          segments.push(new Segment(args));
        }
        break;
      }

      const repeat = calculateRepeat(segmentRange, timeline[timelineIndex + 1]);
      let segmentNumber = getSegmentNumber(ts, up, d);
      let segmentTime;
      while ((segmentTime = ts + segmentNumber * d) < to) {
        if (segmentNumber++ <= repeat) {
          const args = {
            id: "" + repId + "_" + segmentTime,
            time: segmentTime,
            init: false,
            range: range,
            duration: d,
            indexRange: null,
            timescale,
            media,
          };
          segments.push(new Segment(args));
        } else {
          continue loop;
        }
      }

      break;
    }

    return segments;
  },

  shouldRefresh(index, time, up, to) {
    const {
      timeline,
      timescale,
      presentationTimeOffset = 0,
    } = index;

    const scaledTo = to * timescale - presentationTimeOffset;

    let last = timeline[timeline.length - 1];
    if (!last) {
      return false;
    }

    if (last.d < 0) {
      last = { ts: last.ts, d: 0, r: last.r };
    }

    return !(scaledTo <= getTimelineRangeEnd(last));
  },

  getFirstPosition(index) {
    if (!index.timeline.length) {
      return undefined;
    }
    return index.timeline[0].ts / index.timescale;
  },

  getLastPosition(index) {
    if (!index.timeline.length) {
      return undefined;
    }
    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    return (getTimelineRangeEnd(lastTimelineElement) / index.timescale);
  },

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} _time
   * @returns {Number} - If a discontinuity is present, this is the Starting ts
   * for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(index, _time) {
    const { timeline, timescale = 1 } = index;
    const time = _time * timescale;

    if (time <= 0) {
      return -1;
    }

    const segmentIndex = getSegmentIndex(index, time);
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
  },

  _addSegmentInfos(index, newSegment, currentSegment) {
    const { timeline } = index;
    const timelineLength = timeline.length;
    const last = timeline[timelineLength - 1];

    // in some circumstances, the new segment informations are only
    // duration informations that we can use to deduct the ts of the
    // next segment. this is the case where the new segment are
    // associated to a current segment and have the same ts
    const shouldDeductNextSegment =
      !!currentSegment && (newSegment.ts === currentSegment.ts);
    if (shouldDeductNextSegment) {
      const newSegmentTs = newSegment.ts + newSegment.d;
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
    else if (newSegment.ts >= getTimelineRangeEnd(last)) {
      if (last.d === newSegment.d) {
        last.r++;
      } else {
        index.timeline.push({
          d: newSegment.d,
          ts: newSegment.ts,
          r: 0,
        });
      }
      return true;
    }

    return false;
  },
};

export default SegmentTimelineHelpers;
