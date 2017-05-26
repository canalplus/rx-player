import TimelineIndex from "./timeline.js";
import { getTimelineRangeEnd } from "./helpers.js";

export default {
  getSegments: TimelineIndex.getSegments,

  shouldRefresh: (index, time) => {
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
};
