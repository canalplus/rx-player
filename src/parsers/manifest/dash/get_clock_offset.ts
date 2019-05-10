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

import log from "../../../log";

/**
 * Get offset the client's has with the given time, in milliseconds.
 * For example, a response of 1000 would mean that the client is currently 1
 * second in advance when compared with the given time.
 * @param {string} serverClock
 * @returns {number|undefined}
 */
export default function getClockOffset(
  serverClock : string
) : number|undefined {
  const httpOffset = Date.now() - Date.parse(serverClock);
  if (isNaN(httpOffset)) {
    log.warn("DASH Parser: Invalid clock received: ",  serverClock);
    return undefined;
  }
  return httpOffset;
}
