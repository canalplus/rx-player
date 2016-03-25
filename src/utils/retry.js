const { getBackedoffDelay } = require("./backoff");
const timer = require("rxjs/observable/TimerObservable").TimerObservable.create;

function debounce(fn, delay) {
  let timer = 0;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, delay);
  };
}

function retryWithBackoff(obs, options) {
  const {
    retryDelay,
    totalRetry,
    shouldRetry,
    resetDelay,
    errorSelector,
    onRetry,
  } = options;

  let retryCount = 0;
  let debounceRetryCount;
  if (resetDelay > 0) {
    debounceRetryCount = debounce(() => retryCount = 0, resetDelay);
  }

  return obs.catch((error, source) => {
    const wantRetry = !shouldRetry || shouldRetry(error);
    if (!wantRetry || retryCount++ >= totalRetry) {
      if (errorSelector) {
        throw errorSelector(error, retryCount);
      } else {
        throw error;
      }
    }

    if (onRetry) {
      onRetry(error, retryCount);
    }

    const fuzzedDelay = getBackedoffDelay(retryDelay, retryCount);
    return timer(fuzzedDelay).mergeMap(() => {
      debounceRetryCount && debounceRetryCount();
      return source;
    });
  });
}

function retryableFuncWithBackoff(fn, options) {
  const {
    retryDelay,
    totalRetry,
    shouldRetry,
    resetDelay,
    errorSelector,
    onRetry,
  } = options;

  let retryCount = 0;
  let debounceRetryCount;
  if (resetDelay > 0) {
    debounceRetryCount = debounce(() => retryCount = 0, resetDelay);
  }

  return function doRetry(...args) {
    return fn(...args).catch((error) => {
      const wantRetry = !shouldRetry || shouldRetry(error);
      if (!wantRetry || retryCount++ >= totalRetry) {
        if (errorSelector) {
          throw errorSelector(error, retryCount);
        } else {
          throw error;
        }
      }

      if (onRetry) {
        onRetry(error, retryCount);
      }

      const fuzzedDelay = getBackedoffDelay(retryDelay, retryCount);
      return timer(fuzzedDelay).mergeMap(() => {
        debounceRetryCount && debounceRetryCount();
        return doRetry(...args);
      });
    });
  };
}

module.exports = {
  retryWithBackoff,
  retryableFuncWithBackoff,
};
