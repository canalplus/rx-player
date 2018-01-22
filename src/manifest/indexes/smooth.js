import Segment from "../segment.js";
import TimelineIndex from "./timeline.js";
import {
  calculateRepeat,
  getSegmentIndex,
  getSegmentNumber,
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  scale,
} from "./helpers.js";


/**
 * Convert from a time and duration in seconds to a beginning and end
 * timestamp in the scale of the smooth timeline array.
 * @param {Object} index
 * @param {number} [index.presentationTimeOffset=0]
 * @param {number} [index.timescale=0]
 * @param {number} [index.segmentTimeOffset=0]
 * @returns {Object}
 */
function normalizeSmoothRange(index, ts, duration) {
  const pto = index.presentationTimeOffset || 0;
  const timescale = index.timescale || 1;
  const segmentTimeOffset = index.segmentTimeOffset || 0;

  return {
    up: ((ts) * timescale - pto) + segmentTimeOffset,
    to: ((ts + duration) * timescale - pto) + segmentTimeOffset,
  };
}

export default {
  getInitSegment,
  checkDiscontinuity: TimelineIndex.checkDiscontinuity, // TODO Re-implement?
  _addSegmentInfos: TimelineIndex._addSegmentInfos,
  setTimescale,
  scale,

  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeSmoothRange(index, _up, _to);
    const segmentTimeOffset = index.segmentTimeOffset || 0;

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
          const time = ts - segmentTimeOffset;
          const args = {
            id: "" + repId + "_" + ts,
            time,
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
          const time = segmentTime - segmentTimeOffset;
          const args = {
            id: "" + repId + "_" + segmentTime,
            time,
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

  shouldRefresh(index, time) {
    const {
      timeline,
      timescale,
      presentationTimeOffset = 0,
    } = index;

    const scaledTime = time * timescale - presentationTimeOffset;
    let last = timeline[timeline.length - 1];
    if (!last) {
      return false;
    }

    if (last.d < 0) {
      last = { ts: last.ts, d: 0, r: last.r };
    }

    return scaledTime >= getTimelineRangeEnd(last);
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
};
