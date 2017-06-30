import objectAssign from "object-assign";

import TimelineIndex from "./timeline.js";
import { getInitSegment, setTimescale, scale } from "./helpers.js";

/**
 * TODO weird... Reimplement from scratch
 */
export default objectAssign({}, TimelineIndex, {
  getInitSegment,
  setTimescale,
  scale,

  _addSegmentInfos(index, segmentInfos) {
    index.timeline.push({
      ts: segmentInfos.ts,
      d: segmentInfos.d,
      r: segmentInfos.r,
      range: segmentInfos.range,
    });
    return true;
  },

  shouldRefresh() {
    return false;
  },
});
