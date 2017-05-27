import TimelineIndex from "./timeline.js";
import {
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  scale,
} from "./helpers.js";

export default {
  getSegments: TimelineIndex.getSegments, // TODO Re-implement?
  getInitSegment,
  checkDiscontinuity: TimelineIndex.checkDiscontinuity, // TODO Re-implement?
  _addSegmentInfos: TimelineIndex._addSegmentInfos,
  setTimescale,
  scale,

  shouldRefresh(index, time) {
    const { timeline } = index;
    let last = timeline[timeline.length - 1];
    if (!last) {
      return false;
    }

    if (last.d < 0) {
      last = { ts: last.ts, d: 0, r: last.r };
    }

    return time >= getTimelineRangeEnd(last);
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
