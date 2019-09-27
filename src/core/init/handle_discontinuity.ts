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

import log from "../../log";

/**
 * Handle discontinuity against current time and stall status
 * @param {number} seekTo
 * @param {boolean} isStalled
 */
export default function handleDiscontinuity(seekTo: number,
                                            mediaElement: HTMLMediaElement): void {
  if (seekTo < mediaElement.currentTime) {
    return;
  }
  log.warn("Init: discontinuity seek", mediaElement.currentTime, seekTo);
  mediaElement.currentTime = seekTo;
}
