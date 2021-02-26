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
import log from "../log";
import {
  isFirefox,
  isTizen,
} from "./browser_detection";

/**
 * Try to unfreeze playback by chosing between different methods.
 * @param {HTMLMediaElement} mediaElement
 * @param {string} state
 */
export default function tryToUnfreeze(mediaElement: HTMLMediaElement,
                                      state: string): void {
  // firefox fix: sometimes playback can be stalled, even if we are in a buffer.
  // TODO This seems to be about an old Firefox version. Delete it?
  if (isFirefox) {
    if (state === "timeupdate") {
      log.warn("Init: Trying to unfreeze by seeking", mediaElement.currentTime);
      mediaElement.currentTime = mediaElement.currentTime;
      return;
    }
  } else if (isTizen && !mediaElement.paused) {
    log.warn("Init: Trying to unfreeze by pausing and playing", mediaElement.currentTime);
    mediaElement.pause();
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    mediaElement.play();
    return;
  }
  // Default behavior to avoid freezing is trying to seek a little far from current
  // position.
  log.warn("Init: Trying to unfreeze by seeking", mediaElement.currentTime + 0.01);
  mediaElement.currentTime += 0.01;
}
