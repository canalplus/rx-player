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
  of as observableOf,
  take,
} from "rxjs";
import { READY_STATES } from "./browser_compatibility_types";
import { onLoadedMetadata$ } from "./event_listeners";

/**
 * Returns an observable emitting a single time, as soon as a seek is possible
 * (the metadata are loaded).
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function whenLoadedMetadata$(
  mediaElement : HTMLMediaElement
) : Observable<unknown> {
  if (mediaElement.readyState >= READY_STATES.HAVE_METADATA) {
    return observableOf(null);
  } else {
    return onLoadedMetadata$(mediaElement)
      .pipe(take(1));
  }
}
