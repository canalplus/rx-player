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
import {
  RequestError,
  RequestErrorTypes,
} from "../../errors";
import { isOffline } from "../../compat";
import  { getFuzzedDelay } from "../../utils/backoff";

/**
 * Called on a pipeline's loader error.
 * Returns whether the loader request should be retried.
 * @param {Error} error
 * @returns {Boolean}
 */
function shouldRetry(error : Error) : boolean {
  if (!(error instanceof RequestError)) {
    return false;
  }
  if (error.type === RequestErrorTypes.ERROR_HTTP_CODE) {
    return error.status >= 500 || error.status === 404;
  }
  return (
    error.type === RequestErrorTypes.TIMEOUT ||
    error.type === RequestErrorTypes.ERROR_EVENT
  );
}

function isOfflineRequestError(error : RequestError) : boolean {
  return error.type === RequestErrorTypes.ERROR_EVENT && isOffline();
}

interface IDownloadingBackoffOptions {
  baseDelay : number;
  maxDelay : number;
  maxRetryRegular : number;
  maxRetryOffline : number;
  onRetry? : (error : Error, retryCount : number) => void;
}

/**
 * Specific exponential backoff algorithm used for segments/manifest
 * downloading.
 *
 * The specificty here in comparaison to a "regular" backoff algorithm is
 * the separation between type of errors:
 *   - "offline" errors
 *   - other xhr errors
 * Both have their own counters which are resetted if the error type changes.
 * @param {Observable}
 * @param {Object} options
 * @param {Number} options.baseDelay - First delay set when and if:
 *   - the first observable throws
 *   - any observable throws an error which has a type different than the last
 *     one.
 * @param {Number} options.maxDelay - Maximum delay considered for the backoff.
 * Note that this delay is not exact as it will be "fuzzed".
 * @param {Number} options.maxRetryRegular - Maximum number of retry for
 * "regular" errors. That is, errors that are most likely due to the CDN.
 * @param {Number} options.maxRetryOffline - Maximum number of retry for
 * "offline" errors. That is, errors that are most likely due to the user being
 * offline.
 * @param {Function} [options.onRetry] - callback to call as an observable
 * throws. Will be called with two arguments:
 *   - The error thrown by the observable.
 *   - The counter for the current error type.
 * @returns {Observable}
 */
function downloadingBackoff<T>(
  obs$ : Observable<T>,
  options : IDownloadingBackoffOptions
) : Observable<T> {
  const {
    baseDelay,
    maxDelay,
    maxRetryRegular,
    maxRetryOffline,
    onRetry,
  } = options;
  let retryCount = 0;

  const ERROR_TYPES = {
    NONE: 0,
    REGULAR: 1,
    OFFLINE: 2,
  };

  let lastError = ERROR_TYPES.NONE;
  return obs$.catch((error : Error, source) => {
    if (!shouldRetry(error)) {
      throw error;
    }
    const currentError = error instanceof RequestError &&
      isOfflineRequestError(error) ?  ERROR_TYPES.OFFLINE : ERROR_TYPES.REGULAR;

    const maxRetry = currentError === ERROR_TYPES.OFFLINE ?
      maxRetryOffline : maxRetryRegular;

    if (currentError !== lastError) {
      retryCount = 0;
      lastError = currentError;
    }

    if (++retryCount > maxRetry) {
      throw error;
    }

    if (onRetry) {
      onRetry(error, retryCount);
    }

    const delay = Math.min(
      baseDelay * Math.pow(2, retryCount - 1),
      maxDelay
    );

    const fuzzedDelay = getFuzzedDelay(delay);
    return Observable.timer(fuzzedDelay)
      .mergeMap(() => source);
  });
}

export default downloadingBackoff;
