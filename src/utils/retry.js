var { Observable } = require("rxjs");
var { timer } = Observable;
var { getBackedoffDelay } = require("canal-js-utils/backoff");
var debounce = require("canal-js-utils/debounce");

function retryWithBackoff(obs, { retryDelay, totalRetry, shouldRetry, resetDelay }) {
  var retryCount = 0;
  var debounceRetryCount;
  if (resetDelay > 0) {
    debounceRetryCount = debounce(() => retryCount = 0, resetDelay);
  }

  return obs.catch((err, source) => {
    var wantRetry = !shouldRetry || shouldRetry(err, retryCount);
    if (!wantRetry || retryCount++ >= totalRetry) {
      throw err;
    }

    var fuzzedDelay = getBackedoffDelay(retryDelay, retryCount);
    return timer(fuzzedDelay).flatMap(() => {
      debounceRetryCount && debounceRetryCount();
      return source;
    });
  });
}

module.exports = { retryWithBackoff };
