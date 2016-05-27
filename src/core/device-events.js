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

const { merge } = require("rxjs/observable/merge");
const interval = require("rxjs/observable/IntervalObservable").IntervalObservable.create;
const { visibilityChange, videoSizeChange } = require("./compat");

const INACTIVITY_DELAY = 60 * 1000;

const pixelRatio = window.devicePixelRatio || 1;

function DeviceEvents(videoElement) {
  const isVisible = visibilityChange()
    .filter((x) => x === false);

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

module.exports = DeviceEvents;
