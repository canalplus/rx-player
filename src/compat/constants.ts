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

import MediaError from "../errors/MediaError";

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

const HTMLElement_ : HTMLElementConstructor = window.HTMLElement;
const VTTCue_ : VTTCueConstructor|undefined = window.VTTCue || window.TextTrackCue;

const MediaSource_ : MediaSourceConstructor|undefined = (
  window.MediaSource ||
  window.MozMediaSource ||
  window.WebKitMediaSource ||
  window.MSMediaSource
);

let MediaKeys_ : MediaKeysConstructor|undefined = (
  window.MediaKeys ||
  window.MozMediaKeys ||
  window.WebKitMediaKeys ||
  window.MSMediaKeys
);

if (!MediaKeys_) {
  const noMediaKeys = () => {
    throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", null, true);
  };

  MediaKeys_ = class {
    public readonly create : () => never;
    public readonly isTypeSupported : () => never;
    public readonly createSession : () => never;
    public readonly setServerCertificate : () => never;
    constructor() {
      this.create = noMediaKeys;
      this.createSession = noMediaKeys;
      this.isTypeSupported = noMediaKeys;
      this.setServerCertificate = noMediaKeys;
    }
  };
}

// true for IE / Edge
const isIE : boolean = (
  navigator.appName === "Microsoft Internet Explorer" ||
  navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent)
);

const isFirefox : boolean = (
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
  MediaSource_,
  MediaKeys_,
  isIE,
  isFirefox,
  READY_STATES,
  VTTCue_,
};
