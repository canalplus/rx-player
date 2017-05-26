const { Segment } = require("../segment.js");
const { normalizeRange } = require("./helpers.js");

const ListIndexHelpers = {
  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeRange(index, _up, _to);

    // TODO(pierre): use startNumber
    const { duration, list, timescale } = index;
    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      const range = list[i].range;
      const args = {
        id: "" + repId + "_" + i,
        time: i * duration,
        init: false,
        range: range,
        duration: duration,
        indexRange: null,
        timescale,
      };
      segments.push(new Segment(args));
      i++;
    }
    return segments;
  },

  shouldRefresh(index, time, up, to) {
    const { duration, list } = index;
    const i = Math.floor(to / duration);
    return !(i >= 0 && i < list.length);
  },

  getLiveEdge() {
    throw new Error("not implemented");
  },

  addSegment() {
    return false;
  },

  checkDiscontinuity() {
    return -1;
  },
};

module.exports = ListIndexHelpers;
