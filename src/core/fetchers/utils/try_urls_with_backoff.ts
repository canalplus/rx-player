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

import {
  EMPTY,
  Observable,
  timer as observableTimer,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
  startWith,
} from "rxjs/operators";
import { isOffline } from "../../../compat";
import {
  CustomLoaderError,
  isKnownError,
  NetworkErrorTypes,
  RequestError,
} from "../../../errors";
import log from "../../../log";
import getFuzzedDelay from "../../../utils/get_fuzzed_delay";

/**
 * Called on a loader error.
 * Returns whether the loader request should be retried.
 *
 * TODO the notion of retrying or not could be transport-specific (e.g. 412 are
 * mainly used for Smooth contents) and thus as part of the transport code (e.g.
 * by rejecting with an error always having a `canRetry` property?).
 * Or not, to ponder.
 *
 * @param {Error} error
 * @returns {Boolean} - If true, the request can be retried.
 */
function shouldRetry(error : unknown) : boolean {
  if (error instanceof RequestError) {
    if (error.type === NetworkErrorTypes.ERROR_HTTP_CODE) {
      return error.status >= 500 ||
             error.status === 404 ||
             error.status === 415 || // some CDN seems to use that code when
                                     // requesting low-latency segments too much
                                     // in advance
             error.status === 412;
    }
    return error.type === NetworkErrorTypes.TIMEOUT ||
           error.type === NetworkErrorTypes.ERROR_EVENT;
  } else if (error instanceof CustomLoaderError) {
    if (typeof error.canRetry === "boolean") {
      return error.canRetry;
    }
    if (error.xhr !== undefined) {
      return error.xhr.status >= 500 ||
             error.xhr.status === 404 ||
             error.xhr.status === 415 || // some CDN seems to use that code when
                                         // requesting low-latency segments too much
                                         // in advance
             error.xhr.status === 412;
    }
    return false;
  }
  return isKnownError(error) && error.code === "INTEGRITY_ERROR";
}

/**
 * Returns true if we're pretty sure that the current error is due to the
 * user being offline.
 * @param {Error} error
 * @returns {Boolean}
 */
function isOfflineRequestError(error : unknown) : boolean {
  if (error instanceof RequestError) {
    return error.type === NetworkErrorTypes.ERROR_EVENT &&
           isOffline();
  } else if (error instanceof CustomLoaderError) {
    return error.isOfflineError;
  }
  return false; // under doubt, return false
}

export interface IBackoffOptions { baseDelay : number;
                                   maxDelay : number;
                                   maxRetryRegular : number;
                                   maxRetryOffline : number; }

export interface IBackoffRetry {
  type : "retry";
  value : unknown; // The error that made us retry
}

export interface IBackoffResponse<T> {
  type : "response";
  value : T;
}

export type IBackoffEvent<T> = IBackoffRetry |
                               IBackoffResponse<T>;

enum REQUEST_ERROR_TYPES { None,
                           Regular,
                           Offline }

/**
 * Guess the type of error obtained.
 * @param {*} error
 * @returns {number}
 */
function getRequestErrorType(error : unknown) : REQUEST_ERROR_TYPES {
  return isOfflineRequestError(error) ? REQUEST_ERROR_TYPES.Offline :
                                        REQUEST_ERROR_TYPES.Regular;
}

/**
 * Specific algorithm used to perform segment and manifest requests.
 *
 * Here how it works:
 *
 *   1. we give it one or multiple URLs available for the element we want to
 *      request, the request callback and some options
 *
 *   2. it tries to call the request callback with the first URL:
 *        - if it works as expected, it wrap the response in a `response` event.
 *        - if it fails, it emits a `retry` event and try with the next one.
 *
 *   3. When all URLs have been tested (and failed), it decides - according to
 *      the error counters, configuration and errors received - if it can retry
 *      at least one of them, in the same order:
 *        - If it can, it increments the corresponding error counter, wait a
 *          delay (based on an exponential backoff) and restart the same logic
 *          for all retry-able URL.
 *        - If it can't it just throws the error.
 *
 * Note that there are in fact two separate counters:
 *   - one for "offline" errors
 *   - one for other xhr errors
 * Both counters are resetted if the error type changes from an error to the
 * next.
 * @param {Array.<string} obs$
 * @param {Function} request$
 * @param {Object} options - Configuration options.
 * @returns {Observable}
 */
export default function tryURLsWithBackoff<T>(
  urls : Array<string|null>,
  request$ : (url : string | null) => Observable<T>,
  options : IBackoffOptions
) : Observable<IBackoffEvent<T>> {
  const { baseDelay,
          maxDelay,
          maxRetryRegular,
          maxRetryOffline } = options;
  let retryCount = 0;
  let lastError = REQUEST_ERROR_TYPES.None;

  const urlsToTry = urls.slice();
  if (urlsToTry.length === 0) {
    log.warn("Fetchers: no URL given to `tryURLsWithBackoff`.");
    return EMPTY;
  }
  return tryURLsRecursively(urlsToTry[0], 0);

  /**
   * Try to do the request of a given `url` which corresponds to the `index`
   * argument in the `urlsToTry` Array.
   *
   * If it fails try the next one.
   *
   * If all URLs fail, start a timer and retry the first element in that array
   * by following the configuration.
   *
   * @param {string|null} url
   * @param {number} index
   * @returns {Observable}
   */
  function tryURLsRecursively(
    url : string | null,
    index : number
  ) : Observable<IBackoffEvent<T>> {
    return request$(url).pipe(
      map(res => ({ type : "response" as const, value: res })),
      catchError((error : unknown) => {
        if (!shouldRetry(error)) { // ban this URL
          if (urlsToTry.length <= 1) { // This was the last one, throw
            throw error;
          }

          // else, remove that element from the array and go the next URL
          urlsToTry.splice(index, 1);
          const newIndex = index >= urlsToTry.length - 1 ? 0 :
                                                           index;
          return tryURLsRecursively(urlsToTry[newIndex], newIndex)
            .pipe(startWith({ type: "retry" as const, value: error }));
        }

        const currentError = getRequestErrorType(error);
        const maxRetry = currentError === REQUEST_ERROR_TYPES.Offline ? maxRetryOffline :
                                                                        maxRetryRegular;

        if (currentError !== lastError) {
          retryCount = 0;
          lastError = currentError;
        }

        if (index < urlsToTry.length - 1) { // there is still URLs to test
          const newIndex = index + 1;
          return tryURLsRecursively(urlsToTry[newIndex], newIndex)
            .pipe(startWith({ type: "retry" as const, value: error }));
        }

        // Here, we were using the last element of the `urlsToTry` array.
        // Increment counter and restart with the first URL

        retryCount++;
        if (retryCount > maxRetry) {
          throw error;
        }
        const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1),
                               maxDelay);
        const fuzzedDelay = getFuzzedDelay(delay);
        const nextURL = urlsToTry[0];
        return observableTimer(fuzzedDelay).pipe(
          mergeMap(() => tryURLsRecursively(nextURL, 0)),
          startWith({ type: "retry" as const, value: error }));
      })
    );
  }
}

/**
 * Lightweight version of the request algorithm, this time with only a simple
 * Observable given.
 * @param {Function} request$
 * @param {Object} options
 * @returns {Observable}
 */
export function tryRequestObservableWithBackoff<T>(
  request$ : Observable<T>,
  options : IBackoffOptions
) : Observable<IBackoffEvent<T>> {
  // same than for a single unknown URL
  return tryURLsWithBackoff([null], () => request$, options);
}
