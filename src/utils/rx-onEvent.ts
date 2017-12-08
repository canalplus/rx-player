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
import { EventTargetLike } from "rxjs/observable/FromEventObservable";
import { Observer } from "rxjs/Observer";
import EventEmitter from "./eventemitter";

/**
 * Returns a fromEvent on the given element for the given event(s).
 * @param {Element|Document|Window}
 * @param {Array.<string>|string}
 * @returns {Observable}
 */
export default function onEvent<T>(
  elt : EventTargetLike|EventEmitter<T>,
  evts : string|string[]
) : Observable<T> {
  if (Array.isArray(evts)) {
    const eventsArray : Array<Observable<T>> =
      evts.map((evt) => onEvent(elt, evt));
    return Observable.merge(...eventsArray);
  } else if (elt instanceof EventEmitter) {
    return Observable.create((obs : Observer<T>) => {
      const listener = function(payload : T) {
        obs.next(payload);
      };
      elt.addEventListener(evts, listener);

      return () => {
        elt.removeEventListener(evts, listener);
      };
    });
  } else {
    return Observable.fromEvent(elt, evts);
  }
}
