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
import { retryFuncWithBackoff } from "../../utils/retry";

/**
 * @param {MediaSource} mediaSource
 */
function triggerEndOfStream(mediaSource : MediaSource) : void {
  mediaSource.endOfStream();
}

/**
 * Try to call endOfStream on the mediaSource multiple times.
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
export default function triggerEndOfStreamWithRetries(
  mediaSource : MediaSource
) : Observable<never> {
  const retryOptions = {
    totalRetry: 10,
    retryDelay: 100,
    shouldRetry: () => mediaSource.readyState !== "ended",
  };

  return retryFuncWithBackoff(() => triggerEndOfStream(mediaSource), retryOptions)
    .ignoreElements() as Observable<never>;
}
