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
  defer as observableDefer,
  Observable,
} from "rxjs";
import castToObservable from "../utils/cast_to_observable";
import tryCatch from "../utils/rx-try_catch";

/**
 * Call play on the media element on subscription and return the response as an
 * observable.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function play(mediaElement : HTMLMediaElement) : Observable<unknown> {
  return observableDefer(() =>
    // mediaElement.play is not always a Promise. In the improbable case it
    // throws, I prefer still to catch to return the error wrapped in an
    // Observable
    tryCatch(() => castToObservable(mediaElement.play()), undefined)
  );
}
