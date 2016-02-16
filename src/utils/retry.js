const { getBackedoffDelay } = require("canal-js-utils/backoff");
const timer = require("rxjs/observable/TimerObservable").TimerObservable.create;
const debounce = require("canal-js-utils/debounce");

function retryWithBackoff(obs, { retryDelay, totalRetry, shouldRetry, resetDelay }) {
  let retryCount = 0;
  let debounceRetryCount;
  if (resetDelay > 0) {
    debounceRetryCount = debounce(() => retryCount = 0, resetDelay);
  }

  return obs.catch((err, source) => {
    const wantRetry = !shouldRetry || shouldRetry(err, retryCount);
    if (!wantRetry || retryCount++ >= totalRetry) {
      throw err;
    }

    const fuzzedDelay = getBackedoffDelay(retryDelay, retryCount);
    return timer(fuzzedDelay).flatMap(() => {
      debounceRetryCount && debounceRetryCount();
      return source;
    });
  });
}

module.exports = { retryWithBackoff };
