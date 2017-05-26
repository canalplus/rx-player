import TimelineIndex from "./timeline.js";

export default Object.assign({}, TimelineIndex, {
  getLiveEdge() {
    throw new Error("not implemented");
  },

  addSegment(segmentInfos) {
    // TODO
    console.log(segmentInfos);
  },
});
