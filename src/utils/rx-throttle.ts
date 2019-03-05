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
  Observer,
} from "rxjs";

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
export default function throttle<T extends any[], U>(
  func : (...args : T) => Observable<U>
) : (...args : T) => Observable<U> {
  let isPending = false;

  return (...args : T) : Observable<U> => {
    return new Observable((obs : Observer<U>) => {
      let hasErroredOrCompleted = false;
      if (isPending) {
        hasErroredOrCompleted = true;
        obs.complete();
        return undefined;
      }

      isPending = true;
      func(...args)
        .subscribe(
          (i) => { obs.next(i); },
          (e) => {
            hasErroredOrCompleted = true;
            isPending = false;
            obs.error(e);
          },
          () => {
            hasErroredOrCompleted = true;
            isPending = false;
            obs.complete();
          }
        );

      return () => {
        // handle unsubscription
        if (!hasErroredOrCompleted) {
          isPending = false;
        }
      };
    });
  };
}
