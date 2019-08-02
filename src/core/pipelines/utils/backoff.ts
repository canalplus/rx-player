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
  RequestError,
  RequestErrorTypes,
} from "../../../errors";
import getFuzzedDelay from "../../../utils/get_fuzzed_delay";

/**
 * Called on a pipeline's loader error.
 * Returns whether the loader request should be retried.
 * @param {Error} error
 * @returns {Boolean} - If true, the request can be retried.
 */
function shouldRetry(error : unknown) : boolean {
  if (!(error instanceof RequestError)) {
    return false;
  }
  if (error.type === RequestErrorTypes.ERROR_HTTP_CODE) {
    return error.status >= 500 ||
           error.status === 404 ||
           error.status === 415 || // XXX TODO => FOR ANEVIA STREAM !
           error.status === 412;
  }
  return error.type === RequestErrorTypes.TIMEOUT ||
         error.type === RequestErrorTypes.ERROR_EVENT;
}

/**
 * Returns true if we're pretty sure that the current error is due to the
 * user being offline.
 * @param {Error} error
 * @returns {Boolean}
 */
function isOfflineRequestError(error : RequestError) : boolean {
  return error.type === RequestErrorTypes.ERROR_EVENT &&
         isOffline();
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

/**
 * Specific exponential backoff algorithm used for segments/manifest
 * downloading.
 *
 * The specificty here in comparaison to a "regular" backoff algorithm is
 * the separation between type of errors:
 *   - "offline" errors
 *   - other xhr errors
 * Both have their own counters which are resetted if the error type changes.
 * @param {Observable} obs$
 * @param {Object} options - Configuration options.
 * @returns {Observable}
 */
export default function backoff<T>(
  obs$ : Observable<T>,
  options : IBackoffOptions
) : Observable<IBackoffEvent<T>> {
  const { baseDelay,
          maxDelay,
          maxRetryRegular,
          maxRetryOffline } = options;

  let retryCount = 0;

  const ERROR_TYPES = { NONE: 0,
                        REGULAR: 1,
                        OFFLINE: 2 };

  let lastError = ERROR_TYPES.NONE;

  return obs$.pipe(
    map(res => ({ type : "response" as const, value: res })),
    catchError((error : unknown, source) => {
      if (!shouldRetry(error)) {
        throw error;
      }
      const currentError = error instanceof RequestError &&
                           isOfflineRequestError(error) ? ERROR_TYPES.OFFLINE :
                                                          ERROR_TYPES.REGULAR;

      const maxRetry = currentError === ERROR_TYPES.OFFLINE ? maxRetryOffline :
                                                              maxRetryRegular;

      if (currentError !== lastError) {
        retryCount = 0;
        lastError = currentError;
      }

      if (++retryCount > maxRetry) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1),
                             maxDelay);

      const fuzzedDelay = getFuzzedDelay(delay);
      return observableTimer(fuzzedDelay).pipe(
        mergeMap(() => source),
        startWith({ type: "retry" as const, value: error })
      );
    })
  );
}
