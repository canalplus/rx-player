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
  catchError,
  mergeMap,
  Observable,
  timer as observableTimer,
} from "rxjs";
import { ICustomError } from "../errors";
import getFuzzedDelay from "./get_fuzzed_delay";
import isNullOrUndefined from "./is_null_or_undefined";

export interface IBackoffOptions {
  baseDelay : number;
  maxDelay : number;
  totalRetry : number;
  shouldRetry? : (error : unknown) => boolean;
  errorSelector? : (error : unknown, retryCount : number) => Error|ICustomError;
  onRetry? : (error : unknown, retryCount : number) => void;
}

/**
 * Retry the given observable (if it triggers an error) with an exponential
 * backoff.
 * The backoff behavior can be tweaked through the options given.
 *
 * @param {Observable} obs$
 * @param {Object} options - Configuration object.
 * This object contains the following properties:
 *
 *   - retryDelay {Number} - The initial delay, in ms.
 *     This delay will be fuzzed to fall under the range +-30% each time a new
 *     retry is done.
 *     Then, this delay will be multiplied by 2^(n-1), n being the counter of
 *     retry we performed (beginning at 1 for the first retry).
 *
 *   - totalRetry {Number} - The amount of time we should retry. 0
 *     means no retry, 1 means a single retry, Infinity means infinite retry
 *     etc.
 *     If the observable still fails after this number of retry, the error will
 *     be throwed through this observable.
 *
 *   - shouldRetry {Function|undefined} -  Function which will receive the
 *     observable error each time it fails, and should return a boolean. If this
 *     boolean is false, the error will be directly thrown (without anymore
 *     retry).
 *
 *   - onRetry {Function|undefined} - Function which will be triggered at
 *     each retry. Will receive two arguments:
 *       1. The observable error
 *       2. The current retry count, beginning at 1 for the first retry
 *
 * @returns {Observable}
 * TODO Take errorSelector out. Should probably be entirely managed in the
 * calling code via a catch (much simpler to use and to understand).
 */
export default function retryObsWithBackoff<T>(
  obs$ : Observable<T>,
  options : IBackoffOptions
) : Observable<T> {
  const { baseDelay,
          maxDelay,
          totalRetry,
          shouldRetry,
          onRetry } = options;

  let retryCount = 0;

  return obs$.pipe(catchError((error : unknown, source : Observable<T>) => {
    if ((!isNullOrUndefined(shouldRetry) && !shouldRetry(error)) ||
         retryCount++ >= totalRetry)
    {
      throw error;
    }

    if (typeof onRetry === "function") {
      onRetry(error, retryCount);
    }

    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1),
                           maxDelay);

    const fuzzedDelay = getFuzzedDelay(delay);
    return observableTimer(fuzzedDelay)
      .pipe(mergeMap(() => source));
  }));
}
