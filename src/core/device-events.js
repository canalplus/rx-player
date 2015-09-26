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

var { Observable } = require("canal-js-utils/rx");
var { merge, interval } = Observable;
var { visibilityChange, videoSizeChange } = require("./compat");

var INACTIVITY_DELAY = 60 * 1000;

var pixelRatio = window.devicePixelRatio || 1;

function DeviceEvents(videoElement) {
  var isVisible = visibilityChange()
    .filter(x => x === false);

  var isHidden = visibilityChange()
    .customDebounce(INACTIVITY_DELAY)
    .filter(x => x === true);

  var inBackground = merge(isVisible, isHidden)
    .startWith(false);

  var videoWidth = merge(
    interval(20000),
    videoSizeChange().customDebounce(500)
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
