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

import { EventTargetLike } from "rxjs/observable/FromEventObservable";
import { Observable } from "rxjs/Observable";

/**
 * Returns a fromEvent on the given element for the given event(s).
 * @param {Element|Document|Window}
 * @param {Array.<string>|string}
 * @returns {Observable}
 */
export default function onEvent<T>(
  elt : EventTargetLike,
  evts : string|string[]
) : Observable<T> {
  if (Array.isArray(evts)) {
    const eventsArray : Array<Observable<T>> =
      evts.map((evt) => Observable.fromEvent(elt, evt));
    return Observable.merge(...eventsArray);
  } else {
    return Observable.fromEvent(elt, evts);
  }
}
