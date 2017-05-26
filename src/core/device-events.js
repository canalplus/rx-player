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

import { merge } from "rxjs/observable/merge";
import { IntervalObservable } from "rxjs/observable/IntervalObservable";
import { visibilityChange, videoSizeChange } from "./compat";

const interval = IntervalObservable.create;

const INACTIVITY_DELAY = 60 * 1000;

const pixelRatio = window.devicePixelRatio || 1;

/**
 * Returns an Object containing two Observables:
 *
 *   - _videoWidth_: Returns the width of the videoElement, in pixels, each time
 *     it changes (with a light delay - 500 ms - to avoid frequent updates).
 *     Note: This observable first emit the string 'init'.
 *
 *   - _inBackground_: Emit false when the current document is visible, true
 *     when hidden since 60s
 *
 * @param {HTMLMediaElement} videoElement
 * @returns {Object}
 */
function DeviceEvents(videoElement) {
  const isVisible = visibilityChange() // emit false when visible
    .filter((x) => x === false);

  // Emit true if the visibility changed to hidden since 60s
  const isHidden = visibilityChange()
    .debounceTime(INACTIVITY_DELAY)
    .filter((x) => x === true);

  const inBackground = merge(isVisible, isHidden)
    .startWith(false);

  const videoWidth = merge(
    interval(20000),
    videoSizeChange().debounceTime(500)
  )
    .startWith("init")
    .map(() => videoElement.clientWidth * pixelRatio)
    .distinctUntilChanged();

  return {
    videoWidth,
    inBackground,
  };
}

export default DeviceEvents;
