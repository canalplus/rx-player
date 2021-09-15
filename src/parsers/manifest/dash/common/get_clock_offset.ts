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

import log from "../../../../log";

/**
 * Get difference between the server's clock, in milliseconds and the return of
 * the JS function `performance.now`.
 * This property allows to calculate the server time at any moment.
 *
 * `undefined` if we could not define such offset (in which case, you could have
 * to rely on the user's clock instead).
 *
 * For example, a response of 1000 would mean that performance.now() is 1 second
 * behind the server's time.
 * @param {string} serverClock
 * @returns {number|undefined}
 */
export default function getClockOffset(
  serverClock : string
) : number|undefined {
  const httpOffset = Date.parse(serverClock) - performance.now();
  if (isNaN(httpOffset)) {
    log.warn("DASH Parser: Invalid clock received: ",  serverClock);
    return undefined;
  }
  return httpOffset;
}
