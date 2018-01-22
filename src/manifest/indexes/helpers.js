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

export {
  normalizeRange,
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  getSegmentIndex,
  getSegmentNumber,
  calculateRepeat,
  scale,
};
