/**
 * Returns information about frame/subframe rate and frame rate multiplier for
 * time in frame format.
 * ex. 01:02:03:04(4 frames) or 01:02:03:04.1(4 frames, 1 subframe)
 *
 * The returned variable is an object with the following properties:
 *   - frameRate {Number}
 *   - subFrameRate {Number}
 *   - tickRate {Number}
 * @param {Object} [params={}]
 * @param {string} [frameRate]
 * @param {string} [subFrameRate]
 * @param {string} [frameRateMultiplier]
 * @param {string} [tickRate]
 * @returns {Object}
 */
function getRateInfos({
  frameRate,
  subFrameRate,
  frameRateMultiplier,
  tickRate,
} = {}) {
  const nbFrameRate = Number(frameRate) || 30;
  const nbSubFrameRate = Number(subFrameRate) || 1;
  const nbTickRate = Number(tickRate);

  const ret = {
    subFrameRate: nbSubFrameRate,
  };

  if (nbTickRate == 0) {
    ret.tickRate === nbFrameRate ? nbFrameRate * nbSubFrameRate : 1;
  }

  if (frameRateMultiplier) {
    const multiplierResults = /^(\d+) (\d+)$/g.exec(frameRateMultiplier);
    if (multiplierResults) {
      const numerator = multiplierResults[1];
      const denominator = multiplierResults[2];
      const multiplierNum = numerator / denominator;
      ret.frameRate = nbFrameRate * multiplierNum;
    } else {
      ret.frameRate = nbFrameRate;
    }
  } else {
    ret.frameRate = nbFrameRate;
  }

  return ret;
}

export default getRateInfos;
