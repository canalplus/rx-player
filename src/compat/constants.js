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

import MediaError from "../errors/MediaError.js";

const win = window;
const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];
const HTMLElement_      = win.HTMLElement;
const HTMLVideoElement_ = win.HTMLVideoElement;

const MediaSource_ = (
  win.MediaSource ||
  win.MozMediaSource ||
  win.WebKitMediaSource ||
  win.MSMediaSource);

let MediaKeys_ = (
  win.MediaKeys ||
  win.MozMediaKeys ||
  win.WebKitMediaKeys ||
  win.MSMediaKeys);

if (!MediaKeys_) {
  const noMediaKeys = () => {
    throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", null, true);
  };

  MediaKeys_ = {
    create: noMediaKeys,
    isTypeSupported: noMediaKeys,
  };
}

// true for IE / Edge
const isIE = (
  navigator.appName == "Microsoft Internet Explorer" ||
  navigator.appName == "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent)
);

const isFirefox = (
  navigator.userAgent.toLowerCase().indexOf("firefox") !== -1
);

const READY_STATES = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
};

export {
  BROWSER_PREFIXES,
  HTMLElement_,
  HTMLVideoElement_,
  MediaSource_,
  MediaKeys_,
  isIE,
  isFirefox,
  READY_STATES,
};
