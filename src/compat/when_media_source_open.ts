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
import { onSourceOpen$ } from "./event_listeners";

/**
 * Wait for the MediaSource's sourceopen event and emit. Emit immediatelly if
 * already received.
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
export default function whenMediaSourceOpen$(
  mediaSource : MediaSource
) : Observable<Event|null> {
  if (mediaSource.readyState === "open") {
    return observableOf(null);
  } else {
    return onSourceOpen$(mediaSource)
      .pipe(take(1));
  }
}
