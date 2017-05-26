const TimelineIndex = require("./timeline.js");
const { getTimelineRangeEnd } = require("./helpers.js");

module.exports = {
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
