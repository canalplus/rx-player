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
} from "rxjs";
import { tap } from "rxjs/operators";
import noop from "./noop";

/**
 * Throttle an asynchronous function returning an Observable to drop calls done
 * before a previous one has finished or failed.
 *
 * @example
 * ```js
 * const fn = (time) => Observable.timer(time);
 * const throttled = throttle(fn);
 *
 * const Obs1 = throttled(2000); // -> call fn(2000) and returns its Observable
 * const Obs2 = throttled(1000); // -> won't do anything, Obs2 is an empty
 *                               //    observable (it directly completes)
 * setTimeout(() => {
 *   const Obs3 = throttled(1000); // -> will call fn(1000)
 * }, 2001);
 * ```
 *
 * @param {Function} func
 * @returns {Function} - Function taking in argument the arguments you want
 * to give your function, and returning an Observable.
 */
export default function throttle<T, U>(
  func : (...args : T[]) => Observable<U>
) : (...args : T[]) => Observable<U> {
  let isPending = false;

  return (...args) => {
    if (isPending) {
      return EMPTY;
    }

    isPending = true;
    return func(...args)
      .pipe(tap(
        noop,
        () => isPending = false,
        () => isPending = false
      ));
  };
}
