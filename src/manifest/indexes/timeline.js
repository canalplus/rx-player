import Segment from "../segment.js";
import {
  normalizeRange,
  getTimelineRangeEnd,
} from "./helpers.js";

const getSegmentIndex = (index, ts) => {
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
};

const getSegmentNumber = (ts, up, duration) => {
  const diff = up - ts;
  if (diff > 0) {
    return Math.floor(diff / duration);
  } else {
    return 0;
  }
};

const calculateRepeat = (seg, nextSeg) => {
  let rep = seg.r || 0;

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  if (rep < 0) {
    const repEnd = nextSeg
      ? nextSeg.t
      : Infinity;
    rep = Math.ceil((repEnd - seg.ts) / seg.d) - 1;
  }

  return rep;
};

const SegmentTimelineHelpers = {
  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeRange(index, _up, _to);

    const { timeline, timescale } = index;
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
    const { timeline } = index;

    let last = timeline[timeline.length - 1];
    if (!last) {
      return true;
    }

    if (last.d < 0) {
      last = { ts: last.ts, d: 0, r: last.r };
    }

    return !(to <= getTimelineRangeEnd(last));
  },

  getEndTime(index) {
    return this.getLiveEdge(index);
  },

  getBeginningTime(index) {
    return index.timeline[0].ts;
  },

  getLiveEdge(index) {
    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    return (getTimelineRangeEnd(lastTimelineElement) / index.timescale);
      // - manifest.suggestedPresentationDelay // TODO higher up that sh*t
  },

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} time
   * @returns {Number} - If a discontinuity is present, this is the Starting ts
   * for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(index, time) {
    const { timeline } = index;

    if (time <= 0) {
      return -1;
    }

    const segmentIndex = getSegmentIndex(time);
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

    const timescale = index.timescale || 1;
    // when we are actually inside the found range and this range has
    // an explicit discontinuity with the next one
    if (rangeTo !== nextRange.ts &&
        time >= rangeUp &&
        time <= rangeTo &&
        (rangeTo - time) < timescale) {
      return nextRange.ts;
    }

    return -1;
  },
};

export default SegmentTimelineHelpers;
