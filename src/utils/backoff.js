const FUZZ_FACTOR = 0.3;

/**
 * Perform "fuzzing" on the delay given.
 * @param {Number} retryDelay
 * @returns {Number}
 */
function getFuzzedDelay(retryDelay) {
  const fuzzingFactor = ((Math.random() * 2) - 1) * FUZZ_FACTOR;
  return retryDelay * (1.0 + fuzzingFactor);
}

/**
 * Calculate a "backed off" fuzzed delay.
 * That is, a delay augmented depending on the current retry count.
 * @param {Number} retryDelay
 * @param {Number} [retryCount=1]
 * @returns {Number}
 */
function getBackedoffDelay(retryDelay, retryCount=1) {
  return getFuzzedDelay(retryDelay * Math.pow(2, retryCount - 1));
}

module.exports = {
  getFuzzedDelay,
  getBackedoffDelay,
};
