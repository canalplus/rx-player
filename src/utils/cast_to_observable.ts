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

import PPromise from "pinkie";
import {
  from as observableFrom,
  Observable,
  of as observableOf,
} from "rxjs";
import isNullOrUndefined from "./is_null_or_undefined";

/**
 * Try to cast the given value into an observable.
 * StraightForward - test first for an Observable then for a Promise.
 * @param {Observable|Function|*}
 * @returns {Observable}
 */
function castToObservable<T>(value : Observable<T> |
                                     Promise<T> |
                                     PPromise<T> |
                                     Exclude<T, Observable<T>>) : Observable<T> {
  if (value instanceof Observable) {
    return value;
  } else if (
    value instanceof PPromise ||
    value instanceof Promise ||
    (
      !isNullOrUndefined(value) &&
      typeof (value as { then? : unknown }).then === "function")
  )
  {
    return observableFrom(value as Promise<T>);
  }

  return observableOf(value);
}

export default castToObservable;
