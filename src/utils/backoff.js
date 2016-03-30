const FUZZ_FACTOR = 0.3;

function getFuzzedDelay(retryDelay) {
  const fuzzingFactor = ((Math.random() * 2) - 1) * FUZZ_FACTOR;
  return retryDelay * (1.0 + fuzzingFactor);
}

function getBackedoffDelay(retryDelay, retryCount=1) {
  return getFuzzedDelay(retryDelay * Math.pow(2, retryCount - 1));
}

module.exports = {
  getFuzzedDelay,
  getBackedoffDelay,
};
