/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Observable } from "rxjs/Observable";
import { getBackedoffDelay } from "./backoff";

/**
 * Simple debounce implementation.
 * @param {Function} fn
 * @param {Number} delay - delay in ms
 * @returns {Function}
 */
function debounce(fn : () => void, delay : number) : () => void {
  let timer = 0;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = window.setTimeout(fn, delay);
  };
}

interface IBackoffOptions {
  retryDelay : number;
  totalRetry : number;
  shouldRetry? : (error : Error) => boolean;
  resetDelay? : number;
  errorSelector? : (error : Error, retryCount : number) => Error;
  onRetry? : (error : Error, retryCount : number) => void;
}

/**
 * Retry the given observable (if it triggers an error) with an exponential
 * backoff.
 * The backoff behavior can be tweaked through the options given.
 *
 * @param {Observable} obs$
 * @param {Object} options
 * @param {Number} options.retryDelay - The initial delay, in ms.
 * This delay will be fuzzed to fall under the range +-30% each time a new retry
 * is done.
 * Then, this delay will be multiplied by 2^(n-1), n being the counter of retry
 * we performed (beginning at 1 for the first retry).
 * @param {Number} options.totalRetry - The amount of time we should retry. 0
 * means no retry, 1 means a single retry, Infinity means infinite retry etc.
 * If the observable still fails after this number of retry, the error will
 * be throwed through this observable.
 * @param {Number} [options.resetDelay] - Delay in ms since a retry after which
 * the counter of retry will be reset if the observable wasn't retried a new
 * time. 0 / undefined means no delay will be applied.
 * @param {Function} [options.shouldRetry] - Function which will receive the
 * observable error each time it fails, and should return a boolean. If this
 * boolean is false, the error will be directly thrown (without anymore retry).
 * @param {Function} [options.onRetry] - Function which will be triggered at
 * each retry. Will receive two arguments:
 *   1. The observable error
 *   2. The current retry count, beginning at 1 for the first retry
 * @param {Function} [options.errorSelector]
 * @returns {Observable}
 * TODO Take errorSelector out. Should probably be entirely managed in the
 * calling code via a catch (much simpler to use and to understand).
 */
function retryWithBackoff<T>(
  obs$ : Observable<T>,
  options : IBackoffOptions
) : Observable<T> {
  const {
    retryDelay,
    totalRetry,
    shouldRetry,
    resetDelay,
    errorSelector,
    onRetry,
  } = options;

  let retryCount = 0;
  let debounceRetryCount : () => void|undefined;
  if (resetDelay != null && resetDelay > 0) {
    debounceRetryCount = debounce(() => { retryCount = 0; }, resetDelay);
  }

  return obs$.catch((error, source) => {
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
    return Observable.timer(fuzzedDelay).mergeMap(() => {
      if (debounceRetryCount) {
        debounceRetryCount();
      }
      return source;
    });
  });
}

/**
 * Same than retryWithBackoff, only with a function returning an observable
 * instead of an observable.
 * @param {Function} fn - Function returning an Observable which
 * will (well, might) be retried.
 * @param {Object} options
 * @param {Number} options.retryDelay
 * @param {Number} options.totalRetry
 * @param {Number} [options.resetDelay]
 * @param {Function} [options.shouldRetry]
 * @param {Function} [options.errorSelector]
 * @param {Function} [options.onRetry]
 * @returns {Function} - take in argument fn's arguments, returns
 * an Observable.
 */
function retryableFuncWithBackoff<T, I>(
  fn : (...args : T[]) => Observable<I>,
  options : IBackoffOptions
) : (...args : T[]) => Observable<I> {
  const {
    retryDelay,
    totalRetry,
    shouldRetry,
    resetDelay,
    errorSelector,
    onRetry,
  } = options;

  let retryCount = 0;
  let debounceRetryCount : () => void|undefined;
  if (resetDelay != null && resetDelay > 0) {
    debounceRetryCount = debounce(() => { retryCount = 0; }, resetDelay);
  }

  return function doRetry(...args : T[]) : Observable<I> {
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
      return Observable.timer(fuzzedDelay).mergeMap(() => {
        if (debounceRetryCount) {
          debounceRetryCount();
        }
        return doRetry(...args);
      });
    });
  };
}

export {
  retryWithBackoff,
  retryableFuncWithBackoff,
};
