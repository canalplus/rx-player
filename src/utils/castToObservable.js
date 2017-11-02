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

/**
 * Try to cast the given value into an observable.
 * StraightForward - test first for an Observable then for a Promise.
 * @param {Observable|Function|*}
 * @returns {Observable}
 */
export default function castToObservable(value) {
  if (value instanceof Observable) {
    return value;
  }

  if (value && typeof value.subscribe == "function") {
    return new Observable((obs) => {
      const sub = value.subscribe(
        (val) => obs.next(val),
        (err) => obs.error(err),
        ()    => obs.complete()
      );

      return () => {
        if (sub && sub.dispose) {
          sub.dispose();
        }
        else if (sub && sub.unsubscribe) {
          sub.unsubscribe();
        }
      };
    });
  }

  if (value && typeof value.then === "function") {
    return Observable.fromPromise(value);
  }

  return Observable.of(value);
}
