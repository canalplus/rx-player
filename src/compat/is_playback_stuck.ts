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

import { isFirefox } from "./browser_detection";

/**
 * firefox fix: sometimes playback can be stalled, even if we are in a buffer.
 * TODO This seems to be about an old Firefox version. Delete it?
 * @param {number} time
 * @param {Object|null} currentRange
 * @param {string} state
 * @param {Boolean} isStalled
 * @returns {Boolean}
 */
export default function isPlaybackStuck(
  time : number,
  currentRange : { start: number;
                   end: number; } |
                 null,
  state : string,
  isStalled : boolean
) : boolean {
  const FREEZE_THRESHOLD = 10; // freeze threshold in seconds
  return (isFirefox &&
          isStalled &&
          state === "timeupdate" &&
          currentRange != null &&
          currentRange.end - time > FREEZE_THRESHOLD);
}
