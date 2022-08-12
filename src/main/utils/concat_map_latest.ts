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
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  mergeMap,
  Observable,
  tap,
} from "rxjs";

/**
 * Same as concatMap, but get last emitted value from source instead of unstack
 * inner values.
 * @param {function} callback
 * @returns {function}
 */
export default function concatMapLatest<T, U>(
  callback: (arg: T, i: number) => Observable<U>
): (source: Observable<T>) => Observable<U> {
  return (source: Observable<T>) => observableDefer(() => {
    let counter = 0;
    let valuePending : T;
    let hasValuePending = false;
    let isExhausting = false;
    function next(value: T): Observable<U> {
      return observableDefer(() => {
        if (isExhausting) {
          valuePending  = value;
          hasValuePending = true;
          return EMPTY;
        }
        hasValuePending = false;
        isExhausting = true;
        return callback(value, counter++).pipe(
          tap({ complete: () => isExhausting = false }),
          (s: Observable<U>) =>
            observableConcat(s,
                             observableDefer(() =>
                               hasValuePending ? next(valuePending) :
                                                 EMPTY))
        );
      });
    }
    return source.pipe(mergeMap(next));
  });
}
