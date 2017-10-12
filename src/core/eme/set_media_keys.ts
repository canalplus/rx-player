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

import { Observable } from "rxjs/Observable";
import log from "../../utils/log";
import { setMediaKeys } from "../../compat";
import { $loadedSessions } from "./globals";

/**
 * Set the MediaKeys object on the videoElement.
 * @param {MediaKeys} mediaKeys
 * @param {Object} mksConfig - MediaKeySystemConfiguration used
 * @param {HTMLMediaElement} video
 * @param {Object} keySystem
 * @param {Object} instceInfos
 * @returns {Observable}
 */
function setMediaKeysObs(
  mediaKeys : MediaKeys,
  mksConfig : MediaKeySystemConfiguration,
  video : HTMLMediaElement,
  keySystem,
  instceInfos
) : Observable<MediaKeys> {
  return Observable.defer(() => {
    const {
      $videoElement,
      $mediaKeys,
    } = instceInfos;
    const oldVideoElement = $videoElement;
    const oldMediaKeys = $mediaKeys;

    instceInfos.$mediaKeys = mediaKeys;
    instceInfos.$mediaKeySystemConfiguration = mksConfig;
    instceInfos.$keySystem = keySystem;
    instceInfos.$videoElement = video;

    if (video.mediaKeys === mediaKeys) {
      return Observable.of(mediaKeys);
    }

    if (oldMediaKeys && oldMediaKeys !== mediaKeys) {
      // if we change our mediaKeys singleton, we need to dispose all existing
      // sessions linked to the previous one.
      $loadedSessions.dispose();
    }

    let mediaKeysSetter;
    if ((oldVideoElement && oldVideoElement !== video)) {
      log.debug("eme: unlink old video element and set mediakeys");
      mediaKeysSetter = setMediaKeys(oldVideoElement, null)
        .concat(setMediaKeys(video, mediaKeys));
    }
    else {
      log.debug("eme: set mediakeys");
      mediaKeysSetter = setMediaKeys(video, mediaKeys);
    }

    return mediaKeysSetter.mapTo(mediaKeys);
  });
}

function disposeMediaKeys(
  videoElement : HTMLMediaElement
) : Observable<MediaKeys> {
  if (videoElement) {
    return setMediaKeys(videoElement, null);
  }
  return Observable.empty();
}

export {
  setMediaKeysObs as setMediaKeys,
  disposeMediaKeys,
};
export default setMediaKeysObs;
