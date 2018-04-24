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
import { setMediaKeys } from "../../compat";
import log from "../../utils/log";
import { $loadedSessions } from "./globals";
import { IInstanceInfo } from "./key_system";
import { IMediaKeysInfos } from "./session";

/**
 * Set the MediaKeys object on the HTMLMediaElement if it is not already on the
 * element.
 * If a MediaKeys was already set on it, dispose of it before setting the new
 * one.
 * @param {Object} mediaKeysInfos
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} instceInfos
 * @returns {Observable}
 */
function updateMediaKeys(
  mediaKeysInfos: IMediaKeysInfos,
  mediaElement : HTMLMediaElement,
  instceInfos: IInstanceInfo
) : Observable<null> {
  return Observable.defer(() => {
    const {
      $videoElement,
      $mediaKeys,
    } = instceInfos;
    const oldVideoElement = $videoElement;
    const oldMediaKeys = $mediaKeys;

    const {
      mediaKeys,
      keySystemAccess,
      keySystem,
    } = mediaKeysInfos;

    const mksConfig = keySystemAccess.getConfiguration();

    instceInfos.$mediaKeys = mediaKeys;
    instceInfos.$mediaKeySystemConfiguration = mksConfig;
    instceInfos.$keySystem = keySystem;
    instceInfos.$videoElement = mediaElement;

    if (mediaElement.mediaKeys === mediaKeys) {
      return Observable.of(null);
    }

    if (oldMediaKeys && oldMediaKeys !== mediaKeys) {
      // if we change our mediaKeys singleton, we need to dispose all existing
      // sessions linked to the previous one.
      $loadedSessions.dispose();
    }

    let mediaKeysSetter : Observable<null>;
    if ((oldVideoElement && oldVideoElement !== mediaElement)) {
      log.debug("eme: unlink old media element and set mediakeys");
      mediaKeysSetter = setMediaKeys(oldVideoElement, null)
        .concat(setMediaKeys(mediaElement, mediaKeys));
    }
    else {
      log.debug("eme: set mediakeys");
      mediaKeysSetter = setMediaKeys(mediaElement, mediaKeys);
    }

    return mediaKeysSetter;
  });
}

/**
 * Remove the MediaKeys from the given HTMLMediaElement.
 * @param {HMTLMediaElement} mediaElement
 * @returns {Observable}
 */
function disposeMediaKeys(
  mediaElement : HTMLMediaElement|null
) : Observable<null> {
  return mediaElement ?
    setMediaKeys(mediaElement, null) : Observable.empty();
}

export {
  updateMediaKeys as setMediaKeys,
  disposeMediaKeys,
};
export default updateMediaKeys;
