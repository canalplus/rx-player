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

module.exports = {
  normalizeRange,
  getTimelineRangeEnd,
};
