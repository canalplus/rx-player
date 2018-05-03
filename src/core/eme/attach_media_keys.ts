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
import {
  $loadedSessions,
  ICurrentMediaKeysInfos,
  IMediaKeysInfos,
} from "./constants";

/**
 * Set the MediaKeys object on the HTMLMediaElement if it is not already on the
 * element.
 * If a MediaKeys was already set on it, dispose of it before setting the new
 * one.
 *
 * /!\ Mutates heavily currentMediaKeysInfos
 * @param {Object} mediaKeysInfos
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} currentMediaKeysInfos
 * @returns {Observable}
 */
export default function attachMediaKeys(
  mediaKeysInfos: IMediaKeysInfos,
  mediaElement : HTMLMediaElement,
  currentMediaKeysInfos: ICurrentMediaKeysInfos
) : Observable<null> {
  return Observable.defer(() => {
    const oldVideoElement = currentMediaKeysInfos.$videoElement;
    const oldMediaKeys = currentMediaKeysInfos.$mediaKeys;

    const {
      mediaKeys,
      keySystemAccess,
      keySystemOptions,
    } = mediaKeysInfos;

    const mksConfig = keySystemAccess.getConfiguration();

    currentMediaKeysInfos.$mediaKeys = mediaKeys;
    currentMediaKeysInfos.$mediaKeySystemConfiguration = mksConfig;
    currentMediaKeysInfos.$keySystemOptions = keySystemOptions;
    currentMediaKeysInfos.$videoElement = mediaElement;

    if (mediaElement.mediaKeys === mediaKeys) {
      return Observable.of(null);
    }

    if (oldMediaKeys && oldMediaKeys !== mediaKeys) {
      // if we change our mediaKeys singleton, we need to dispose all existing
      // sessions linked to the previous one.
      $loadedSessions.closeAllSessions().subscribe();
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
