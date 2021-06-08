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
function castToObservable<T>(
  value : Promise<T>) : Observable<T>;
function castToObservable<T>(value? : T) : Observable<T>;
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function castToObservable<T>(value? : any) : Observable<T> {
  if (value instanceof Observable) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  }

  if (!isNullOrUndefined(value) &&
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
       (typeof value.subscribe === "function" || typeof value.then === "function"))
  {
    return observableFrom(value) as Observable<T>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return observableOf(value);
}

export default castToObservable;
