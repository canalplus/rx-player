import assert from "../../utils/assert.js";
import Segment from "../segment.js";

const normalizeRange = (index, ts, duration) => {
  const pto = index.presentationTimeOffset || 0;
  const timescale = index.timescale || 1;

  return {
    up: (ts) * timescale - pto,
    to: (ts + duration) * timescale - pto,
  };
};

const getTimelineRangeEnd = ({ ts, d, r }) => {
  if (d === -1) {
    return ts;
  } else {
    return ts + (r+1) * d;
  }
};

const getInitSegment = (rootId, index) => {
  const { initialization = {} } = index;

  const args = {
    id: "" + rootId + "_init",
    init: true,
    range: initialization.range || null,
    indexRange: index.indexRange || null,
    media: initialization.media,
    timescale: index.timescale,
  };
  return new Segment(args);
};

/**
 * Update the timescale used (for all segments).
 * TODO This should probably update all previous segments to the newly set
 * Timescale.
 * @param {Number} timescale
 */
const setTimescale = (index, timescale) => {
  if (__DEV__) {
    assert(typeof timescale == "number");
    assert(timescale > 0);
  }

  if (index.timescale !== timescale) {
    index.timescale = timescale;
  }

  return index;
};

const scale = (index, time)  => {
  if (__DEV__) {
    assert(index.timescale > 0);
  }

  return time / index.timescale;
};

export {
  normalizeRange,
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  scale,
};
