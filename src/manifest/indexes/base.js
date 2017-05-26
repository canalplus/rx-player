const TimelineIndex = require("./timeline.js");

module.exports = Object.assign({}, TimelineIndex, {
  getLiveEdge() {
    throw new Error("not implemented");
  },

  addSegment(segmentInfos) {
    // TODO
    console.log(segmentInfos);
  },
});
